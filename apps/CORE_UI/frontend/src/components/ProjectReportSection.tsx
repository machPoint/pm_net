"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Bot,
  Wrench,
  Shield,
  Copy,
  ChevronDown,
  ChevronRight,
  TerminalSquare,
  ListTodo,
  Activity,
  Package,
  PanelRightClose,
  PanelRightOpen,
  Calendar,
  Hash,
  CircleDot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { canonicalTaskStatus, isDoneStatus, isInProgressStatus, taskStatusLabel } from "@/utils/workflow-status";

const API_BASE = "/api/opal/proxy";

// ============================================================================
// Types
// ============================================================================

interface Project {
  id: string;
  node_type: string;
  title: string;
  description?: string;
  status: string;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

interface ReportTask {
  id: string;
  title: string;
  status: string;
  metadata?: Record<string, any>;
  agents: string[];
}

interface ExecutionStep {
  step_order: number;
  action: string;
  tool: string | null;
  output: string;
  success: boolean;
  duration_ms: number;
  source: string;
  tool_calls: string[];
  model?: string;
}

interface RunBundle {
  session_id: string;
  stage: string;
  task_id: string;
  task_title: string;
  run_id: string | null;
  plan_id: string | null;
  gate_id: string | null;
  agent_id: string;
  updated_at?: string;
  messages: Array<{ role: string; content: string; stage: string; timestamp: string }>;
  execution_steps: ExecutionStep[];
  plan_steps: Array<{ order: number; action: string; expected_outcome?: string; tool?: string | null; step_type?: string }>;
}

interface Approval {
  id: string;
  title: string;
  status: string;
  step_order?: number | null;
  task_id?: string | null;
  run_id?: string | null;
  metadata?: Record<string, any>;
}

interface Artifact {
  id: string;
  node_type: string;
  title: string;
  status: string;
  description?: string;
  metadata?: Record<string, any>;
}

interface ProjectReport {
  project: Project;
  tasks: ReportTask[];
  runs: RunBundle[];
  approvals: Approval[];
  artifacts: Artifact[];
  markdown_refs: string[];
  stats: {
    task_count: number;
    tasks_done: number;
    tasks_in_progress: number;
    total_steps: number;
    steps_passed: number;
    steps_failed: number;
    total_duration_ms: number;
  };
}

interface HierarchyTreeNode {
  node: any;
  children?: HierarchyTreeNode[];
}

// ============================================================================
// Helpers
// ============================================================================

function extractTasksFromTree(tree: HierarchyTreeNode | null | undefined): any[] {
  if (!tree) return [];
  const out: any[] = [];
  const stack: HierarchyTreeNode[] = [tree];
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current?.node?.node_type === "task") out.push(current.node);
    if (Array.isArray(current?.children)) {
      for (const child of current.children) stack.push(child);
    }
  }
  return out;
}

function extractTaskAgents(task: any): string[] {
  const meta = task?.metadata || {};
  if (Array.isArray(meta.assigned_agents)) {
    return meta.assigned_agents.map((a: any) => (typeof a === "string" ? a : a?.name || a?.id || "")).filter(Boolean);
  }
  if (Array.isArray(meta.assignees)) {
    return meta.assignees.map((a: any) => (typeof a === "string" ? a : a?.name || a?.id || "")).filter(Boolean);
  }
  if (meta.assigned_agent) return [String(meta.assigned_agent)];
  if (meta.execution_agent_id) return [String(meta.execution_agent_id)];
  if (meta.agent_id) return [String(meta.agent_id)];
  return [];
}

function collectMarkdownRefs(input: any, out: Set<string>) {
  if (input == null) return;
  if (typeof input === "string") {
    const matches = input.match(/(?:[A-Za-z0-9._~\-\/]+\.md)\b/g);
    if (matches) for (const m of matches) out.add(m);
    return;
  }
  if (Array.isArray(input)) { for (const item of input) collectMarkdownRefs(item, out); return; }
  if (typeof input === "object") { for (const v of Object.values(input)) collectMarkdownRefs(v, out); }
}

// ============================================================================
// Component
// ============================================================================

