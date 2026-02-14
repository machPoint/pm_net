"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";
import {
  Loader2,
  Calendar,
  Lock,
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

interface HierarchyTreeNode {
  node: any;
  children?: HierarchyTreeNode[];
}

interface Task {
  id: string;
  title: string;
  status: string;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

type Recurrence = "none" | "daily" | "weekly" | "monthly";

interface TaskSchedule {
  startDate: string;
  endDate: string;
  isOngoing: boolean;
  recurrence: Recurrence;
}

type ScheduleMode = "one_time" | "ongoing" | "recurring";

interface DragState {
  taskId: string;
  startX: number;
  originStartOffset: number;
  durationDays: number;
  currentStartOffset: number;
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

function dateOnly(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateOnly(input?: string | null): Date | null {
  if (!input) return null;
  const d = new Date(`${input}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function getTaskSchedule(task: Task, timelineStart: Date, totalDays: number) {
  const scheduleMeta = (task.metadata?.schedule || {}) as Partial<TaskSchedule>;
  const created = task.created_at ? new Date(task.created_at) : new Date();
  const fallbackStart = new Date(created);
  fallbackStart.setHours(0, 0, 0, 0);

  const configuredStart = parseDateOnly(scheduleMeta.startDate);
  const configuredEnd = parseDateOnly(scheduleMeta.endDate);

  const startDate = configuredStart || fallbackStart;

  let durationDays = Math.max(1, task.metadata?.estimated_hours ? Math.ceil(task.metadata.estimated_hours / 8) : 3);
  if (configuredEnd) {
    const diff = Math.ceil((configuredEnd.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    durationDays = Math.max(1, diff);
  }

  const startOffsetRaw = Math.floor((startDate.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24));
  const maxStart = Math.max(0, totalDays - durationDays);
  const startOffset = Math.min(Math.max(0, startOffsetRaw), maxStart);

  const scheduledStart = new Date(timelineStart);
  scheduledStart.setDate(timelineStart.getDate() + startOffset);
  const scheduledEnd = new Date(scheduledStart);
  scheduledEnd.setDate(scheduledStart.getDate() + durationDays);

  return {
    startOffset,
    durationDays,
    schedule: {
      startDate: scheduleMeta.startDate || dateOnly(scheduledStart),
      endDate: scheduleMeta.endDate || dateOnly(scheduledEnd),
      isOngoing: Boolean(scheduleMeta.isOngoing),
      recurrence: (scheduleMeta.recurrence || "none") as Recurrence,
    } as TaskSchedule,
  };
}

function getTaskBarProps(startOffset: number, durationDays: number, dayWidth: number) {
  return {
    left: startOffset * dayWidth,
    width: Math.max(durationDays * dayWidth - 2, dayWidth - 2),
  };
}

function scheduleModeFromSchedule(schedule: TaskSchedule): ScheduleMode {
  if (schedule.isOngoing) return "ongoing";
  if (schedule.recurrence !== "none") return "recurring";
  return "one_time";
}

function recurrenceLabel(value: Recurrence): string {
  switch (value) {
    case "daily":
      return "Daily";
    case "weekly":
      return "Weekly";
    case "monthly":
      return "Monthly";
    default:
      return "None";
  }
}

type GanttRow =
  | { type: "phase"; label: string }
  | { type: "task"; label: string; task: Task; isApprovalGate: boolean }
  | { type: "subtask"; label: string; parentTask: Task; subtaskIndex: number; subtaskCount: number };

export default function GanttSection() {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedPrimaryTaskId, setSelectedPrimaryTaskId] = useState<string | null>(null);
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null);
  const [dragging, setDragging] = useState<DragState | null>(null);
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

  const extractTasksFromHierarchyTree = useCallback((tree: HierarchyTreeNode | null | undefined): Task[] => {
    if (!tree) return [];
    const out: Task[] = [];
    const stack: HierarchyTreeNode[] = [tree];
    while (stack.length > 0) {
      const current = stack.pop()!;
      if (current?.node?.node_type === "task") {
        out.push(current.node as Task);
      }
      if (Array.isArray(current?.children)) {
        for (const child of current.children) stack.push(child);
      }
    }
    return out;
  }, []);

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
        const projectsRes = await fetch(`${API_BASE}/api/nodes?node_type=project`);
        if (!projectsRes.ok) throw new Error("Failed to fetch projects for gantt");
        const projectsData = await projectsRes.json();
        const allProjects: Project[] = projectsData.nodes || projectsData || [];

        const trees = await Promise.all(
          allProjects.map(async (project) => {
            try {
              const res = await fetch(`${API_BASE}/api/hierarchy/tree/${project.id}?depth=4`);
              if (!res.ok) return [] as Task[];
              const data = await res.json();
              return extractTasksFromHierarchyTree(data?.node ? data : null);
            } catch {
              return [] as Task[];
            }
          })
        );

        const dedup = new Map<string, Task>();
        for (const task of trees.flat()) {
          dedup.set(task.id, task);
        }
        setTasks(Array.from(dedup.values()));
      } else {
        const res = await fetch(`${API_BASE}/api/hierarchy/tree/${selectedProjectId}?depth=4`);
        if (!res.ok) throw new Error("Failed to fetch project tasks");
        const data = await res.json();
        setTasks(extractTasksFromHierarchyTree(data?.node ? data : null));
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, [extractTasksFromHierarchyTree, selectedProjectId]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    const source = new EventSource("/api/events/stream");
    source.onmessage = (evt) => {
      if (!evt.data) return;
      try {
        const payload = JSON.parse(evt.data);
        const eventType = payload?.event_type;
        const entityType = String(payload?.entity_type || "").toLowerCase();
        if (
          eventType === "deleted" &&
          (entityType === "task" || entityType === "project" || entityType === "phase")
        ) {
          fetchTasks();
          fetchProjects();
        }
      } catch {
        // noop
      }
    };
    source.onerror = () => source.close();
    return () => source.close();
  }, [fetchProjects, fetchTasks]);

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
    const result: GanttRow[] = [];
    for (const group of groupedTasks) {
      if (group.isPhase) {
        result.push({ type: "phase", label: group.label });
      }
      for (const task of group.tasks) {
        const isApproval = task.status === "review" || task.status === "pending_approval" || task.metadata?.needs_approval;
        result.push({ type: "task", label: task.title, task, isApprovalGate: isApproval });

        const subtasks = Array.isArray(task.metadata?.subtasks)
          ? task.metadata.subtasks.filter((s: unknown) => typeof s === "string" && s.trim().length > 0)
          : [];

        subtasks.forEach((subtask, idx) => {
          result.push({
            type: "subtask",
            label: subtask,
            parentTask: task,
            subtaskIndex: idx,
            subtaskCount: subtasks.length,
          });
        });
      }
    }
    return result;
  }, [groupedTasks]);

  const scheduleByTask = useMemo(() => {
    const map = new Map<string, ReturnType<typeof getTaskSchedule>>();
    tasks.forEach((task) => {
      map.set(task.id, getTaskSchedule(task, timelineStart, TOTAL_DAYS));
    });
    return map;
  }, [tasks, timelineStart, TOTAL_DAYS]);

  const selectedPrimaryTask = useMemo(
    () => tasks.find((t) => t.id === selectedPrimaryTaskId) || null,
    [tasks, selectedPrimaryTaskId]
  );

  const selectedPrimarySchedule = useMemo(() => {
    if (!selectedPrimaryTask) return null;
    return scheduleByTask.get(selectedPrimaryTask.id)?.schedule || null;
  }, [scheduleByTask, selectedPrimaryTask]);

  const patchTaskMetadata = useCallback(
    async (task: Task, metadata: Record<string, any>, changeReason: string) => {
      setSavingTaskId(task.id);
      try {
        const res = await fetch(`${API_BASE}/api/nodes/${task.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            metadata,
            changed_by: "ui-user",
            change_reason: changeReason,
          }),
        });
        if (!res.ok) throw new Error("Failed to save task schedule");
        const updated = await res.json();
        setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, ...updated } : t)));
      } finally {
        setSavingTaskId(null);
      }
    },
    []
  );

  const saveScheduleShift = useCallback(
    async (task: Task, startOffset: number, durationDays: number) => {
      const start = new Date(timelineStart);
      start.setDate(timelineStart.getDate() + startOffset);
      const end = new Date(start);
      end.setDate(start.getDate() + durationDays);

      const current = scheduleByTask.get(task.id)?.schedule;
      const nextSchedule: TaskSchedule = {
        startDate: dateOnly(start),
        endDate: dateOnly(end),
        isOngoing: current?.isOngoing || false,
        recurrence: current?.recurrence || "none",
      };

      await patchTaskMetadata(
        task,
        {
          ...(task.metadata || {}),
          schedule: nextSchedule,
        },
        "move_task_schedule"
      );
    },
    [patchTaskMetadata, scheduleByTask, timelineStart]
  );

  const updateSelectedPrimaryScheduleMode = useCallback(
    async (mode: ScheduleMode) => {
      if (!selectedPrimaryTask || !selectedPrimarySchedule) return;
      const nextSchedule: TaskSchedule = {
        ...selectedPrimarySchedule,
        isOngoing: mode === "ongoing",
        recurrence: mode === "recurring" ? (selectedPrimarySchedule.recurrence === "none" ? "weekly" : selectedPrimarySchedule.recurrence) : "none",
      };
      await patchTaskMetadata(
        selectedPrimaryTask,
        {
          ...(selectedPrimaryTask.metadata || {}),
          schedule: nextSchedule,
        },
        "update_task_schedule_mode"
      );
      toast.success(`Primary task set to ${mode === "one_time" ? "one-time" : mode}`);
    },
    [patchTaskMetadata, selectedPrimarySchedule, selectedPrimaryTask]
  );

  const updateSelectedPrimaryRecurrence = useCallback(
    async (recurrence: Recurrence) => {
      if (!selectedPrimaryTask || !selectedPrimarySchedule) return;
      const nextSchedule: TaskSchedule = {
        ...selectedPrimarySchedule,
        isOngoing: false,
        recurrence,
      };
      await patchTaskMetadata(
        selectedPrimaryTask,
        {
          ...(selectedPrimaryTask.metadata || {}),
          schedule: nextSchedule,
        },
        "update_task_recurrence"
      );
      toast.success(`Recurring schedule set to ${recurrenceLabel(recurrence).toLowerCase()}`);
    },
    [patchTaskMetadata, selectedPrimarySchedule, selectedPrimaryTask]
  );

  useEffect(() => {
    if (tasks.length === 0) {
      setSelectedPrimaryTaskId(null);
      return;
    }
    setSelectedPrimaryTaskId((prev) => (prev && tasks.some((t) => t.id === prev) ? prev : tasks[0].id));
  }, [tasks]);

  useEffect(() => {
    if (!dragging) return;

    const handleMouseMove = (event: MouseEvent) => {
      const deltaDays = Math.round((event.clientX - dragging.startX) / DAY_WIDTH);
      const maxStart = Math.max(0, TOTAL_DAYS - dragging.durationDays);
      const currentStartOffset = Math.min(Math.max(0, dragging.originStartOffset + deltaDays), maxStart);
      setDragging((prev) => (prev ? { ...prev, currentStartOffset } : prev));
    };

    const handleMouseUp = () => {
      setDragging((prev) => {
        if (!prev) return null;
        if (prev.currentStartOffset !== prev.originStartOffset) {
          const task = tasks.find((t) => t.id === prev.taskId);
          if (task) {
            void saveScheduleShift(task, prev.currentStartOffset, prev.durationDays)
              .then(() => toast.success("Task schedule moved"))
              .catch(() => toast.error("Failed to save task schedule"));
          }
        }
        return null;
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [DAY_WIDTH, TOTAL_DAYS, dragging, saveScheduleShift, tasks]);

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

      {/* Schedule controls for primary task */}
      {selectedPrimaryTask && selectedPrimarySchedule && (
        <div className="px-6 py-3 border-b border-border bg-card/40 flex flex-wrap items-center gap-3">
          <Badge variant="outline" className="font-medium">Primary: {selectedPrimaryTask.title}</Badge>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Schedule Type</span>
            <Select
              value={scheduleModeFromSchedule(selectedPrimarySchedule)}
              onValueChange={(v) => void updateSelectedPrimaryScheduleMode(v as ScheduleMode)}
              disabled={savingTaskId === selectedPrimaryTask.id}
            >
              <SelectTrigger className="w-[160px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="one_time">One-time</SelectItem>
                <SelectItem value="ongoing">Ongoing</SelectItem>
                <SelectItem value="recurring">Recurring</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {scheduleModeFromSchedule(selectedPrimarySchedule) === "recurring" && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Cadence</span>
              <Select
                value={selectedPrimarySchedule.recurrence}
                onValueChange={(v) => void updateSelectedPrimaryRecurrence(v as Recurrence)}
                disabled={savingTaskId === selectedPrimaryTask.id}
              >
                <SelectTrigger className="w-[140px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <span className="text-xs text-muted-foreground">Drag primary bars to move schedule. Subtasks are locked.</span>
        </div>
      )}

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
                ) : row.type === "subtask" ? (
                  <div className="flex items-center gap-2 min-w-0 pl-4">
                    <Lock className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                    <span className="text-[11px] text-muted-foreground truncate">{row.label}</span>
                  </div>
                ) : (
                  <div
                    className={cn(
                      "flex items-center gap-2 min-w-0 rounded px-1 py-0.5",
                      selectedPrimaryTaskId === row.task.id && "bg-primary/10"
                    )}
                    onClick={() => setSelectedPrimaryTaskId(row.task.id)}
                  >
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
                {row.type === "task" && (
                  <div className="absolute inset-y-0 flex items-center" style={{ left: 0 }}>
                    {(() => {
                      const schedule = scheduleByTask.get(row.task.id) || getTaskSchedule(row.task, timelineStart, TOTAL_DAYS);
                      const startOffset = dragging?.taskId === row.task.id ? dragging.currentStartOffset : schedule.startOffset;
                      const bar = getTaskBarProps(startOffset, schedule.durationDays, DAY_WIDTH);
                      const statusColor = STATUS_COLORS[row.task.status] || "bg-zinc-500";
                      const statusLabel = STATUS_LABELS[row.task.status] || row.task.status;
                      return (
                        <div
                          className={cn(
                            "absolute h-7 rounded-md flex items-center px-2 text-[10px] font-medium text-white shadow-sm cursor-grab active:cursor-grabbing",
                            statusColor,
                            row.isApprovalGate && "ring-2 ring-amber-400/50",
                            selectedPrimaryTaskId === row.task.id && "ring-2 ring-primary/60",
                            savingTaskId === row.task.id && "opacity-70"
                          )}
                          style={{ left: bar.left, width: bar.width }}
                          title={`${row.task.title} — ${statusLabel}`}
                          onMouseDown={(event) => {
                            event.preventDefault();
                            setSelectedPrimaryTaskId(row.task.id);
                            setDragging({
                              taskId: row.task.id,
                              startX: event.clientX,
                              originStartOffset: schedule.startOffset,
                              durationDays: schedule.durationDays,
                              currentStartOffset: schedule.startOffset,
                            });
                          }}
                        >
                          <span className="truncate">{row.task.title}</span>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Subtask bars (locked visual segments under primary task) */}
                {row.type === "subtask" && (
                  <div className="absolute inset-y-0 flex items-center" style={{ left: 0 }}>
                    {(() => {
                      const parentSchedule = scheduleByTask.get(row.parentTask.id) || getTaskSchedule(row.parentTask, timelineStart, TOTAL_DAYS);
                      const parentBar = getTaskBarProps(parentSchedule.startOffset, parentSchedule.durationDays, DAY_WIDTH);
                      const segmentWidth = Math.max(Math.floor(parentBar.width / Math.max(1, row.subtaskCount)) - 2, DAY_WIDTH - 8);
                      const left = parentBar.left + row.subtaskIndex * Math.max(1, Math.floor(parentBar.width / Math.max(1, row.subtaskCount)));
                      return (
                        <div
                          className="absolute h-6 rounded-md flex items-center px-2 text-[10px] font-medium text-zinc-200 bg-zinc-600/80 border border-zinc-400/20"
                          style={{ left, width: segmentWidth }}
                          title={`${row.label} (locked subtask)`}
                        >
                          <Lock className="w-3 h-3 mr-1 opacity-70" />
                          <span className="truncate">{row.label}</span>
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
        <span className="flex items-center gap-1"><Lock className="w-3 h-3 text-zinc-300" /> Locked Subtask</span>
      </div>
    </div>
  );
}
