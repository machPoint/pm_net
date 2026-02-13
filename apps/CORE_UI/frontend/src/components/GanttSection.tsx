"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";
import {
  Loader2,
  FolderKanban,
  CheckCircle2,
  Clock,
  Zap,
  PauseCircle,
  XCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const API_BASE = "/api/opal/proxy";

interface Project {
  id: string;
  title: string;
  status: string;
  metadata?: Record<string, any>;
  created_at?: string;
}

interface Task {
  id: string;
  title: string;
  status: string;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

const STATUS_COLORS: Record<string, string> = {
  done: "bg-emerald-500",
  complete: "bg-emerald-500",
  in_progress: "bg-blue-500",
  active: "bg-blue-500",
  planning: "bg-zinc-500",
  not_started: "bg-zinc-600",
  backlog: "bg-zinc-600",
  on_hold: "bg-amber-500",
  blocked: "bg-red-500",
  cancelled: "bg-red-500/50",
  review: "bg-purple-500",
  pending_approval: "bg-amber-500",
};

const STATUS_LABELS: Record<string, string> = {
  done: "Done",
  complete: "Complete",
  in_progress: "In Progress",
  active: "Active",
  planning: "Planning",
  not_started: "Not Started",
  backlog: "Backlog",
  on_hold: "On Hold",
  blocked: "Blocked",
  cancelled: "Cancelled",
  review: "Review",
  pending_approval: "Pending Approval",
};

// Generate day columns for the timeline
function generateDays(startDate: Date, count: number): Date[] {
  const days: Date[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    days.push(d);
  }
  return days;
}

function formatDay(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function isToday(d: Date): boolean {
  const now = new Date();
  return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

// Estimate task position on timeline based on creation date and status
function getTaskBarProps(task: Task, timelineStart: Date, dayWidth: number, totalDays: number) {
  const created = task.created_at ? new Date(task.created_at) : new Date();
  const updated = task.updated_at ? new Date(task.updated_at) : new Date();

  const startOffset = Math.max(0, Math.floor((created.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24)));
  const isDone = task.status === "done" || task.status === "complete";
  const endOffset = isDone
    ? Math.max(startOffset + 1, Math.floor((updated.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24)))
    : Math.min(startOffset + (task.metadata?.estimated_hours ? Math.ceil(task.metadata.estimated_hours / 8) : 3), totalDays);

  const duration = Math.max(1, endOffset - startOffset);

  return {
    left: startOffset * dayWidth,
    width: Math.max(duration * dayWidth - 2, dayWidth - 2),
  };
}

export default function GanttSection() {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [tasks, setTasks] = useState<Task[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const DAY_WIDTH = 80;
  const TOTAL_DAYS = 30;
  const ROW_HEIGHT = 44;
  const LABEL_WIDTH = 220;

  // Timeline starts 7 days ago
  const timelineStart = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const days = useMemo(() => generateDays(timelineStart, TOTAL_DAYS), [timelineStart]);

  // Fetch projects
  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/nodes?node_type=project`);
      if (!res.ok) throw new Error("Failed to fetch projects");
      const data = await res.json();
      setProjects(data.nodes || data || []);
    } catch (err: any) {
      console.error(err);
    }
  }, []);

  // Fetch tasks for selected project (or all)
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      if (selectedProjectId === "all") {
        const res = await fetch(`${API_BASE}/api/nodes?node_type=task`);
        if (!res.ok) throw new Error("Failed to fetch tasks");
        const data = await res.json();
        setTasks(data.nodes || data || []);
      } else {
        const res = await fetch(
          `${API_BASE}/api/traverse?from_id=${selectedProjectId}&edge_type=contains&direction=outgoing`
        );
        if (!res.ok) throw new Error("Failed to fetch project tasks");
        const data = await res.json();
        const allChildren = data.nodes || data || [];
        setTasks(allChildren.filter((n: any) => n.node_type === "task"));
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Scroll to today on mount
  useEffect(() => {
    if (scrollRef.current) {
      const todayOffset = 7 * DAY_WIDTH; // 7 days from start
      scrollRef.current.scrollLeft = Math.max(0, todayOffset - 200);
    }
  }, [loading]);

  // Group tasks by phase if available
  const groupedTasks = useMemo(() => {
    const phases = new Map<string, Task[]>();
    const ungrouped: Task[] = [];

    for (const task of tasks) {
      const phase = task.metadata?.phase;
      if (phase) {
        if (!phases.has(phase)) phases.set(phase, []);
        phases.get(phase)!.push(task);
      } else {
        ungrouped.push(task);
      }
    }

    const groups: { label: string; isPhase: boolean; tasks: Task[] }[] = [];
    for (const [phase, phaseTasks] of phases) {
      groups.push({ label: phase, isPhase: true, tasks: phaseTasks });
    }
    if (ungrouped.length > 0) {
      groups.push({ label: "Tasks", isPhase: false, tasks: ungrouped });
    }
    if (groups.length === 0 && tasks.length > 0) {
      groups.push({ label: "Tasks", isPhase: false, tasks });
    }

    return groups;
  }, [tasks]);

  // Flatten for row rendering
  const rows = useMemo(() => {
    const result: Array<{ type: "phase" | "task"; label: string; task?: Task; isApprovalGate?: boolean }> = [];
    for (const group of groupedTasks) {
      if (group.isPhase) {
        result.push({ type: "phase", label: group.label });
      }
      for (const task of group.tasks) {
        const isApproval = task.status === "review" || task.status === "pending_approval" || task.metadata?.needs_approval;
        result.push({ type: "task", label: task.title, task, isApprovalGate: isApproval });
      }
    }
    return result;
  }, [groupedTasks]);

  if (loading && projects.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--color-text-secondary)]" />
      </div>
    );
  }

  const timelineWidth = TOTAL_DAYS * DAY_WIDTH;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Gantt Chart</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
            Task timeline with phases and approval gates
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={fetchTasks} className="gap-1">
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Gantt body */}
      <div className="flex-1 overflow-hidden flex">
        {/* Left labels */}
        <div className="flex-shrink-0 border-r border-border bg-[var(--color-card)]" style={{ width: LABEL_WIDTH }}>
          {/* Header spacer */}
          <div className="h-10 border-b border-border px-3 flex items-center">
            <span className="text-xs font-medium text-[var(--color-text-secondary)]">Task</span>
          </div>
          {/* Rows */}
          <ScrollArea className="h-[calc(100%-40px)]">
            {rows.length === 0 && !loading && (
              <div className="p-4 text-center text-sm text-[var(--color-text-secondary)]">
                No tasks found
              </div>
            )}
            {rows.map((row, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-center px-3 border-b border-border/50",
                  row.type === "phase" ? "bg-muted/30" : ""
                )}
                style={{ height: ROW_HEIGHT }}
              >
                {row.type === "phase" ? (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                      {row.label}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 min-w-0">
                    {row.isApprovalGate && (
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                    )}
                    <span className="text-xs text-[var(--color-text-primary)] truncate">
                      {row.label}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </ScrollArea>
        </div>

        {/* Timeline area — horizontally scrollable */}
        <div className="flex-1 overflow-x-auto overflow-y-auto" ref={scrollRef}>
          <div style={{ minWidth: timelineWidth }}>
            {/* Day headers */}
            <div className="flex h-10 border-b border-border sticky top-0 bg-[var(--color-card)] z-10">
              {days.map((day, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex-shrink-0 flex items-center justify-center text-[10px] border-r border-border/30",
                    isToday(day) ? "bg-blue-500/10 text-blue-400 font-bold" : "text-[var(--color-text-secondary)]"
                  )}
                  style={{ width: DAY_WIDTH }}
                >
                  {formatDay(day)}
                </div>
              ))}
            </div>

            {/* Rows with bars */}
            {rows.map((row, i) => (
              <div
                key={i}
                className={cn(
                  "relative border-b border-border/30",
                  row.type === "phase" ? "bg-muted/20" : ""
                )}
                style={{ height: ROW_HEIGHT }}
              >
                {/* Grid lines */}
                <div className="absolute inset-0 flex pointer-events-none">
                  {days.map((day, j) => (
                    <div
                      key={j}
                      className={cn(
                        "flex-shrink-0 border-r border-border/10",
                        isToday(day) && "bg-blue-500/5"
                      )}
                      style={{ width: DAY_WIDTH }}
                    />
                  ))}
                </div>

                {/* Task bar */}
                {row.type === "task" && row.task && (
                  <div className="absolute inset-y-0 flex items-center" style={{ left: 0 }}>
                    {(() => {
                      const bar = getTaskBarProps(row.task!, timelineStart, DAY_WIDTH, TOTAL_DAYS);
                      const statusColor = STATUS_COLORS[row.task!.status] || "bg-zinc-500";
                      const statusLabel = STATUS_LABELS[row.task!.status] || row.task!.status;
                      return (
                        <div
                          className={cn(
                            "absolute h-7 rounded-md flex items-center px-2 text-[10px] font-medium text-white shadow-sm",
                            statusColor,
                            row.isApprovalGate && "ring-2 ring-amber-400/50"
                          )}
                          style={{ left: bar.left, width: bar.width }}
                          title={`${row.task!.title} — ${statusLabel}`}
                        >
                          <span className="truncate">{row.task!.title}</span>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Phase separator line */}
                {row.type === "phase" && (
                  <div className="absolute inset-0 flex items-center px-2">
                    <div className="w-full border-t border-dashed border-amber-500/30" />
                  </div>
                )}
              </div>
            ))}

            {/* Today marker */}
            {(() => {
              const todayIdx = days.findIndex(isToday);
              if (todayIdx < 0) return null;
              return (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-20 pointer-events-none"
                  style={{ left: LABEL_WIDTH + todayIdx * DAY_WIDTH + DAY_WIDTH / 2 }}
                />
              );
            })()}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-6 py-2 border-t border-border text-[10px] text-[var(--color-text-secondary)]">
        <span className="flex items-center gap-1"><div className="w-3 h-2 rounded-sm bg-emerald-500" /> Done</span>
        <span className="flex items-center gap-1"><div className="w-3 h-2 rounded-sm bg-blue-500" /> In Progress</span>
        <span className="flex items-center gap-1"><div className="w-3 h-2 rounded-sm bg-amber-500" /> On Hold</span>
        <span className="flex items-center gap-1"><div className="w-3 h-2 rounded-sm bg-zinc-500" /> Planning</span>
        <span className="flex items-center gap-1"><div className="w-3 h-2 rounded-sm bg-purple-500" /> Review</span>
        <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3 text-amber-400" /> Approval Gate</span>
      </div>
    </div>
  );
}
