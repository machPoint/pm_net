/**
 * Agent Dispatcher — Agent-Agnostic Execution Layer
 *
 * Abstracts agent runtimes (OpenClaw, LangChain, direct LLM, custom HTTP, etc.)
 * behind a common interface so that the scheduler, intake pipeline, and any
 * future caller can dispatch work without knowing which runtime is in use.
 *
 * Design principles:
 *   1. Runtime-agnostic — callers never reference a specific agent framework
 *   2. Pluggable — new runtimes are added by implementing AgentRuntime
 *   3. Fallback chain — if the primary runtime fails, try the next one
 *   4. Observable — every dispatch emits events and logs a decision_trace node
 */

import { v4 as uuid } from 'uuid';
import logger from '../logger';
import { callLLM } from './agentGateway';
import { eventBus } from './eventBus';
import * as graphService from './graphService';

// ============================================================================
// Public Types
// ============================================================================

export interface DispatchRequest {
  /** Human-readable label for logs / UI */
  title: string;
  /** The prompt or instruction to send to the agent */
  prompt: string;
  /** Which agent identity to use (e.g. "main", "research-agent") */
  agent_id?: string;
  /** Optional session ID for multi-turn context */
  session_id?: string;
  /** Caller identifier for audit trail */
  caller: string;
  /** Optional metadata passed through to the runtime */
  metadata?: Record<string, any>;
  /** Preferred runtime key — if omitted, uses the default chain */
  runtime?: string;
  /** Timeout in ms (default 120 000) */
  timeout_ms?: number;
  /** Streaming callback for incremental output */
  onChunk?: (chunk: string) => void;
}

export interface ToolCallInfo {
  name: string;
  arguments: Record<string, any>;
  result?: string;
  error?: string;
}

export interface DispatchResult {
  output: string;
  success: boolean;
  duration_ms: number;
  runtime: string;
  model?: string;
  tool_calls: ToolCallInfo[];
  /** Runtime-specific session/run ID */
  runtime_session_id?: string;
}

// ============================================================================
// Agent Runtime Interface — implement this to add a new agent backend
// ============================================================================

export interface AgentRuntime {
  /** Unique key used in DispatchRequest.runtime and the registry */
  key: string;
  /** Human-readable name */
  name: string;
  /** Return true if this runtime is currently available */
  isAvailable(): Promise<boolean>;
  /** Execute a prompt and return the result */
  execute(req: DispatchRequest): Promise<DispatchResult>;
}

// ============================================================================
// Built-in Runtimes
// ============================================================================

/**
 * OpenClaw CLI runtime — spawns `openclaw agent` as a child process.
 */
class OpenClawRuntime implements AgentRuntime {
  key = 'openclaw';
  name = 'OpenClaw CLI';

