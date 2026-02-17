import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const execAsync = promisify(exec);
const OPENCLAW_HOME = process.env.OPENCLAW_HOME || path.join(process.env.HOME || "/home/x1", ".openclaw");

/**
 * Chat history is stored per-agent in a simple JSON file.
 * OpenClaw manages its own session state; we just keep a UI-side log.
 */
function chatHistoryPath(agentId: string): string {
  return path.join(OPENCLAW_HOME, "agents", agentId, "pmnet-chat-history.json");
}

/**
 * PUT /api/openclaw/agents/[id]/chat
 * Add a manual message to an agent's PM inbox history.
 *
 * Body: { content: string, role?: "assistant"|"system"|"user", meta?: object }
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await req.json();
    const content = String(body?.content || "").trim();
    const role = (body?.role || "assistant") as ChatMessage["role"];

    if (!content) {
      return NextResponse.json({ ok: false, error: "content is required" }, { status: 400 });
    }

    const allowedRoles: ChatMessage["role"][] = ["assistant", "system", "user"];
    if (!allowedRoles.includes(role)) {
      return NextResponse.json({ ok: false, error: "invalid role" }, { status: 400 });
    }

    const history = await loadHistory(id);
    const newMessage: ChatMessage = {
      id: createMessageId(),
      role,
      content,
      timestamp: new Date().toISOString(),
      meta: {
        source: "pm-net-manual",
        ...(body?.meta || {}),
      },
    };

    history.push(newMessage);
    await saveHistory(id, history);
    return NextResponse.json({ ok: true, agentId: id, message: newMessage });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message || "Failed to add message" }, { status: 500 });
  }
}

/**
 * PATCH /api/openclaw/agents/[id]/chat
 * Update a single message content in agent history.
 *
 * Body: { messageId: string, content: string }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await req.json();
    const messageId = String(body?.messageId || "").trim();
    const content = String(body?.content || "").trim();

    if (!messageId || !content) {
      return NextResponse.json({ ok: false, error: "messageId and content are required" }, { status: 400 });
    }

    const history = await loadHistory(id);
    const idx = history.findIndex((m) => m.id === messageId);
    if (idx < 0) {
      return NextResponse.json({ ok: false, error: "message not found" }, { status: 404 });
    }

    history[idx] = {
      ...history[idx],
      content,
      meta: {
        ...(history[idx].meta || {}),
        edited: true,
        edited_at: new Date().toISOString(),
      },
    };

    await saveHistory(id, history);
    return NextResponse.json({ ok: true, agentId: id, message: history[idx] });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message || "Failed to update message" }, { status: 500 });
  }
}

interface ChatMessage {
  id?: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  meta?: Record<string, any>;
}

function createMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeHistory(messages: ChatMessage[]): ChatMessage[] {
  return messages.map((m, idx) => ({
    ...m,
    id: m.id || `${m.role}-${m.timestamp || "no-ts"}-${idx}`,
  }));
}

async function loadHistory(agentId: string): Promise<ChatMessage[]> {
  const p = chatHistoryPath(agentId);
  if (!existsSync(p)) return [];
  try {
    const raw = await readFile(p, "utf-8");
    const parsed = JSON.parse(raw) as ChatMessage[];
    return normalizeHistory(parsed);
  } catch {
    return [];
  }
}

async function saveHistory(agentId: string, messages: ChatMessage[]) {
  const p = chatHistoryPath(agentId);
  const dir = path.dirname(p);
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });
  // Keep last 200 messages to avoid unbounded growth
  const trimmed = messages.slice(-200);
  await writeFile(p, JSON.stringify(trimmed, null, 2), "utf-8");
}

/**
 * GET /api/openclaw/agents/[id]/chat
 * Retrieve chat history for an agent
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const history = await loadHistory(id);
  return NextResponse.json({ ok: true, agentId: id, messages: history });
}

/**
 * POST /api/openclaw/agents/[id]/chat
 * Send a message to an agent and get a response
 *
 * Body: { message: string, sessionId?: string }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await req.json();
    const { message, sessionId } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { ok: false, error: "Message is required" },
        { status: 400 }
      );
    }

    // Build the session id — use a stable per-agent session for our UI
    const sid = sessionId || `pmnet-ui-${id}`;

    // Escape the message for shell safety
    const escapedMessage = message.replace(/'/g, "'\\''");

    const cmd = `openclaw agent --agent '${id}' --message '${escapedMessage}' --session-id '${sid}' --json --timeout 120`;

    let cliResult: any = {};
    let replyText = "";
    let replyMarkdown = "";
    let meta: Record<string, any> = {};

    try {
      const { stdout, stderr } = await execAsync(cmd, {
        timeout: 130000, // slightly longer than CLI timeout
        maxBuffer: 1024 * 1024 * 5, // 5MB for large responses
      });

      if (stdout) {
        cliResult = JSON.parse(stdout);
        // Extract reply text from payloads
        const payloads = cliResult.result?.payloads || [];
        replyMarkdown = payloads.map((p: any) => p.text).filter(Boolean).join("\n\n");
        replyText = replyMarkdown;

        meta = {
          runId: cliResult.runId,
          status: cliResult.status,
          durationMs: cliResult.result?.meta?.durationMs,
          model: cliResult.result?.meta?.agentMeta?.model,
          sessionId: cliResult.result?.meta?.agentMeta?.sessionId,
          usage: cliResult.result?.meta?.agentMeta?.usage,
          injectedFiles: cliResult.result?.meta?.systemPromptReport?.injectedWorkspaceFiles?.map(
            (f: any) => f.name
          ),
          consoleMarkdown: `\`\`\`json\n${JSON.stringify(cliResult, null, 2)}\n\`\`\``,
        };
      } else {
        replyText = stderr || "(no response)";
      }
    } catch (cliErr: any) {
      // Try to parse partial output
      const errOutput = cliErr.stdout || cliErr.stderr || cliErr.message;
      try {
        cliResult = JSON.parse(errOutput);
        const payloads = cliResult.result?.payloads || [];
        replyMarkdown = payloads.map((p: any) => p.text).filter(Boolean).join("\n\n");
        replyText = replyMarkdown;
        meta.consoleMarkdown = `\`\`\`json\n${JSON.stringify(cliResult, null, 2)}\n\`\`\``;
      } catch {
        replyText = `Error: ${errOutput}`;
      }
      meta.error = true;
    }

    // Save to chat history
    const history = await loadHistory(id);
    const now = new Date().toISOString();

    history.push({
      id: createMessageId(),
      role: "user",
      content: message,
      timestamp: now,
    });

    history.push({
      id: createMessageId(),
      role: "assistant",
      content: replyMarkdown || replyText || "(empty response)",
      timestamp: new Date().toISOString(),
      meta,
    });

    await saveHistory(id, history);

    return NextResponse.json({
      ok: true,
      agentId: id,
      reply: replyText || "(empty response)",
      reply_markdown: replyMarkdown || replyText || "(empty response)",
      meta,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/openclaw/agents/[id]/chat
 * Clear chat history for an agent
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let body: any = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const messageId = String(body?.messageId || "").trim();

  if (messageId) {
    const history = await loadHistory(id);
    const next = history.filter((m) => m.id !== messageId);
    const deleted = next.length !== history.length;
    if (!deleted) {
      return NextResponse.json({ ok: false, error: "message not found" }, { status: 404 });
    }
    await saveHistory(id, next);
    return NextResponse.json({ ok: true, agentId: id, deleted: true, messageId });
  }

  const p = chatHistoryPath(id);
  if (existsSync(p)) {
    const { unlink } = await import("fs/promises");
    await unlink(p);
  }

  return NextResponse.json({ ok: true, agentId: id, cleared: true });
}
