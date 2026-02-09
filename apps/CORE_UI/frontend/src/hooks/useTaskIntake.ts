"use client";

import { useState, useCallback } from "react";

// ============================================================================
// Types
// ============================================================================

export type IntakeStage =
	| "start"
	| "precedents"
	| "clarify"
	| "plan"
	| "approve"
	| "execute"
	| "verify"
	| "learn";

export interface IntakeMessage {
	role: "system" | "user" | "assistant";
	content: string;
	stage: IntakeStage;
	timestamp: string;
	metadata?: Record<string, any>;
}

export interface IntakeSession {
	id: string;
	stage: IntakeStage;
	task_id: string | null;
	plan_id: string | null;
	gate_id: string | null;
	run_id: string | null;
	precedent_id: string | null;
	agent_id: string;
	clarify_count: number;
	messages: IntakeMessage[];
	created_at: string;
	updated_at: string;
}

export interface PrecedentMatch {
	id: string;
	title: string;
	task_pattern: string;
	success_count: number;
	failure_count: number;
	avg_completion_hours: number;
	required_tools: string[];
	plan_template: Record<string, any>;
}

export interface PlanPreview {
	plan_id: string;
	steps: Array<{ order: number; action: string; expected_outcome: string; tool?: string }>;
	rationale: string;
	estimated_hours: number;
	requires_gate: boolean;
	subtasks?: Array<{ id: string; title: string; description: string; priority: string; estimated_hours: number }>;
}

export interface GraphNode {
	id: string;
	node_type: string;
	schema_layer: string;
	title: string;
	description?: string;
	status: string;
	metadata?: Record<string, any>;
}

// ============================================================================
// API helpers
// ============================================================================

const API_BASE = "/api/opal/proxy/api/task-intake";

async function api<T = any>(path: string, body?: any): Promise<T> {
	const res = await fetch(`${API_BASE}${path}`, {
		method: body !== undefined ? "POST" : "GET",
		headers: { "Content-Type": "application/json" },
		body: body !== undefined ? JSON.stringify(body) : undefined,
	});
	const data = await res.json();
	if (!data.ok) throw new Error(data.error || "API error");
	return data as T;
}

// ============================================================================
// Hook
// ============================================================================

