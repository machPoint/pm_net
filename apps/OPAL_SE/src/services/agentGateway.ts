/**
 * Agent Gateway Service
 * 
 * Centralized service for all LLM/AI calls. Every agent interaction
 * flows through this gateway, which provides:
 * - Unified LLM calling with model selection
 * - Request/response audit logging
 * - Rate limiting hooks
 * - Token usage tracking
 * - Error normalization
 */

import logger from '../logger';

// ============================================================================
// Types
// ============================================================================

export interface GatewayRequest {
  /** Caller identifier for audit trail */
  caller: string;
  /** System prompt (optional) */
  system_prompt?: string;
  /** User/human message */
  user_prompt: string;
  /** Conversation history */
  history?: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  /** LLM parameters */
  temperature?: number;
  max_tokens?: number;
  /** If true, request JSON output */
  json_mode?: boolean;
  /** Model override (defaults to env MODEL or gpt-4o) */
  model?: string;
  /** Optional metadata for audit */
  metadata?: Record<string, any>;
}

export interface GatewayResponse {
  /** The LLM's text response */
  content: string;
  /** Model used */
  model: string;
  /** Token usage */
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  /** Request duration in ms */
  duration_ms: number;
  /** Unique request ID for tracing */
  request_id: string;
}

export interface GatewayStats {
  total_requests: number;
  total_errors: number;
  total_tokens_used: number;
  requests_by_caller: Record<string, number>;
  avg_latency_ms: number;
}

// ============================================================================
// Gateway State
// ============================================================================

let stats: GatewayStats = {
  total_requests: 0,
  total_errors: 0,
  total_tokens_used: 0,
  requests_by_caller: {},
  avg_latency_ms: 0,
};

let requestCounter = 0;

// ============================================================================
// Core Gateway Function
// ============================================================================

/**
 * Send a request through the agent gateway to the configured LLM.
 * All AI/agent calls in the system should use this function.
 */
export async function callLLM(req: GatewayRequest): Promise<GatewayResponse> {
  const requestId = `gw-${++requestCounter}-${Date.now()}`;
  const startTime = Date.now();

  // Validate API key
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === 'your-openai-api-key') {
    stats.total_errors++;
    throw new GatewayError('OPENAI_API_KEY not configured', 'CONFIG_ERROR', requestId);
  }

  // Build messages array
  const messages: Array<{ role: string; content: string }> = [];

  if (req.system_prompt) {
    messages.push({ role: 'system', content: req.system_prompt });
  }

  if (req.history) {
    messages.push(...req.history);
  }

  messages.push({ role: 'user', content: req.user_prompt });

  // Select model
  const model = req.model || process.env.MODEL || 'gpt-4o';

  // Build request body
  const body: Record<string, any> = {
    model,
    messages,
    temperature: req.temperature ?? 0.7,
    max_tokens: req.max_tokens ?? 1000,
  };

  if (req.json_mode) {
    body.response_format = { type: 'json_object' };
  }

  // Update stats
  stats.total_requests++;
  stats.requests_by_caller[req.caller] = (stats.requests_by_caller[req.caller] || 0) + 1;

  logger.info(`[AgentGateway] ${requestId} | caller=${req.caller} model=${model} json=${!!req.json_mode}`);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const duration_ms = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      stats.total_errors++;
      logger.error(`[AgentGateway] ${requestId} | LLM error ${response.status}: ${errorText.substring(0, 200)}`);
      throw new GatewayError(
        `LLM returned ${response.status}`,
        'LLM_ERROR',
        requestId,
        { status: response.status, body: errorText.substring(0, 500) }
      );
    }

    const data: any = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      stats.total_errors++;
      throw new GatewayError('No content in LLM response', 'EMPTY_RESPONSE', requestId);
    }

    const usage = data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
    stats.total_tokens_used += usage.total_tokens;

    // Update rolling average latency
    stats.avg_latency_ms = Math.round(
      (stats.avg_latency_ms * (stats.total_requests - 1) + duration_ms) / stats.total_requests
    );

    logger.info(`[AgentGateway] ${requestId} | OK ${duration_ms}ms tokens=${usage.total_tokens}`);

    return {
      content,
      model: data.model || model,
      usage,
      duration_ms,
      request_id: requestId,
    };
  } catch (error: any) {
    if (error instanceof GatewayError) throw error;

    const duration_ms = Date.now() - startTime;
    stats.total_errors++;
    logger.error(`[AgentGateway] ${requestId} | Network error after ${duration_ms}ms: ${error.message}`);
    throw new GatewayError(
      `Network error: ${error.message}`,
      'NETWORK_ERROR',
      requestId
    );
  }
}

/**
 * Test the LLM connection without a real prompt.
 * Returns model list or connection status.
 */
export async function testConnection(): Promise<{
  status: 'ok' | 'error';
  model_count?: number;
  models?: string[];
  error?: string;
}> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === 'your-openai-api-key') {
    return { status: 'error', error: 'OPENAI_API_KEY not configured' };
  }

  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { status: 'error', error: `API returned ${response.status}: ${errorText.substring(0, 200)}` };
    }

    const data: any = await response.json();
    const models = (data.data || []).map((m: any) => m.id).slice(0, 10);

    return {
      status: 'ok',
      model_count: data.data?.length || 0,
      models,
    };
  } catch (error: any) {
    return { status: 'error', error: error.message };
  }
}

/**
 * Get gateway statistics
 */
export function getGatewayStats(): GatewayStats {
  return { ...stats };
}

/**
 * Reset gateway statistics
 */
export function resetGatewayStats(): void {
  stats = {
    total_requests: 0,
    total_errors: 0,
    total_tokens_used: 0,
    requests_by_caller: {},
    avg_latency_ms: 0,
  };
}

// ============================================================================
// Error Class
// ============================================================================

export class GatewayError extends Error {
  code: string;
  request_id: string;
  details?: Record<string, any>;

  constructor(message: string, code: string, request_id: string, details?: Record<string, any>) {
    super(message);
    this.name = 'GatewayError';
    this.code = code;
    this.request_id = request_id;
    this.details = details;
  }

  toJSON() {
    return {
      error: this.message,
      code: this.code,
      request_id: this.request_id,
      details: this.details,
    };
  }
}