export default function ProjectReportSection({
  projectId,
  onBack,
}: {
  projectId: string;
  onBack?: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ProjectReport | null>(null);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Load project node
      const projectRes = await fetch(`${API_BASE}/api/nodes/${projectId}`);
      if (!projectRes.ok) throw new Error("Project not found");
      const project = await projectRes.json();

      // 2. Load hierarchy tree to get tasks
      const treeRes = await fetch(`${API_BASE}/api/hierarchy/tree/${projectId}?depth=6`);
      if (!treeRes.ok) throw new Error("Failed to load project hierarchy");
      const treeData = await treeRes.json();
      const rawTasks = extractTasksFromTree(treeData?.node ? treeData : null);
      const tasks: ReportTask[] = rawTasks.map((t: any) => ({
        id: String(t.id),
        title: String(t.title || "Untitled Task"),
        status: canonicalTaskStatus(t.status || "backlog"),
        metadata: t.metadata || {},
        agents: extractTaskAgents(t),
      }));

      const taskIds = new Set(tasks.map((t) => t.id));

      // 3. Find intake sessions linked to tasks
      const sessionIds = Array.from(new Set(
        tasks.map((t) => String(t.metadata?.session_id || "").trim()).filter(Boolean)
      ));

      // Also try to find sessions by listing all and matching task_ids
      let allSessions: any[] = [];
      try {
        const sessRes = await fetch(`${API_BASE}/api/task-intake/sessions`);
        if (sessRes.ok) {
          const sessData = await sessRes.json();
          allSessions = Array.isArray(sessData?.sessions) ? sessData.sessions : [];
        }
      } catch { /* ignore */ }

      // Add sessions that reference our tasks
      for (const sess of allSessions) {
        if (sess.task_id && taskIds.has(sess.task_id) && !sessionIds.includes(sess.id)) {
          sessionIds.push(sess.id);
        }
      }

      // 4. Load run bundles from sessions
      const runBundlesRaw = await Promise.all(
        sessionIds.map(async (id) => {
          try {
            const [sessionRes, resultsRes] = await Promise.all([
              fetch(`${API_BASE}/api/task-intake/sessions/${id}`),
              fetch(`${API_BASE}/api/task-intake/sessions/${id}/execution-results`),
            ]);
            if (!sessionRes.ok) return null;
            const sessionData = await sessionRes.json();
            const resultsData = resultsRes.ok ? await resultsRes.json() : { ok: false, steps: [] };
            if (!sessionData?.ok) return null;

            const session = sessionData.session || {};
            const task = sessionData.task || {};
            const plan = sessionData.plan || {};

            return {
              session_id: String(session.id || id),
              stage: String(session.stage || "unknown"),
              task_id: String(task.id || session.task_id || ""),
              task_title: String(task.title || "Untitled Task"),
              run_id: session.run_id || null,
              plan_id: session.plan_id || null,
              gate_id: session.gate_id || null,
              agent_id: session.agent_id || "main",
              updated_at: session.updated_at,
              messages: Array.isArray(session.messages) ? session.messages : [],
              execution_steps: Array.isArray(resultsData?.steps) ? resultsData.steps : [],
              plan_steps: Array.isArray(plan?.metadata?.steps) ? plan.metadata.steps : [],
            } as RunBundle;
          } catch { return null; }
        })
      );

      const runs: RunBundle[] = runBundlesRaw
        .filter((item): item is RunBundle => Boolean(item))
        .filter((item) => !item.task_id || taskIds.has(item.task_id));

      const runIds = new Set(runs.map((r) => String(r.run_id || "")).filter(Boolean));

      // 5. Load gates/approvals
      let approvals: Approval[] = [];
      try {
        const gatesRes = await fetch(`${API_BASE}/api/nodes?node_type=gate&limit=500`);
        if (gatesRes.ok) {
          const gatesData = await gatesRes.json();
          approvals = (Array.isArray(gatesData?.nodes) ? gatesData.nodes : [])
            .filter((gate: any) => {
              const tId = String(gate?.metadata?.task_id || "");
              const rId = String(gate?.metadata?.run_id || "");
              return (tId && taskIds.has(tId)) || (rId && runIds.has(rId));
            })
            .map((gate: any) => ({
              id: String(gate.id),
              title: String(gate.title || "Approval Gate"),
              status: String(gate.status || "unknown"),
              step_order: typeof gate?.metadata?.step_order === "number" ? gate.metadata.step_order : null,
              task_id: gate?.metadata?.task_id || null,
              run_id: gate?.metadata?.run_id || null,
              metadata: gate.metadata,
            }));
        }
      } catch { /* ignore */ }

      // 6. Load artifacts via edges
      const artifactIds = new Set<string>();
      for (const run of runs) {
        if (run.plan_id) artifactIds.add(run.plan_id);
        if (run.gate_id) artifactIds.add(run.gate_id);
        if (run.run_id) artifactIds.add(run.run_id);
      }

      try {
        const edgeFetches = [...taskIds, ...Array.from(runIds)].map(async (nodeId) => {
          const [sRes, tRes] = await Promise.all([
            fetch(`${API_BASE}/api/edges?source_node_id=${nodeId}&limit=500`),
            fetch(`${API_BASE}/api/edges?target_node_id=${nodeId}&limit=500`),
          ]);
          const s = sRes.ok ? await sRes.json() : { edges: [] };
          const t = tRes.ok ? await tRes.json() : { edges: [] };
          return [...(s.edges || []), ...(t.edges || [])];
        });
        const allEdges = (await Promise.all(edgeFetches)).flat();
        for (const edge of allEdges) {
          const src = String(edge?.source_node_id || "");
          const tgt = String(edge?.target_node_id || "");
          if (src && !taskIds.has(src) && !runIds.has(src) && src !== projectId) artifactIds.add(src);
          if (tgt && !taskIds.has(tgt) && !runIds.has(tgt) && tgt !== projectId) artifactIds.add(tgt);
        }
      } catch { /* ignore */ }

      const artifactNodesRaw = await Promise.all(
        Array.from(artifactIds).map(async (id) => {
          try {
            const res = await fetch(`${API_BASE}/api/nodes/${id}`);
            if (!res.ok) return null;
            return await res.json();
          } catch { return null; }
        })
      );

      const artifacts: Artifact[] = artifactNodesRaw
        .filter((n): n is any => Boolean(n))
        .filter((node) => !["project", "phase", "task", "program", "mission"].includes(String(node.node_type || "")))
        .map((node) => ({
          id: String(node.id),
          node_type: String(node.node_type || "unknown"),
          title: String(node.title || node.id),
          status: String(node.status || "unknown"),
          description: node.description,
          metadata: node.metadata,
        }));

      // 7. Collect markdown references
      const mdRefs = new Set<string>();
      collectMarkdownRefs(project, mdRefs);
      collectMarkdownRefs(tasks, mdRefs);
      collectMarkdownRefs(runs, mdRefs);
      collectMarkdownRefs(artifacts, mdRefs);

      // 8. Compute stats
      const allSteps = runs.flatMap((r) => r.execution_steps);
      const stats = {
        task_count: tasks.length,
        tasks_done: tasks.filter((t) => isDoneStatus(t.status)).length,
        tasks_in_progress: tasks.filter((t) => isInProgressStatus(t.status)).length,
        total_steps: allSteps.length,
        steps_passed: allSteps.filter((s) => s.success).length,
        steps_failed: allSteps.filter((s) => !s.success).length,
        total_duration_ms: allSteps.reduce((sum, s) => sum + (s.duration_ms || 0), 0),
      };

      setReport({
        project,
        tasks,
        runs,
        approvals,
        artifacts,
        markdown_refs: Array.from(mdRefs).sort(),
        stats,
      });

    } catch (err: any) {
      setError(err.message || "Failed to load project report");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) loadReport();
  }, [projectId, loadReport]);

  const completionPct = useMemo(() => {
    if (!report || report.stats.task_count === 0) return 0;
    return Math.round((report.stats.tasks_done / report.stats.task_count) * 100);
  }, [report]);

  const uniqueAgents = useMemo(() => {
    if (!report) return [];
    const set = new Set<string>();
    for (const t of report.tasks) for (const a of t.agents) set.add(a);
    for (const r of report.runs) if (r.agent_id) set.add(r.agent_id);
    return Array.from(set).sort();
  }, [report]);

  const [activeTab, setActiveTab] = useState<"overview" | "execution" | "artifacts" | "activity">("overview");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [expandedArtifacts, setExpandedArtifacts] = useState<Set<string>>(new Set());

  const toggleStep = (key: string) => setExpandedSteps((prev) => { const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next; });
  const toggleArtifact = (id: string) => setExpandedArtifacts((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });

  // Build a unified activity timeline
  const activityTimeline = useMemo(() => {
    if (!report) return [];
    const items: Array<{ ts: string; type: string; title: string; detail?: string; status?: string }> = [];
    for (const gate of report.approvals) {
      items.push({ ts: gate.metadata?.created_at || gate.metadata?.approved_at || "", type: "approval", title: gate.title, detail: gate.id, status: gate.status });
    }
    for (const run of report.runs) {
      for (const msg of run.messages) {
        items.push({ ts: msg.timestamp, type: "message", title: `${msg.role} (${msg.stage})`, detail: msg.content });
      }
    }
    items.sort((a, b) => new Date(b.ts || 0).getTime() - new Date(a.ts || 0).getTime());
    return items;
  }, [report]);

  // ── Loading / Error ──────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full gap-2 text-[var(--color-text-secondary)]">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Loading project report...</span>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive max-w-md text-center">
          {error || "No report data available."}
        </div>
        {onBack && (
          <Button variant="outline" onClick={onBack} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Projects
          </Button>
        )}
      </div>
    );
  }

  const STATUS_COLORS: Record<string, string> = {
    complete: "text-emerald-400 bg-emerald-500/15 border-emerald-500/30",
    active: "text-blue-400 bg-blue-500/15 border-blue-500/30",
    planning: "text-violet-400 bg-violet-500/15 border-violet-500/30",
    cancelled: "text-red-400 bg-red-500/15 border-red-500/30",
    on_hold: "text-amber-400 bg-amber-500/15 border-amber-500/30",
  };
  const statusCls = STATUS_COLORS[report.project.status] || "text-zinc-400 bg-zinc-500/15 border-zinc-500/30";

  // ── Tabs ─────────────────────────────────────────────────────────────

  const TABS: Array<{ id: typeof activeTab; label: string; icon: React.ReactNode; count?: number }> = [
    { id: "overview", label: "Overview", icon: <ListTodo className="w-3.5 h-3.5" /> },
    { id: "execution", label: "Execution Log", icon: <TerminalSquare className="w-3.5 h-3.5" />, count: report.runs.reduce((s, r) => s + r.execution_steps.length, 0) },
    { id: "artifacts", label: "Artifacts", icon: <Package className="w-3.5 h-3.5" />, count: report.artifacts.length + report.markdown_refs.length },
    { id: "activity", label: "Activity", icon: <Activity className="w-3.5 h-3.5" />, count: activityTimeline.length },
  ];

  // ── Render ───────────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* ── Top header bar ─────────────────────────────────────────── */}
      <div className="flex-shrink-0 border-b border-border bg-[var(--color-card)]/80 px-5 py-3">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <CircleDot className="w-4 h-4 text-primary flex-shrink-0" />
            <h1 className="text-base font-semibold text-[var(--color-text-primary)] truncate">
              {report.project.title}
            </h1>
            <Badge variant="outline" className={cn("text-[10px] font-medium rounded-full px-2", statusCls)}>
              {report.project.status}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-[var(--color-text-secondary)]"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* ── Tab bar ────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 border-b border-border bg-[var(--color-card)]/40 px-5">
        <div className="flex gap-0">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors",
                activeTab === tab.id
                  ? "border-primary text-[var(--color-text-primary)]"
                  : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              )}
            >
              {tab.icon}
              {tab.label}
              {typeof tab.count === "number" && tab.count > 0 && (
                <span className="text-[10px] bg-muted/60 rounded-full px-1.5 py-0.5 min-w-[18px] text-center">{tab.count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main content + sidebar ─────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main scrollable area */}
        <ScrollArea className="flex-1">
          <div className="p-5 max-w-4xl">
            {activeTab === "overview" && <OverviewTab report={report} completionPct={completionPct} />}
            {activeTab === "execution" && <ExecutionTab report={report} expandedSteps={expandedSteps} toggleStep={toggleStep} />}
            {activeTab === "artifacts" && <ArtifactsTab report={report} expandedArtifacts={expandedArtifacts} toggleArtifact={toggleArtifact} />}
            {activeTab === "activity" && <ActivityTab timeline={activityTimeline} />}
          </div>
        </ScrollArea>

        {/* Right sidebar */}
        {sidebarOpen && (
          <div className="w-[280px] flex-shrink-0 border-l border-border bg-[var(--color-card)]/40 overflow-y-auto">
            <SidebarPanel report={report} completionPct={completionPct} uniqueAgents={uniqueAgents} />
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Sidebar
// ============================================================================

function SidebarPanel({ report, completionPct, uniqueAgents }: { report: ProjectReport; completionPct: number; uniqueAgents: string[] }) {
  return (
    <div className="p-4 space-y-5 text-xs">
      {/* Progress */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[var(--color-text-secondary)] font-medium">Progress</span>
          <span className="text-[var(--color-text-primary)] font-semibold">{completionPct}%</span>
        </div>
        <Progress value={completionPct} className="h-1.5" />
      </div>

      {/* Properties */}
      <div className="space-y-3">
        <SidebarRow icon={<CircleDot className="w-3.5 h-3.5" />} label="Status" value={report.project.status} />
        <SidebarRow icon={<Hash className="w-3.5 h-3.5" />} label="Priority" value={report.project.metadata?.priority || "medium"} />
        {report.project.created_at && (
          <SidebarRow icon={<Calendar className="w-3.5 h-3.5" />} label="Created" value={new Date(report.project.created_at).toLocaleDateString()} />
        )}
        {report.project.updated_at && (
          <SidebarRow icon={<Calendar className="w-3.5 h-3.5" />} label="Updated" value={new Date(report.project.updated_at).toLocaleDateString()} />
        )}
      </div>

      <div className="border-t border-border/50" />

      {/* Stats */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-wide text-[var(--color-text-secondary)] font-medium">Metrics</p>
        <div className="grid grid-cols-2 gap-2">
          <MiniStat label="Tasks" value={report.stats.task_count} />
          <MiniStat label="Done" value={report.stats.tasks_done} color="text-emerald-400" />
          <MiniStat label="Steps" value={report.stats.total_steps} />
          <MiniStat label="Passed" value={report.stats.steps_passed} color="text-emerald-400" />
          <MiniStat label="Failed" value={report.stats.steps_failed} color="text-red-400" />
          <MiniStat label="Duration" value={report.stats.total_duration_ms > 0 ? `${(report.stats.total_duration_ms / 1000).toFixed(0)}s` : "-"} />
        </div>
      </div>

      <div className="border-t border-border/50" />

      {/* Agents */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-wide text-[var(--color-text-secondary)] font-medium">Agents</p>
        {uniqueAgents.length === 0 ? (
          <p className="text-[var(--color-text-secondary)]">No agents assigned</p>
        ) : (
          <div className="space-y-1">
            {uniqueAgents.map((a) => (
              <div key={a} className="flex items-center gap-2 py-1">
                <Bot className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" />
                <span className="text-[var(--color-text-primary)]">{a}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-border/50" />

      {/* Runs */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-wide text-[var(--color-text-secondary)] font-medium">Runs</p>
        {report.runs.length === 0 ? (
          <p className="text-[var(--color-text-secondary)]">No execution runs</p>
        ) : (
          <div className="space-y-1.5">
            {report.runs.map((run) => (
              <div key={run.session_id} className="rounded border border-border px-2.5 py-1.5 bg-[var(--color-background)]/50">
                <p className="text-[var(--color-text-primary)] font-medium truncate">{run.task_title}</p>
                <p className="text-[10px] text-[var(--color-text-secondary)]">{run.stage} • {run.execution_steps.length} steps</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ID */}
      <div className="border-t border-border/50 pt-3">
        <p className="text-[10px] text-[var(--color-text-secondary)] font-mono break-all">{report.project.id}</p>
      </div>
    </div>
  );
}

function SidebarRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
        {icon}
        <span>{label}</span>
      </div>
      <span className="text-[var(--color-text-primary)] font-medium truncate max-w-[120px]">{value}</span>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <div className="rounded border border-border px-2 py-1.5 bg-[var(--color-background)]/50">
      <p className="text-[10px] text-[var(--color-text-secondary)]">{label}</p>
      <p className={cn("text-sm font-semibold", color || "text-[var(--color-text-primary)]")}>{value}</p>
    </div>
  );
}

// ============================================================================
// Overview Tab
// ============================================================================

function OverviewTab({ report, completionPct }: { report: ProjectReport; completionPct: number }) {
  return (
    <div className="space-y-6">
      {/* Description */}
      {report.project.description && (
        <div className="prose prose-sm prose-invert max-w-none text-[var(--color-text-primary)]">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{report.project.description}</ReactMarkdown>
        </div>
      )}
      {!report.project.description && (
        <p className="text-sm text-[var(--color-text-secondary)] italic">No project description.</p>
      )}

      {/* Progress summary */}
      <div className="rounded-lg border border-border p-4 bg-[var(--color-card)]/60">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-[var(--color-text-primary)]">Completion</span>
          <span className="text-sm font-semibold text-[var(--color-text-primary)]">{completionPct}%</span>
        </div>
        <Progress value={completionPct} className="h-2 mb-3" />
        <div className="flex gap-4 text-xs text-[var(--color-text-secondary)]">
          <span>{report.stats.tasks_done} of {report.stats.task_count} tasks done</span>
          {report.stats.tasks_in_progress > 0 && <span>{report.stats.tasks_in_progress} in progress</span>}
        </div>
      </div>

      {/* Work packages / tasks */}
      <div>
        <h3 className="text-sm font-medium text-[var(--color-text-primary)] mb-3">Work Packages</h3>
        {report.tasks.length === 0 ? (
          <p className="text-xs text-[var(--color-text-secondary)]">No work packages linked to this project.</p>
        ) : (
          <div className="space-y-1">
            {report.tasks.map((task) => (
              <div key={task.id} className="flex items-center gap-3 py-2 px-3 rounded hover:bg-muted/20 transition-colors group">
                <StatusDot status={task.status} />
                <span className="text-sm text-[var(--color-text-primary)] flex-1 truncate">{task.title}</span>
                {task.agents.length > 0 && (
                  <span className="text-[10px] text-[var(--color-text-secondary)] flex-shrink-0">{task.agents.join(", ")}</span>
                )}
                <Badge variant="outline" className="text-[10px] flex-shrink-0">{taskStatusLabel(task.status)}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Plan steps from first run */}
      {report.runs.length > 0 && report.runs[0].plan_steps.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-[var(--color-text-primary)] mb-3">Execution Plan</h3>
          <div className="space-y-0.5">
            {report.runs[0].plan_steps.map((ps) => {
              const matchingStep = report.runs[0].execution_steps.find((s) => s.step_order === ps.order);
              return (
                <div key={ps.order} className="flex items-start gap-3 py-2 px-3 rounded hover:bg-muted/20 transition-colors">
                  <span className="text-xs font-mono text-[var(--color-text-secondary)] w-5 text-right flex-shrink-0 pt-0.5">{ps.order}</span>
                  {matchingStep ? (
                    matchingStep.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  ) : ps.step_type === "approval_gate" ? (
                    <Shield className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <CircleDot className="w-4 h-4 text-[var(--color-text-secondary)] flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[var(--color-text-primary)]">{ps.action}</p>
                    {ps.expected_outcome && <p className="text-[11px] text-[var(--color-text-secondary)] mt-0.5">{ps.expected_outcome}</p>}
                  </div>
                  {ps.tool && (
                    <Badge variant="outline" className="text-[9px] h-5 gap-0.5 flex-shrink-0">
                      <Wrench className="w-2.5 h-2.5" />{ps.tool}
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Execution Log Tab
// ============================================================================

function ExecutionTab({ report, expandedSteps, toggleStep }: { report: ProjectReport; expandedSteps: Set<string>; toggleStep: (k: string) => void }) {
  const allSteps = report.runs.flatMap((run) =>
    run.execution_steps.map((step) => ({ ...step, session_id: run.session_id, task_title: run.task_title, agent_id: run.agent_id }))
  );

  if (allSteps.length === 0) {
    return <p className="text-sm text-[var(--color-text-secondary)] py-8 text-center">No execution output recorded for this project.</p>;
  }

  return (
    <div className="space-y-1">
      {allSteps.map((step) => {
        const stepKey = `${step.session_id}-${step.step_order}`;
        const isOpen = expandedSteps.has(stepKey);
        return (
          <div key={stepKey} className="group">
            {/* Step row */}
            <button
              className="w-full flex items-center gap-3 py-2.5 px-3 rounded hover:bg-muted/20 transition-colors text-left"
              onClick={() => toggleStep(stepKey)}
            >
              {step.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              )}
              <span className="text-xs font-mono text-[var(--color-text-secondary)] w-5 text-right flex-shrink-0">{step.step_order}</span>
              <span className="text-sm text-[var(--color-text-primary)] flex-1 truncate">{step.action}</span>
              <div className="flex items-center gap-1.5 flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                {step.tool && (
                  <span className="text-[10px] text-[var(--color-text-secondary)]">{step.tool}</span>
                )}
                <span className="text-[10px] text-[var(--color-text-secondary)]">{(step.duration_ms / 1000).toFixed(1)}s</span>
                {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" /> : <ChevronRight className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" />}
              </div>
            </button>

            {/* Expanded output */}
            {isOpen && (
              <div className="ml-12 mr-3 mb-3 space-y-2">
                {/* Meta line */}
                <div className="flex flex-wrap gap-3 text-[10px] text-[var(--color-text-secondary)]">
                  {step.source && <span>Source: {step.source}</span>}
                  {step.model && <span>Model: {step.model}</span>}
                  {step.tool_calls.length > 0 && <span>Tool calls: {step.tool_calls.join(", ")}</span>}
                  <span>Agent: {step.agent_id}</span>
                </div>

                {/* Output block */}
                <div className="rounded-lg border border-border bg-[var(--color-background)] p-4 text-sm leading-relaxed prose prose-sm prose-invert max-w-none max-h-[600px] overflow-y-auto prose-headings:text-[var(--color-text-primary)] prose-p:text-[var(--color-text-primary)] prose-li:text-[var(--color-text-primary)] prose-strong:text-[var(--color-text-primary)] prose-a:text-primary prose-code:text-xs prose-pre:bg-muted/30 prose-pre:border prose-pre:border-border">
                  {step.output ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{step.output}</ReactMarkdown>
                  ) : (
                    <p className="text-[var(--color-text-secondary)] italic">(no output captured)</p>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// Artifacts Tab
// ============================================================================

function ArtifactsTab({ report, expandedArtifacts, toggleArtifact }: { report: ProjectReport; expandedArtifacts: Set<string>; toggleArtifact: (id: string) => void }) {
  return (
    <div className="space-y-6">
      {/* Graph artifacts */}
      {report.artifacts.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-[var(--color-text-primary)] mb-3">Graph Nodes</h3>
          <div className="space-y-1">
            {report.artifacts.map((artifact) => {
              const isOpen = expandedArtifacts.has(artifact.id);
              return (
                <div key={artifact.id}>
                  <button
                    className="w-full flex items-center gap-3 py-2 px-3 rounded hover:bg-muted/20 transition-colors text-left"
                    onClick={() => toggleArtifact(artifact.id)}
                  >
                    <Package className="w-4 h-4 text-[var(--color-text-secondary)] flex-shrink-0" />
                    <span className="text-sm text-[var(--color-text-primary)] flex-1 truncate">{artifact.title}</span>
                    <Badge variant="outline" className="text-[9px] h-5">{artifact.node_type}</Badge>
                    <Badge variant="outline" className="text-[9px] h-5">{artifact.status}</Badge>
                    {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" /> : <ChevronRight className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" />}
                  </button>
                  {isOpen && (
                    <div className="ml-10 mr-3 mb-2 space-y-1.5">
                      <p className="text-[10px] text-[var(--color-text-secondary)] font-mono">{artifact.id}</p>
                      {artifact.description && <p className="text-xs text-[var(--color-text-primary)]">{artifact.description}</p>}
                      {artifact.metadata && Object.keys(artifact.metadata).length > 0 && (
                        <pre className="text-[10px] text-[var(--color-text-primary)] whitespace-pre-wrap break-words max-h-48 overflow-y-auto bg-[var(--color-background)] rounded border border-border p-2.5">
                          {JSON.stringify(artifact.metadata, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Markdown references */}
      {report.markdown_refs.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-[var(--color-text-primary)]">Markdown Files</h3>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-[10px] gap-1 text-[var(--color-text-secondary)]"
              onClick={async () => {
                await navigator.clipboard.writeText(report.markdown_refs.join("\n"));
                toast.success("Copied to clipboard");
              }}
            >
              <Copy className="w-3 h-3" /> Copy all
            </Button>
          </div>
          <div className="space-y-1">
            {report.markdown_refs.map((ref) => (
              <div key={ref} className="flex items-center gap-3 py-1.5 px-3 rounded hover:bg-muted/20 transition-colors">
                <FileText className="w-4 h-4 text-[var(--color-text-secondary)] flex-shrink-0" />
                <span className="text-sm text-[var(--color-text-primary)] font-mono break-all">{ref}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {report.artifacts.length === 0 && report.markdown_refs.length === 0 && (
        <p className="text-sm text-[var(--color-text-secondary)] py-8 text-center">No artifacts found for this project.</p>
      )}
    </div>
  );
}

// ============================================================================
// Activity Tab
// ============================================================================

function ActivityTab({ timeline }: { timeline: Array<{ ts: string; type: string; title: string; detail?: string; status?: string }> }) {
  if (timeline.length === 0) {
    return <p className="text-sm text-[var(--color-text-secondary)] py-8 text-center">No activity recorded.</p>;
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-[19px] top-3 bottom-3 w-px bg-border" />

      <div className="space-y-0">
        {timeline.map((item, i) => (
          <div key={i} className="flex gap-3 py-2.5 px-1 relative">
            <div className={cn(
              "w-[10px] h-[10px] rounded-full border-2 flex-shrink-0 mt-1.5 z-10",
              item.type === "approval" ? "border-amber-400 bg-amber-400/20" : "border-border bg-[var(--color-card)]"
            )} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[var(--color-text-primary)]">{item.title}</span>
                {item.status && (
                  <Badge variant="outline" className={cn("text-[9px] h-4",
                    item.status === "approved" && "text-emerald-400 border-emerald-400/40",
                    item.status === "rejected" && "text-red-400 border-red-400/40",
                    item.status === "pending_approval" && "text-amber-400 border-amber-400/40",
                  )}>{item.status}</Badge>
                )}
                {item.ts && <span className="text-[10px] text-[var(--color-text-secondary)] ml-auto flex-shrink-0">{new Date(item.ts).toLocaleString()}</span>}
              </div>
              {item.detail && (
                <p className="text-xs text-[var(--color-text-secondary)] mt-0.5 line-clamp-3 whitespace-pre-wrap">{item.detail}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Shared
// ============================================================================

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    done: "bg-emerald-400",
    complete: "bg-emerald-400",
    in_progress: "bg-blue-400",
    active: "bg-blue-400",
    backlog: "bg-zinc-500",
    planning: "bg-violet-400",
    open: "bg-zinc-500",
  };
  return <div className={cn("w-2 h-2 rounded-full flex-shrink-0", colors[status] || "bg-zinc-500")} />;
}
