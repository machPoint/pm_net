import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { mkdir, writeFile, readdir, readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const execAsync = promisify(exec);

const OPENCLAW_HOME = process.env.OPENCLAW_HOME || path.join(process.env.HOME || "/home/x1", ".openclaw");
const WORKSPACE_FILES = ["SOUL.md", "IDENTITY.md", "AGENTS.md", "TOOLS.md", "USER.md", "HEARTBEAT.md", "BOOTSTRAP.md"];

/**
 * GET /api/openclaw/agents
 * List all OpenClaw agents with their workspace info
 */
export async function GET() {
  try {
    const { stdout } = await execAsync("openclaw agents list --json", { timeout: 10000 });
    const agents = JSON.parse(stdout);

    // Enrich each agent with workspace file list
    const enriched = await Promise.all(
      (Array.isArray(agents) ? agents : []).map(async (agent: any) => {
        const workspaceDir = agent.workspace || path.join(OPENCLAW_HOME, "workspace");
        let workspaceFiles: string[] = [];
        try {
          const files = await readdir(workspaceDir);
          workspaceFiles = files.filter((f: string) => f.endsWith(".md"));
        } catch { /* workspace may not exist yet */ }

        return {
          ...agent,
          workspaceFiles,
        };
      })
    );

    return NextResponse.json({ ok: true, agents: enriched });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/openclaw/agents
 * Create a new OpenClaw agent with workspace files
 *
 * Body: {
 *   id: string,           // agent id (e.g. "planner")
 *   model?: string,       // model id (default: anthropic/claude-sonnet-4-5)
 *   workspace?: {         // workspace doc contents
 *     "SOUL.md": "...",
 *     "IDENTITY.md": "...",
 *     "TOOLS.md": "...",
 *     "USER.md": "...",
 *     "HEARTBEAT.md": "...",
 *   }
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, model, workspace } = body;

    if (!id || typeof id !== "string" || !/^[a-z0-9_-]+$/i.test(id)) {
      return NextResponse.json(
        { ok: false, error: "Invalid agent id. Use lowercase alphanumeric, hyphens, underscores." },
        { status: 400 }
      );
    }

    // Create workspace directory for the new agent
    const agentWorkspace = path.join(OPENCLAW_HOME, "agents", id, "workspace");
    await mkdir(agentWorkspace, { recursive: true });

    // Write workspace files
    if (workspace && typeof workspace === "object") {
      for (const [filename, content] of Object.entries(workspace)) {
        if (WORKSPACE_FILES.includes(filename) && typeof content === "string") {
          await writeFile(path.join(agentWorkspace, filename), content, "utf-8");
        }
      }
    }

    // Write default files for any not provided
    const defaults: Record<string, string> = {
      "SOUL.md": `# SOUL.md - ${id} Agent\n\nYou are the **${id}** agent. Follow your instructions precisely.\n`,
      "IDENTITY.md": `# IDENTITY.md\n\n- **Name:** ${id}\n- **Vibe:** focused, precise\n- **Emoji:** 🤖\n`,
      "AGENTS.md": `# AGENTS.md\n\nWorkspace rules for ${id} agent.\n\n## Every Session\n\n1. Read SOUL.md\n2. Read USER.md\n3. Execute your assigned task\n`,
      "USER.md": `# USER.md\n\nYou are helping the PM_NET engineering team.\n`,
    };

    for (const [filename, defaultContent] of Object.entries(defaults)) {
      const filePath = path.join(agentWorkspace, filename);
      if (!existsSync(filePath)) {
        await writeFile(filePath, defaultContent, "utf-8");
      }
    }

    // Run openclaw agents add
    const modelFlag = model ? `--model "${model}"` : "";
    const cmd = `openclaw agents add "${id}" --workspace "${agentWorkspace}" ${modelFlag} --non-interactive --json`;

    let cliResult: any = {};
    try {
      const { stdout, stderr } = await execAsync(cmd, { timeout: 15000 });
      cliResult = stdout ? JSON.parse(stdout) : { raw: stderr };
    } catch (cliErr: any) {
      // openclaw agents add may exit non-zero but still succeed
      cliResult = { warning: cliErr.message };
    }

    // Verify agent was created
    let verified = false;
    try {
      const { stdout: listOut } = await execAsync("openclaw agents list --json", { timeout: 10000 });
      const allAgents = JSON.parse(listOut);
      verified = (Array.isArray(allAgents) ? allAgents : []).some((a: any) => a.id === id);
    } catch { /* ignore */ }

    return NextResponse.json({
      ok: true,
      agent: {
        id,
        workspace: agentWorkspace,
        model: model || "anthropic/claude-sonnet-4-5",
        verified,
      },
      cliResult,
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/openclaw/agents?id=<agentId>
 * Delete an OpenClaw agent
 */
export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ ok: false, error: "Missing id parameter" }, { status: 400 });
    }

    if (id === "main") {
      return NextResponse.json({ ok: false, error: "Cannot delete the main agent" }, { status: 400 });
    }

    let cliResult: any = {};
    try {
      const { stdout, stderr } = await execAsync(`openclaw agents delete --force --json "${id}"`, { timeout: 15000 });
      cliResult = stdout ? JSON.parse(stdout) : { raw: stderr };
    } catch (cliErr: any) {
      cliResult = { warning: cliErr.message };
    }

    return NextResponse.json({ ok: true, deleted: id, cliResult });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}
