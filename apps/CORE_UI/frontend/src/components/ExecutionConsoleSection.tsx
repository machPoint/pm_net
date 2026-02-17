"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Play, RefreshCw, TerminalSquare, Wrench, Bot, Clock3, CheckCircle2, AlertCircle, Shield, XCircle, HeartPulse, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type StepStatus = "pending" | "running" | "completed" | "failed";

interface PlanStep {
  order: number;
  action: string;
  expected_outcome?: string;
  tool?: string | null;
  step_type?: "task" | "approval_gate";
}

interface StepToolCall {
  name: string;
  arguments?: Record<string, any>;
  result?: string;
  error?: string;
}

interface StepExecutionLog {
  order: number;
  action: string;
  expected_outcome?: string;
  tool?: string | null;
  step_type?: string;
  status: StepStatus;
  source?: string;
  model?: string;
  duration_ms?: number;
  oc_session_id?: string;
  full_output?: string;
  tool_calls: StepToolCall[];
}

interface ActivityLogItem {
  id: string;
  timestamp: string;
  type: string;
  summary: string;
  metadata?: Record<string, any>;
}

interface ReactivationStatus {
  can_reactivate: boolean;
  next_step_order: number | null;
  pending_gate_id: string | null;
  pending_gate_step_order: number | null;
  message: string;
}

const API_BASE = "/api/opal/proxy/api/task-intake";
const ACTIVE_SESSION_KEY = "pmnet_active_intake_session_id";