  async isAvailable(): Promise<boolean> {
    try {
      const { execSync } = require('child_process');
      execSync('which openclaw', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  async execute(req: DispatchRequest): Promise<DispatchResult> {
    const { spawn } = require('child_process');
    const agentId = req.agent_id || 'main';
    const sessionId = req.session_id || `dispatch-${uuid()}`;
    const timeout = req.timeout_ms || 120_000;
    const startTime = Date.now();

    const result: string = await new Promise((resolve, reject) => {
      const child = spawn(
        'openclaw',
        ['agent', '--agent', agentId, '--message', req.prompt, '--json', '--session-id', sessionId],
        { stdio: ['ignore', 'pipe', 'pipe'] }
      );

      let stdout = '';
      let stderr = '';
      let timedOut = false;

      const timer = setTimeout(() => {
        timedOut = true;
        child.kill('SIGTERM');
        setTimeout(() => child.kill('SIGKILL'), 5000);
      }, timeout);

      child.stdout.on('data', (chunk: Buffer | string) => {
        const text = chunk.toString();
        stdout += text;
        req.onChunk?.(text);
      });

      child.stderr.on('data', (chunk: Buffer | string) => {
        stderr += chunk.toString();
      });

      child.on('error', (err: Error) => {
        clearTimeout(timer);
        reject(err);
      });

      child.on('close', (code: number) => {
        clearTimeout(timer);
        if (timedOut) return reject(new Error('OpenClaw agent timed out'));
        if (code !== 0) return reject(new Error(stderr.trim() || `OpenClaw exited with code ${code}`));
        resolve(stdout);
      });
    });

    // Parse the JSON response
    let output = result;
    let model: string | undefined;
    let runtimeSessionId: string | undefined;
    let toolCalls: ToolCallInfo[] = [];

    try {
      const parsed = JSON.parse(result);
      if (parsed.result?.payloads?.length > 0) {
        output = parsed.result.payloads.map((p: any) => p.text || '').join('\n').trim();
      } else {
        output = parsed.response || parsed.message || parsed.content || parsed.result?.text || result;
      }
      model = parsed.result?.meta?.agentMeta?.model;
      runtimeSessionId = parsed.result?.meta?.agentMeta?.sessionId;

      if (runtimeSessionId) {
        toolCalls = this.parseSessionToolCalls(runtimeSessionId, agentId);
      }
    } catch {
      // raw text output — leave as-is
    }

    return {
      output,
      success: true,
      duration_ms: Date.now() - startTime,
      runtime: this.key,
      model,
      tool_calls: toolCalls,
      runtime_session_id: runtimeSessionId,
    };
  }

  /** Parse an OpenClaw session JSONL file to extract tool calls */
  private parseSessionToolCalls(sessionId: string, agentId: string): ToolCallInfo[] {
    const fs = require('fs');
    const path = require('path');
    const sessionFile = path.join(
      process.env.HOME || '/home/x1',
      `.openclaw/agents/${agentId}/sessions`,
      `${sessionId}.jsonl`
    );

    if (!fs.existsSync(sessionFile)) return [];

    const toolCalls: ToolCallInfo[] = [];
    const pendingCalls = new Map<string, ToolCallInfo>();

    try {
      const lines = fs.readFileSync(sessionFile, 'utf-8').split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        const entry = JSON.parse(line);
        if (entry.type === 'message' && entry.message?.content) {
          const content = entry.message.content;
          if (!Array.isArray(content)) continue;
          for (const block of content) {
            if (block.type === 'toolCall' || block.type === 'tool_use') {
              const tc: ToolCallInfo = {
                name: block.name,
                arguments: block.arguments || block.input || {},
              };
              pendingCalls.set(block.id, tc);
              toolCalls.push(tc);
            }
            if (block.type === 'tool_result') {
              const pending = pendingCalls.get(block.tool_use_id);
              if (pending) {
                const rc = block.content;
                if (typeof rc === 'string') {
                  pending.result = rc.substring(0, 1000);
                } else if (Array.isArray(rc)) {
                  pending.result = rc.map((c: any) => c.text || '').join('\n').substring(0, 1000);
                }
                if (block.is_error) pending.error = pending.result;
              }
            }
          }
        }
        if (entry.type === 'toolResult') {
          const pending = pendingCalls.get(entry.toolUseId);
          if (pending) {
            const text = entry.result || entry.content || '';
            pending.result = (typeof text === 'string' ? text : JSON.stringify(text)).substring(0, 1000);
            if (entry.isError) pending.error = pending.result;
          }
        }
      }
    } catch (err: any) {
      logger.warn(`[AgentDispatcher] Failed to parse OC session JSONL: ${err.message}`);
    }

    return toolCalls;
  }
}

/**
 * Direct LLM runtime — calls the agentGateway (OpenAI-compatible API).
 * Works as a universal fallback when no agent framework is available.
 */
class DirectLLMRuntime implements AgentRuntime {
  key = 'llm';
  name = 'Direct LLM';

  async isAvailable(): Promise<boolean> {
    const apiKey = process.env.OPENAI_API_KEY;
    return !!apiKey && apiKey !== 'your-openai-api-key';
  }

  async execute(req: DispatchRequest): Promise<DispatchResult> {
    const startTime = Date.now();
    const response = await callLLM({
      caller: req.caller,
      system_prompt: `You are an AI agent executing a task. Provide real, substantive output — not placeholders.`,
      user_prompt: req.prompt,
      temperature: 0.5,
      max_tokens: 4000,
    });

    return {
      output: response.content,
      success: true,
      duration_ms: Date.now() - startTime,
      runtime: this.key,
      model: response.model,
      tool_calls: [],
      runtime_session_id: response.request_id,
    };
  }
}

/**
 * HTTP Agent runtime — calls any agent exposed via an HTTP endpoint.
 * Useful for LangChain/LangServe, CrewAI, custom microservices, etc.
 *
 * Configure via environment variables:
 *   AGENT_HTTP_URL=http://localhost:8000/invoke
 *   AGENT_HTTP_AUTH_HEADER=Authorization
 *   AGENT_HTTP_AUTH_VALUE=Bearer sk-...
 */
class HttpAgentRuntime implements AgentRuntime {
  key = 'http';
  name = 'HTTP Agent';

  async isAvailable(): Promise<boolean> {
    return !!process.env.AGENT_HTTP_URL;
  }

  async execute(req: DispatchRequest): Promise<DispatchResult> {
    const url = process.env.AGENT_HTTP_URL!;
    const authHeader = process.env.AGENT_HTTP_AUTH_HEADER;
    const authValue = process.env.AGENT_HTTP_AUTH_VALUE;
    const startTime = Date.now();
    const timeout = req.timeout_ms || 120_000;

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authHeader && authValue) {
      headers[authHeader] = authValue;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          input: req.prompt,
          agent_id: req.agent_id,
          session_id: req.session_id,
          metadata: req.metadata,
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`HTTP agent returned ${response.status}: ${errText.substring(0, 500)}`);
      }

      const data: any = await response.json();
      // Support common response shapes: { output }, { result }, { content }, { text }
      const output = data.output || data.result || data.content || data.text || JSON.stringify(data);

      return {
        output: typeof output === 'string' ? output : JSON.stringify(output),
        success: true,
        duration_ms: Date.now() - startTime,
        runtime: this.key,
        model: data.model,
        tool_calls: data.tool_calls || [],
        runtime_session_id: data.session_id || data.run_id,
      };
    } catch (err: any) {
      clearTimeout(timer);
      throw err;
    }
  }
}

