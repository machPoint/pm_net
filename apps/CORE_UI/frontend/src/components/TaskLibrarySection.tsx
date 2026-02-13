"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import {
  Library,
  Plus,
  Search,
  Play,
  Pencil,
  Trash2,
  Loader2,
  Tag,
  Clock,
  X,
  CalendarDays,
  Zap,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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

const API_BASE = "/api/opal/proxy/api/task-intake/library";

// ============================================================================
// Types
// ============================================================================

interface TaskTemplate {
  id: string;
  title: string;
  description: string;
  priority: string;
  acceptance_criteria: any[];
  estimated_hours: number;
  tags: string[];
  is_template: boolean;
  created_at?: string;
  updated_at?: string;
  metadata?: Record<string, any>;
}

// ============================================================================
// API helper
// ============================================================================

async function libraryApi<T = any>(path: string, options?: {
  method?: string;
  body?: any;
}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: options?.method || "GET",
    headers: { "Content-Type": "application/json" },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || "API error");
  return data as T;
}

// ============================================================================
// Priority config
// ============================================================================

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  critical: { label: "Critical", color: "text-red-400",    bg: "bg-red-500/15 border-red-500/30",    dot: "#f87171" },
  high:     { label: "High",     color: "text-amber-400",  bg: "bg-amber-500/15 border-amber-500/30",  dot: "#fbbf24" },
  medium:   { label: "Medium",   color: "text-blue-400",   bg: "bg-blue-500/15 border-blue-500/30",   dot: "#60a5fa" },
  low:      { label: "Low",      color: "text-zinc-400",   bg: "bg-zinc-500/15 border-zinc-500/30",   dot: "#a1a1aa" },
};