export default function ExecutionConsoleSection() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [taskTitle, setTaskTitle] = useState<string>("");
  const [agentId, setAgentId] = useState<string>("");
  const [runId, setRunId] = useState<string>("");
  const [steps, setSteps] = useState<PlanStep[]>([]);
  const [stepLogs, setStepLogs] = useState<Record<number, StepExecutionLog>>({});
  const [activityFeed, setActivityFeed] = useState<ActivityLogItem[]>([]);
  const [executing, setExecuting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [runStartedAt, setRunStartedAt] = useState<string | null>(null);
  const [runCompletedAt, setRunCompletedAt] = useState<string | null>(null);
  const [runDurationMs, setRunDurationMs] = useState<number | null>(null);
  const [selectedStepOrder, setSelectedStepOrder] = useState<number | null>(null);

  const [autoStartPending, setAutoStartPending] = useState(false);
  const [pendingGate, setPendingGate] = useState<{ gateNodeId: string; stepOrder: number; action: string } | null>(null);
  const [gateResolving, setGateResolving] = useState(false);
  const [reactivation, setReactivation] = useState<ReactivationStatus | null>(null);

  const activityEndRef = useRef<HTMLDivElement>(null);
  const outputEndRef = useRef<HTMLDivElement>(null);
  const stepRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const chunkBufferRef = useRef<Record<number, string>>({});
  const chunkFlushTimerRef = useRef<number | null>(null);

  const flushChunkBuffer = useCallback(() => {
    if (chunkFlushTimerRef.current !== null) {
      window.clearTimeout(chunkFlushTimerRef.current);
      chunkFlushTimerRef.current = null;
    }

    const buffered = chunkBufferRef.current;
    const entries = Object.entries(buffered);
    if (entries.length === 0) return;

    chunkBufferRef.current = {};

    setStepLogs((prev) => {
      const next = { ...prev };
      for (const [orderRaw, chunk] of entries) {
        if (!chunk) continue;
        const order = Number(orderRaw);
        const existing = next[order] || {
          order,
          action: "Executing step",
          tool_calls: [],
          status: "running" as StepStatus,
        };

        next[order] = {
          ...existing,
          status: "running",
          full_output: `${existing.full_output || ""}${chunk}`,
        };
      }
      return next;
    });
  }, []);

  const fetchReactivationStatus = useCallback(async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/sessions/${id}/reactivation-status`);
      const data = await res.json();
      if (!res.ok || data?.ok === false) return;
      setReactivation({
        can_reactivate: Boolean(data.can_reactivate),
        next_step_order: typeof data.next_step_order === "number" ? data.next_step_order : null,
        pending_gate_id: data.pending_gate_id || null,
        pending_gate_step_order: typeof data.pending_gate_step_order === "number" ? data.pending_gate_step_order : null,
        message: String(data.message || ""),
      });
    } catch {
      // no-op
    }
  }, []);

  const hydrateExecutionResults = useCallback(async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/sessions/${id}/execution-results`);
      if (!res.ok) {
        let detail = "";
        try {
          const errData = await res.json();
          detail = String(errData?.error || "");
        } catch {
          // ignore parse errors
        }

        // "No active run" is normal for sessions that haven't executed yet — just skip silently
        if (/no active run/i.test(detail)) return;

        // Only clear session for genuine "session not found" (e.g. after backend restart)
        if (res.status === 404 || /session not found/i.test(detail)) {
          if (typeof window !== "undefined") {
            localStorage.removeItem(ACTIVE_SESSION_KEY);
          }
          setSessionId(null);
          setError("Execution session expired after backend restart. Click Reload Session.");
        }
        return;
      }
      const data = await res.json();
      if (!data.ok || !Array.isArray(data.steps)) return;

      setStepLogs((prev) => {
        const next = { ...prev };
        for (const step of data.steps) {
          const order = Number(step.step_order || 0);
          if (!order) continue;
          const existing = next[order] || {
            order,
            action: step.action || `Step ${order}`,
            tool_calls: [],
            status: "pending" as StepStatus,
          };

          next[order] = {
            ...existing,
            action: step.action || existing.action,
            tool: step.tool ?? existing.tool,
            status: step.success === false ? "failed" : "completed",
            source: step.source || existing.source,
            model: step.model || existing.model,
            duration_ms: step.duration_ms ?? existing.duration_ms,
            full_output: step.output || existing.full_output,
            tool_calls: Array.isArray(step.tool_calls)
              ? step.tool_calls.map((name: string) => ({ name }))
              : existing.tool_calls || [],
          };
        }
        return next;
      });

      if (!selectedStepOrder && Array.isArray(data.steps) && data.steps.length > 0) {
        const firstOrder = Number(data.steps[0]?.step_order || 0);
        if (firstOrder) setSelectedStepOrder(firstOrder);
      }

      if (typeof data.total_duration_ms === "number" && data.total_duration_ms > 0) {
        setRunDurationMs(data.total_duration_ms);
      }
    } catch {
      // ignore transient hydrate errors
    }
  }, [selectedStepOrder]);

  const scheduleChunkFlush = useCallback(() => {
    if (chunkFlushTimerRef.current !== null) return;
    chunkFlushTimerRef.current = window.setTimeout(() => {
      flushChunkBuffer();
    }, 60);
  }, [flushChunkBuffer]);

  const appendActivity = useCallback((item: Omit<ActivityLogItem, "id">) => {
    setActivityFeed((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, ...item },
    ]);
  }, []);

  const loadSessionState = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/sessions/${id}`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Failed to load execution session");

      const task = data.task || null;
      const plan = data.plan || null;
      const planSteps: PlanStep[] = Array.isArray(plan?.metadata?.steps) ? plan.metadata.steps : [];
      const executionAgentId =
        String(task?.metadata?.execution_agent_id || task?.metadata?.assigned_agent_id || "").trim() ||
        data.session.agent_id ||
        "main";

      setSessionId(data.session.id);
      setTaskTitle(task?.title || "Untitled Project");
      setAgentId(executionAgentId);
      setRunId(data.session.run_id || "");
      setSteps(planSteps);
      setStepLogs(
        Object.fromEntries(
          planSteps.map((s: PlanStep, i: number) => [
            s.order || i + 1,
            {
              order: s.order || i + 1,
              action: s.action,
              expected_outcome: s.expected_outcome,
              tool: s.tool || null,
              step_type: s.step_type || "task",
              status: "pending",
              tool_calls: [],
            } as StepExecutionLog,
          ])
        )
      );
      if (planSteps.length > 0) {
        setSelectedStepOrder(planSteps[0].order || 1);
      }

      await hydrateExecutionResults(data.session.id);
      await fetchReactivationStatus(data.session.id);

      // If session is approved but not yet executed, flag for auto-start
      if (data.session.stage === "execute" && !data.session.run_id && planSteps.length > 0) {
        setAutoStartPending(true);
      }

      appendActivity({
        timestamp: new Date().toISOString(),
        type: "session_loaded",
        summary: `Loaded execution context for ${task?.title || "task"}`,
        metadata: { session_id: data.session.id, total_steps: planSteps.length },
      });
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [appendActivity, fetchReactivationStatus, hydrateExecutionResults]);

  const loadLatestSession = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const remembered = typeof window !== "undefined" ? localStorage.getItem(ACTIVE_SESSION_KEY) : null;
      if (remembered) {
        try {
          await loadSessionState(remembered);
          return;
        } catch {
          if (typeof window !== "undefined") {
            localStorage.removeItem(ACTIVE_SESSION_KEY);
          }
        }
      }

      const res = await fetch(`${API_BASE}/sessions`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Failed to fetch sessions");

      const sessions = Array.isArray(data.sessions) ? data.sessions : [];
      if (sessions.length === 0) throw new Error("No intake session found. Start a project intake first.");

      const latest = sessions.sort((a: any, b: any) => Date.parse(b.updated_at) - Date.parse(a.updated_at))[0];
      if (typeof window !== "undefined") {
        localStorage.setItem(ACTIVE_SESSION_KEY, latest.id);
      }
      await loadSessionState(latest.id);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }, [loadSessionState]);

  useEffect(() => {
    loadLatestSession();
  }, [loadLatestSession]);

  useEffect(() => {
    activityEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activityFeed]);

  useEffect(() => {
    return () => {
      if (chunkFlushTimerRef.current !== null) {
        window.clearTimeout(chunkFlushTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const source = new EventSource("/api/events/stream");

    source.onmessage = (evt) => {
      if (!evt.data) return;
      try {
        const payload = JSON.parse(evt.data);
        const payloadSessionId = payload?.metadata?.session_id;
        if (!sessionId || payloadSessionId !== sessionId) return;

        if (payload?.entity_type === "TaskStep" && payload?.metadata?.step_order) {
          const order = Number(payload.metadata.step_order);
          const statusRaw = String(payload.metadata.status || "").toLowerCase();
          const mappedStatus: StepStatus =
            statusRaw === "completed"
              ? "completed"
              : statusRaw === "failed"
              ? "failed"
              : statusRaw === "running"
              ? "running"
              : "pending";

          setStepLogs((prev) => ({
            ...prev,
            [order]: {
              ...(prev[order] || {
                order,
                action: payload.summary || `Step ${order}`,
                tool_calls: [],
                status: "pending" as StepStatus,
              }),
              status: mappedStatus,
              duration_ms: payload?.metadata?.duration_ms ?? prev[order]?.duration_ms,
              source: payload?.metadata?.execution_source || prev[order]?.source,
              model: payload?.metadata?.model || prev[order]?.model,
              full_output: payload?.metadata?.output_preview || prev[order]?.full_output,
            },
          }));

          if (!selectedStepOrder || mappedStatus === "running") {
            setSelectedStepOrder(order);
          }
        }

        appendActivity({
          timestamp: payload.timestamp || new Date().toISOString(),
          type: payload.event_type || payload.type || "event",
          summary: payload.summary || "Execution event",
          metadata: payload.metadata,
        });
      } catch {
        // noop
      }
    };

    source.onerror = () => {
      source.close();
    };

    return () => source.close();
  }, [appendActivity, selectedStepOrder, sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    const timer = window.setInterval(() => {
      hydrateExecutionResults(sessionId);
      fetchReactivationStatus(sessionId);
    }, 4000);
    return () => window.clearInterval(timer);
  }, [fetchReactivationStatus, hydrateExecutionResults, sessionId]);

  const handleStreamEvent = useCallback((eventName: string, payload: any) => {
    if (!payload) return;

    if (eventName === "run_started") {
      setRunId(payload.run_id || "");
      setAgentId(payload.agent_id || "");
      setRunStartedAt(payload.started_at || new Date().toISOString());
      setRunCompletedAt(null);
      setRunDurationMs(null);
      appendActivity({
        timestamp: payload.started_at || new Date().toISOString(),
        type: "run_started",
        summary: `Run started for ${payload.project?.title || "task"}`,
        metadata: payload,
      });
      return;
    }

    if (eventName === "run_paused") {
      setReactivation({
        can_reactivate: true,
        next_step_order: typeof payload.next_step_order === "number" ? payload.next_step_order : null,
        pending_gate_id: payload.gate_node_id || null,
        pending_gate_step_order: typeof payload.step_order === "number" ? payload.step_order : null,
        message: payload.message || "Execution paused. Reactivate to continue.",
      });
      appendActivity({
        timestamp: payload.timestamp || new Date().toISOString(),
        type: "run_paused",
        summary: payload.message || "Execution paused",
        metadata: payload,
      });
      return;
    }

    if (eventName === "step_output_chunk") {
      const order = payload.step_order;
      const chunk = typeof payload.chunk === "string" ? payload.chunk : "";
      if (!chunk) return;

      chunkBufferRef.current[order] = `${chunkBufferRef.current[order] || ""}${chunk}`;
      scheduleChunkFlush();
      return;
    }

    if (eventName === "step_started") {
      const order = payload.step_order;
      setSelectedStepOrder(order);
      setStepLogs((prev) => ({
        ...prev,
        [order]: {
          ...(prev[order] || {
            order,
            action: payload.action,
            expected_outcome: payload.expected_outcome,
            tool: payload.tool,
            step_type: payload.step_type,
            tool_calls: [],
            full_output: "",
          }),
          status: "running",
        },
      }));
      appendActivity({
        timestamp: payload.timestamp || new Date().toISOString(),
        type: "step_started",
        summary: `Step ${order} started: ${payload.action}`,
        metadata: payload,
      });
      return;
    }

    if (eventName === "step_completed") {
      flushChunkBuffer();
      const order = payload.step_order;
      setStepLogs((prev) => ({
        ...prev,
        [order]: {
          ...(prev[order] || {
            order,
            action: payload.action,
            expected_outcome: payload.expected_outcome,
            tool: payload.tool,
            step_type: payload.step_type,
            tool_calls: [],
          }),
          status: payload.status === "failed" ? "failed" : "completed",
          source: payload.source,
          model: payload.model,
          duration_ms: payload.duration_ms,
          oc_session_id: payload.oc_session_id,
          full_output: payload.full_output,
          tool_calls: Array.isArray(payload.tool_calls) ? payload.tool_calls : [],
        },
      }));

      appendActivity({
        timestamp: payload.timestamp || new Date().toISOString(),
        type: "step_completed",
        summary: `Step ${order} ${payload.status || "completed"} (${payload.source || "unknown"})`,
        metadata: payload,
      });
      return;
    }

    if (eventName === "step_failed") {
      flushChunkBuffer();
      const order = payload.step_order;
      setStepLogs((prev) => ({
        ...prev,
        [order]: {
          ...(prev[order] || {
            order,
            action: payload.action,
            tool_calls: [],
          }),
          status: "failed",
          full_output: payload.error,
        },
      }));
      appendActivity({
        timestamp: payload.timestamp || new Date().toISOString(),
        type: "step_failed",
        summary: `Step ${order} failed`,
        metadata: payload,
      });
      return;
    }

    if (eventName === "run_completed") {
      setRunCompletedAt(payload.finished_at || new Date().toISOString());
      setRunDurationMs(payload.duration_ms || null);
      setReactivation(null);
      appendActivity({
        timestamp: payload.finished_at || new Date().toISOString(),
        type: "run_completed",
        summary: `Run completed: ${payload.completed_steps}/${payload.total_steps} steps successful`,
        metadata: payload,
      });
      return;
    }

    if (eventName === "gate_waiting") {
      const order = payload.step_order;
      setPendingGate({
        gateNodeId: payload.gate_node_id,
        stepOrder: order,
        action: payload.action || `Approval Gate — Step ${order}`,
      });
      setStepLogs((prev) => ({
        ...prev,
        [order]: {
          ...(prev[order] || { order, action: payload.action, tool_calls: [] }),
          status: "running",
          step_type: "approval_gate",
          full_output: "⏸ Approval gate reached. Waiting for your approval…",
        },
      }));
      appendActivity({
        timestamp: payload.timestamp || new Date().toISOString(),
        type: "gate_waiting",
        summary: `Step ${order}: Approval gate — waiting for human approval`,
        metadata: payload,
      });
      return;
    }

    if (eventName === "gate_resolved") {
      setPendingGate(null);
      const order = payload.step_order;
      const approved = payload.status === "approved";
      setStepLogs((prev) => ({
        ...prev,
        [order]: {
          ...(prev[order] || { order, action: `Approval Gate`, tool_calls: [] }),
          status: approved ? "completed" : "failed",
          full_output: approved ? "✅ Approval gate approved. Continuing execution." : `❌ Approval gate ${payload.status}. Execution stopped.`,
        },
      }));
      appendActivity({
        timestamp: payload.timestamp || new Date().toISOString(),
        type: "gate_resolved",
        summary: `Step ${order}: Gate ${payload.status}`,
        metadata: payload,
      });
      return;
    }

    if (eventName === "run_error") {
      setError(payload.error || "Execution stream failed");
      appendActivity({
        timestamp: payload.timestamp || new Date().toISOString(),
        type: "run_error",
        summary: payload.error || "Execution stream failed",
        metadata: payload,
      });
    }
  }, [appendActivity]);

  const resolveGate = useCallback(async (approved: boolean) => {
    if (!pendingGate) return;
    setGateResolving(true);
    try {
      const res = await fetch(`${API_BASE}/gates/${pendingGate.gateNodeId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved, resolved_by: "ui-user" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to resolve gate");
      }
      // The SSE gate_resolved event will clear pendingGate
    } catch (err: any) {
      setError(`Gate resolution failed: ${err.message}`);
    } finally {
      setGateResolving(false);
    }
  }, [pendingGate]);

  const startExecution = useCallback(async (continueFromStepOrder?: number | null) => {
    if (!sessionId) {
      setError("No active session. Start from Project Intake.");
      return;
    }
    if (steps.length === 0) {
      setError("No plan steps found. Generate and approve a plan first.");
      return;
    }

    setExecuting(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/sessions/${sessionId}/execute-stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          steps,
          continue_from_step_order:
            typeof continueFromStepOrder === "number" && continueFromStepOrder > 0
              ? continueFromStepOrder
              : undefined,
        }),
      });

      if (!res.ok || !res.body) {
        let detail = "";
        try {
          const errData = await res.json();
          detail = String(errData?.error || "");
        } catch {
          // ignore parse errors
        }

        if (res.status === 400 || res.status === 404 || /session not found/i.test(detail)) {
          if (typeof window !== "undefined") {
            localStorage.removeItem(ACTIVE_SESSION_KEY);
          }
          setSessionId(null);
          throw new Error("Execution session is no longer valid. Click Reload Session and run again.");
        }

        throw new Error(`Failed to start stream: HTTP ${res.status}${detail ? ` — ${detail}` : ""}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split("\n\n");
        buffer = frames.pop() || "";

        for (const frame of frames) {
          const lines = frame.split("\n");
          let eventName = "message";
          const dataLines: string[] = [];

          for (const line of lines) {
            if (line.startsWith("event:")) {
              eventName = line.slice(6).trim();
            } else if (line.startsWith("data:")) {
              const dataPart = line.slice(5);
              dataLines.push(dataPart.startsWith(" ") ? dataPart.slice(1) : dataPart);
            }
          }

          if (dataLines.length === 0) continue;
          const payloadRaw = dataLines.join("\n");
          let payload: any = null;
          try {
            payload = JSON.parse(payloadRaw);
          } catch {
            payload = { raw: payloadRaw };
          }
          handleStreamEvent(eventName, payload);
        }
      }
    } catch (err: any) {
      setError(err.message);
      appendActivity({
        timestamp: new Date().toISOString(),
        type: "run_error",
        summary: err.message,
      });
    } finally {
      setExecuting(false);
    }
  }, [appendActivity, handleStreamEvent, sessionId, steps]);

  const reactivateExecution = useCallback(async () => {
    if (!sessionId) return;
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/sessions/${sessionId}/reactivation-status`);
      const data = await res.json();
      if (!res.ok || data?.ok === false) throw new Error(data?.error || "Failed to inspect execution state");

      if (!data.can_reactivate) {
        setReactivation({
          can_reactivate: false,
          next_step_order: null,
          pending_gate_id: data.pending_gate_id || null,
          pending_gate_step_order: typeof data.pending_gate_step_order === "number" ? data.pending_gate_step_order : null,
          message: data.message || "Cannot reactivate yet",
        });
        return;
      }

      setReactivation({
        can_reactivate: true,
        next_step_order: typeof data.next_step_order === "number" ? data.next_step_order : null,
        pending_gate_id: null,
        pending_gate_step_order: null,
        message: data.message || "Reactivating execution",
      });

      await startExecution(typeof data.next_step_order === "number" ? data.next_step_order : undefined);
    } catch (err: any) {
      setError(err.message || "Failed to reactivate execution");
    }
  }, [sessionId, startExecution]);

  // Auto-start execution for freshly approved sessions
  useEffect(() => {
    if (autoStartPending && sessionId && steps.length > 0 && !executing) {
      setAutoStartPending(false);
      startExecution();
    }
  }, [autoStartPending, sessionId, steps, executing, startExecution]);

  const totals = useMemo(() => {
    const values = Object.values(stepLogs);
    return {
      completed: values.filter((s) => s.status === "completed").length,
      running: values.filter((s) => s.status === "running").length,
      failed: values.filter((s) => s.status === "failed").length,
      pending: values.filter((s) => s.status === "pending").length,
    };
  }, [stepLogs]);

  const sortedLogs = useMemo(() => {
    return Object.values(stepLogs).sort((a, b) => a.order - b.order);
  }, [stepLogs]);

  const reactivationEvents = useMemo(() => {
    return activityFeed
      .filter((item) => item.type === "run_paused" || item.type === "gate_waiting" || item.type === "gate_resolved")
      .slice(-6)
      .reverse();
  }, [activityFeed]);

  const runHealth = useMemo(() => {
    if (executing) return { label: "Active", tone: "text-blue-400 border-blue-400/40" };
    if (pendingGate) return { label: "Waiting Approval", tone: "text-amber-400 border-amber-400/40" };
    if (reactivation?.can_reactivate) return { label: "Needs Reactivation", tone: "text-orange-400 border-orange-400/40" };
    if (runCompletedAt) return { label: "Completed", tone: "text-primary border-primary/40" };
    return { label: "Idle", tone: "text-[var(--color-text-secondary)] border-border" };
  }, [executing, pendingGate, reactivation?.can_reactivate, runCompletedAt]);

  const operationsSnapshot = useMemo(() => {
    const lastEventAt = activityFeed.length > 0 ? activityFeed[activityFeed.length - 1]?.timestamp : null;
    const stateLabel = executing
      ? "running"
      : pendingGate
      ? "waiting_approval"
      : reactivation?.can_reactivate
      ? "paused_reactivate"
      : runCompletedAt
      ? "completed"
      : sessionId
      ? "ready"
      : "idle";

    if (error) {
      return {
        healthLabel: "degraded",
        healthTone: "text-destructive border-destructive/40",
        stateLabel,
        restartLabel: reactivation?.can_reactivate ? "resume" : "restart",
        lastEventAt,
      };
    }

    if (executing) {
      return {
        healthLabel: "healthy",
        healthTone: "text-blue-400 border-blue-400/40",
        stateLabel,
        restartLabel: "running",
        lastEventAt,
      };
    }

    if (pendingGate || reactivation?.can_reactivate) {
      return {
        healthLabel: "attention",
        healthTone: "text-amber-400 border-amber-400/40",
        stateLabel,
        restartLabel: reactivation?.can_reactivate ? "resume" : "blocked",
        lastEventAt,
      };
    }

    return {
      healthLabel: sessionId ? "healthy" : "offline",
      healthTone: sessionId ? "text-primary border-primary/40" : "text-[var(--color-text-secondary)] border-border",
      stateLabel,
      restartLabel: sessionId ? "ready" : "n/a",
      lastEventAt,
    };
  }, [activityFeed, error, executing, pendingGate, reactivation?.can_reactivate, runCompletedAt, sessionId]);

  const restartExecution = useCallback(async () => {
    if (executing || loading) return;
    setError(null);
    appendActivity({
      timestamp: new Date().toISOString(),
      type: "restart_requested",
      summary: reactivation?.can_reactivate ? "Resume requested from paused run" : "Full restart requested from step 1",
      metadata: {
        session_id: sessionId,
        mode: reactivation?.can_reactivate ? "resume" : "restart",
      },
    });

    if (reactivation?.can_reactivate) {
      await reactivateExecution();
      return;
    }

    await startExecution(1);
  }, [appendActivity, executing, loading, reactivateExecution, reactivation?.can_reactivate, sessionId, startExecution]);

  const scrollToStep = useCallback((order: number) => {
    setSelectedStepOrder(order);
    stepRefs.current[order]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // Auto-scroll output to bottom when new content arrives during execution
  useEffect(() => {
    if (executing) {
      outputEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [stepLogs, executing]);

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
            <TerminalSquare className="w-5 h-5 text-primary" />
            Execution Console
          </h2>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">
            Live OpenClaw execution telemetry with full outputs, tool calls, agent/model metadata, and status events.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadLatestSession} disabled={loading || executing} className="gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Reload Session
          </Button>
          <Button onClick={() => startExecution()} disabled={executing || loading || steps.length === 0} className="gap-2">
            {executing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {executing ? "Running..." : "Run in Console"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {reactivation && (
        <div className="mx-6 mt-4 rounded-lg border border-blue-500/40 bg-blue-500/10 px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-[var(--color-text-primary)]">Execution Reactivation</p>
              <p className="text-xs text-[var(--color-text-secondary)]">
                {reactivation.message}
                {reactivation.next_step_order ? ` (next step: ${reactivation.next_step_order})` : ""}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={reactivateExecution}
            disabled={executing || loading || !reactivation.can_reactivate}
            className="gap-1.5"
          >
            {executing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            Reactivate Agent
          </Button>
        </div>
      )}

      {pendingGate && (
        <div className="mx-6 mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-[var(--color-text-primary)]">Approval Gate — Step {pendingGate.stepOrder}</p>
              <p className="text-xs text-[var(--color-text-secondary)]">Execution is paused. Review the work so far and approve to continue or reject to stop.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => resolveGate(false)}
              disabled={gateResolving}
              className="gap-1.5 border-red-500/40 text-red-400 hover:bg-red-500/10"
            >
              {gateResolving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
              Reject
            </Button>
            <Button
              size="sm"
              onClick={() => resolveGate(true)}
              disabled={gateResolving}
              className="gap-1.5"
            >
              {gateResolving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              Approve
            </Button>
          </div>
        </div>
      )}

      <div className="px-6 py-4 grid grid-cols-2 lg:grid-cols-6 gap-3 border-b border-border">
        <Metric label="Project" value={taskTitle || "-"} />
        <Metric label="Session" value={sessionId || "-"} mono />
        <Metric label="Run" value={runId || "Pending"} mono />
        <Metric label="Agent" value={agentId || "-"} mono />
        <Metric label="Tool Calls" value={String(Object.values(stepLogs).reduce((acc, s) => acc + (s.tool_calls?.length || 0), 0))} />
        <Metric label="Duration" value={runDurationMs ? `${(runDurationMs / 1000).toFixed(1)}s` : "-"} />
      </div>

      <div className="px-6 pb-4 grid grid-cols-1 lg:grid-cols-4 gap-3 border-b border-border">
        <div className="rounded-lg border border-border bg-[var(--color-background)]/70 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--color-text-primary)]">Run Health</span>
            <Badge variant="outline" className={cn("h-5", runHealth.tone)}>{runHealth.label}</Badge>
          </div>
          <div className="text-[11px] text-[var(--color-text-secondary)] space-y-1">
            <p>Started: {runStartedAt ? new Date(runStartedAt).toLocaleString() : "-"}</p>
            <p>Completed: {runCompletedAt ? new Date(runCompletedAt).toLocaleString() : "-"}</p>
            <p>Progress: {totals.completed}/{steps.length || 0} steps done</p>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-[var(--color-background)]/70 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--color-text-primary)]">Reactivation Timeline</span>
            <Badge variant="outline" className="h-5">{reactivationEvents.length}</Badge>
          </div>
          <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
            {reactivationEvents.length === 0 ? (
              <p className="text-[11px] text-[var(--color-text-secondary)]">No pauses or gate events yet.</p>
            ) : (
              reactivationEvents.map((evt) => (
                <div key={evt.id} className="text-[11px] rounded border border-border px-2 py-1 bg-muted/20">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-[var(--color-text-primary)]">{evt.type}</span>
                    <span className="text-[10px] text-[var(--color-text-secondary)]">{new Date(evt.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-[10px] text-[var(--color-text-secondary)] mt-0.5 line-clamp-1">{evt.summary}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-[var(--color-background)]/70 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Bot className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-semibold text-[var(--color-text-primary)]">Continuity Checkpoint</span>
          </div>
          <p className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed">
            Agents are instructed to preserve progress/evidence/next-action heartbeat checkpoints across long approval waits.
          </p>
          <div className="flex items-center justify-between gap-2">
            <Badge variant="outline" className="h-5">heartbeat.md discipline: on</Badge>
            <Button
              size="sm"
              variant="outline"
              onClick={reactivateExecution}
              disabled={executing || loading || !reactivation?.can_reactivate}
              className="h-7 px-2 text-[10px]"
            >
              Reactivate
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-[var(--color-background)]/70 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HeartPulse className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-semibold text-[var(--color-text-primary)]">Operations Snapshot</span>
            </div>
            <Badge variant="outline" className={cn("h-5", operationsSnapshot.healthTone)}>{operationsSnapshot.healthLabel}</Badge>
          </div>
          <ul className="text-[11px] text-[var(--color-text-secondary)] space-y-1">
            <li>State: <span className="font-mono text-[var(--color-text-primary)]">{operationsSnapshot.stateLabel}</span></li>
            <li>Restart: <span className="font-mono text-[var(--color-text-primary)]">{operationsSnapshot.restartLabel}</span></li>
            <li>
              Last Event: {operationsSnapshot.lastEventAt ? new Date(operationsSnapshot.lastEventAt).toLocaleTimeString() : "-"}
            </li>
          </ul>
          <Button
            size="sm"
            variant="outline"
            onClick={restartExecution}
            disabled={loading || executing || steps.length === 0 || !sessionId}
            className="h-7 px-2 text-[10px] gap-1.5"
          >
            {executing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
            {reactivation?.can_reactivate ? "Resume Agent" : "Restart Run"}
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-5 gap-4 p-4">
        <div className="lg:col-span-3 min-h-0 rounded-xl border border-border bg-[var(--color-background)]/70 flex flex-col">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Output Console</h3>
            <div className="flex items-center gap-1.5 text-xs">
              <Badge variant="outline">Done {totals.completed}</Badge>
              <Badge variant="outline">Running {totals.running}</Badge>
              <Badge variant="outline">Failed {totals.failed}</Badge>
              <Badge variant="outline">Pending {totals.pending}</Badge>
              {executing && <Badge variant="outline" className="text-blue-500 border-blue-400/50 animate-pulse">streaming...</Badge>}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {sortedLogs.length === 0 ? (
              <div className="rounded border border-dashed border-border p-4 text-xs text-[var(--color-text-secondary)] min-h-[260px]">
                Waiting for output. Click Run in Console or navigate from Project Intake to start execution.
              </div>
            ) : (
              sortedLogs.map((log) => (
                <div
                  key={log.order}
                  ref={(el) => { stepRefs.current[log.order] = el; }}
                  className={cn(
                    "rounded-lg border",
                    selectedStepOrder === log.order ? "border-primary/40" : "border-border",
                    log.status === "running" && "border-blue-400/50",
                    log.status === "failed" && "border-destructive/50"
                  )}
                >
                  <div
                    className={cn(
                      "px-3 py-2 flex items-center justify-between gap-2 text-xs cursor-pointer rounded-t-lg",
                      log.status === "running" ? "bg-blue-500/10" :
                      log.status === "completed" ? "bg-primary/5" :
                      log.status === "failed" ? "bg-destructive/10" :
                      "bg-muted/30"
                    )}
                    onClick={() => setSelectedStepOrder(log.order)}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-[var(--color-text-secondary)]">[{log.order}]</span>
                      <span className="font-medium text-[var(--color-text-primary)] truncate">{log.action}</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {log.tool && <Badge variant="outline" className="h-5 gap-1"><Wrench className="w-3 h-3" />{log.tool}</Badge>}
                      {log.source && <Badge variant="outline" className="h-5">{log.source}</Badge>}
                      {log.duration_ms ? <Badge variant="outline" className="h-5"><Clock3 className="w-3 h-3 mr-0.5" />{(log.duration_ms / 1000).toFixed(1)}s</Badge> : null}
                      {log.status === "running" && <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />}
                      {log.status === "completed" && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
                      {log.status === "failed" && <AlertCircle className="w-3.5 h-3.5 text-destructive" />}
                    </div>
                  </div>

                  {(log.full_output || log.status === "running") && (
                    <div className="px-4 py-3 text-sm leading-relaxed text-[var(--color-text-primary)] bg-muted/20 prose prose-sm prose-invert max-w-none prose-headings:text-[var(--color-text-primary)] prose-p:text-[var(--color-text-primary)] prose-li:text-[var(--color-text-primary)] prose-strong:text-[var(--color-text-primary)] prose-a:text-primary prose-code:text-xs prose-pre:bg-muted/40 prose-pre:border prose-pre:border-border">
                      {log.full_output ? (
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{log.full_output}</ReactMarkdown>
                      ) : (
                        <p className="text-[var(--color-text-secondary)] italic">Waiting for output...</p>
                      )}
                    </div>
                  )}

                  {Array.isArray(log.tool_calls) && log.tool_calls.length > 0 && (
                    <div className="px-3 py-2 border-t border-border/50 bg-muted/10">
                      <div className="text-[10px] uppercase tracking-wide text-[var(--color-text-secondary)] mb-1">Tool Calls ({log.tool_calls.length})</div>
                      <div className="flex flex-wrap gap-1">
                        {log.tool_calls.map((tc, tci) => (
                          <Badge key={`${log.order}-tc-${tci}`} variant="outline" className="h-5 text-[10px]">
                            {tc.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
            <div ref={outputEndRef} />
          </div>
        </div>

        <div className="lg:col-span-2 min-h-0 rounded-xl border border-border bg-[var(--color-background)]/70 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Task Steps</h3>
          </div>
          <div className="max-h-[45%] overflow-y-auto p-3 space-y-2 border-b border-border">
            {steps.length === 0 ? (
              <div className="text-sm text-[var(--color-text-secondary)]">No plan steps available yet.</div>
            ) : (
              steps.map((step, idx) => {
                const order = step.order || idx + 1;
                const log = stepLogs[order];
                const status = log?.status || "pending";
                return (
                  <button
                    key={order}
                    onClick={() => scrollToStep(order)}
                    className={cn(
                      "w-full text-left rounded-lg border p-2.5 space-y-1.5 transition-colors",
                      selectedStepOrder === order ? "border-primary/50 bg-primary/5" : "border-border",
                      status === "running" && "border-blue-400/50",
                      status === "failed" && "border-destructive/50"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-[var(--color-text-secondary)]">#{order}</span>
                      <span className="text-xs font-medium text-[var(--color-text-primary)] line-clamp-2 flex-1">{step.action}</span>
                      {status === "running" && <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />}
                      {status === "completed" && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
                      {status === "failed" && <AlertCircle className="w-3.5 h-3.5 text-destructive" />}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px]">
                      {step.tool && <Badge variant="outline" className="h-5">{step.tool}</Badge>}
                      {log?.duration_ms ? <Badge variant="outline" className="h-5"><Clock3 className="w-3 h-3 mr-1" />{(log.duration_ms / 1000).toFixed(1)}s</Badge> : null}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="px-4 py-2 border-b border-border">
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Live Activity Feed</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {activityFeed.length === 0 ? (
              <div className="text-xs text-[var(--color-text-secondary)]">No events yet. Start execution to stream activity.</div>
            ) : (
              activityFeed.map((item) => (
                <div key={item.id} className="rounded border border-border p-2 bg-[var(--color-background)]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] uppercase tracking-wide text-primary">{item.type}</span>
                    <span className="text-[10px] text-[var(--color-text-secondary)]">{new Date(item.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-xs text-[var(--color-text-primary)] mt-1">{item.summary}</p>
                </div>
              ))
            )}
            <div ref={activityEndRef} />
          </div>
        </div>
      </div>

      {(runStartedAt || runCompletedAt) && (
        <div className="px-6 pb-4 text-xs text-[var(--color-text-secondary)]">
          {runStartedAt && <span>Started: {new Date(runStartedAt).toLocaleString()}</span>}
          {runStartedAt && runCompletedAt && <span className="mx-2">•</span>}
          {runCompletedAt && <span>Completed: {new Date(runCompletedAt).toLocaleString()}</span>}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-[var(--color-background)]/70 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-[var(--color-text-secondary)]">{label}</div>
      <div className={cn("text-sm text-[var(--color-text-primary)] truncate", mono && "font-mono text-xs")}>{value}</div>
    </div>
  );
}