// ============================================================================
// Runtime Registry
// ============================================================================

const runtimeRegistry = new Map<string, AgentRuntime>();

/** Register a new agent runtime */
export function registerRuntime(runtime: AgentRuntime): void {
  runtimeRegistry.set(runtime.key, runtime);
  logger.info(`[AgentDispatcher] Registered runtime: ${runtime.key} (${runtime.name})`);
}

/** Unregister a runtime */
export function unregisterRuntime(key: string): void {
  runtimeRegistry.delete(key);
}

/** List all registered runtimes with availability */
export async function listRuntimes(): Promise<Array<{ key: string; name: string; available: boolean }>> {
  const results: Array<{ key: string; name: string; available: boolean }> = [];
  for (const rt of runtimeRegistry.values()) {
    let available = false;
    try { available = await rt.isAvailable(); } catch { /* unavailable */ }
    results.push({ key: rt.key, name: rt.name, available });
  }
  return results;
}

// Register built-in runtimes (order = default fallback priority)
registerRuntime(new OpenClawRuntime());
registerRuntime(new HttpAgentRuntime());
registerRuntime(new DirectLLMRuntime());

/** Default fallback order when no specific runtime is requested */
const DEFAULT_FALLBACK_ORDER = ['openclaw', 'http', 'llm'];

// ============================================================================
// Core Dispatch Function
// ============================================================================

/**
 * Dispatch a prompt to an agent runtime.
 *
 * If `req.runtime` is specified, only that runtime is tried.
 * Otherwise, runtimes are tried in DEFAULT_FALLBACK_ORDER until one succeeds.
 *
 * Optionally logs a decision_trace node to the graph for observability.
 */
export async function dispatch(
  req: DispatchRequest,
  options?: { log_to_graph?: boolean; run_id?: string }
): Promise<DispatchResult> {
  const runtimesToTry: string[] = req.runtime
    ? [req.runtime]
    : [...DEFAULT_FALLBACK_ORDER];

  let lastError: Error | null = null;

  for (const key of runtimesToTry) {
    const rt = runtimeRegistry.get(key);
    if (!rt) continue;

    let available = false;
    try { available = await rt.isAvailable(); } catch { /* skip */ }
    if (!available) {
      logger.info(`[AgentDispatcher] Runtime '${key}' not available, skipping`);
      continue;
    }

    try {
      logger.info(`[AgentDispatcher] Dispatching "${req.title}" via ${key}`);
      const result = await rt.execute(req);

      // Emit event
      eventBus.emit({
        id: uuid(),
        event_type: 'updated',
        entity_type: 'AgentDispatch',
        entity_id: `dispatch-${uuid()}`,
        summary: `Agent completed: ${req.title}`,
        source: 'agent',
        timestamp: new Date().toISOString(),
        metadata: {
          runtime: result.runtime,
          model: result.model,
          duration_ms: result.duration_ms,
          tool_call_count: result.tool_calls.length,
          caller: req.caller,
          agent_id: req.agent_id,
        },
      });

      // Optionally log to graph
      if (options?.log_to_graph && options.run_id) {
        try {
          await graphService.createNode({
            node_type: 'decision_trace',
            title: req.title,
            description: result.output.substring(0, 500),
            status: result.success ? 'recorded' : 'failed',
            metadata: {
              run_id: options.run_id,
              runtime: result.runtime,
              model: result.model,
              duration_ms: result.duration_ms,
              success: result.success,
              tool_calls: result.tool_calls.map(tc => ({ name: tc.name, args: tc.arguments })),
              full_output: result.output,
              caller: req.caller,
            },
            created_by: req.agent_id || 'agent-dispatcher',
            source: 'agent',
          });
        } catch (err: any) {
          logger.warn(`[AgentDispatcher] Failed to log decision_trace: ${err.message}`);
        }
      }

      return result;
    } catch (err: any) {
      lastError = err;
      logger.warn(`[AgentDispatcher] Runtime '${key}' failed: ${err.message}`);
    }
  }

  // All runtimes failed
  const errorMsg = lastError?.message || 'No agent runtime available';
  logger.error(`[AgentDispatcher] All runtimes failed for "${req.title}": ${errorMsg}`);

  return {
    output: `Error: ${errorMsg}`,
    success: false,
    duration_ms: 0,
    runtime: 'none',
    tool_calls: [],
  };
}
