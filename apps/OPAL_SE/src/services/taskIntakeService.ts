/**
 * Task Intake Service
 * 
 * Orchestrates the guided task creation walkthrough (Stages 0-7).
 * Each stage produces graph nodes/edges aligned with the two-layer schema:
 *   PM layer:  task, gate, decision, risk, deliverable, resource
 *   Gov layer: plan, run, verification, decision_trace, precedent
 *
 * The walkthrough produces a consistent subgraph:
 *   task -> (plan -> gate) -> run -> (deliverable + verification + decision_trace) -> precedent
 */

import { v4 as uuid } from 'uuid';
import * as graphService from './graphService';
import { callLLM } from './agentGateway';
import logger from '../logger';

// ============================================================================
// Types
// ============================================================================

export type IntakeStage =
	| 'start'           // Stage 0: create task node
	| 'precedents'      // Stage 1: lookup similar past workflows
	| 'clarify'         // Stage 2: clarifying questions
	| 'plan'            // Stage 3: generate plan node
	| 'approve'         // Stage 4: approval checkpoint
	| 'execute'         // Stage 5: create run node
	| 'verify'          // Stage 6: deliverables + verification
	| 'learn';          // Stage 7: precedent creation

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

export interface IntakeMessage {
	role: 'system' | 'user' | 'assistant';
	content: string;
	stage: IntakeStage;
	timestamp: string;
	metadata?: Record<string, any>;
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

export interface ClarifyResult {
	questions: string[];
	task_updates: Record<string, any>;
	decisions: Array<{ question: string; options: string[]; chosen?: string }>;
}

export interface PlanPreview {
	plan_id: string;
	steps: Array<{ order: number; action: string; expected_outcome: string; tool?: string }>;
	rationale: string;
	estimated_hours: number;
	requires_gate: boolean;
}

// In-memory session store (MVP; swap for DB later)
const sessions = new Map<string, IntakeSession>();

// ============================================================================
// Constants
// ============================================================================

const MAX_CLARIFY_ROUNDS = 5;

const SYSTEM_PROMPT = `You are a Task Intake Agent for a project management system. Your job is to help users define tasks clearly and create actionable plans.

You operate on a graph-based PM system with two layers:
- PM Layer: task, milestone, deliverable, gate, risk, decision, resource
- Governance Layer: plan, run, verification, decision_trace, precedent

Be concise, structured, and helpful. Ask focused questions to fill in missing details.
Always respond in valid JSON when asked for structured output.`;

// ============================================================================
// Agent Node Bootstrap
// ============================================================================

let agentNodeId: string | null = null;

async function ensureAgentNode(): Promise<string> {
	if (agentNodeId) return agentNodeId;

	// Look for an existing agent resource node with our marker
	try {
		const resources = await graphService.listNodes({ node_type: 'resource' });
		const existing = resources.find(
			(n) => n.metadata?.agent_kind === 'task-intake'
		);
		if (existing) {
			agentNodeId = existing.id;
			logger.info(`[TaskIntake] Found existing agent node: ${agentNodeId}`);
			return agentNodeId;
		}
	} catch (_) {
		// listNodes failed — fall through to create
	}

	// Create the agent resource node
	const node = await graphService.createNode({
		node_type: 'resource',
		title: 'Task Intake Agent',
		description: 'AI agent that guides users through structured task creation',
		status: 'active',
		created_by: 'system',
		metadata: { resource_type: 'agent', agent_kind: 'task-intake' },
	});
	agentNodeId = node.id;
	logger.info(`[TaskIntake] Created agent resource node: ${agentNodeId}`);
	return agentNodeId;
}

// ============================================================================
// Session Management
// ============================================================================

export async function createSession(): Promise<IntakeSession> {
	const realAgentId = await ensureAgentNode();
	const session: IntakeSession = {
		id: uuid(),
		stage: 'start',
		task_id: null,
		plan_id: null,
		gate_id: null,
		run_id: null,
		precedent_id: null,
		agent_id: realAgentId,
		clarify_count: 0,
		messages: [],
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
	};
	sessions.set(session.id, session);
	logger.info(`[TaskIntake] Session ${session.id} created (agent: ${realAgentId})`);
	return session;
}

export function getSession(sessionId: string): IntakeSession | null {
	return sessions.get(sessionId) || null;
}

export function listSessions(): IntakeSession[] {
	return Array.from(sessions.values()).sort(
		(a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
	);
}

function updateSession(session: IntakeSession): void {
	session.updated_at = new Date().toISOString();
	sessions.set(session.id, session);
}

function addMessage(session: IntakeSession, role: IntakeMessage['role'], content: string, metadata?: Record<string, any>): void {
	session.messages.push({
		role,
		content,
		stage: session.stage,
		timestamp: new Date().toISOString(),
		metadata,
	});
}

// ============================================================================
// Stage 0: Start — Create task node
// ============================================================================

export async function startTask(
	sessionId: string,
	input: { title: string; description?: string; priority?: string; estimated_hours?: number; acceptance_criteria?: string[] }
): Promise<{ task: graphService.Node; session: IntakeSession }> {
	const session = getSession(sessionId);
	if (!session) throw new Error(`Session not found: ${sessionId}`);
	if (session.stage !== 'start') throw new Error(`Invalid stage for startTask: ${session.stage}`);

	logger.info(`[TaskIntake] Stage 0: Creating task node for session ${sessionId}`);

	const task = await graphService.createNode({
		node_type: 'task',
		title: input.title,
		description: input.description,
		status: 'backlog',
		metadata: {
			priority: input.priority || 'medium',
			estimated_hours: input.estimated_hours,
			acceptance_criteria: (input.acceptance_criteria || []).map((text, i) => ({
				id: `ac-${i + 1}`,
				text,
				status: 'pending',
			})),
			assignee_type: null,
		},
		created_by: session.agent_id,
		source: 'agent',
	});

	session.task_id = task.id;
	session.stage = 'precedents';
	addMessage(session, 'system', `Task "${input.title}" created (${task.id}). Moving to precedent lookup.`);
	updateSession(session);

	return { task, session };
}

// ============================================================================
// Stage 1: Precedent Lookup
// ============================================================================

export async function lookupPrecedents(
	sessionId: string
): Promise<{ precedents: PrecedentMatch[]; session: IntakeSession }> {
	const session = getSession(sessionId);
	if (!session) throw new Error(`Session not found: ${sessionId}`);
	if (session.stage !== 'precedents') throw new Error(`Invalid stage: ${session.stage}`);
	if (!session.task_id) throw new Error('No task_id in session');

	logger.info(`[TaskIntake] Stage 1: Looking up precedents for session ${sessionId}`);

	const task = await graphService.getNode(session.task_id);
	if (!task) throw new Error(`Task not found: ${session.task_id}`);

	// Query existing precedent nodes
	const allPrecedents = await graphService.listNodes({ node_type: 'precedent' });

	// Score precedents by text similarity (MVP: simple keyword overlap)
	const taskWords = new Set((task.title + ' ' + (task.description || '')).toLowerCase().split(/\s+/));
	const scored: PrecedentMatch[] = allPrecedents
		.map((p) => {
			const pattern = p.metadata?.task_pattern || p.title || '';
			const pWords = new Set(pattern.toLowerCase().split(/\s+/));
			let overlap = 0;
			for (const w of taskWords) {
				if (w.length > 3 && pWords.has(w)) overlap++;
			}
			return {
				id: p.id,
				title: p.title,
				task_pattern: pattern,
				success_count: p.metadata?.success_count || 0,
				failure_count: p.metadata?.failure_count || 0,
				avg_completion_hours: p.metadata?.avg_completion_hours || 0,
				required_tools: p.metadata?.required_tools || [],
				plan_template: p.metadata?.plan_template || {},
				_score: overlap,
			};
		})
		.sort((a, b) => (b as any)._score - (a as any)._score)
		.slice(0, 3)
		.map(({ _score, ...rest }: any) => rest as PrecedentMatch);

	addMessage(session, 'system', `Found ${scored.length} precedent(s). User can select one or start fresh.`);
	session.stage = 'clarify';
	updateSession(session);

	return { precedents: scored, session };
}

// ============================================================================
// Stage 1b: Select Precedent (optional)
// ============================================================================

export async function selectPrecedent(
	sessionId: string,
	precedentId: string
): Promise<{ plan_id: string; session: IntakeSession }> {
	const session = getSession(sessionId);
	if (!session) throw new Error(`Session not found: ${sessionId}`);
	if (!session.task_id) throw new Error('No task_id in session');

	logger.info(`[TaskIntake] Selecting precedent ${precedentId} for session ${sessionId}`);

	const precedent = await graphService.getNode(precedentId);
	if (!precedent || precedent.node_type !== 'precedent') {
		throw new Error(`Precedent not found: ${precedentId}`);
	}

	// Create plan from precedent template
	const plan = await graphService.createNode({
		node_type: 'plan',
		title: `Plan from precedent: ${precedent.title}`,
		description: `Auto-generated from precedent ${precedentId}`,
		status: 'pending',
		metadata: {
			task_id: session.task_id,
			proposed_by: session.agent_id,
			steps: precedent.metadata?.plan_template?.steps || [],
			source_precedent: precedentId,
		},
		created_by: session.agent_id,
		source: 'agent',
	});

	// plan --based_on--> precedent
	await graphService.createEdge({
		edge_type: 'based_on',
		source_node_id: plan.id,
		target_node_id: precedentId,
		weight: 0.6,
		created_by: session.agent_id,
	});

	// plan --for_task--> task
	await graphService.createEdge({
		edge_type: 'for_task',
		source_node_id: plan.id,
		target_node_id: session.task_id,
		weight: 1.0,
		created_by: session.agent_id,
	});

	session.plan_id = plan.id;
	session.precedent_id = precedentId;
	addMessage(session, 'system', `Plan ${plan.id} created from precedent ${precedentId}.`);
	updateSession(session);

	return { plan_id: plan.id, session };
}

// ============================================================================
// Stage 2: Clarifying Questions
// ============================================================================

export async function clarify(
	sessionId: string,
	userMessage: string
): Promise<{ reply: string; task_updated: boolean; ready_for_plan: boolean; session: IntakeSession }> {
	const session = getSession(sessionId);
	if (!session) throw new Error(`Session not found: ${sessionId}`);
	if (session.stage !== 'clarify' && session.stage !== 'precedents') {
		throw new Error(`Invalid stage: ${session.stage}`);
	}
	// Auto-advance from precedents to clarify if skipping
	if (session.stage === 'precedents') {
		session.stage = 'clarify';
	}
	if (!session.task_id) throw new Error('No task_id in session');

	logger.info(`[TaskIntake] Stage 2: Clarifying (round ${session.clarify_count + 1}) for session ${sessionId}`);

	const task = await graphService.getNode(session.task_id);
	if (!task) throw new Error(`Task not found: ${session.task_id}`);

	addMessage(session, 'user', userMessage);

	// Build conversation for LLM
	const history = session.messages.map((m) => ({
		role: m.role as 'system' | 'user' | 'assistant',
		content: m.content,
	}));

	const clarifyPrompt = `You are helping refine a task. Current task state:
Title: ${task.title}
Description: ${task.description || 'None'}
Priority: ${task.metadata?.priority || 'medium'}
Estimated hours: ${task.metadata?.estimated_hours || 'unknown'}
Acceptance criteria: ${JSON.stringify(task.metadata?.acceptance_criteria || [])}

The user just said: "${userMessage}"

Respond with JSON:
{
  "reply": "your response to the user (conversational, concise)",
  "task_updates": {
    "description": "updated description if changed, or null",
    "priority": "updated priority if changed, or null",
    "estimated_hours": "updated hours if changed, or null",
    "acceptance_criteria": ["updated criteria array if changed, or null"]
  },
  "ready_for_plan": true/false (true if enough info to generate a plan),
  "decisions": [{"question": "...", "options": ["a","b"], "chosen": "a"}] or []
}`;

	let reply = '';
	let taskUpdated = false;
	let readyForPlan = false;

	try {
		const llmResponse = await callLLM({
			caller: 'task-intake-clarify',
			system_prompt: SYSTEM_PROMPT,
			user_prompt: clarifyPrompt,
			history,
			json_mode: true,
			temperature: 0.3,
		});

		const parsed = JSON.parse(llmResponse.content);
		reply = parsed.reply || 'Could you tell me more about this task?';
		readyForPlan = parsed.ready_for_plan === true;

		// Apply task updates
		if (parsed.task_updates) {
			const updates: Record<string, any> = {};
			const meta = { ...task.metadata };
			if (parsed.task_updates.description) updates.description = parsed.task_updates.description;
			if (parsed.task_updates.priority) meta.priority = parsed.task_updates.priority;
			if (parsed.task_updates.estimated_hours) meta.estimated_hours = parsed.task_updates.estimated_hours;
			if (parsed.task_updates.acceptance_criteria) {
				meta.acceptance_criteria = parsed.task_updates.acceptance_criteria.map((text: string, i: number) => ({
					id: `ac-${i + 1}`,
					text,
					status: 'pending',
				}));
			}
			updates.metadata = meta;

			if (Object.keys(updates).length > 0) {
				await graphService.updateNode(session.task_id, updates, session.agent_id);
				taskUpdated = true;
			}
		}

		// Create decision nodes if any
		if (parsed.decisions && parsed.decisions.length > 0) {
			for (const d of parsed.decisions) {
				const decision = await graphService.createNode({
					node_type: 'decision',
					title: d.question,
					description: `Options: ${d.options.join(', ')}. Chosen: ${d.chosen || 'pending'}`,
					status: d.chosen ? 'resolved' : 'open',
					metadata: { options: d.options, chosen: d.chosen },
					created_by: session.agent_id,
					source: 'agent',
				});
				await graphService.createEdge({
					edge_type: 'informs',
					source_node_id: decision.id,
					target_node_id: session.task_id,
					weight: 0.2,
					created_by: session.agent_id,
				});
			}
		}
	} catch (err: any) {
		logger.warn(`[TaskIntake] LLM call failed during clarify: ${err.message}`);
		reply = 'I had trouble processing that. Could you rephrase or provide more details about the task?';
	}

	session.clarify_count++;
	addMessage(session, 'assistant', reply);

	// Auto-advance if ready or max rounds reached
	if (readyForPlan || session.clarify_count >= MAX_CLARIFY_ROUNDS) {
		session.stage = 'plan';
	}

	updateSession(session);

	return { reply, task_updated: taskUpdated, ready_for_plan: readyForPlan || session.clarify_count >= MAX_CLARIFY_ROUNDS, session };
}

// ============================================================================
// Stage 3: Generate Plan
// ============================================================================

export async function generatePlan(
	sessionId: string,
	requiresGate: boolean = true
): Promise<{ plan: PlanPreview; session: IntakeSession }> {
	const session = getSession(sessionId);
	if (!session) throw new Error(`Session not found: ${sessionId}`);
	if (session.stage !== 'plan' && session.stage !== 'clarify') throw new Error(`Invalid stage: ${session.stage}`);
	if (!session.task_id) throw new Error('No task_id in session');

	// If a plan already exists from precedent selection, return it
	if (session.plan_id) {
		const existingPlan = await graphService.getNode(session.plan_id);
		if (existingPlan) {
			session.stage = 'approve';
			updateSession(session);
			return {
				plan: {
					plan_id: existingPlan.id,
					steps: existingPlan.metadata?.steps || [],
					rationale: existingPlan.description || '',
					estimated_hours: existingPlan.metadata?.estimated_hours || 0,
					requires_gate: requiresGate,
				},
				session,
			};
		}
	}

	logger.info(`[TaskIntake] Stage 3: Generating plan for session ${sessionId}`);

	const task = await graphService.getNode(session.task_id);
	if (!task) throw new Error(`Task not found: ${session.task_id}`);

	// Ask LLM to generate a plan
	const planPrompt = `Generate an execution plan for this task:
Title: ${task.title}
Description: ${task.description || 'None'}
Priority: ${task.metadata?.priority || 'medium'}
Estimated hours: ${task.metadata?.estimated_hours || 'unknown'}
Acceptance criteria: ${JSON.stringify(task.metadata?.acceptance_criteria || [])}

Respond with JSON:
{
  "steps": [
    {"order": 1, "action": "description of step", "expected_outcome": "what this produces", "tool": "optional tool name"}
  ],
  "rationale": "why this approach",
  "estimated_hours": number,
  "risks": ["potential risk 1", "potential risk 2"]
}`;

	let steps: any[] = [];
	let rationale = '';
	let estimatedHours = task.metadata?.estimated_hours || 1;
	let risks: string[] = [];

	try {
		const llmResponse = await callLLM({
			caller: 'task-intake-plan',
			system_prompt: SYSTEM_PROMPT,
			user_prompt: planPrompt,
			json_mode: true,
			temperature: 0.4,
		});

		const parsed = JSON.parse(llmResponse.content);
		steps = parsed.steps || [];
		rationale = parsed.rationale || '';
		estimatedHours = parsed.estimated_hours || estimatedHours;
		risks = parsed.risks || [];
	} catch (err: any) {
		logger.warn(`[TaskIntake] LLM plan generation failed: ${err.message}`);
		steps = [{ order: 1, action: 'Execute task as described', expected_outcome: 'Task completed', tool: null }];
		rationale = 'Default single-step plan (LLM unavailable)';
	}

	// Create plan node
	const plan = await graphService.createNode({
		node_type: 'plan',
		title: `Plan for: ${task.title}`,
		description: rationale,
		status: 'pending',
		metadata: {
			task_id: session.task_id,
			proposed_by: session.agent_id,
			steps,
			estimated_hours: estimatedHours,
			risks,
		},
		created_by: session.agent_id,
		source: 'agent',
	});

	// resource(agent) --proposes--> plan
	await graphService.createEdge({
		edge_type: 'proposes',
		source_node_id: session.agent_id,
		target_node_id: plan.id,
		weight: 0.7,
		created_by: session.agent_id,
	});

	// plan --for_task--> task
	await graphService.createEdge({
		edge_type: 'for_task',
		source_node_id: plan.id,
		target_node_id: session.task_id,
		weight: 1.0,
		created_by: session.agent_id,
	});

	// Create risk nodes if any
	for (const riskText of risks) {
		const risk = await graphService.createNode({
			node_type: 'risk',
			title: riskText,
			status: 'identified',
			metadata: { source_plan: plan.id },
			created_by: session.agent_id,
			source: 'agent',
		});
		await graphService.createEdge({
			edge_type: 'mitigates',
			source_node_id: plan.id,
			target_node_id: risk.id,
			weight: 0.5,
			created_by: session.agent_id,
		});
	}

	// Create gate if required
	let gateId: string | null = null;
	if (requiresGate) {
		const gate = await graphService.createNode({
			node_type: 'gate',
			title: `Approval gate for: ${task.title}`,
			status: 'pending',
			metadata: { gate_type: 'plan_approval', plan_id: plan.id },
			created_by: session.agent_id,
			source: 'agent',
		});
		gateId = gate.id;

		// plan --requires_approval--> gate
		await graphService.createEdge({
			edge_type: 'requires_approval',
			source_node_id: plan.id,
			target_node_id: gate.id,
			weight: 1.0,
			created_by: session.agent_id,
		});
	}

	session.plan_id = plan.id;
	session.gate_id = gateId;
	session.stage = 'approve';
	addMessage(session, 'system', `Plan ${plan.id} generated with ${steps.length} step(s).`);
	updateSession(session);

	return {
		plan: {
			plan_id: plan.id,
			steps,
			rationale,
			estimated_hours: estimatedHours,
			requires_gate: requiresGate,
		},
		session,
	};
}

// ============================================================================
// Stage 4: Approve / Reject
// ============================================================================

export async function approvePlan(
	sessionId: string,
	approved: boolean
): Promise<{ status: string; session: IntakeSession }> {
	const session = getSession(sessionId);
	if (!session) throw new Error(`Session not found: ${sessionId}`);
	if (session.stage !== 'approve') throw new Error(`Invalid stage: ${session.stage}`);
	if (!session.plan_id) throw new Error('No plan_id in session');

	logger.info(`[TaskIntake] Stage 4: ${approved ? 'Approving' : 'Rejecting'} plan for session ${sessionId}`);

	const now = new Date().toISOString();

	if (approved) {
		await graphService.updateNode(session.plan_id, {
			status: 'approved',
			metadata: { approved_at: now },
		}, session.agent_id);
		if (session.gate_id) {
			await graphService.updateNode(session.gate_id, { status: 'approved' }, session.agent_id);
		}
		if (session.task_id) {
			await graphService.updateNode(session.task_id, { status: 'ready' }, session.agent_id);
		}
		session.stage = 'execute';
		addMessage(session, 'system', 'Plan approved. Ready to execute.');
	} else {
		await graphService.updateNode(session.plan_id, { status: 'rejected' }, session.agent_id);
		if (session.gate_id) {
			await graphService.updateNode(session.gate_id, { status: 'rejected' }, session.agent_id);
		}
		// Reset to plan stage so a new plan can be generated
		session.plan_id = null;
		session.gate_id = null;
		session.stage = 'plan';
		addMessage(session, 'system', 'Plan rejected. You can refine requirements or generate a new plan.');
	}

	updateSession(session);
	return { status: approved ? 'approved' : 'rejected', session };
}

// ============================================================================
// Stage 5: Execute — Create Run node
// ============================================================================

export async function startExecution(
	sessionId: string
): Promise<{ run_id: string; session: IntakeSession }> {
	const session = getSession(sessionId);
	if (!session) throw new Error(`Session not found: ${sessionId}`);
	if (session.stage !== 'execute') throw new Error(`Invalid stage: ${session.stage}`);
	if (!session.task_id || !session.plan_id) throw new Error('Missing task_id or plan_id');

	logger.info(`[TaskIntake] Stage 5: Starting execution for session ${sessionId}`);

	const run = await graphService.createNode({
		node_type: 'run',
		title: `Run for session ${session.id}`,
		description: `Execution of plan ${session.plan_id}`,
		status: 'running',
		metadata: {
			task_id: session.task_id,
			plan_id: session.plan_id,
			executed_by: session.agent_id,
			started_at: new Date().toISOString(),
			tool_run_ids: [],
			artifacts: [],
		},
		created_by: session.agent_id,
		source: 'agent',
	});

	// run --executes_plan--> plan
	await graphService.createEdge({
		edge_type: 'executes_plan',
		source_node_id: run.id,
		target_node_id: session.plan_id,
		weight: 1.0,
		created_by: session.agent_id,
	});

	// run --for_task--> task
	await graphService.createEdge({
		edge_type: 'for_task',
		source_node_id: run.id,
		target_node_id: session.task_id,
		weight: 1.0,
		created_by: session.agent_id,
	});

	// resource(agent) --executed--> run
	await graphService.createEdge({
		edge_type: 'executed',
		source_node_id: session.agent_id,
		target_node_id: run.id,
		weight: 1.0,
		created_by: session.agent_id,
	});

	// Update task status
	await graphService.updateNode(session.task_id, { status: 'in_progress' }, session.agent_id);

	session.run_id = run.id;
	session.stage = 'verify';
	addMessage(session, 'system', `Run ${run.id} started.`);
	updateSession(session);

	return { run_id: run.id, session };
}

// ============================================================================
// Stage 5b: Log Decision Trace (during execution)
// ============================================================================

export async function logDecisionTrace(
	sessionId: string,
	input: { title: string; alternatives: string[]; chosen: string; rationale: string }
): Promise<{ decision_trace_id: string }> {
	const session = getSession(sessionId);
	if (!session) throw new Error(`Session not found: ${sessionId}`);
	if (!session.run_id) throw new Error('No active run');

	const dt = await graphService.createNode({
		node_type: 'decision_trace',
		title: input.title,
		description: input.rationale,
		status: 'recorded',
		metadata: {
			alternatives_considered: input.alternatives,
			chosen_option: input.chosen,
			rationale: input.rationale,
		},
		created_by: session.agent_id,
		source: 'agent',
	});

	// decision_trace --during_run--> run
	await graphService.createEdge({
		edge_type: 'during_run',
		source_node_id: dt.id,
		target_node_id: session.run_id,
		weight: 0.6,
		created_by: session.agent_id,
	});

	return { decision_trace_id: dt.id };
}

// ============================================================================
// Stage 6: Verify — Deliverables + Verification nodes
// ============================================================================

export async function completeVerification(
	sessionId: string,
	input: {
		deliverables: Array<{ title: string; description?: string }>;
		verifications: Array<{ criterion_text: string; status: 'passed' | 'failed' | 'needs_review'; evidence_ref?: string }>;
	}
): Promise<{ task_status: string; session: IntakeSession }> {
	const session = getSession(sessionId);
	if (!session) throw new Error(`Session not found: ${sessionId}`);
	if (session.stage !== 'verify') throw new Error(`Invalid stage: ${session.stage}`);
	if (!session.task_id || !session.run_id) throw new Error('Missing task_id or run_id');

	logger.info(`[TaskIntake] Stage 6: Completing verification for session ${sessionId}`);

	// Create deliverable nodes
	for (const d of input.deliverables) {
		const deliverable = await graphService.createNode({
			node_type: 'deliverable',
			title: d.title,
			description: d.description,
			status: 'produced',
			created_by: session.agent_id,
			source: 'agent',
		});

		// task --produces--> deliverable (PM layer linkage)
		await graphService.createEdge({
			edge_type: 'produces',
			source_node_id: session.task_id,
			target_node_id: deliverable.id,
			weight: 0.8,
			created_by: session.agent_id,
		});
	}

	// Create verification nodes
	let allPassed = true;
	let hasNeedsReview = false;

	for (const v of input.verifications) {
		const verification = await graphService.createNode({
			node_type: 'verification',
			title: v.criterion_text,
			status: v.status,
			metadata: {
				task_id: session.task_id,
				run_id: session.run_id,
				criterion_text: v.criterion_text,
				evidence_type: 'artifact',
				evidence_ref: v.evidence_ref,
			},
			created_by: session.agent_id,
			source: 'agent',
		});

		// verification --checks--> task
		await graphService.createEdge({
			edge_type: 'checks',
			source_node_id: verification.id,
			target_node_id: session.task_id,
			weight: 0.9,
			created_by: session.agent_id,
		});

		// verification --evidenced_by--> run
		await graphService.createEdge({
			edge_type: 'evidenced_by',
			source_node_id: verification.id,
			target_node_id: session.run_id,
			weight: 0.8,
			created_by: session.agent_id,
		});

		if (v.status !== 'passed') allPassed = false;
		if (v.status === 'needs_review') hasNeedsReview = true;
	}

	// Determine final task status
	let taskStatus: string;
	if (allPassed) {
		taskStatus = 'done';
		await graphService.updateNode(session.run_id, { status: 'completed' }, session.agent_id);
	} else if (hasNeedsReview) {
		taskStatus = 'review';
		await graphService.updateNode(session.run_id, { status: 'review' }, session.agent_id);
	} else {
		taskStatus = 'blocked';
		await graphService.updateNode(session.run_id, { status: 'failed' }, session.agent_id);
	}

	await graphService.updateNode(session.task_id, { status: taskStatus }, session.agent_id);

	if (allPassed) {
		session.stage = 'learn';
	}

	addMessage(session, 'system', `Verification complete. Task status: ${taskStatus}.`);
	updateSession(session);

	return { task_status: taskStatus, session };
}

// ============================================================================
// Stage 7: Learn — Create Precedent
// ============================================================================

export async function createPrecedent(
	sessionId: string
): Promise<{ precedent_id: string; session: IntakeSession }> {
	const session = getSession(sessionId);
	if (!session) throw new Error(`Session not found: ${sessionId}`);
	if (session.stage !== 'learn') throw new Error(`Invalid stage: ${session.stage}`);
	if (!session.task_id || !session.run_id || !session.plan_id) {
		throw new Error('Missing task_id, run_id, or plan_id');
	}

	logger.info(`[TaskIntake] Stage 7: Creating precedent for session ${sessionId}`);

	const task = await graphService.getNode(session.task_id);
	const plan = await graphService.getNode(session.plan_id);

	const precedent = await graphService.createNode({
		node_type: 'precedent',
		title: `Precedent: ${task?.title || 'Unknown'}`,
		description: `Learned from successful run ${session.run_id}`,
		status: 'active',
		metadata: {
			task_pattern: task?.title || '',
			plan_template: {
				steps: plan?.metadata?.steps || [],
				estimated_hours: plan?.metadata?.estimated_hours,
			},
			success_count: 1,
			failure_count: 0,
			avg_completion_hours: plan?.metadata?.estimated_hours || 0,
			required_tools: (plan?.metadata?.steps || [])
				.filter((s: any) => s.tool)
				.map((s: any) => s.tool),
			applicable_node_types: ['task'],
		},
		created_by: session.agent_id,
		source: 'agent',
	});

	// precedent --learned_from--> run
	await graphService.createEdge({
		edge_type: 'learned_from',
		source_node_id: precedent.id,
		target_node_id: session.run_id,
		weight: 0.5,
		created_by: session.agent_id,
	});

	session.precedent_id = precedent.id;
	addMessage(session, 'system', `Precedent ${precedent.id} created. Workflow complete.`);
	updateSession(session);

	return { precedent_id: precedent.id, session };
}

// ============================================================================
// Utility: Get full session state with graph data
// ============================================================================

export async function getSessionState(sessionId: string): Promise<{
	session: IntakeSession;
	task: graphService.Node | null;
	plan: graphService.Node | null;
	gate: graphService.Node | null;
	run: graphService.Node | null;
	precedent: graphService.Node | null;
}> {
	const session = getSession(sessionId);
	if (!session) throw new Error(`Session not found: ${sessionId}`);

	const [task, plan, gate, run, precedent] = await Promise.all([
		session.task_id ? graphService.getNode(session.task_id) : null,
		session.plan_id ? graphService.getNode(session.plan_id) : null,
		session.gate_id ? graphService.getNode(session.gate_id) : null,
		session.run_id ? graphService.getNode(session.run_id) : null,
		session.precedent_id ? graphService.getNode(session.precedent_id) : null,
	]);

	return { session, task, plan, gate, run, precedent };
}
