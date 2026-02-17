"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CreateTaskDialog from "@/components/CreateTaskDialog";
import TaskDetailDialog from "@/components/TaskDetailDialog";
import {
  Search,
  Plus,
  Calendar,
  User,
  Bot,
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  LayoutList,
  Columns3,
  Loader2,
  RefreshCw,
  Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { canonicalTaskStatus, isDoneStatus, isInProgressStatus, taskStatusLabel } from "@/utils/workflow-status";

const OPAL_BASE_URL = '/api/opal/proxy';

interface TaskNode {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  dueDate?: string;
  assignees: { id: string; name: string; type: 'user' | 'agent' }[];
  metadata: any;
}

// Kanban columns mapping
const KANBAN_COLUMNS = [
  { id: 'backlog', label: 'Backlog', statuses: ['backlog', 'todo'] },
  { id: 'in_progress', label: 'In Progress', statuses: ['in_progress', 'in-progress'] },
  { id: 'review', label: 'Review', statuses: ['review', 'pending'] },
  { id: 'completed', label: 'Done', statuses: ['completed', 'done', 'approved'] },
];

export default function TasksSection({
  onNavigate,
  selectedProjectId,
  selectedProjectTitle,
}: {
  onNavigate?: (tab: string) => void;
  selectedProjectId?: string;
  selectedProjectTitle?: string;
}) {
  const [tasks, setTasks] = useState<TaskNode[]>([]);
  const [assignees, setAssignees] = useState<Map<string, { name: string; type: string }>>(new Map());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban');
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskNode | null>(null);

  useEffect(() => {
    fetchTasks();
  }, [selectedProjectId]);

  const extractTasksFromHierarchyTree = (tree: any): any[] => {
    if (!tree) return [];
    const out: any[] = [];
    const stack: any[] = [tree];
    while (stack.length > 0) {
      const current = stack.pop();
      if (current?.node?.node_type === 'task') out.push(current.node);
      if (Array.isArray(current?.children)) {
        for (const child of current.children) stack.push(child);
      }
    }
    return out;
  };

  const fetchTasks = async () => {
    try {
      setLoading(true);

      // Fetch task nodes, optionally scoped to selected project hierarchy
      let nodes: any[] = [];
      if (selectedProjectId) {
        const treeRes = await fetch(`${OPAL_BASE_URL}/api/hierarchy/tree/${selectedProjectId}?depth=4`);
        if (!treeRes.ok) throw new Error('Failed to fetch project tasks');
        const treeData = await treeRes.json();
        nodes = extractTasksFromHierarchyTree(treeData?.node ? treeData : null);
      } else {
        const nodesRes = await fetch(`${OPAL_BASE_URL}/api/nodes?node_type=task`);
        if (!nodesRes.ok) throw new Error('Failed to fetch tasks');
        const nodesData = await nodesRes.json();
        nodes = nodesData.nodes || nodesData || [];
      }

      // Fetch edges to get assignments
      const edgesRes = await fetch(`${OPAL_BASE_URL}/api/edges`);
      const edgesData = edgesRes.ok ? await edgesRes.json() : { edges: [] };
      const edges = edgesData.edges || edgesData || [];

      // Fetch users and agents for assignment names
      const allNodesRes = await fetch(`${OPAL_BASE_URL}/api/nodes`);
      const allNodesData = allNodesRes.ok ? await allNodesRes.json() : { nodes: [] };
      const allNodes = allNodesData.nodes || allNodesData || [];

      // Build assignee lookup
      const assigneeLookup = new Map<string, { name: string; type: string }>();
      allNodes.forEach((node: any) => {
        if (node.node_type === 'user' || node.node_type === 'agent') {
          assigneeLookup.set(node.id, { name: node.title, type: node.node_type });
        }
      });
      setAssignees(assigneeLookup);

      // Build assignment map from edges
      const assignmentMap = new Map<string, { id: string; name: string; type: 'user' | 'agent' }[]>();
      edges.forEach((edge: any) => {
        if (edge.edge_type === 'assigned_to') {
          const taskId = edge.source_node_id;
          const assigneeId = edge.target_node_id;
          const assignee = assigneeLookup.get(assigneeId);
          if (assignee) {
            const existing = assignmentMap.get(taskId) || [];
            existing.push({ id: assigneeId, name: assignee.name, type: assignee.type as 'user' | 'agent' });
            assignmentMap.set(taskId, existing);
          }
        }
      });

      // Transform nodes to tasks (exclude templates)
      const taskList: TaskNode[] = nodes
        .filter((node: any) => {
          const meta = typeof node.metadata === 'string' ? JSON.parse(node.metadata) : (node.metadata || {});
          return !meta.is_template && node.status !== 'template';
        })
        .map((node: any) => {
          const metadata = typeof node.metadata === 'string' ? JSON.parse(node.metadata) : (node.metadata || {});
          return {
            id: node.id,
            title: node.title,
            description: node.description || '',
            status: canonicalTaskStatus(node.status || metadata.status || 'backlog'),
            priority: metadata.priority || 'medium',
            dueDate: metadata.due_date,
            assignees: assignmentMap.get(node.id) || [],
            metadata
          };
        });

      setTasks(taskList);
    } catch (err: any) {
      console.error('Error fetching tasks:', err);
      toast.error(selectedProjectId ? 'Failed to load project tasks' : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTask = async (taskId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const taskToDelete = tasks.find((task) => task.id === taskId);
    const confirmed = confirm(
      `Delete "${taskToDelete?.title || "this task"}" and its related records?\n\nThis action cannot be undone.`
    );
    if (!confirmed) return;
    try {
      const res = await fetch(`${OPAL_BASE_URL}/api/hierarchy/work-packages/${taskId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          changed_by: 'ui-user',
          change_reason: 'User deleted task from Tasks section',
        }),
      });
      if (!res.ok) throw new Error('Failed to delete');
      setTasks(prev => prev.filter(t => t.id !== taskId));
      setSelectedTask(null);
      toast.success(`Task removed: ${taskToDelete?.title || taskId}`);
      fetchTasks();
    } catch (err: any) {
      toast.error(`Could not remove task: ${err.message}`);
    }
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || task.status === filterStatus;
    const matchesPriority = filterPriority === "all" || task.priority === filterPriority;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const getStatusColor = (status: string) => {
    if (isDoneStatus(status)) return "text-green-500";
    if (isInProgressStatus(status)) return "text-blue-500";
    if (canonicalTaskStatus(status) === 'review') return "text-yellow-500";
    return "text-muted-foreground";
  };

  const getStatusIcon = (status: string) => {
    if (isDoneStatus(status)) return CheckCircle2;
    if (isInProgressStatus(status)) return Clock;
    if (canonicalTaskStatus(status) === 'review') return AlertCircle;
    return Circle;
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high': return <Badge variant="destructive" className="text-xs">High</Badge>;
      case 'medium': return <Badge variant="secondary" className="text-xs">Medium</Badge>;
      case 'low': return <Badge variant="outline" className="text-xs">Low</Badge>;
      default: return null;
    }
  };

  const getTasksForColumn = (column: typeof KANBAN_COLUMNS[0]) => {
    return filteredTasks.filter(task => column.statuses.includes(canonicalTaskStatus(task.status)));
  };

  // Task Card Component
  const TaskCard = ({ task }: { task: TaskNode }) => {
    const StatusIcon = getStatusIcon(task.status);
    return (
      <Card
        className="mb-3 hover:shadow-md transition-shadow cursor-pointer group"
        onClick={() => setSelectedTask(task)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <h4 className="font-medium text-sm line-clamp-2 flex-1">{task.title}</h4>
            <div className="flex items-center gap-1 flex-shrink-0">
              {getPriorityBadge(task.priority)}
              <button
                onClick={(e) => handleDeleteTask(task.id, e)}
                className="p-1 rounded hover:bg-red-500/10 text-muted-foreground/40 hover:text-red-400 transition-all"
                title="Delete task"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>

          {task.description && (
            <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
              {task.description}
            </p>
          )}

          {/* Subtask indicators */}
          {task.metadata?.is_macro_task && task.metadata?.subtask_ids?.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-purple-400 mb-2">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 3v12"/><path d="M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><path d="M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><path d="M18 9c0 6-6 6-6 12"/></svg>
              {task.metadata.subtask_ids.length} subtask{task.metadata.subtask_ids.length !== 1 ? 's' : ''}
            </div>
          )}
          {task.metadata?.is_subtask && (
            <div className="text-[10px] text-purple-400/70 mb-2">↳ subtask</div>
          )}

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              {task.dueDate && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>{task.dueDate}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1">
              {task.assignees.slice(0, 2).map((assignee, i) => (
                <div key={assignee.id} className="flex items-center gap-1" title={assignee.name}>
                  {assignee.type === 'agent' ? (
                    <Bot className="w-3 h-3 text-purple-500" />
                  ) : (
                    <User className="w-3 h-3" />
                  )}
                </div>
              ))}
              {task.assignees.length > 2 && (
                <span>+{task.assignees.length - 2}</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">{selectedProjectId ? 'Loading project tasks...' : 'Loading tasks...'}</span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold">Tasks</h2>
          <Badge variant="secondary">{tasks.length} total</Badge>
          {selectedProjectId && <Badge variant="outline">Project scoped</Badge>}
        </div>

        {selectedProjectId && (
          <p className="text-xs text-muted-foreground hidden lg:block">
            Viewing: {selectedProjectTitle || selectedProjectId}
          </p>
        )}

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-9 w-64"
            />
          </div>

          {/* View Toggle */}
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-r-none"
            >
              <LayoutList className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'kanban' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('kanban')}
              className="rounded-l-none"
            >
              <Columns3 className="w-4 h-4" />
            </Button>
          </div>

          {/* Refresh */}
          <Button variant="outline" size="sm" onClick={fetchTasks}>
            <RefreshCw className="w-4 h-4" />
          </Button>

          {/* New Task */}
          <Button size="sm" onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-1" />
            New Task
          </Button>
        </div>
      </div>

      {/* Create Task Dialog */}
      <CreateTaskDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onTaskCreated={fetchTasks}
        onNeedHelp={() => {
          setShowCreateDialog(false);
          onNavigate?.('ai-chat');
        }}
      />

      {/* Content */}
      {viewMode === 'kanban' ? (
        /* Kanban View */
        <div className="flex-1 overflow-x-auto p-4">
          <div className="flex gap-4 h-full min-w-max">
            {KANBAN_COLUMNS.map(column => {
              const columnTasks = getTasksForColumn(column);
              return (
                <div
                  key={column.id}
                  className="w-72 flex-shrink-0 bg-muted/30 rounded-lg flex flex-col"
                >
                  {/* Column Header */}
                  <div className="p-3 border-b border-border/50">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-sm">{column.label}</h3>
                      <Badge variant="secondary" className="text-xs">
                        {columnTasks.length}
                      </Badge>
                    </div>
                  </div>

                  {/* Column Content */}
                  <ScrollArea className="flex-1 p-3">
                    {columnTasks.map(task => (
                      <TaskCard key={task.id} task={task} />
                    ))}

                    {columnTasks.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        No tasks
                      </div>
                    )}
                  </ScrollArea>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* List View */
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-2">
            {filteredTasks.map(task => {
              const StatusIcon = getStatusIcon(task.status);
              return (
                <div
                  key={task.id}
                  className="flex items-center gap-4 p-4 bg-card rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedTask(task)}
                >
                  <StatusIcon className={cn("w-5 h-5 flex-shrink-0", getStatusColor(task.status))} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm truncate">{task.title}</h4>
                      {getPriorityBadge(task.priority)}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{task.description}</p>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {task.dueDate && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{task.dueDate}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-1">
                      {task.assignees.map((assignee, i) => (
                        <div key={assignee.id} className="flex items-center gap-1" title={assignee.name}>
                          {assignee.type === 'agent' ? (
                            <Bot className="w-4 h-4 text-purple-500" />
                          ) : (
                            <User className="w-4 h-4" />
                          )}
                          <span className="hidden sm:inline">{assignee.name}</span>
                        </div>
                      ))}
                    </div>

                    <Badge variant="outline">
                      {taskStatusLabel(task.status)}
                    </Badge>

                    <button
                      onClick={(e) => handleDeleteTask(task.id, e)}
                      className="p-1 rounded hover:bg-red-500/10 text-muted-foreground/40 hover:text-red-400 transition-all"
                      title="Delete task"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredTasks.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="text-4xl mb-4">📋</div>
                <h3 className="text-lg font-medium mb-2">
                  {selectedProjectId ? "No tasks yet for this project" : "No tasks found"}
                </h3>
                <p className="text-muted-foreground text-sm text-center">
                  {selectedProjectId
                    ? "Start by creating your first task for this project."
                    : "Create a task to give your team and agents something to work on."}
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <Button size="sm" onClick={() => setShowCreateDialog(true)}>
                    <Plus className="w-4 h-4 mr-1" />
                    Create Task
                  </Button>
                  {selectedProjectId && (
                    <Button size="sm" variant="outline" onClick={() => onNavigate?.('projects')}>
                      View Project
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      )}

      {/* Task Detail Dialog */}
      <TaskDetailDialog
        task={selectedTask}
        open={!!selectedTask}
        onOpenChange={(open) => !open && setSelectedTask(null)}
        onTaskUpdated={() => { fetchTasks(); setSelectedTask(null); }}
      />
    </div>
  );
}
