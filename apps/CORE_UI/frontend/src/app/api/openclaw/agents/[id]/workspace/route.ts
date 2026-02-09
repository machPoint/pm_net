import { NextRequest, NextResponse } from "next/server";
import { readdir, readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
const OPENCLAW_HOME = process.env.OPENCLAW_HOME || path.join(process.env.HOME || "/home/x1", ".openclaw");

/**
 * Resolve the workspace directory for a given agent id.
 * - "main" uses the shared workspace at ~/.openclaw/workspace
 * - Other agents use ~/.openclaw/agents/<id>/workspace
 */
async function resolveWorkspace(agentId: string): Promise<string | null> {
  // First try to get it from openclaw agents list
  try {
    const { stdout } = await execAsync("openclaw agents list --json", { timeout: 10000 });
    const agents = JSON.parse(stdout);
    const agent = (Array.isArray(agents) ? agents : []).find(
      (a: any) => a.id === agentId
    );
    if (agent?.workspace) return agent.workspace;
  } catch { /* fallback below */ }

  // Fallback: convention-based paths
  if (agentId === "main") {
    return path.join(OPENCLAW_HOME, "workspace");
  }
  const agentWs = path.join(OPENCLAW_HOME, "agents", agentId, "workspace");
  if (existsSync(agentWs)) return agentWs;

  return null;
}

/**
 * GET /api/openclaw/agents/[id]/workspace
 * List all workspace files and their contents for an agent.
 *
 * Query params:
 *   ?file=SOUL.md  — return only that file's content
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const workspace = await resolveWorkspace(id);

    if (!workspace || !existsSync(workspace)) {
      return NextResponse.json(
        { ok: false, error: `Workspace not found for agent "${id}"` },
        { status: 404 }
      );
    }

    const fileParam = req.nextUrl.searchParams.get("file");

    if (fileParam) {
      // Return single file
      const filePath = path.join(workspace, fileParam);
      if (!filePath.startsWith(workspace)) {
        return NextResponse.json({ ok: false, error: "Invalid file path" }, { status: 400 });
      }
      if (!existsSync(filePath)) {
        return NextResponse.json({ ok: false, error: `File not found: ${fileParam}` }, { status: 404 });
      }
      const content = await readFile(filePath, "utf-8");
      return NextResponse.json({ ok: true, file: fileParam, content });
    }

    // Return all .md files
    const allFiles = await readdir(workspace);
    const mdFiles = allFiles.filter((f) => f.endsWith(".md"));

    const files: Record<string, string> = {};
    for (const f of mdFiles) {
      files[f] = await readFile(path.join(workspace, f), "utf-8");
    }

    return NextResponse.json({
      ok: true,
      agentId: id,
      workspace,
      files,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/openclaw/agents/[id]/workspace
 * Write workspace files for an agent.
 *
 * Body: {
 *   files: {
 *     "SOUL.md": "new content...",
 *     "IDENTITY.md": "new content...",
 *   }
 * }
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const workspace = await resolveWorkspace(id);

    if (!workspace) {
      return NextResponse.json(
        { ok: false, error: `Workspace not found for agent "${id}"` },
        { status: 404 }
      );
    }

    // Ensure workspace exists
    await mkdir(workspace, { recursive: true });

    const body = await req.json();
    const { files } = body;

    if (!files || typeof files !== "object") {
      return NextResponse.json(
        { ok: false, error: "Body must contain a 'files' object" },
        { status: 400 }
      );
    }

    const written: string[] = [];
    for (const [filename, content] of Object.entries(files)) {
      // Only allow .md files in workspace root (no path traversal)
      if (!filename.endsWith(".md") || filename.includes("/") || filename.includes("..")) {
        continue;
      }
      if (typeof content !== "string") continue;

      await writeFile(path.join(workspace, filename), content, "utf-8");
      written.push(filename);
    }

    return NextResponse.json({
      ok: true,
      agentId: id,
      workspace,
      written,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}
