"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import {
  FolderKanban,
  Plus,
  Loader2,
  CheckCircle2,
  Clock,
  PauseCircle,
  XCircle,
  Search,
  BarChart3,
  X,
  Pencil,
  Trash2,
  ListTodo,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Bot,
  Link2,
  FileText,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
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

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border px-2 py-2 bg-[var(--color-background)]/50">
      <p className="text-[10px] uppercase tracking-wide text-[var(--color-text-secondary)]">{label}</p>
      <p className="text-sm font-semibold text-[var(--color-text-primary)]">{value}</p>
    </div>
  );
}

interface ProjectWithStats extends Project {
  task_count: number;
  tasks_done: number;
  tasks_in_progress: number;
}

interface ProjectTaskSummary {
  id: string;
  title: string;
  status: string;
  agents: string[];
}

interface ProjectExpandedDetails {
  tasks: ProjectTaskSummary[];
  unique_agents: string[];
}

interface DossierExecutionStep {
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

interface ProjectRunBundle {
  session_id: string;
  stage: string;
  task_id: string;
  task_title: string;
  run_id: string | null;
  plan_id: string | null;
  gate_id: string | null;
  updated_at?: string;
  execution_steps: DossierExecutionStep[];
}

interface ProjectDossier {
  project: ProjectWithStats;
  tasks: Array<{ id: string; title: string; status: string; metadata?: Record<string, any> }>;
  runs: ProjectRunBundle[];
  approvals: Array<{ id: string; title: string; status: string; step_order?: number | null; task_id?: string | null; run_id?: string | null }>;
  artifacts: Array<{ id: string; node_type: string; title: string; status: string; description?: string; metadata?: Record<string, any> }>;
  markdown_refs: string[];
}

interface HierarchyTreeNode {
  node: any;
  children?: HierarchyTreeNode[];
}

// ============================================================================
// Status config
// ============================================================================

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string; icon: any }> = {
  planning:    { label: "Planning",     color: "text-blue-400",    bg: "bg-blue-500/15 border-blue-500/30",    dot: "#60a5fa", icon: Clock },
  active:      { label: "Active",       color: "text-green-400",   bg: "bg-green-500/15 border-green-500/30",   dot: "#4ade80", icon: BarChart3 },
  on_hold:     { label: "On Hold",      color: "text-amber-400",   bg: "bg-amber-500/15 border-amber-500/30",   dot: "#fbbf24", icon: PauseCircle },
  complete:    { label: "Complete",     color: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/30", dot: "#34d399", icon: CheckCircle2 },
  cancelled:   { label: "Cancelled",    color: "text-red-400",     bg: "bg-red-500/15 border-red-500/30",       dot: "#f87171", icon: XCircle },
  not_started: { label: "Not Started",  color: "text-zinc-400",    bg: "bg-zinc-500/15 border-zinc-500/30",     dot: "#a1a1aa", icon: Clock },
  in_progress: { label: "In Progress",  color: "text-blue-400",    bg: "bg-blue-500/15 border-blue-500/30",     dot: "#60a5fa", icon: BarChart3 },
  backlog:     { label: "Backlog",      color: "text-zinc-400",    bg: "bg-zinc-500/15 border-zinc-500/30",     dot: "#a1a1aa", icon: Clock },
  done:        { label: "Done",         color: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/30", dot: "#34d399", icon: CheckCircle2 },
};

const CATEGORIES = [
  "Marketing",
  "Development",
  "Design",
  "Content",
  "Operations",
  "Sales",
  "Research",
  "Other",
];

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.planning;
  return (
    <Badge
      variant="outline"
      className={cn("text-[11px] font-medium gap-1.5 px-2.5 py-0.5 rounded-full", cfg.bg, cfg.color)}
    >
      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.dot }} />
      {cfg.label}
    </Badge>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function ProjectsSection({
  selectedProjectId,
  onSelectProject,
  onNavigate,
  onScheduleNow,
  onOpenReport,
}: {
  selectedProjectId?: string;
  onSelectProject?: (projectId: string) => void;
  onNavigate?: (tab: string) => void;
  onScheduleNow?: (projectId: string) => void;
  onOpenReport?: (projectId: string) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<ProjectWithStats[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Detail popup
  const [selectedProject, setSelectedProject] = useState<ProjectWithStats | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Create/Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCategory, setFormCategory] = useState("Other");
  const [formStatus, setFormStatus] = useState("planning");
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
  const [expandedDetails, setExpandedDetails] = useState<Record<string, ProjectExpandedDetails>>({});
  const [loadingExpandedId, setLoadingExpandedId] = useState<string | null>(null);
  const [dossierOpen, setDossierOpen] = useState(false);
  const [dossierLoading, setDossierLoading] = useState(false);
  const [dossierError, setDossierError] = useState<string | null>(null);
  const [dossierData, setDossierData] = useState<ProjectDossier | null>(null);

  const collectMarkdownRefs = useCallback((input: any, out: Set<string>) => {
    if (input == null) return;

    if (typeof input === "string") {
      const matches = input.match(/(?:[A-Za-z0-9._~\-\/]+\.md)\b/g);
      if (matches) {
        for (const match of matches) out.add(match);
      }
      return;
    }

    if (Array.isArray(input)) {
      for (const item of input) collectMarkdownRefs(item, out);
      return;
    }

    if (typeof input === "object") {
      for (const value of Object.values(input)) collectMarkdownRefs(value, out);
    }
  }, []);

  const extractTasksFromHierarchyTree = useCallback((tree: HierarchyTreeNode | null | undefined) => {
    if (!tree) return [] as any[];
    const out: any[] = [];
    const stack: HierarchyTreeNode[] = [tree];
    while (stack.length > 0) {
      const current = stack.pop()!;
      if (current?.node?.node_type === "task") {
        out.push(current.node);
      }
      if (Array.isArray(current?.children)) {
        for (const child of current.children) stack.push(child);
      }
    }
    return out;
  }, []);

  const extractTaskAgents = useCallback((task: any): string[] => {
    const meta = task?.metadata || {};
    if (Array.isArray(meta.assigned_agents)) {
      return meta.assigned_agents
        .map((a: any) => (typeof a === "string" ? a : a?.name || a?.id || ""))
        .filter(Boolean);
    }
    if (Array.isArray(meta.assignees)) {
      return meta.assignees
        .map((a: any) => (typeof a === "string" ? a : a?.name || a?.id || ""))
        .filter(Boolean);
    }
    if (meta.assigned_agent) return [String(meta.assigned_agent)];
    if (meta.agent_id) return [String(meta.agent_id)];
    return [];
  }, []);

  const fetchProjectDetails = useCallback(async (projectId: string) => {
    setLoadingExpandedId(projectId);
    try {
      const treeRes = await fetch(`${API_BASE}/api/hierarchy/tree/${projectId}?depth=4`);
      if (!treeRes.ok) throw new Error("Failed to load project details");
      const treeData = await treeRes.json();
      const tasks = extractTasksFromHierarchyTree(treeData?.node ? treeData : null);
      const taskRows: ProjectTaskSummary[] = tasks.map((t: any) => ({
        id: t.id,
        title: t.title,
        status: canonicalTaskStatus(t.status || "backlog"),
        agents: extractTaskAgents(t),
      }));
      const uniqueAgents = Array.from(new Set(taskRows.flatMap((t) => t.agents))).sort();

      setExpandedDetails((prev) => ({
        ...prev,
        [projectId]: {
          tasks: taskRows,
          unique_agents: uniqueAgents,
        },
      }));
    } catch (err: any) {
      toast.error(err.message || "Failed to load project details");
    } finally {
      setLoadingExpandedId((prev) => (prev === projectId ? null : prev));
    }
  }, [extractTaskAgents, extractTasksFromHierarchyTree]);

  // ── Fetch projects ──────────────────────────────────────────────────

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      const [programsRes, directProjectsRes] = await Promise.all([
        fetch(`${API_BASE}/api/nodes?node_type=program&limit=500`),
        fetch(`${API_BASE}/api/nodes?node_type=project&limit=500`),
      ]);

      if (!programsRes.ok) throw new Error("Failed to fetch programs");
      if (!directProjectsRes.ok) throw new Error("Failed to fetch projects");

      const programsData = await programsRes.json();
      const directProjectsData = await directProjectsRes.json();
      const programs: any[] = programsData.nodes || [];
      const directProjects: Project[] = (directProjectsData.nodes || []) as Project[];

      const hierarchyProjectLists = await Promise.all(
        programs.map(async (program) => {
          try {
            const res = await fetch(`${API_BASE}/api/hierarchy/programs/${program.id}/projects`);
            if (!res.ok) return [] as Project[];
            const data = await res.json();
            return (data.projects || []) as Project[];
          } catch {
            return [] as Project[];
          }
        })
      );

      const dedup = new Map<string, Project>();
      for (const project of [...directProjects, ...hierarchyProjectLists.flat()]) {
        if (!project?.id) continue;
        dedup.set(project.id, project);
      }

      const nodes: Project[] = Array.from(dedup.values());

      // For each project, fetch task stats via hierarchy tree
      const withStats: ProjectWithStats[] = await Promise.all(
        nodes.map(async (p) => {
          try {
            const tasksRes = await fetch(`${API_BASE}/api/hierarchy/tree/${p.id}?depth=4`);
            if (tasksRes.ok) {
              const tasksData = await tasksRes.json();
              const tasks = extractTasksFromHierarchyTree(tasksData?.node ? tasksData : null);
              return {
                ...p,
                task_count: tasks.length,
                tasks_done: tasks.filter((t: any) => isDoneStatus(t.status)).length,
                tasks_in_progress: tasks.filter((t: any) => isInProgressStatus(t.status)).length,
              };
            }
          } catch {}
          return { ...p, task_count: 0, tasks_done: 0, tasks_in_progress: 0 };
        })
      );

      withStats.sort((a, b) => Date.parse(b.updated_at || b.created_at || "") - Date.parse(a.updated_at || a.created_at || ""));
      setProjects(withStats);
    } catch (err: any) {
      console.error("Error fetching projects:", err);
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, [extractTasksFromHierarchyTree]);

  const openProjectDossier = useCallback(async (project: ProjectWithStats) => {
    setDossierOpen(true);
    setDossierError(null);
    setDossierLoading(true);
    setDossierData(null);

    try {
      const treeRes = await fetch(`${API_BASE}/api/hierarchy/tree/${project.id}?depth=6`);
      if (!treeRes.ok) throw new Error("Failed to load project hierarchy");
      const treeData = await treeRes.json();
      const tasks = extractTasksFromHierarchyTree(treeData?.node ? treeData : null);
      const taskRows = tasks.map((task: any) => ({
        id: String(task.id),
        title: String(task.title || "Untitled Task"),
        status: canonicalTaskStatus(task.status || "backlog"),
        metadata: (task.metadata || {}) as Record<string, any>,
      }));

      const taskIds = new Set(taskRows.map((t: any) => t.id));
      const sessionIds = Array.from(new Set(
        taskRows
          .map((t: any) => String(t.metadata?.session_id || "").trim())
          .filter(Boolean)
      ));

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

            return {
              session_id: String(session.id || id),
              stage: String(session.stage || "unknown"),
              task_id: String(task.id || session.task_id || ""),
              task_title: String(task.title || "Untitled Task"),
              run_id: session.run_id || null,
              plan_id: session.plan_id || null,
              gate_id: session.gate_id || null,
              updated_at: session.updated_at,
              execution_steps: Array.isArray(resultsData?.steps) ? resultsData.steps : [],
            } as ProjectRunBundle;
          } catch {
            return null;
          }
        })
      );

      const runs: ProjectRunBundle[] = runBundlesRaw
        .filter((item): item is ProjectRunBundle => Boolean(item))
        .filter((item) => !item.task_id || taskIds.has(item.task_id));

      const runIds = new Set(runs.map((r) => String(r.run_id || "")).filter(Boolean));

      const [gatesRes, allProjectEdgesRaw] = await Promise.all([
        fetch(`${API_BASE}/api/nodes?node_type=gate&limit=500`),
        Promise.all(
          [...taskIds, ...Array.from(runIds)].map(async (nodeId) => {
            const [sourceRes, targetRes] = await Promise.all([
              fetch(`${API_BASE}/api/edges?source_node_id=${nodeId}&limit=500`),
              fetch(`${API_BASE}/api/edges?target_node_id=${nodeId}&limit=500`),
            ]);
            const source = sourceRes.ok ? await sourceRes.json() : { edges: [] };
            const target = targetRes.ok ? await targetRes.json() : { edges: [] };
            return [...(source.edges || []), ...(target.edges || [])];
          })
        ),
      ]);

      const allProjectEdges = allProjectEdgesRaw.flat();
      const artifactIds = new Set<string>();
      for (const edge of allProjectEdges) {
        const sourceId = String(edge?.source_node_id || "");
        const targetId = String(edge?.target_node_id || "");
        if (sourceId && !taskIds.has(sourceId) && !runIds.has(sourceId) && sourceId !== project.id) artifactIds.add(sourceId);
        if (targetId && !taskIds.has(targetId) && !runIds.has(targetId) && targetId !== project.id) artifactIds.add(targetId);
      }

      for (const run of runs) {
        if (run.plan_id) artifactIds.add(run.plan_id);
        if (run.gate_id) artifactIds.add(run.gate_id);
        if (run.run_id) artifactIds.add(run.run_id);
      }

      const artifactNodesRaw = await Promise.all(
        Array.from(artifactIds).map(async (id) => {
          try {
            const res = await fetch(`${API_BASE}/api/nodes/${id}`);
            if (!res.ok) return null;
            return await res.json();
          } catch {
            return null;
          }
        })
      );

      const artifactNodes = artifactNodesRaw.filter((n): n is any => Boolean(n));
      const artifacts = artifactNodes
        .filter((node) => !["project", "phase", "task", "program", "mission"].includes(String(node.node_type || "")))
        .map((node) => ({
          id: String(node.id),
          node_type: String(node.node_type || "unknown"),
          title: String(node.title || node.id),
          status: String(node.status || "unknown"),
          description: node.description,
          metadata: node.metadata,
        }));

      const gatesData = gatesRes.ok ? await gatesRes.json() : { nodes: [] };
      const approvals = (Array.isArray(gatesData?.nodes) ? gatesData.nodes : [])
        .filter((gate: any) => {
          const taskId = String(gate?.metadata?.task_id || "");
          const runId = String(gate?.metadata?.run_id || "");
          return (taskId && taskIds.has(taskId)) || (runId && runIds.has(runId));
        })
        .map((gate: any) => ({
          id: String(gate.id),
          title: String(gate.title || "Approval Gate"),
          status: String(gate.status || "unknown"),
          step_order: typeof gate?.metadata?.step_order === "number" ? gate.metadata.step_order : null,
          task_id: gate?.metadata?.task_id || null,
          run_id: gate?.metadata?.run_id || null,
        }));

      const markdownRefs = new Set<string>();
      collectMarkdownRefs(project, markdownRefs);
      collectMarkdownRefs(taskRows, markdownRefs);
      collectMarkdownRefs(runs, markdownRefs);
      collectMarkdownRefs(artifacts, markdownRefs);

      setDossierData({
        project,
        tasks: taskRows,
        runs,
        approvals,
        artifacts,
        markdown_refs: Array.from(markdownRefs).sort(),
      });
    } catch (err: any) {
      setDossierError(err.message || "Failed to load project dossier");
    } finally {
      setDossierLoading(false);
    }
  }, [collectMarkdownRefs, extractTasksFromHierarchyTree]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // ── Filtered projects ───────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = projects;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.metadata?.category?.toLowerCase().includes(q)
      );
    }
    if (filterStatus !== "all") {
      list = list.filter((p) => p.status === filterStatus);
    }
    return list;
  }, [projects, searchQuery, filterStatus]);

  const toggleProjectExpanded = async (projectId: string) => {
    const next = expandedProjectId === projectId ? null : projectId;
    setExpandedProjectId(next);
    if (next && !expandedDetails[next]) {
      await fetchProjectDetails(next);
    }
  };

  // ── Create / Edit ───────────────────────────────────────────────────

  const openCreateDialog = () => {
    setEditingProject(null);
    setFormTitle("");
    setFormDescription("");
    setFormCategory("Other");
    setFormStatus("planning");
    setDialogOpen(true);
  };

  const openEditDialog = (project: Project) => {
    setEditingProject(project);
    setFormTitle(project.title);
    setFormDescription(project.description || "");
    setFormCategory(project.metadata?.category || "Other");
    setFormStatus(project.status);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formTitle.trim()) return;
    setSaving(true);
    try {
      if (editingProject) {
        // Update
        const res = await fetch(`${API_BASE}/api/nodes/${editingProject.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            changed_by: "ui-user",
            change_reason: "User edited quick project",
            title: formTitle,
            description: formDescription,
            status: formStatus,
            metadata: { ...editingProject.metadata, category: formCategory },
          }),
        });
        if (!res.ok) throw new Error("Failed to update project");
        toast.success("Project updated");
      } else {
        // Create
        const res = await fetch(`${API_BASE}/api/hierarchy/projects`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: formTitle,
            description: formDescription,
            status: formStatus,
            category: formCategory,
            created_by: "ui-user",
          }),
        });
        if (!res.ok) throw new Error("Failed to create project");
        toast.success("Project created");
      }
      setDialogOpen(false);
      setDetailOpen(false);
      fetchProjects();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!selectedProject) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_BASE}/api/hierarchy/projects/${selectedProject.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          changed_by: "ui-user",
          change_reason: "User deleted project from Projects section",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) {
        throw new Error(data.error || "Failed to delete project");
      }
      toast.success("Project deleted with associated tasks and artifacts");
      setDeleteConfirmOpen(false);
      setDetailOpen(false);
      setSelectedProject(null);
      fetchProjects();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  // ── Stats ───────────────────────────────────────────────────────────

  const totalProjects = projects.length;
  const activeProjects = projects.filter((p) => isInProgressStatus(p.status)).length;
  const totalTasks = projects.reduce((s, p) => s + p.task_count, 0);
  const totalDone = projects.reduce((s, p) => s + p.tasks_done, 0);

  const deriveProjectHealth = (project: ProjectWithStats) => {
    if (project.task_count === 0) {
      return {
        label: "Setup needed",
        tone: "amber",
        reasons: ["No tasks have been created yet"],
      };
    }

    const completionRate = project.tasks_done / project.task_count;
    const hasNoActiveWork = project.tasks_in_progress === 0 && project.tasks_done < project.task_count;

    if (completionRate >= 0.8) {
      return {
        label: "Healthy",
        tone: "green",
        reasons: ["Most tasks are complete"],
      };
    }

    if (hasNoActiveWork && project.task_count >= 3) {
      return {
        label: "At risk",
        tone: "red",
        reasons: ["No active tasks right now", "Progress may be stalled"],
      };
    }

    return {
      label: "Watch",
      tone: "amber",
      reasons: ["Work is underway", "Monitor momentum this week"],
    };
  };

  const formatDate = (value?: string) => (value ? new Date(value).toLocaleDateString() : "-");

  // ── Render ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--color-text-secondary)]" />
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6 max-w-[1200px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Projects</h1>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">
              Manage your projects and track task progress
            </p>
          </div>
          <Button onClick={openCreateDialog} className="gap-2">
            <Plus className="w-4 h-4" />
            New Project
          </Button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total Projects", value: totalProjects, color: "text-blue-400" },
            { label: "Active", value: activeProjects, color: "text-green-400" },
            { label: "Total Tasks", value: totalTasks, color: "text-violet-400" },
            { label: "Tasks Done", value: totalDone, color: "text-emerald-400" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg border border-border bg-[var(--color-card)] p-4"
            >
              <p className="text-xs text-[var(--color-text-secondary)]">{stat.label}</p>
              <p className={cn("text-2xl font-bold mt-1", stat.color)}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Search + Filter */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-secondary)]" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="planning">Planning</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="on_hold">On Hold</SelectItem>
              <SelectItem value="complete">Complete</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Project Cards */}
        {filtered.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-border rounded-lg">
            <FolderKanban className="w-12 h-12 mx-auto text-[var(--color-text-secondary)] mb-4 opacity-50" />
            <h3 className="text-lg font-medium text-[var(--color-text-primary)]">
              {projects.length === 0 ? "No projects yet" : "No matching projects"}
            </h3>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">
              {projects.length === 0
                ? "Create your first project to get started."
                : "Try adjusting your search or filters."}
            </p>
            {projects.length === 0 && (
              <Button onClick={openCreateDialog} className="mt-4 gap-2">
                <Plus className="w-4 h-4" />
                Create Project
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((project) => {
              const progress =
                project.task_count > 0
                  ? Math.round((project.tasks_done / project.task_count) * 100)
                  : 0;

              const isSelectedProject = selectedProjectId === project.id;
              const health = deriveProjectHealth(project);

              return (
                <div
                  key={project.id}
                  className={cn(
                    "w-full text-left border border-border rounded-lg p-5 hover:border-blue-500/40 transition-all group bg-[var(--color-card)]",
                    isSelectedProject && "ring-1 ring-primary border-primary/50"
                  )}
                >
                  {/* Top row: category + status */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <FolderKanban className="w-4 h-4 text-blue-400" />
                      </div>
                      {project.metadata?.category && (
                        <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">
                          {project.metadata.category}
                        </span>
                      )}
                    </div>
                    <StatusPill status={project.status} />
                  </div>

                  {/* Clickable title area — opens report */}
                  <button
                    className="w-full text-left"
                    onClick={() => onOpenReport?.(project.id)}
                  >
                    <h3 className="font-semibold text-[var(--color-text-primary)] group-hover:text-blue-400 transition-colors mb-1 line-clamp-1">
                      {project.title}
                    </h3>
                    {project.description && (
                      <p className="text-xs text-[var(--color-text-secondary)] mb-3 line-clamp-2">
                        {project.description}
                      </p>
                    )}
                  </button>

                  {/* Progress */}
                  <div className="space-y-1.5 mb-3">
                    <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
                      <span className="flex items-center gap-1">
                        <ListTodo className="w-3 h-3" />
                        {project.tasks_done}/{project.task_count} tasks
                      </span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-1.5" />
                  </div>

                  {/* Health badge + date */}
                  <div className="flex items-center justify-between text-[10px] text-[var(--color-text-secondary)]">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px]",
                        health.tone === "green" && "text-emerald-400 border-emerald-500/40",
                        health.tone === "amber" && "text-amber-400 border-amber-500/40",
                        health.tone === "red" && "text-red-400 border-red-500/40"
                      )}
                    >
                      {health.label}
                    </Badge>
                    {project.created_at && (
                      <span className="flex items-center gap-1">
                        <CalendarDays className="w-3 h-3" />
                        {new Date(project.created_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {/* Minimal action row */}
                  <div className="flex items-center gap-1 mt-3 pt-3 border-t border-border/50">
                    {onOpenReport && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onOpenReport(project.id)}
                        className="h-7 px-2 text-[11px] gap-1 text-primary"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Report
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        onSelectProject?.(project.id);
                        onNavigate?.("tasks");
                      }}
                      className="h-7 px-2 text-[11px] gap-1 text-[var(--color-text-secondary)]"
                    >
                      <ListTodo className="w-3.5 h-3.5" />
                      Tasks
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        onSelectProject?.(project.id);
                        onScheduleNow?.(project.id);
                      }}
                      className="h-7 px-2 text-[11px] gap-1 text-[var(--color-text-secondary)]"
                    >
                      <CalendarDays className="w-3.5 h-3.5" />
                      Schedule
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Detail Popup ─────────────────────────────────────────────── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogDescription className="sr-only">
            Project detail summary including status, description, and task progress.
          </DialogDescription>
          {selectedProject && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="flex items-center gap-2">
                    <FolderKanban className="w-5 h-5 text-blue-400" />
                    {selectedProject.title}
                  </DialogTitle>
                </div>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {/* Status + Category */}
                <div className="flex items-center gap-3">
                  <StatusPill status={selectedProject.status} />
                  {selectedProject.metadata?.category && (
                    <Badge variant="outline" className="text-[11px]">
                      {selectedProject.metadata.category}
                    </Badge>
                  )}
                </div>

                {/* Description */}
                {selectedProject.description && (
                  <div>
                    <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-1">Description</p>
                    <p className="text-sm text-[var(--color-text-primary)] leading-relaxed">
                      {selectedProject.description}
                    </p>
                  </div>
                )}

                {/* Task Progress */}
                <div>
                  <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-2">Task Progress</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-md border border-border p-3 text-center">
                      <p className="text-lg font-bold text-[var(--color-text-primary)]">{selectedProject.task_count}</p>
                      <p className="text-[10px] text-[var(--color-text-secondary)]">Total</p>
                    </div>
                    <div className="rounded-md border border-border p-3 text-center">
                      <p className="text-lg font-bold text-blue-400">{selectedProject.tasks_in_progress}</p>
                      <p className="text-[10px] text-[var(--color-text-secondary)]">In Progress</p>
                    </div>
                    <div className="rounded-md border border-border p-3 text-center">
                      <p className="text-lg font-bold text-emerald-400">{selectedProject.tasks_done}</p>
                      <p className="text-[10px] text-[var(--color-text-secondary)]">Done</p>
                    </div>
                  </div>
                  {selectedProject.task_count > 0 && (
                    <Progress
                      value={Math.round((selectedProject.tasks_done / selectedProject.task_count) * 100)}
                      className="h-2 mt-3"
                    />
                  )}
                </div>

                {/* Metadata */}
                <div className="space-y-1.5 text-xs">
                  {selectedProject.created_at && (
                    <div className="flex justify-between">
                      <span className="text-[var(--color-text-secondary)]">Created</span>
                      <span className="text-[var(--color-text-primary)]">
                        {new Date(selectedProject.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {selectedProject.updated_at && (
                    <div className="flex justify-between">
                      <span className="text-[var(--color-text-secondary)]">Updated</span>
                      <span className="text-[var(--color-text-primary)]">
                        {new Date(selectedProject.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDetailOpen(false);
                    setDeleteConfirmOpen(true);
                  }}
                  className="text-red-400 hover:text-red-300 gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </Button>
                <div className="flex-1" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDetailOpen(false);
                    openEditDialog(selectedProject);
                  }}
                  className="gap-1"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={dossierOpen} onOpenChange={setDossierOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
          <DialogDescription className="sr-only">
            Complete project dossier including metadata, execution steps, approvals, logs, and artifact references.
          </DialogDescription>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              {dossierData?.project?.title || selectedProject?.title || "Project Dossier"}
            </DialogTitle>
          </DialogHeader>

          {dossierLoading ? (
            <div className="h-[55vh] flex items-center justify-center text-sm text-[var(--color-text-secondary)] gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading full project dossier...
            </div>
          ) : dossierError ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {dossierError}
            </div>
          ) : dossierData ? (
            <ScrollArea className="h-[72vh] pr-2">
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  <StatCell label="Tasks" value={String(dossierData.tasks.length)} />
                  <StatCell label="Runs" value={String(dossierData.runs.length)} />
                  <StatCell label="Approvals" value={String(dossierData.approvals.length)} />
                  <StatCell label="Artifacts" value={String(dossierData.artifacts.length)} />
                  <StatCell label="Markdown Refs" value={String(dossierData.markdown_refs.length)} />
                </div>

                <div className="rounded-lg border border-border p-3 bg-[var(--color-card)] space-y-2">
                  <p className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">Project Metadata</p>
                  <pre className="text-[11px] text-[var(--color-text-primary)] whitespace-pre-wrap break-words max-h-44 overflow-y-auto bg-[var(--color-background)] rounded border border-border p-2">
                    {JSON.stringify(dossierData.project.metadata || {}, null, 2)}
                  </pre>
                </div>

                <div className="rounded-lg border border-border p-3 bg-[var(--color-card)] space-y-2">
                  <p className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">Tasks & Status</p>
                  {dossierData.tasks.length === 0 ? (
                    <p className="text-xs text-[var(--color-text-secondary)]">No tasks linked to this project.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                      {dossierData.tasks.map((task) => (
                        <div key={task.id} className="rounded border border-border p-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-medium text-[var(--color-text-primary)]">{task.title}</p>
                            <Badge variant="outline" className="text-[10px]">{taskStatusLabel(task.status)}</Badge>
                          </div>
                          <p className="text-[10px] text-[var(--color-text-secondary)] mt-1 font-mono">{task.id}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-lg border border-border p-3 bg-[var(--color-card)] space-y-2">
                  <p className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">Execution Console Output + Step Logs</p>
                  {dossierData.runs.length === 0 ? (
                    <p className="text-xs text-[var(--color-text-secondary)]">No task-intake sessions found on linked tasks yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {dossierData.runs.map((run) => (
                        <div key={run.session_id} className="rounded border border-border p-2 space-y-2 bg-[var(--color-background)]/60">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge variant="outline" className="text-[10px]">session {run.session_id}</Badge>
                            {run.run_id && <Badge variant="outline" className="text-[10px]">run {run.run_id}</Badge>}
                            <Badge variant="outline" className="text-[10px]">stage {run.stage}</Badge>
                            <span className="text-[10px] text-[var(--color-text-secondary)]">{run.task_title}</span>
                          </div>
                          {run.execution_steps.length === 0 ? (
                            <p className="text-[11px] text-[var(--color-text-secondary)]">No persisted execution steps for this run yet.</p>
                          ) : (
                            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                              {run.execution_steps.map((step) => (
                                <div key={`${run.session_id}-${step.step_order}`} className="rounded border border-border px-2 py-1.5">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="text-[11px] font-medium text-[var(--color-text-primary)]">[{step.step_order}] {step.action}</p>
                                    <Badge variant="outline" className="text-[10px]">{step.success ? "ok" : "failed"}</Badge>
                                  </div>
                                  <p className="text-[10px] text-[var(--color-text-secondary)] mt-0.5">{step.source}{step.model ? ` • ${step.model}` : ""}</p>
                                  <pre className="mt-1 text-[10px] text-[var(--color-text-primary)] whitespace-pre-wrap break-words max-h-40 overflow-y-auto bg-muted/20 border border-border rounded p-2">
                                    {step.output || "(no output captured)"}
                                  </pre>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-lg border border-border p-3 bg-[var(--color-card)] space-y-2">
                  <p className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">Approvals</p>
                  {dossierData.approvals.length === 0 ? (
                    <p className="text-xs text-[var(--color-text-secondary)]">No approval-gate records were found for this project.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                      {dossierData.approvals.map((gate) => (
                        <div key={gate.id} className="rounded border border-border p-2 flex items-center justify-between gap-2">
                          <div>
                            <p className="text-xs font-medium text-[var(--color-text-primary)]">{gate.title}</p>
                            <p className="text-[10px] text-[var(--color-text-secondary)] font-mono">{gate.id}</p>
                          </div>
                          <div className="text-right space-y-1">
                            <Badge variant="outline" className="text-[10px]">{gate.status}</Badge>
                            {gate.step_order ? <p className="text-[10px] text-[var(--color-text-secondary)]">step {gate.step_order}</p> : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-lg border border-border p-3 bg-[var(--color-card)] space-y-2">
                  <p className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">Artifacts + Output References</p>
                  {dossierData.artifacts.length === 0 ? (
                    <p className="text-xs text-[var(--color-text-secondary)]">No non-hierarchy artifacts linked to project tasks yet.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {dossierData.artifacts.map((artifact) => (
                        <div key={artifact.id} className="rounded border border-border p-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-medium text-[var(--color-text-primary)]">{artifact.title}</p>
                            <div className="flex items-center gap-1.5">
                              <Badge variant="outline" className="text-[10px]">{artifact.node_type}</Badge>
                              <Badge variant="outline" className="text-[10px]">{artifact.status}</Badge>
                            </div>
                          </div>
                          <p className="text-[10px] text-[var(--color-text-secondary)] mt-1 font-mono">{artifact.id}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-lg border border-border p-3 bg-[var(--color-card)] space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">Markdown Files Referenced</p>
                    {dossierData.markdown_refs.length > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-[10px] gap-1"
                        onClick={async () => {
                          await navigator.clipboard.writeText(dossierData.markdown_refs.join("\n"));
                          toast.success("Markdown references copied");
                        }}
                      >
                        <Copy className="w-3 h-3" />
                        Copy list
                      </Button>
                    )}
                  </div>
                  {dossierData.markdown_refs.length === 0 ? (
                    <p className="text-xs text-[var(--color-text-secondary)]">No .md references detected yet.</p>
                  ) : (
                    <ul className="space-y-1 max-h-36 overflow-y-auto pr-1">
                      {dossierData.markdown_refs.map((ref) => (
                        <li key={ref} className="text-[11px] text-[var(--color-text-primary)] font-mono rounded border border-border px-2 py-1 break-all">
                          {ref}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </ScrollArea>
          ) : (
            <div className="text-sm text-[var(--color-text-secondary)]">Open a project dossier from the project card.</div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Create / Edit Dialog ─────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogDescription className="sr-only">
            Create or edit a project record.
          </DialogDescription>
          <DialogHeader>
            <DialogTitle>
              {editingProject ? "Edit Project" : "New Project"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-[var(--color-text-primary)] mb-1 block">
                Title
              </label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g., Marketing Campaign Q1"
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--color-text-primary)] mb-1 block">
                Description
              </label>
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="What should this project accomplish?"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-[var(--color-text-primary)] mb-1 block">
                  Category
                </label>
                <Select value={formCategory} onValueChange={setFormCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-[var(--color-text-primary)] mb-1 block">
                  Status
                </label>
                <Select value={formStatus} onValueChange={setFormStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planning">Planning</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="complete">Complete</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!formTitle.trim() || saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingProject ? "Save Changes" : "Create Project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ──────────────────────────────────────── */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogDescription className="sr-only">
            Confirm permanent deletion of this project and associated linked work.
          </DialogDescription>
          <DialogHeader>
            <DialogTitle className="text-red-400">Delete Project</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[var(--color-text-secondary)] py-2">
            Are you sure you want to delete <strong>{selectedProject?.title}</strong>? This will also remove all associated tasks. This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ScrollArea>
  );
}
