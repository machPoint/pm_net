"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import {
  ClipboardCheck,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  MessageSquare,
  Search,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  FileText,
  CalendarDays,
  Bot,
  FolderKanban,
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

interface ApprovalItem {
  id: string;
  task_id: string;
  task_title: string;
  project_title?: string;
  project_id?: string;
  description?: string;
  deliverable?: string;
  agent_output?: string;
  status: "pending" | "approved" | "rejected" | "revision_requested";
  submitted_at?: string;
  reviewed_at?: string;
  feedback?: string;
  metadata?: Record<string, any>;
}

// ============================================================================
// Status config
// ============================================================================

const APPROVAL_STATUS: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  pending:            { label: "Pending Review", color: "text-amber-400",   bg: "bg-amber-500/15 border-amber-500/30",   icon: Clock },
  approved:           { label: "Approved",       color: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/30", icon: CheckCircle2 },
  rejected:           { label: "Rejected",       color: "text-red-400",     bg: "bg-red-500/15 border-red-500/30",       icon: XCircle },
  revision_requested: { label: "Revision Req.",  color: "text-blue-400",    bg: "bg-blue-500/15 border-blue-500/30",     icon: RotateCcw },
};

function ApprovalStatusPill({ status }: { status: string }) {
  const cfg = APPROVAL_STATUS[status] || APPROVAL_STATUS.pending;
  const Icon = cfg.icon;
  return (
    <Badge
      variant="outline"
      className={cn("text-[11px] font-medium gap-1.5 px-2.5 py-0.5 rounded-full", cfg.bg, cfg.color)}
    >
      <Icon className="w-3 h-3" />
      {cfg.label}
    </Badge>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function ApprovalsSection() {
  const [loading, setLoading] = useState(true);
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Detail / review dialog
  const [selectedApproval, setSelectedApproval] = useState<ApprovalItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // ── Fetch approvals ─────────────────────────────────────────────────

  const fetchApprovals = useCallback(async () => {
    try {
      setLoading(true);

      const items: ApprovalItem[] = [];

      // 1. Fetch gate nodes (approval gates created during execution)
      try {
        const gatesRes = await fetch(`${API_BASE}/api/nodes?node_type=gate`);
        if (gatesRes.ok) {
          const gatesData = await gatesRes.json();
          const gates = (gatesData.nodes || gatesData || []).filter((g: any) => !g.deleted_at);
          for (const gate of gates) {
            const meta = typeof gate.metadata === "string" ? JSON.parse(gate.metadata) : (gate.metadata || {});
            const statusMap: Record<string, ApprovalItem["status"]> = {
              pending_approval: "pending",
              approved: "approved",
              rejected: "rejected",
            };
            items.push({
              id: gate.id,
              task_id: meta.task_id || gate.id,
              task_title: meta.task_title || gate.title,
              project_title: "",
              project_id: "",
              description: gate.description,
              status: statusMap[gate.status] || "pending",
              submitted_at: meta.requested_at || gate.created_at,
              reviewed_at: meta.resolved_at,
              feedback: meta.reason,
              metadata: { ...meta, _node_type: "gate", _gate_id: gate.id, step_order: meta.step_order },
            });
          }
        }
      } catch {}

      // 2. Fetch tasks that need approval (status = review or pending_approval)
      try {
        const res = await fetch(`${API_BASE}/api/nodes?node_type=task`);
        if (res.ok) {
          const data = await res.json();
          const tasks = (data.nodes || data || []);
          const reviewTasks = tasks.filter(
            (t: any) =>
              t.status === "review" ||
              t.status === "pending_approval" ||
              t.metadata?.needs_approval === true
          );

          for (const task of reviewTasks) {
            items.push({
              id: task.id,
              task_id: task.id,
              task_title: task.title,
              description: task.description,
              deliverable: task.metadata?.deliverable || task.metadata?.agent_output,
              agent_output: task.metadata?.agent_output,
              status: task.metadata?.approval_status || "pending",
              submitted_at: task.metadata?.completed_at || task.updated_at,
              reviewed_at: task.metadata?.reviewed_at,
              feedback: task.metadata?.review_feedback,
              metadata: task.metadata,
            });
          }
        }
      } catch {}

      setApprovals(items);
    } catch (err: any) {
      console.error("Error fetching approvals:", err);
      toast.error("Failed to load approvals");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  // ── Filtered ────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = approvals;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (a) =>
          a.task_title.toLowerCase().includes(q) ||
          a.project_title?.toLowerCase().includes(q) ||
          a.description?.toLowerCase().includes(q)
      );
    }
    if (filterStatus !== "all") {
      list = list.filter((a) => a.status === filterStatus);
    }
    return list;
  }, [approvals, searchQuery, filterStatus]);

  const pendingCount = approvals.filter((a) => a.status === "pending").length;

  // ── Approve / Reject / Request Revision ─────────────────────────────

  const handleDecision = async (decision: "approved" | "rejected" | "revision_requested") => {
    if (!selectedApproval) return;
    setSubmitting(true);
    try {
      const isGate = selectedApproval.metadata?._node_type === "gate";

      if (isGate) {
        // Resolve the gate node via the dedicated gate endpoint
        const gateId = selectedApproval.metadata?._gate_id || selectedApproval.id;
        const res = await fetch(`${API_BASE}/api/task-intake/gates/${gateId}/resolve`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            approved: decision === "approved",
            reason: feedback,
            resolved_by: "ui-reviewer",
          }),
        });
        if (!res.ok) throw new Error("Failed to resolve gate");
      } else {
        // Patch the task node directly
        const res = await fetch(`${API_BASE}/api/nodes/${selectedApproval.task_id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            changed_by: "ui-reviewer",
            change_reason: `Approval decision: ${decision}`,
            status: decision === "approved" ? "done" : decision === "rejected" ? "cancelled" : "in_progress",
            metadata: {
              ...selectedApproval.metadata,
              approval_status: decision,
              review_feedback: feedback,
              reviewed_at: new Date().toISOString(),
              needs_approval: decision === "revision_requested",
            },
          }),
        });
        if (!res.ok) throw new Error("Failed to submit review");
      }

      const labels: Record<string, string> = {
        approved: isGate ? "Gate approved — execution will continue!" : "Task approved!",
        rejected: isGate ? "Gate rejected — execution stopped" : "Task rejected",
        revision_requested: "Revision requested — AI will redo with your feedback",
      };
      toast.success(labels[decision]);
      setDetailOpen(false);
      setFeedback("");
      fetchApprovals();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
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
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] flex items-center gap-2">
            Approvals
            {pendingCount > 0 && (
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">
                {pendingCount} pending
              </Badge>
            )}
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            Review agent deliverables — approve, reject, or request revisions with feedback
          </p>
        </div>

        {/* Search + Filter */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-secondary)]" />
            <Input
              placeholder="Search approvals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="revision_requested">Revision Req.</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Approval Cards */}
        {filtered.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-border rounded-lg">
            <ClipboardCheck className="w-12 h-12 mx-auto text-[var(--color-text-secondary)] mb-4 opacity-50" />
            <h3 className="text-lg font-medium text-[var(--color-text-primary)]">
              {approvals.length === 0 ? "No approvals yet" : "No matching approvals"}
            </h3>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">
              {approvals.length === 0
                ? "When an agent completes a task, it will appear here for your review."
                : "Try adjusting your search or filters."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setSelectedApproval(item);
                  setFeedback(item.feedback || "");
                  setDetailOpen(true);
                }}
                className={cn(
                  "w-full text-left border rounded-lg p-5 transition-all group bg-[var(--color-card)]",
                  item.status === "pending"
                    ? "border-amber-500/30 hover:border-amber-500/60"
                    : "border-border hover:border-blue-500/40"
                )}
              >
                {/* Top: project + status */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-violet-400" />
                    {item.project_title && (
                      <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">
                        {item.project_title}
                      </span>
                    )}
                  </div>
                  <ApprovalStatusPill status={item.status} />
                </div>

                {/* Task title */}
                <h3 className="font-semibold text-[var(--color-text-primary)] group-hover:text-blue-400 transition-colors mb-1 line-clamp-1">
                  {item.task_title}
                </h3>

                {/* Description */}
                {item.description && (
                  <p className="text-xs text-[var(--color-text-secondary)] mb-3 line-clamp-2">
                    {item.description}
                  </p>
                )}

                {/* Deliverable preview */}
                {item.deliverable && (
                  <div className="rounded-md bg-muted/50 border border-border p-2 mb-3">
                    <p className="text-[10px] font-medium text-[var(--color-text-secondary)] mb-1 flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      Deliverable
                    </p>
                    <p className="text-xs text-[var(--color-text-primary)] line-clamp-2 font-mono">
                      {item.deliverable}
                    </p>
                  </div>
                )}

                {/* Footer */}
                {item.submitted_at && (
                  <div className="flex items-center gap-1 text-[10px] text-[var(--color-text-secondary)]">
                    <CalendarDays className="w-3 h-3" />
                    {new Date(item.submitted_at).toLocaleDateString()}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Detail / Review Dialog ───────────────────────────────────── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogDescription className="sr-only">
            Review and decide whether to approve, reject, or request revision for a task.
          </DialogDescription>
          {selectedApproval && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5 text-amber-400" />
                  Review Task
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {/* Task info */}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <ApprovalStatusPill status={selectedApproval.status} />
                    {selectedApproval.project_title && (
                      <Badge variant="outline" className="text-[10px] gap-1">
                        <FolderKanban className="w-3 h-3" />
                        {selectedApproval.project_title}
                      </Badge>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-[var(--color-text-primary)] mt-2">
                    {selectedApproval.task_title}
                  </h3>
                  {selectedApproval.description && (
                    <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                      {selectedApproval.description}
                    </p>
                  )}
                </div>

                {/* Agent output / deliverable */}
                {(selectedApproval.deliverable || selectedApproval.agent_output) && (
                  <div>
                    <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-1.5 flex items-center gap-1">
                      <Bot className="w-3.5 h-3.5" />
                      Agent Deliverable
                    </p>
                    <div className="rounded-md bg-muted/50 border border-border p-3 max-h-[200px] overflow-y-auto">
                      <pre className="text-xs text-[var(--color-text-primary)] whitespace-pre-wrap font-mono leading-relaxed">
                        {selectedApproval.deliverable || selectedApproval.agent_output}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Previous feedback */}
                {selectedApproval.feedback && selectedApproval.status !== "pending" && (
                  <div>
                    <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-1 flex items-center gap-1">
                      <MessageSquare className="w-3.5 h-3.5" />
                      Previous Feedback
                    </p>
                    <p className="text-sm text-[var(--color-text-primary)] bg-muted/30 rounded-md p-2 border border-border">
                      {selectedApproval.feedback}
                    </p>
                  </div>
                )}

                {/* Feedback input (for pending items) */}
                {selectedApproval.status === "pending" && (
                  <div>
                    <label className="text-sm font-medium text-[var(--color-text-primary)] mb-1 block">
                      Feedback (optional for approve, required for revision)
                    </label>
                    <Textarea
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="Add comments, corrections, or guidance for the AI..."
                      rows={3}
                    />
                  </div>
                )}
              </div>

              {/* Action buttons */}
              {selectedApproval.status === "pending" && (
                <DialogFooter className="flex gap-2 sm:gap-2">
                  <Button
                    onClick={() => handleDecision("rejected")}
                    disabled={submitting}
                    variant="outline"
                    className="text-red-400 hover:text-red-300 gap-1"
                  >
                    <ThumbsDown className="w-3.5 h-3.5" />
                    Reject
                  </Button>
                  <Button
                    onClick={() => handleDecision("revision_requested")}
                    disabled={submitting || !feedback.trim()}
                    variant="outline"
                    className="gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Revise
                  </Button>
                  <Button
                    onClick={() => handleDecision("approved")}
                    disabled={submitting}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                  >
                    {submitting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ThumbsUp className="w-3.5 h-3.5" />
                    )}
                    Approve
                  </Button>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </ScrollArea>
  );
}
