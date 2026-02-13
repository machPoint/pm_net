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

  // ── Fetch projects ──────────────────────────────────────────────────

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/nodes?node_type=project`);
      if (!res.ok) throw new Error("Failed to fetch projects");
      const data = await res.json();
      const nodes: Project[] = data.nodes || data || [];

      // For each project, fetch task stats
      const withStats: ProjectWithStats[] = await Promise.all(
        nodes.map(async (p) => {
          try {
            const tasksRes = await fetch(
              `${API_BASE}/api/traverse?from_id=${p.id}&edge_type=contains&direction=outgoing`
            );
            if (tasksRes.ok) {
              const tasksData = await tasksRes.json();
              const tasks = (tasksData.nodes || tasksData || []).filter(
                (n: any) => n.node_type === "task"
              );
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
  }, []);

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
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
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
        const res = await fetch(`${API_BASE}/api/nodes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            node_type: "project",
            title: formTitle,
            description: formDescription,
            status: formStatus,
            metadata: { category: formCategory },
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
      const res = await fetch(`${API_BASE}/api/nodes/${selectedProject.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete project");
      toast.success("Project deleted");
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

              return (
                <button
                  key={project.id}
                  onClick={() => {
                    setSelectedProject(project);
                    setDetailOpen(true);
                  }}
                  className="w-full text-left border border-border rounded-lg p-5 hover:border-blue-500/40 transition-all group bg-[var(--color-card)]"
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
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Detail Popup ─────────────────────────────────────────────── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
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