export function useTaskIntake() {
	const [session, setSession] = useState<IntakeSession | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Graph nodes for the preview panel
	const [task, setTask] = useState<GraphNode | null>(null);
	const [plan, setPlan] = useState<GraphNode | null>(null);
	const [gate, setGate] = useState<GraphNode | null>(null);
	const [run, setRun] = useState<GraphNode | null>(null);
	const [precedent, setPrecedent] = useState<GraphNode | null>(null);

	// Stage-specific state
	const [precedents, setPrecedents] = useState<PrecedentMatch[]>([]);
	const [planPreview, setPlanPreview] = useState<PlanPreview | null>(null);

	const clearError = useCallback(() => setError(null), []);

	// Refresh full session state from server
	const refreshState = useCallback(async (sessionId: string) => {
		try {
			const data = await api(`/sessions/${sessionId}`);
			setSession(data.session);
			setTask(data.task || null);
			setPlan(data.plan || null);
			setGate(data.gate || null);
			setRun(data.run || null);
			setPrecedent(data.precedent || null);
		} catch (err: any) {
			setError(err.message);
		}
	}, []);

	// Create a new session
	const createSession = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const data = await api("/sessions", {});
			setSession(data.session);
			setTask(null);
			setPlan(null);
			setGate(null);
			setRun(null);
			setPrecedent(null);
			setPrecedents([]);
			setPlanPreview(null);
			return data.session as IntakeSession;
		} catch (err: any) {
			setError(err.message);
			return null;
		} finally {
			setLoading(false);
		}
	}, []);

	// Stage 0: Start task — automatically chains into precedent lookup
	const startTask = useCallback(async (input: {
		title: string;
		description?: string;
		priority?: string;
		estimated_hours?: number;
		acceptance_criteria?: string[];
	}) => {
		if (!session) return;
		setLoading(true);
		setError(null);
		try {
			const data = await api(`/sessions/${session.id}/start`, input);
			setSession(data.session);
			setTask(data.task);

			// Auto-chain: lookup precedents using the session ID directly (avoids stale closure)
			if (data.session.stage === "precedents") {
				const precData = await api(`/sessions/${data.session.id}/precedents`, {});
				setSession(precData.session);
				setPrecedents(precData.precedents || []);
			}
		} catch (err: any) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	}, [session]);

	// Stage 1: Lookup precedents (standalone, for manual re-trigger)
	const lookupPrecedents = useCallback(async () => {
		if (!session) return;
		setLoading(true);
		setError(null);
		try {
			const data = await api(`/sessions/${session.id}/precedents`, {});
			setSession(data.session);
			setPrecedents(data.precedents || []);
		} catch (err: any) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	}, [session]);

	// Stage 1b: Select precedent
	const selectPrecedent = useCallback(async (precedentId: string) => {
		if (!session) return;
		setLoading(true);
		setError(null);
		try {
			const data = await api(`/sessions/${session.id}/select-precedent`, { precedent_id: precedentId });
			setSession(data.session);
			await refreshState(session.id);
		} catch (err: any) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	}, [session, refreshState]);

	// Stage 1b: Skip precedent (start fresh) — session is already at 'clarify' after lookupPrecedents
	const skipPrecedent = useCallback(async () => {
		if (!session) return;
		// Refresh to pick up the clarify stage and trigger a re-render
		await refreshState(session.id);
	}, [session, refreshState]);

	// Stage 2: Clarify
	const clarify = useCallback(async (message: string): Promise<string | null> => {
		if (!session) return null;
		setLoading(true);
		setError(null);
		try {
			const data = await api(`/sessions/${session.id}/clarify`, { message });
			setSession(data.session);
			if (data.task_updated) {
				await refreshState(session.id);
			}
			return data.reply || null;
		} catch (err: any) {
			setError(err.message);
			return null;
		} finally {
			setLoading(false);
		}
	}, [session, refreshState]);

	// Stage 3: Generate plan
	const generatePlan = useCallback(async (requiresGate: boolean = true) => {
		if (!session) return;
		setLoading(true);
		setError(null);
		try {
			const data = await api(`/sessions/${session.id}/plan`, { requires_gate: requiresGate });
			setSession(data.session);
			setPlanPreview(data.plan || null);
			await refreshState(session.id);
		} catch (err: any) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	}, [session, refreshState]);

	// Stage 4: Approve/Reject
	const approvePlan = useCallback(async (approved: boolean) => {
		if (!session) return;
		setLoading(true);
		setError(null);
		try {
			const data = await api(`/sessions/${session.id}/approve`, { approved });
			setSession(data.session);
			await refreshState(session.id);
			if (!approved) {
				setPlanPreview(null);
			}
		} catch (err: any) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	}, [session, refreshState]);

	// Stage 5: Execute
	const startExecution = useCallback(async () => {
		if (!session) return;
		setLoading(true);
		setError(null);
		try {
			const data = await api(`/sessions/${session.id}/execute`, {});
			setSession(data.session);
			await refreshState(session.id);
		} catch (err: any) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	}, [session, refreshState]);

	// Stage 6: Verify
	const completeVerification = useCallback(async (input: {
		deliverables: Array<{ title: string; description?: string }>;
		verifications: Array<{ criterion_text: string; status: "passed" | "failed" | "needs_review"; evidence_ref?: string }>;
	}) => {
		if (!session) return;
		setLoading(true);
		setError(null);
		try {
			const data = await api(`/sessions/${session.id}/verify`, input);
			setSession(data.session);
			await refreshState(session.id);
		} catch (err: any) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	}, [session, refreshState]);

	// Stage 7: Learn
	const createPrecedentFromRun = useCallback(async () => {
		if (!session) return;
		setLoading(true);
		setError(null);
		try {
			const data = await api(`/sessions/${session.id}/learn`, {});
			setSession(data.session);
			await refreshState(session.id);
		} catch (err: any) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	}, [session, refreshState]);

	// Delete session + associated graph nodes
	const deleteSession = useCallback(async () => {
		if (!session) return;
		setLoading(true);
		setError(null);
		try {
			await fetch(`${API_BASE}/sessions/${session.id}`, { method: 'DELETE' });
			// Reset all state
			setSession(null);
			setTask(null);
			setPlan(null);
			setGate(null);
			setRun(null);
			setPrecedent(null);
			setPrecedents([]);
			setPlanPreview(null);
		} catch (err: any) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	}, [session]);

	// Reset to start a new task (without deleting)
	const resetSession = useCallback(() => {
		setSession(null);
		setTask(null);
		setPlan(null);
		setGate(null);
		setRun(null);
		setPrecedent(null);
		setPrecedents([]);
		setPlanPreview(null);
		setError(null);
	}, []);

	return {
		// State
		session,
		loading,
		error,
		task,
		plan,
		gate,
		run,
		precedent,
		precedents,
		planPreview,

		// Actions
		clearError,
		createSession,
		startTask,
		lookupPrecedents,
		selectPrecedent,
		skipPrecedent,
		clarify,
		generatePlan,
		approvePlan,
		startExecution,
		completeVerification,
		createPrecedentFromRun,
		deleteSession,
		resetSession,
		refreshState,
	};
}
