export function canonicalTaskStatus(status?: string | null): string {
  const raw = String(status || "").trim().toLowerCase();
  if (!raw) return "backlog";

  if (["done", "complete", "completed", "approved"].includes(raw)) return "done";
  if (["in_progress", "in-progress", "active", "running"].includes(raw)) return "in_progress";
  if (["review", "pending"].includes(raw)) return "review";
  if (["todo", "not_started", "not-started", "new", "backlog"].includes(raw)) return "backlog";

  return raw;
}

export function isDoneStatus(status?: string | null): boolean {
  return canonicalTaskStatus(status) === "done";
}

export function isInProgressStatus(status?: string | null): boolean {
  return canonicalTaskStatus(status) === "in_progress";
}

export function taskStatusLabel(status?: string | null): string {
  const normalized = canonicalTaskStatus(status);

  if (normalized === "done") return "Done";
  if (normalized === "in_progress") return "In progress";
  if (normalized === "review") return "Waiting review";
  if (normalized === "backlog") return "Not started";

  return normalized
    .split("_")
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
}
