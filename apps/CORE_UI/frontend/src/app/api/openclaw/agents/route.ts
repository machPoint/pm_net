import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { mkdir, writeFile, readdir, copyFile, readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const execAsync = promisify(exec);

const OPENCLAW_HOME = process.env.OPENCLAW_HOME || path.join(process.env.HOME || "/home/x1", ".openclaw");
const OPAL_URL = process.env.NEXT_PUBLIC_OPAL_URL || "http://localhost:7788";
const SPECIALIZABLE_FILES = ["IDENTITY.md", "SOUL.md", "TOOLS.md", "AGENTS.md", "USER.md"] as const;
const MAX_AI_CHANGE_RATIO = 0.35;

type WorkspaceMap = Record<string, string>;

interface AgentSpecializationInput {
  name?: string;
  emoji?: string;
  description?: string;
}

interface AISpecializationResponse {
  files?: WorkspaceMap;
  tools?: string[];
  skills?: string[];
  summary?: string;
}

function slugifyAgentId(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function changeRatio(original: string, updated: string) {
  const denom = Math.max(original.length, 1);
  return Math.abs(updated.length - original.length) / denom;
}

function setIdentityField(content: string, field: "Name" | "Emoji" | "Vibe", value: string) {
  const escaped = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`^\\s*[-*]\\s*\\*\\*${escaped}:\\*\\*\\s*.*$`, "im");
  const line = `- **${field}:** ${value}`;
  if (re.test(content)) return content.replace(re, line);
  return `${content.trimEnd()}\n${line}\n`;
}

function upsertSection(content: string, heading: string, body: string) {
  const trimmedBody = body.trim();
  if (!trimmedBody) return content;
  const headingRe = new RegExp(`^##\\s+${heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "im");
  const section = `## ${heading}\n\n${trimmedBody}\n`;
  if (headingRe.test(content)) {
    return content.replace(
      new RegExp(`(^##\\s+${heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$[\\s\\S]*?)(?=^##\\s+|$)`, "im"),
      `${section}\n`
    ).replace(/\n{3,}/g, "\n\n");
  }
  return `${content.trimEnd()}\n\n${section}`;
}

function normalizeList(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return values
    .filter((v) => typeof v === "string")
    .map((v) => v.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function ensureBullets(content: string, heading: string, values: string[]) {
  if (!values.length) return content;
  const existingLines = new Set(
    content
      .split("\n")
      .map((line) => line.trim().replace(/^[-*]\s+/, ""))
      .filter(Boolean)
  );
  const deduped = values.filter((v) => !existingLines.has(v));
  if (!deduped.length) return content;
  const bullets = deduped.map((v) => `- ${v}`).join("\n");
  return upsertSection(content, heading, bullets);
}

async function readWorkspaceFiles(workspaceDir: string): Promise<WorkspaceMap> {
  const files: WorkspaceMap = {};
  for (const filename of SPECIALIZABLE_FILES) {
    const filePath = path.join(workspaceDir, filename);
    if (!existsSync(filePath)) continue;
    files[filename] = await readFile(filePath, "utf-8");
  }
  return files;
}

function buildDeterministicSpecialization(base: WorkspaceMap, spec: AgentSpecializationInput): WorkspaceMap {
  const updated: WorkspaceMap = {};
  const identity = base["IDENTITY.md"] || "# IDENTITY.md\n";
  const soul = base["SOUL.md"] || "# SOUL.md\n";
  const user = base["USER.md"] || "# USER.md\n";

  let identityOut = identity;
  if (spec.name) identityOut = setIdentityField(identityOut, "Name", spec.name);
  if (spec.emoji) identityOut = setIdentityField(identityOut, "Emoji", spec.emoji);
  if (spec.description) identityOut = setIdentityField(identityOut, "Vibe", spec.description.slice(0, 72));
  updated["IDENTITY.md"] = identityOut;

  if (spec.description) {
    updated["SOUL.md"] = upsertSection(soul, "Mission Focus", spec.description);
    updated["USER.md"] = upsertSection(
      user,
      "Agent Focus",
      `This specialized agent supports: ${spec.description}`
    );
  }

  return updated;
}

async function requestAISpecialization(files: WorkspaceMap, spec: AgentSpecializationInput): Promise<AISpecializationResponse | null> {
  const systemPrompt = [
    "You are editing OpenClaw workspace markdown files for a cloned agent.",
    "Keep changes minimal and style-consistent with the source clone.",
    "Only edit these files if needed: IDENTITY.md, SOUL.md, TOOLS.md, AGENTS.md, USER.md.",
    `Do not exceed about ${Math.round(MAX_AI_CHANGE_RATIO * 100)}% content change in any one file.`,
    "Return valid JSON only.",
  ].join(" ");

  const userPrompt = [
    "Specialize this cloned agent with minimal edits.",
    `Name: ${spec.name || ""}`,
    `Emoji: ${spec.emoji || ""}`,
    `Description: ${spec.description || ""}`,
    "Current workspace files JSON:",
    JSON.stringify(files),
    "Return JSON object with shape:",
    '{"files":{"IDENTITY.md":"..."},"tools":["..."],"skills":["..."],"summary":"..."}',
    "Only include changed files in files object.",
  ].join("\n\n");

  const res = await fetch(`${OPAL_URL}/api/ai/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemPrompt,
      userPrompt,
      temperature: 0.2,
      max_tokens: 1800,
      response_format: "json_object",
    }),
  });

  if (!res.ok) {
    throw new Error(`AI specialization failed (${res.status})`);
  }

  const data = await res.json();
  const text = String(data?.message || data?.content || "").trim();
  if (!text) return null;

  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    const first = text.indexOf("{");
    const last = text.lastIndexOf("}");
    if (first < 0 || last <= first) return null;
    parsed = JSON.parse(text.slice(first, last + 1));
  }

  return {
    files: typeof parsed?.files === "object" && parsed.files ? parsed.files : {},
    tools: normalizeList(parsed?.tools),
    skills: normalizeList(parsed?.skills),
    summary: typeof parsed?.summary === "string" ? parsed.summary : "",
  };
}

async function copyDirectoryRecursive(sourceDir: string, targetDir: string) {
  if (!existsSync(sourceDir)) return;

  await mkdir(targetDir, { recursive: true });
  const entries = await readdir(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      await copyDirectoryRecursive(sourcePath, targetPath);
      continue;
    }

    if (entry.isFile()) {
      if (existsSync(targetPath)) continue;
      await copyFile(sourcePath, targetPath);
    }
  }
}

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
    const { id, model, workspace, cloneFromMain = true, specialization } = body;

    if (!id || typeof id !== "string" || !/^[a-z0-9_-]+$/i.test(id)) {
      return NextResponse.json(
        { ok: false, error: "Invalid agent id. Use lowercase alphanumeric, hyphens, underscores." },
        { status: 400 }
      );
    }

    // Create workspace directory for the new agent
    const agentWorkspace = path.join(OPENCLAW_HOME, "agents", id, "workspace");
    await mkdir(agentWorkspace, { recursive: true });

    // Clone full context from main workspace by default so new agents inherit
    // the same OpenClaw architecture docs/tools/skills conventions.
    const mainWorkspace = path.join(OPENCLAW_HOME, "workspace");
    if (cloneFromMain && existsSync(mainWorkspace)) {
      await copyDirectoryRecursive(mainWorkspace, agentWorkspace);
    }

    // Apply explicit workspace overrides from request
    if (workspace && typeof workspace === "object") {
      for (const [filename, content] of Object.entries(workspace)) {
        if (typeof content !== "string") continue;
        if (filename.includes("/") || filename.includes("..")) continue;
        await writeFile(path.join(agentWorkspace, filename), content, "utf-8");
      }
    }

    // Ensure required files exist if main template is missing/incomplete
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

    const specializationMeta: {
      requested: boolean;
      aiAttempted: boolean;
      aiApplied: boolean;
      fallbackApplied: boolean;
      filesUpdated: string[];
      suggestedTools: string[];
      suggestedSkills: string[];
      warning?: string;
      summary?: string;
    } = {
      requested: false,
      aiAttempted: false,
      aiApplied: false,
      fallbackApplied: false,
      filesUpdated: [],
      suggestedTools: [],
      suggestedSkills: [],
    };

    const specInput: AgentSpecializationInput = {
      name: typeof specialization?.name === "string" ? specialization.name.trim() : "",
      emoji: typeof specialization?.emoji === "string" ? specialization.emoji.trim() : "",
      description: typeof specialization?.description === "string" ? specialization.description.trim() : "",
    };

    if (specInput.name || specInput.emoji || specInput.description) {
      specializationMeta.requested = true;
      const baseFiles = await readWorkspaceFiles(agentWorkspace);
      const deterministic = buildDeterministicSpecialization(baseFiles, specInput);
      const finalFiles: WorkspaceMap = { ...deterministic };
      specializationMeta.fallbackApplied = Object.keys(deterministic).length > 0;

      try {
        specializationMeta.aiAttempted = true;
        const ai = await requestAISpecialization(baseFiles, specInput);
        if (ai?.summary) specializationMeta.summary = ai.summary;
        if (ai?.tools) specializationMeta.suggestedTools = ai.tools;
        if (ai?.skills) specializationMeta.suggestedSkills = ai.skills;

        const aiFiles = ai?.files || {};
        for (const [filename, content] of Object.entries(aiFiles)) {
          if (!SPECIALIZABLE_FILES.includes(filename as (typeof SPECIALIZABLE_FILES)[number])) continue;
          if (typeof content !== "string" || !content.trim()) continue;

          const original = baseFiles[filename] || "";
          if (changeRatio(original, content) > MAX_AI_CHANGE_RATIO) continue;

          finalFiles[filename] = content;
          specializationMeta.aiApplied = true;
        }
      } catch (aiErr: any) {
        specializationMeta.warning = aiErr?.message || "AI specialization failed; fallback edits applied.";
      }

      if (specializationMeta.suggestedTools.length) {
        const current = finalFiles["TOOLS.md"] || baseFiles["TOOLS.md"] || "# TOOLS.md\n";
        finalFiles["TOOLS.md"] = ensureBullets(current, "Specialized Tools", specializationMeta.suggestedTools);
      }
      if (specializationMeta.suggestedSkills.length) {
        const current = finalFiles["AGENTS.md"] || baseFiles["AGENTS.md"] || "# AGENTS.md\n";
        finalFiles["AGENTS.md"] = ensureBullets(current, "Specialized Skills", specializationMeta.suggestedSkills);
      }

      for (const [filename, content] of Object.entries(finalFiles)) {
        if (typeof content !== "string") continue;
        await writeFile(path.join(agentWorkspace, filename), content, "utf-8");
      }
      specializationMeta.filesUpdated = Object.keys(finalFiles);
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
        inheritedFromMain: cloneFromMain,
      },
      specialization: specializationMeta,
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
