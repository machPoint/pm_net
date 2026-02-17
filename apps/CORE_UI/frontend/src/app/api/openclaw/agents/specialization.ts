import { readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const SPECIALIZABLE_FILES = ["IDENTITY.md", "SOUL.md", "TOOLS.md", "AGENTS.md", "USER.md"] as const;
const MAX_AI_CHANGE_RATIO = 0.35;

type WorkspaceMap = Record<string, string>;

export interface AgentSpecializationInput {
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

export interface SpecializationMeta {
  requested: boolean;
  aiAttempted: boolean;
  aiApplied: boolean;
  fallbackApplied: boolean;
  filesUpdated: string[];
  suggestedTools: string[];
  suggestedSkills: string[];
  warning?: string;
  summary?: string;
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
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const headingRe = new RegExp(`^##\\s+${escapedHeading}\\s*$`, "im");
  const section = `## ${heading}\n\n${trimmedBody}\n`;

  if (headingRe.test(content)) {
    return content
      .replace(
        new RegExp(`(^##\\s+${escapedHeading}\\s*$[\\s\\S]*?)(?=^##\\s+|$)`, "im"),
        `${section}\n`
      )
      .replace(/\n{3,}/g, "\n\n");
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

async function requestAISpecialization(
  files: WorkspaceMap,
  spec: AgentSpecializationInput,
  opalUrl: string
): Promise<AISpecializationResponse | null> {
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

  const res = await fetch(`${opalUrl}/api/ai/analyze`, {
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

export async function applyWorkspaceSpecialization(params: {
  workspaceDir: string;
  specialization: AgentSpecializationInput;
  opalUrl: string;
}): Promise<SpecializationMeta> {
  const { workspaceDir, specialization, opalUrl } = params;

  const meta: SpecializationMeta = {
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

  if (!specInput.name && !specInput.emoji && !specInput.description) {
    return meta;
  }

  meta.requested = true;
  const baseFiles = await readWorkspaceFiles(workspaceDir);
  const deterministic = buildDeterministicSpecialization(baseFiles, specInput);
  const finalFiles: WorkspaceMap = { ...deterministic };
  meta.fallbackApplied = Object.keys(deterministic).length > 0;

  try {
    meta.aiAttempted = true;
    const ai = await requestAISpecialization(baseFiles, specInput, opalUrl);
    if (ai?.summary) meta.summary = ai.summary;
    if (ai?.tools) meta.suggestedTools = ai.tools;
    if (ai?.skills) meta.suggestedSkills = ai.skills;

    const aiFiles = ai?.files || {};
    for (const [filename, content] of Object.entries(aiFiles)) {
      if (!SPECIALIZABLE_FILES.includes(filename as (typeof SPECIALIZABLE_FILES)[number])) continue;
      if (typeof content !== "string" || !content.trim()) continue;

      const original = baseFiles[filename] || "";
      if (changeRatio(original, content) > MAX_AI_CHANGE_RATIO) continue;

      finalFiles[filename] = content;
      meta.aiApplied = true;
    }
  } catch (aiErr: any) {
    meta.warning = aiErr?.message || "AI specialization failed; fallback edits applied.";
  }

  if (meta.suggestedTools.length) {
    const current = finalFiles["TOOLS.md"] || baseFiles["TOOLS.md"] || "# TOOLS.md\n";
    finalFiles["TOOLS.md"] = ensureBullets(current, "Specialized Tools", meta.suggestedTools);
  }
  if (meta.suggestedSkills.length) {
    const current = finalFiles["AGENTS.md"] || baseFiles["AGENTS.md"] || "# AGENTS.md\n";
    finalFiles["AGENTS.md"] = ensureBullets(current, "Specialized Skills", meta.suggestedSkills);
  }

  for (const [filename, content] of Object.entries(finalFiles)) {
    if (typeof content !== "string") continue;
    await writeFile(path.join(workspaceDir, filename), content, "utf-8");
  }

  meta.filesUpdated = Object.keys(finalFiles);
  return meta;
}
