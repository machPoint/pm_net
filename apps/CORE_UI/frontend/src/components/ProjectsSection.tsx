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

export default function ProjectsSection() {
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
        status: t.status || "backlog",
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
      const programsRes = await fetch(`${API_BASE}/api/nodes?node_type=program`);
      if (!programsRes.ok) throw new Error("Failed to fetch programs");
      const programsData = await programsRes.json();
      const programs: any[] = programsData.nodes || programsData || [];

      const projectLists = await Promise.all(
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
      for (const project of projectLists.flat()) {
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
                tasks_done: tasks.filter((t: any) => t.status === "done" || t.status === "complete").length,
                tasks_in_progress: tasks.filter((t: any) => t.status === "in_progress" || t.status === "active").length,
              };
            }
          } catch {}
          return { ...p, task_count: 0, tasks_done: 0, tasks_in_progress: 0 };
        })
      );

      setProjects(withStats);
    } catch (err: any) {
      console.error("Error fetching projects:", err);
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, [extractTasksFromHierarchyTree]);

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
      toast.success("Project deleted with associated work and artifacts");
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
  const activeProjects = projects.filter((p) => p.status === "active" || p.status === "in_progress").length;
  const totalTasks = projects.reduce((s, p) => s + p.task_count, 0);
  const totalDone = projects.reduce((s, p) => s + p.tasks_done, 0);

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

              const isExpanded = expandedProjectId === project.id;
              const details = expandedDetails[project.id];
              const isLoadingDetails = loadingExpandedId === project.id;

              return (
                <div
                  key={project.id}
                  className="w-full text-left border border-border rounded-lg p-5 hover:border-blue-500/40 transition-all group bg-[var(--color-card)]"
                >
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleProjectExpanded(project.id)}
                      className="h-7 px-2 text-[11px] text-[var(--color-text-secondary)] gap-1"
                    >
                      {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      {isExpanded ? "Hide details" : "Show details"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedProject(project);
                        setDetailOpen(true);
                      }}
                      className="h-7 px-2 text-[11px]"
                    >
                      Open popup
                    </Button>
                  </div>

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

                  {/* Title */}
                  <h3 className="font-semibold text-[var(--color-text-primary)] group-hover:text-blue-400 transition-colors mb-1 line-clamp-1">
                    {project.title}
                  </h3>

                  {/* Description */}
                  {project.description && (
                    <p className="text-xs text-[var(--color-text-secondary)] mb-3 line-clamp-2">
                      {project.description}
                    </p>
                  )}

                  {/* Progress */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
                      <span className="flex items-center gap-1">
                        <ListTodo className="w-3 h-3" />
                        {project.tasks_done}/{project.task_count} tasks
                      </span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-1.5" />
                  </div>

                  {/* Footer */}
                  {project.created_at && (
                    <div className="flex items-center gap-1 mt-3 text-[10px] text-[var(--color-text-secondary)]">
                      <CalendarDays className="w-3 h-3" />
                      {new Date(project.created_at).toLocaleDateString()}
                    </div>
                  )}

                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-border space-y-3">
                      <div className="rounded-md border border-border p-3 bg-[var(--color-background)]/40">
                        <p className="text-[11px] uppercase tracking-wide text-[var(--color-text-secondary)] mb-1">Project Overview</p>
                        <p className="text-xs text-[var(--color-text-primary)] line-clamp-3">
                          {project.description || "No description provided."}
                        </p>
                      </div>

                      <div className="rounded-md border border-border p-3 bg-[var(--color-background)]/40">
                        <p className="text-[11px] uppercase tracking-wide text-[var(--color-text-secondary)] mb-2">Agents in Use</p>
                        {isLoadingDetails ? (
                          <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading agents...
                          </div>
                        ) : details?.unique_agents?.length ? (
                          <div className="flex flex-wrap gap-1.5">
                            {details.unique_agents.map((agent) => (
                              <Badge key={agent} variant="outline" className="text-[10px] gap-1">
                                <Bot className="w-3 h-3" />
                                {agent}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-[var(--color-text-secondary)]">No assigned agents yet.</p>
                        )}
                      </div>

                      <div className="rounded-md border border-border p-3 bg-[var(--color-background)]/40">
                        <p className="text-[11px] uppercase tracking-wide text-[var(--color-text-secondary)] mb-2">Tasks</p>
                        {isLoadingDetails ? (
                          <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading tasks...
                          </div>
                        ) : details?.tasks?.length ? (
                          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                            {details.tasks.map((task) => (
                              <div key={task.id} className="rounded border border-border p-2">
                                <div className="flex items-start justify-between gap-2">
                                  <p className="text-xs font-medium text-[var(--color-text-primary)] line-clamp-1">{task.title}</p>
                                  <StatusPill status={task.status} />
                                </div>
                                {task.agents.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1.5">
                                    {task.agents.map((agent) => (
                                      <Badge key={`${task.id}-${agent}`} variant="outline" className="text-[10px]">{agent}</Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-[var(--color-text-secondary)]">No tasks linked to this project.</p>
                        )}
                      </div>
                    </div>
                  )}
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