function PriorityPill({ priority }: { priority: string }) {
  const cfg = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.medium;
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

export default function TaskLibrarySection() {
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPriority, setFilterPriority] = useState<string>("all");

  // Detail popup
  const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplate | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Create/Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPriority, setFormPriority] = useState("medium");
  const [formHours, setFormHours] = useState("");
  const [formTags, setFormTags] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Run
  const [runningId, setRunningId] = useState<string | null>(null);

  // ── Fetch ───────────────────────────────────────────────────────────

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const data = await libraryApi<{ ok: boolean; templates: TaskTemplate[] }>("");
      setTemplates(data.templates || []);
    } catch (err: any) {
      console.error("Error fetching templates:", err);
      toast.error("Failed to load task library");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // ── Filtered ────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = templates;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.tags?.some((tag) => tag.toLowerCase().includes(q))
      );
    }
    if (filterPriority !== "all") {
      list = list.filter((t) => t.priority === filterPriority);
    }
    return list;
  }, [templates, searchQuery, filterPriority]);

  // ── Create / Edit ───────────────────────────────────────────────────

  const openCreateDialog = () => {
    setEditingTemplate(null);
    setFormTitle("");
    setFormDescription("");
    setFormPriority("medium");
    setFormHours("");
    setFormTags("");
    setDialogOpen(true);
  };

  const openEditDialog = (template: TaskTemplate) => {
    setEditingTemplate(template);
    setFormTitle(template.title);
    setFormDescription(template.description);
    setFormPriority(template.priority);
    setFormHours(template.estimated_hours?.toString() || "");
    setFormTags(template.tags?.join(", ") || "");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formTitle.trim()) return;
    setSaving(true);
    try {
      const body = {
        title: formTitle,
        description: formDescription,
        priority: formPriority,
        estimated_hours: formHours ? parseFloat(formHours) : 0,
        tags: formTags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      };

      if (editingTemplate) {
        await libraryApi(`/${editingTemplate.id}`, { method: "PUT", body });
        toast.success("Template updated");
      } else {
        await libraryApi("", { method: "POST", body });
        toast.success("Template created");
      }
      setDialogOpen(false);
      setDetailOpen(false);
      fetchTemplates();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!selectedTemplate) return;
    setDeleting(true);
    try {
      await libraryApi(`/${selectedTemplate.id}`, { method: "DELETE" });
      toast.success("Template deleted");
      setDeleteConfirmOpen(false);
      setDetailOpen(false);
      setSelectedTemplate(null);
      fetchTemplates();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  // ── Run ─────────────────────────────────────────────────────────────

  const handleRun = async (template: TaskTemplate) => {
    setRunningId(template.id);
    try {
      await libraryApi(`/${template.id}/run`, { method: "POST", body: {} });
      toast.success(`Running "${template.title}" — check Project Intake`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setRunningId(null);
    }
  };

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
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Task Library</h1>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">
              Reusable task templates — create once, run many times
            </p>
          </div>
          <Button onClick={openCreateDialog} className="gap-2">
            <Plus className="w-4 h-4" />
            New Template
          </Button>
        </div>

        {/* Search + Filter */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-secondary)]" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All priorities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Template Cards */}
        {filtered.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-border rounded-lg">
            <Library className="w-12 h-12 mx-auto text-[var(--color-text-secondary)] mb-4 opacity-50" />
            <h3 className="text-lg font-medium text-[var(--color-text-primary)]">
              {templates.length === 0 ? "No templates yet" : "No matching templates"}
            </h3>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">
              {templates.length === 0
                ? "Create reusable task templates to speed up your workflow."
                : "Try adjusting your search or filters."}
            </p>
            {templates.length === 0 && (
              <Button onClick={openCreateDialog} className="mt-4 gap-2">
                <Plus className="w-4 h-4" />
                Create First Template
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((template) => (
              <button
                key={template.id}
                onClick={() => {
                  setSelectedTemplate(template);
                  setDetailOpen(true);
                }}
                className="w-full text-left border border-border rounded-lg p-5 hover:border-blue-500/40 transition-all group bg-[var(--color-card)]"
              >
                {/* Top: tags + priority */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                      <Library className="w-4 h-4 text-violet-400" />
                    </div>
                    {template.tags?.length > 0 && (
                      <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">
                        {template.tags[0]}
                      </span>
                    )}
                  </div>
                  <PriorityPill priority={template.priority} />
                </div>

                {/* Title */}
                <h3 className="font-semibold text-[var(--color-text-primary)] group-hover:text-blue-400 transition-colors mb-1 line-clamp-1">
                  {template.title}
                </h3>

                {/* Description */}
                {template.description && (
                  <p className="text-xs text-[var(--color-text-secondary)] mb-3 line-clamp-2">
                    {template.description}
                  </p>
                )}

                {/* Footer: hours + tags */}
                <div className="flex items-center justify-between text-[10px] text-[var(--color-text-secondary)]">
                  <div className="flex items-center gap-3">
                    {template.estimated_hours > 0 && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {template.estimated_hours}h
                      </span>
                    )}
                    {template.tags?.length > 1 && (
                      <span className="flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        +{template.tags.length - 1} tags
                      </span>
                    )}
                  </div>
                  <span className="flex items-center gap-1 text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="w-3 h-3" />
                    Run
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Detail Popup ─────────────────────────────────────────────── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          {selectedTemplate && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Library className="w-5 h-5 text-violet-400" />
                  {selectedTemplate.title}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {/* Priority + Tags */}
                <div className="flex items-center gap-2 flex-wrap">
                  <PriorityPill priority={selectedTemplate.priority} />
                  {selectedTemplate.tags?.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-[10px] gap-1">
                      <Tag className="w-3 h-3" />
                      {tag}
                    </Badge>
                  ))}
                </div>

                {/* Description */}
                {selectedTemplate.description && (
                  <div>
                    <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-1">Description</p>
                    <p className="text-sm text-[var(--color-text-primary)] leading-relaxed">
                      {selectedTemplate.description}
                    </p>
                  </div>
                )}

                {/* Details */}
                <div className="space-y-1.5 text-xs">
                  {selectedTemplate.estimated_hours > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[var(--color-text-secondary)]">Estimated Hours</span>
                      <span className="text-[var(--color-text-primary)]">{selectedTemplate.estimated_hours}h</span>
                    </div>
                  )}
                  {selectedTemplate.acceptance_criteria?.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[var(--color-text-secondary)]">Acceptance Criteria</span>
                      <span className="text-[var(--color-text-primary)]">{selectedTemplate.acceptance_criteria.length} items</span>
                    </div>
                  )}
                </div>

                {/* Acceptance criteria list */}
                {selectedTemplate.acceptance_criteria?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">Acceptance Criteria</p>
                    <ul className="space-y-1">
                      {selectedTemplate.acceptance_criteria.map((c: any, i: number) => (
                        <li key={i} className="text-xs text-[var(--color-text-primary)] flex items-start gap-2">
                          <span className="text-[var(--color-text-secondary)] mt-0.5">•</span>
                          {typeof c === "string" ? c : c.description || c.text || JSON.stringify(c)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
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
                    openEditDialog(selectedTemplate);
                  }}
                  className="gap-1"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleRun(selectedTemplate)}
                  disabled={runningId === selectedTemplate.id}
                  className="gap-1 bg-violet-600 hover:bg-violet-700 text-white"
                >
                  {runningId === selectedTemplate.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Play className="w-3.5 h-3.5" />
                  )}
                  Run Task
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
              {editingTemplate ? "Edit Template" : "New Template"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-[var(--color-text-primary)] mb-1 block">Title</label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g., Write Blog Post"
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--color-text-primary)] mb-1 block">Description</label>
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="What does this task accomplish?"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-[var(--color-text-primary)] mb-1 block">Priority</label>
                <Select value={formPriority} onValueChange={setFormPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-[var(--color-text-primary)] mb-1 block">Est. Hours</label>
                <Input
                  type="number"
                  value={formHours}
                  onChange={(e) => setFormHours(e.target.value)}
                  placeholder="0"
                  min="0"
                  step="0.5"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--color-text-primary)] mb-1 block">Tags (comma separated)</label>
              <Input
                value={formTags}
                onChange={(e) => setFormTags(e.target.value)}
                placeholder="e.g., marketing, content, blog"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!formTitle.trim() || saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingTemplate ? "Save Changes" : "Create Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ──────────────────────────────────────── */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-400">Delete Template</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[var(--color-text-secondary)] py-2">
            Are you sure you want to delete <strong>{selectedTemplate?.title}</strong>? This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
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
