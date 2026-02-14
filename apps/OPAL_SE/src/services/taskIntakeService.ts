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
import { eventBus } from './eventBus';
import * as hierarchyService from './hierarchyService';
import logger from '../logger';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import path from 'path';

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

export interface TaskTemplate {
	id: string;
	title: string;
	description: string;
	priority: string;
	acceptance_criteria: any[];
	estimated_hours: number;
	tags: string[];
	is_template: boolean;
}

export interface ClarifyResult {
	questions: string[];
	task_updates: Record<string, any>;
	decisions: Array<{ question: string; options: string[]; chosen?: string }>;
}

export interface PlanPreview {
	plan_id: string;
	steps: PlanStep[];
	rationale: string;
	estimated_hours: number;
	requires_gate: boolean;
	subtasks?: Array<{ id: string; title: string; description: string; priority: string; estimated_hours: number }>;
}

export type PlanStepType = 'task' | 'approval_gate';

export interface PlanStep {
	order: number;
	action: string;
	expected_outcome: string;
	tool?: string | null;
	step_type?: PlanStepType;
}

// In-memory session store (MVP; swap for DB later)
const sessions = new Map<string, IntakeSession>();

// ============================================================================
// Constants
// ============================================================================

const MAX_CLARIFY_ROUNDS = 5;

const SYSTEM_PROMPT = `You are a Task Intake Agent for an AI agent orchestration system called PM_NET. Your job is to help users define tasks that will be executed by autonomous AI agents (powered by OpenClaw), NOT by humans.

CRITICAL: All tasks and plans are executed by AI agents, not people. Never suggest human activities like meetings, phone calls, surveys, or manual document editing. Instead, plan for what an AI agent can do autonomously.

AI agents have these capabilities:
- **Web search & research**: Search the internet, read URLs, analyze web content
- **Code generation & analysis**: Write code, analyze codebases, debug, refactor
- **Text generation & analysis**: Write documents, reports, summaries, comparisons
- **Data analysis**: Process data, generate insights, create structured outputs
- **File operations**: Read, write, and organize files in the workspace
- **Knowledge management**: Create and update notes in Obsidian vaults

You operate on a graph-based system with two layers:
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

function normalizePlanStep(raw: any, index: number): PlanStep {
	const isGate = raw?.step_type === 'approval_gate' || raw?.tool === 'approval_gate';
	const step_type: PlanStepType = isGate ? 'approval_gate' : 'task';
	if (step_type === 'approval_gate') {
		return {
			order: index + 1,
			action: raw?.action || 'Approval Gate — Pause for human review before continuing',
			expected_outcome: raw?.expected_outcome || 'Human approval received',
			tool: 'approval_gate',
			step_type,
		};
	}

	return {
		order: index + 1,
		action: String(raw?.action || '').trim() || `Step ${index + 1}`,
		expected_outcome: String(raw?.expected_outcome || '').trim(),
		tool: raw?.tool || null,
		step_type,
	};
}

function normalizePlanSteps(steps: any[]): PlanStep[] {
	if (!Array.isArray(steps)) return [];
	return steps.map((s, i) => normalizePlanStep(s, i));
}

// ============================================================================
// Stage 0: Start — Create task node
// ============================================================================

export async function startTask(
	sessionId: string,
	input: { title: string; description?: string; priority?: string; estimated_hours?: number; acceptance_criteria?: string[]; phase_id?: string }
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

	// Link to phase if provided
	if (input.phase_id) {
		try {
			await hierarchyService.addWorkPackageToPhase(input.phase_id, task.id, session.agent_id);
			logger.info(`[TaskIntake] Linked task ${task.id} to phase ${input.phase_id}`);
		} catch (err: any) {
			logger.warn(`[TaskIntake] Could not link task to phase: ${err.message}`);
		}
	}

	session.stage = 'precedents';
	addMessage(session, 'system', `Task "${input.title}" created (${task.id}). Moving to precedent lookup.`);

	// Emit task created event to Pulse feed
	eventBus.emit({
		id: uuid(),
		event_type: 'created',
		entity_type: 'Task',
		entity_id: task.id,
		summary: `Task created: ${input.title}`,
		source: 'agent',
		timestamp: new Date().toISOString(),
		metadata: {
			session_id: sessionId,
			priority: input.priority || 'medium',
			description: input.description,
		},
	});
	updateSession(session);

	return { task, session };
}

// ============================================================================
// Stage 1: Precedent Lookup
// ============================================================================

export async function lookupPrecedents(
	sessionId: string
): Promise<{ precedents: PrecedentMatch[]; library_templates: TaskTemplate[]; session: IntakeSession }> {
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
		.filter((p: any) => p._score > 0) // Only return actually relevant matches
		.sort((a, b) => (b as any)._score - (a as any)._score)
		.slice(0, 5)
		.map(({ _score, ...rest }: any) => rest as PrecedentMatch);

	// Also look up task library templates (completed tasks saved as reusable templates)
	const allTemplates = await graphService.listNodes({ node_type: 'task' });
	const libraryTemplates = allTemplates
		.filter((t) => t.metadata?.is_template === true && !t.deleted_at)
		.map((t) => {
			const tWords = new Set((t.title + ' ' + (t.description || '')).toLowerCase().split(/\s+/));
			let overlap = 0;
			for (const w of taskWords) {
				if (w.length > 3 && tWords.has(w)) overlap++;
			}
			return { node: t, _score: overlap };
		})
		.sort((a, b) => b._score - a._score)
		.slice(0, 5)
		.map(({ node: t }) => ({
			id: t.id,
			title: t.title,
			description: t.description || '',
			priority: t.metadata?.priority || 'medium',
			acceptance_criteria: t.metadata?.acceptance_criteria || [],
			estimated_hours: t.metadata?.estimated_hours || 0,
			tags: t.metadata?.tags || [],
			is_template: true,
		}));

	const hasResults = scored.length > 0 || libraryTemplates.length > 0;
	addMessage(session, 'system', `Found ${scored.length} precedent(s) and ${libraryTemplates.length} library template(s).`);
	if (!hasResults) {
		// No matches — auto-advance to clarify
		session.stage = 'clarify';
	}
	// If results exist, stay at 'precedents' so the UI can display them
	updateSession(session);

	return { precedents: scored, library_templates: libraryTemplates, session };
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

	const isFirstRound = session.clarify_count === 0;
	const clarifyPrompt = `You are an expert project manager AI helping refine a task. Current task state:
Title: ${task.title}
Description: ${task.description || 'None'}
Priority: ${task.metadata?.priority || 'medium'}
Estimated hours: ${task.metadata?.estimated_hours || 'unknown'}
Acceptance criteria: ${JSON.stringify(task.metadata?.acceptance_criteria || [])}
No precedents were found for this task.

The user just said: "${userMessage}"

${isFirstRound ? `This is the FIRST interaction. You MUST:
1. Start with a brief assessment: Is this task clear, vague, simple, or complex? (1 sentence)
2. Identify what information is MISSING (scope, constraints, deliverables, timeline, tools needed, etc.)
3. Ask 2-3 specific, targeted questions to fill the gaps
4. If the task is very simple and self-explanatory, say so and set ready_for_plan to true
Be conversational but direct. Don't just say "tell me more" — ask SPECIFIC questions.` : `Continue the conversation. Ask follow-up questions if needed, or confirm you have enough info.`}

Respond with JSON:
{
  "reply": "your response to the user (conversational, concise, with numbered questions if asking)",
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
			const normalizedExistingSteps = normalizePlanSteps(existingPlan.metadata?.steps || []);
			return {
				plan: {
					plan_id: existingPlan.id,
					steps: normalizedExistingSteps,
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

	// Ask LLM to generate a plan with subtasks
	const planPrompt = `Generate an execution plan for this task that will be carried out by an autonomous AI agent (not a human).

Task details:
Title: ${task.title}
Description: ${task.description || 'None'}
Priority: ${task.metadata?.priority || 'medium'}
Estimated hours: ${task.metadata?.estimated_hours || 'unknown'}
Acceptance criteria: ${JSON.stringify(task.metadata?.acceptance_criteria || [])}

CRITICAL RULES:
- Every step must be something an AI agent can do autonomously (NO meetings, phone calls, surveys, manual editing, or human collaboration)
- Use these real agent tools for the "tool" field:
  * "web_search" — search the internet and read web pages
  * "web_read" — read and extract content from a specific URL
  * "code_generation" — write or modify code
  * "text_generation" — write documents, reports, analysis, summaries
  * "data_analysis" — analyze data, compare options, evaluate feasibility
  * "file_write" — save output to a file in the workspace
  * "obsidian_note" — create/update a note in the knowledge base
- Each step should have a concrete, verifiable expected_outcome
- The agent will execute each step sequentially and produce real output

Respond with JSON:
{
  "steps": [
    {"order": 1, "action": "description of what the agent does", "expected_outcome": "concrete output produced", "tool": "tool_name"}
  ],
  "subtasks": [
    {"title": "subtask title", "description": "what this subtask involves", "priority": "high|medium|low", "estimated_hours": number}
  ],
  "rationale": "why this approach works for an AI agent",
  "estimated_hours": number,
  "risks": ["potential risk 1", "potential risk 2"]
}

For complex tasks, break into 2-5 subtasks. For simple tasks, subtasks can be empty.`;

	let steps: PlanStep[] = [];
	let rationale = '';
	let estimatedHours = task.metadata?.estimated_hours || 1;
	let risks: string[] = [];
	let subtasks: Array<{ title: string; description: string; priority: string; estimated_hours: number }> = [];

	try {
		const llmResponse = await callLLM({
			caller: 'task-intake-plan',
			system_prompt: SYSTEM_PROMPT,
			user_prompt: planPrompt,
			json_mode: true,
			temperature: 0.4,
		});

		const parsed = JSON.parse(llmResponse.content);
		steps = normalizePlanSteps(parsed.steps || []);
		rationale = parsed.rationale || '';
		estimatedHours = parsed.estimated_hours || estimatedHours;
		risks = parsed.risks || [];
		subtasks = parsed.subtasks || [];
	} catch (err: any) {
		logger.warn(`[TaskIntake] LLM plan generation failed: ${err.message}`);
		steps = [{ order: 1, action: 'Execute task as described', expected_outcome: 'Task completed', tool: null, step_type: 'task' }];
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

	// Create subtask (microtask) nodes if any
	const subtaskIds: string[] = [];
	for (const st of subtasks) {
		try {
			const subtask = await graphService.createNode({
				node_type: 'task',
				title: st.title,
				description: st.description || '',
				status: 'open',
				metadata: {
					priority: st.priority || 'medium',
					estimated_hours: st.estimated_hours || 1,
					parent_task_id: session.task_id,
					is_subtask: true,
				},
				created_by: session.agent_id,
				source: 'agent',
			});
			subtaskIds.push(subtask.id);

			// parent_task --parent_of--> subtask
			await graphService.createEdge({
				edge_type: 'parent_of',
				source_node_id: session.task_id,
				target_node_id: subtask.id,
				weight: 1.0,
				created_by: session.agent_id,
			});
		} catch (err: any) {
			logger.warn(`[TaskIntake] Failed to create subtask "${st.title}": ${err.message}`);
		}
	}

	if (subtaskIds.length > 0) {
		// Update parent task metadata with subtask references
		await graphService.updateNode(session.task_id, {
			metadata: { ...task.metadata, subtask_ids: subtaskIds, is_macro_task: true },
		}, session.agent_id);
	}

	session.plan_id = plan.id;
	session.gate_id = gateId;
	session.stage = 'approve';
	addMessage(session, 'system', `Plan ${plan.id} generated with ${steps.length} step(s)${subtaskIds.length > 0 ? ` and ${subtaskIds.length} subtask(s)` : ''}.`);
	updateSession(session);

	return {
		plan: {
			plan_id: plan.id,
			steps,
			rationale,
			estimated_hours: estimatedHours,
			requires_gate: requiresGate,
			subtasks: subtasks.map((st, i) => ({ ...st, id: subtaskIds[i] || `pending-${i}` })),
		},
		session,
	};
}

export async function updatePlanSteps(
	sessionId: string,
	steps: any[]
): Promise<{ plan: PlanPreview; session: IntakeSession }> {
	const session = getSession(sessionId);
	if (!session) throw new Error(`Session not found: ${sessionId}`);
	if (session.stage !== 'approve') throw new Error(`Invalid stage for editing plan: ${session.stage}`);
	if (!session.plan_id) throw new Error('No plan_id in session');

	const plan = await graphService.getNode(session.plan_id);
	if (!plan) throw new Error(`Plan not found: ${session.plan_id}`);

	const normalizedSteps = normalizePlanSteps(steps || []);
	if (normalizedSteps.length === 0) throw new Error('Plan must contain at least one step');

	const nextMeta: Record<string, any> = {
		...(plan.metadata || {}),
		steps: normalizedSteps,
		edited_at: new Date().toISOString(),
		edited_by: session.agent_id,
	};

	await graphService.updateNode(session.plan_id, {
		metadata: nextMeta,
	}, session.agent_id);

	addMessage(session, 'system', `Plan steps updated (${normalizedSteps.length} step(s)).`);
	updateSession(session);

	return {
		plan: {
			plan_id: plan.id,
			steps: normalizedSteps,
			rationale: plan.description || '',
			estimated_hours: nextMeta.estimated_hours || 0,
			requires_gate: session.gate_id !== null,
		},
		session,
	};
}

// ============================================================================
// Stage 4: Approve / Reject
// ============================================================================

export async function approvePlan(
	sessionId: string,
	approved: boolean,
	editedSteps?: any[]
): Promise<{ status: string; session: IntakeSession }> {
	const session = getSession(sessionId);
	if (!session) throw new Error(`Session not found: ${sessionId}`);
	if (session.stage !== 'approve') throw new Error(`Invalid stage: ${session.stage}`);
	if (!session.plan_id) throw new Error('No plan_id in session');
	const plan = await graphService.getNode(session.plan_id);
	if (!plan) throw new Error(`Plan not found: ${session.plan_id}`);

	logger.info(`[TaskIntake] Stage 4: ${approved ? 'Approving' : 'Rejecting'} plan for session ${sessionId}`);

	const now = new Date().toISOString();

	if (approved) {
		let mergedMeta = { ...(plan.metadata || {}) };
		if (Array.isArray(editedSteps) && editedSteps.length > 0) {
			mergedMeta.steps = normalizePlanSteps(editedSteps);
			mergedMeta.edited_at = now;
			mergedMeta.edited_by = session.agent_id;
		}
		await graphService.updateNode(session.plan_id, {
			status: 'approved',
			metadata: { ...mergedMeta, approved_at: now },
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
	// Stay at 'execute' stage — steps still need to run
	addMessage(session, 'system', `Run ${run.id} started.`);

	// Emit execution started event to Pulse feed
	eventBus.emit({
		id: uuid(),
		event_type: 'created',
		entity_type: 'Run',
		entity_id: run.id,
		summary: `Execution started for task`,
		source: 'agent',
		timestamp: new Date().toISOString(),
		metadata: {
			session_id: sessionId,
			task_id: session.task_id,
			plan_id: session.plan_id,
			status: 'running',
		},
	});

	updateSession(session);

	return { run_id: run.id, session };
}

/**
 * Finalize execution — advance session from execute to verify after all steps complete.
 * Also: mark task done, ensure hierarchy linkage, auto-save library template.
 */
export async function finalizeExecution(
	sessionId: string
): Promise<{ session: IntakeSession }> {
	const session = getSession(sessionId);
	if (!session) throw new Error(`Session not found: ${sessionId}`);
	if (!session.run_id) throw new Error('No active run');

	// 1. Update run status to completed
	await graphService.updateNode(session.run_id, { status: 'completed' }, session.agent_id);

	// 2. Mark the task node as done
	let taskTitle = 'Untitled Task';
	if (session.task_id) {
		try {
			const task = await graphService.getNode(session.task_id);
			if (task) {
				taskTitle = task.title || taskTitle;
				await graphService.updateNode(session.task_id, {
					status: 'done',
					metadata: {
						...task.metadata,
						completed_at: new Date().toISOString(),
						run_id: session.run_id,
						session_id: sessionId,
					},
				}, session.agent_id);
				logger.info(`[TaskIntake] Marked task ${session.task_id} as done`);
			}
		} catch (err: any) {
			logger.warn(`[TaskIntake] Could not update task status: ${err.message}`);
		}
	}

	// 3. Ensure task is linked to the hierarchy (default project/phase if orphaned)
	if (session.task_id) {
		try {
			const edges = await graphService.listEdges({ target_node_id: session.task_id, edge_type: 'contains' });
			if (!edges || edges.length === 0) {
				const defaults = await hierarchyService.ensureDefaultHierarchy();
				await hierarchyService.addWorkPackageToPhase(defaults.phase.id, session.task_id, session.agent_id);
				logger.info(`[TaskIntake] Linked orphan task ${session.task_id} to default phase ${defaults.phase.id}`);
			}
		} catch (err: any) {
			logger.warn(`[TaskIntake] Could not link task to hierarchy: ${err.message}`);
		}
	}

	// 4. Auto-save as a library template (clone, don't mutate original)
	if (session.task_id) {
		try {
			const task = await graphService.getNode(session.task_id);
			if (task) {
				const plan = session.plan_id ? await graphService.getNode(session.plan_id) : null;
				await graphService.createNode({
					node_type: 'task',
					title: taskTitle,
					description: task.description,
					status: 'template',
					metadata: {
						is_template: true,
						priority: task.metadata?.priority || 'medium',
						acceptance_criteria: task.metadata?.acceptance_criteria || [],
						estimated_hours: task.metadata?.estimated_hours,
						tags: task.metadata?.tags || [],
						source_task_id: session.task_id,
						source_session_id: sessionId,
						plan_steps: plan?.metadata?.steps || [],
						saved_as_template_at: new Date().toISOString(),
					},
					created_by: session.agent_id,
					source: 'agent',
				});
				logger.info(`[TaskIntake] Auto-saved clone template for task ${session.task_id}`);
			}
		} catch (err: any) {
			logger.warn(`[TaskIntake] Could not auto-save library template: ${err.message}`);
		}
	}

	session.stage = 'verify';
	addMessage(session, 'system', `Execution complete. Moving to verification.`);
	updateSession(session);

	// 5. Emit rich completion event for Pulse / Dashboard
	eventBus.emit({
		id: uuid(),
		event_type: 'updated',
		entity_type: 'Run',
		entity_id: session.run_id,
		summary: `Execution completed for "${taskTitle}"`,
		source: 'agent',
		timestamp: new Date().toISOString(),
		metadata: {
			session_id: sessionId,
			task_id: session.task_id,
			task_title: taskTitle,
			status: 'completed',
		},
	});

	// 6. Append completion message to OC agent chat history for Messages inbox
	try {
		const results = await getExecutionResults(sessionId);
		const stepSummary = results.steps.map(
			(s: any) => `${s.success ? '✅' : '❌'} Step ${s.step_order}: ${s.action} (${s.source}, ${(s.duration_ms / 1000).toFixed(1)}s)`
		).join('\n');
		const completionMsg = [
			`**Project Complete: ${taskTitle}**\n`,
			`All ${results.steps.length} steps finished. ${results.success_count} succeeded, ${results.failure_count} failed.`,
			`Total duration: ${(results.total_duration_ms / 1000).toFixed(1)}s\n`,
			`**Steps:**`,
			stepSummary,
		].join('\n');
		appendAgentChatMessage('main', completionMsg);
		logger.info(`[TaskIntake] Appended completion message to agent chat history`);
	} catch (err: any) {
		logger.warn(`[TaskIntake] Could not append completion message: ${err.message}`);
	}

	return { session };
}

/**
 * Append a message to an OC agent's PM-NET chat history file.
 * This makes the message visible in the Messages inbox.
 */
function appendAgentChatMessage(agentId: string, content: string) {
	const ocHome = process.env.OPENCLAW_HOME || path.join(process.env.HOME || '/home/x1', '.openclaw');
	const historyPath = path.join(ocHome, 'agents', agentId, 'pmnet-chat-history.json');
	const dir = path.dirname(historyPath);
	if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

	let history: any[] = [];
	if (existsSync(historyPath)) {
		try { history = JSON.parse(readFileSync(historyPath, 'utf-8')); } catch { history = []; }
	}

	history.push({
		role: 'assistant',
		content,
		timestamp: new Date().toISOString(),
		meta: { source: 'pm-net-execution', type: 'completion_report' },
	});

	// Keep last 200 messages
	writeFileSync(historyPath, JSON.stringify(history.slice(-200), null, 2), 'utf-8');
}

// ============================================================================
// Stage 5a: Execute a single plan step via OpenClaw agent
// ============================================================================

interface ToolCallInfo {
	name: string;
	arguments: Record<string, any>;
	result?: string;
	error?: string;
}

interface StepResult {
	output: string;
	success: boolean;
	duration_ms: number;
	tool_calls: ToolCallInfo[];
	source: 'openclaw' | 'llm_fallback' | 'error' | 'approval_gate';
	model?: string;
	oc_session_id?: string;
}

interface ExecuteStepOptions {
	onOutputChunk?: (chunk: string) => void;
}

/**
 * Parse an OpenClaw session JSONL file to extract tool calls and results
 */
function parseOCSessionToolCalls(sessionId: string): ToolCallInfo[] {
	const fs = require('fs');
	const path = require('path');
	const sessionFile = path.join(
		process.env.HOME || '/home/x1',
		'.openclaw/agents/main/sessions',
		`${sessionId}.jsonl`
	);

	if (!fs.existsSync(sessionFile)) return [];

	const toolCalls: ToolCallInfo[] = [];
	const pendingCalls = new Map<string, ToolCallInfo>();

	try {
		const lines = fs.readFileSync(sessionFile, 'utf-8').split('\n');
		for (const line of lines) {
			if (!line.trim()) continue;
			const entry = JSON.parse(line);
			if (entry.type === 'message' && entry.message?.content) {
				const content = entry.message.content;
				if (!Array.isArray(content)) continue;
				for (const block of content) {
					if (block.type === 'toolCall' || block.type === 'tool_use') {
						const tc: ToolCallInfo = {
							name: block.name,
							arguments: block.arguments || block.input || {},
						};
						pendingCalls.set(block.id, tc);
						toolCalls.push(tc);
					}
					if (block.type === 'tool_result') {
						const pending = pendingCalls.get(block.tool_use_id);
						if (pending) {
							const resultContent = block.content;
							if (typeof resultContent === 'string') {
								pending.result = resultContent.substring(0, 1000);
							} else if (Array.isArray(resultContent)) {
								pending.result = resultContent
									.map((c: any) => c.text || '')
									.join('\n')
									.substring(0, 1000);
							}
							if (block.is_error) pending.error = pending.result;
						}
					}
				}
			}
			// Also handle top-level toolResult entries
			if (entry.type === 'toolResult') {
				const toolUseId = entry.toolUseId;
				const pending = pendingCalls.get(toolUseId);
				if (pending) {
					const text = entry.result || entry.content || '';
					if (typeof text === 'string') {
						pending.result = text.substring(0, 1000);
					} else if (typeof text === 'object') {
						pending.result = JSON.stringify(text).substring(0, 1000);
					}
					if (entry.isError) pending.error = pending.result;
				}
			}
		}
	} catch (err: any) {
		logger.warn(`[TaskIntake] Failed to parse OC session JSONL: ${err.message}`);
	}

	return toolCalls;
}

export async function executeStep(
	sessionId: string,
	input: { step_order: number; action: string; tool: string | null; expected_outcome: string; step_type?: PlanStepType },
	options?: ExecuteStepOptions
): Promise<StepResult> {
	const session = getSession(sessionId);
	if (!session) throw new Error(`Session not found: ${sessionId}`);
	if (!session.task_id) throw new Error('No task_id in session');

	const task = await graphService.getNode(session.task_id);
	if (!task) throw new Error(`Task not found: ${session.task_id}`);

	const startTime = Date.now();
	const isApprovalGateStep = input.step_type === 'approval_gate' || input.tool === 'approval_gate';

	// Build a focused prompt for the OpenClaw agent
	const agentPrompt = [
		`You are executing step ${input.step_order} of a plan for task: "${task.title}"`,
		task.description ? `Task description: ${task.description}` : '',
		``,
		`Step action: ${input.action}`,
		input.tool ? `Suggested tool: ${input.tool}` : '',
		input.expected_outcome ? `Expected outcome: ${input.expected_outcome}` : '',
		``,
		`Execute this step now. Provide your findings, analysis, or output directly. Be thorough but concise.`,
		`If this involves web research, actually search and summarize what you find.`,
		`If this involves analysis, provide real analysis with specific details.`,
		`If this involves writing, produce the actual content.`,
	].filter(Boolean).join('\n');

	logger.info(`[TaskIntake] Executing step ${input.step_order}: ${input.action}`);

	// Emit "step started" event to Pulse feed
	eventBus.emit({
		id: uuid(),
		event_type: 'status_changed',
		entity_type: 'TaskStep',
		entity_id: `${sessionId}-step-${input.step_order}`,
		summary: `Step ${input.step_order}: ${input.action}`,
		source: 'agent',
		timestamp: new Date().toISOString(),
		metadata: {
			session_id: sessionId,
			task_id: session.task_id,
			task_title: task.title,
			step_order: input.step_order,
			tool: input.tool,
			status: 'running',
		},
	});

	let output = '';
	let success = false;
	let tool_calls: ToolCallInfo[] = [];
	let source: StepResult['source'] = 'error';
	let model: string | undefined;
	let oc_session_id: string | undefined;

	// Use a dedicated session ID per PM_NET task so steps share context
	const ocSessionId = `pmnet-${sessionId}`;

	if (isApprovalGateStep) {
		// Create a pending approval node in the graph so Approvals page shows it
		const gateNode = await graphService.createNode({
			node_type: 'gate',
			title: `Approval Gate — Step ${input.step_order}`,
			description: `Approval checkpoint after step ${input.step_order - 1}. Waiting for human review.`,
			status: 'pending_approval',
			metadata: {
				session_id: sessionId,
				task_id: session.task_id,
				task_title: task.title,
				step_order: input.step_order,
				run_id: session.run_id,
				requested_at: new Date().toISOString(),
			},
			created_by: session.agent_id,
			source: 'agent',
		});

		// Link gate to the run
		if (session.run_id) {
			await graphService.createEdge({
				edge_type: 'contains',
				source_node_id: session.run_id,
				target_node_id: gateNode.id,
				weight: 1.0,
				created_by: session.agent_id,
			});
		}

		// Send approval-needed message to agent chat
		appendAgentChatMessage('main', [
			`**⏸ Approval Gate Reached — Step ${input.step_order}**\n`,
			`Task: **${task.title}**`,
			`The execution has paused and is waiting for your approval before continuing.`,
			`Please review the work so far and approve or reject in the Execution Console or Approvals page.`,
		].join('\n'));

		logger.info(`[TaskIntake] Step ${input.step_order} is an approval gate — created gate node ${gateNode.id}, waiting for approval`);

		output = `Approval gate checkpoint reached. Waiting for human approval. Gate ID: ${gateNode.id}`;
		success = true;
		source = 'approval_gate';
		oc_session_id = gateNode.id; // Reuse this field to pass gate_node_id back

		const duration_ms = Date.now() - startTime;
		return { output, success, duration_ms, tool_calls, source, model, oc_session_id };
	} else {
		try {
			// Try OpenClaw CLI first (stream stdout chunks for real-time console updates)
			const { spawn } = require('child_process');
			const result: string = await new Promise((resolve, reject) => {
				const child = spawn(
					'openclaw',
					['agent', '--agent', 'main', '--message', agentPrompt, '--json', '--session-id', ocSessionId],
					{ stdio: ['ignore', 'pipe', 'pipe'] }
				);

				let stdout = '';
				let stderr = '';
				let timedOut = false;

				const timer = setTimeout(() => {
					timedOut = true;
					child.kill('SIGTERM');
					setTimeout(() => child.kill('SIGKILL'), 5000);
				}, 120000);

				child.stdout.on('data', (chunk: Buffer | string) => {
					const text = chunk.toString();
					stdout += text;
					options?.onOutputChunk?.(text);
				});

				child.stderr.on('data', (chunk: Buffer | string) => {
					stderr += chunk.toString();
				});

				child.on('error', (err: Error) => {
					clearTimeout(timer);
					reject(err);
				});

				child.on('close', (code: number) => {
					clearTimeout(timer);
					if (timedOut) {
						return reject(new Error('OpenClaw agent timed out after 120s'));
					}
					if (code !== 0) {
						return reject(new Error(stderr.trim() || `OpenClaw agent exited with code ${code}`));
					}
					resolve(stdout);
				});
			});

			try {
				const parsed = JSON.parse(result);
				// Extract text from payloads
				if (parsed.result?.payloads?.length > 0) {
					output = parsed.result.payloads.map((p: any) => p.text || '').join('\n').trim();
				} else {
					output = parsed.response || parsed.message || parsed.content || parsed.result?.text || result;
				}
				// Extract metadata
				model = parsed.result?.meta?.agentMeta?.model;
				oc_session_id = parsed.result?.meta?.agentMeta?.sessionId;

				// Parse the session JSONL to get tool calls
				if (oc_session_id) {
					tool_calls = parseOCSessionToolCalls(oc_session_id);
				}
			} catch {
				output = result;
			}
			success = true;
			source = 'openclaw';
			logger.info(`[TaskIntake] Step ${input.step_order} completed via OpenClaw agent (${tool_calls.length} tool calls)`);
		} catch (ocErr: any) {
			logger.warn(`[TaskIntake] OpenClaw agent unavailable, falling back to LLM: ${ocErr.message}`);

			// Fallback: use the LLM directly
			try {
				const llmResponse = await callLLM({
					caller: 'task-intake-execute-step',
					system_prompt: `You are an AI agent executing a task step. Provide real, substantive output — not placeholders. If the step involves research, provide actual analysis. If it involves writing, produce real content.`,
					user_prompt: agentPrompt,
					temperature: 0.5,
				});
				output = llmResponse.content;
				model = llmResponse.model;
				success = true;
				source = 'llm_fallback';
				logger.info(`[TaskIntake] Step ${input.step_order} completed via LLM fallback`);
			} catch (llmErr: any) {
				output = `Error executing step: ${llmErr.message}`;
				success = false;
				source = 'error';
				logger.error(`[TaskIntake] Step ${input.step_order} failed: ${llmErr.message}`);
			}
		}
	}

	const duration_ms = Date.now() - startTime;

	// Log the step execution as a decision trace
	if (session.run_id) {
		try {
			await graphService.createNode({
				node_type: 'decision_trace',
				title: `Step ${input.step_order}: ${input.action}`,
				description: output.substring(0, 500),
				status: success ? 'recorded' : 'failed',
				metadata: {
					run_id: session.run_id,
					step_order: input.step_order,
					tool: input.tool,
					success,
					duration_ms,
					source,
					tool_calls: tool_calls.map(tc => ({ name: tc.name, args: tc.arguments })),
					full_output: output,
				},
				created_by: session.agent_id,
				source: 'agent',
			});
		} catch {}
	}

	// Emit "step completed" event to Pulse feed
	eventBus.emit({
		id: uuid(),
		event_type: success ? 'updated' : 'status_changed',
		entity_type: 'TaskStep',
		entity_id: `${sessionId}-step-${input.step_order}`,
		summary: success
			? `Completed step ${input.step_order}: ${input.action}`
			: `Failed step ${input.step_order}: ${input.action}`,
		source: 'agent',
		timestamp: new Date().toISOString(),
		metadata: {
			session_id: sessionId,
			task_id: session.task_id,
			task_title: task.title,
			step_order: input.step_order,
			tool: input.tool,
			status: success ? 'completed' : 'failed',
			duration_ms,
			execution_source: source,
			model,
			tool_calls: tool_calls.map(tc => tc.name),
			output_preview: output.substring(0, 500),
		},
	});

	return { output, success, duration_ms, tool_calls, source, model, oc_session_id };
}

// ============================================================================
// Stage 5c: Get Execution Results (for VerifyStage)
// ============================================================================

export async function getExecutionResults(
	sessionId: string
): Promise<{
	steps: Array<{
		step_order: number;
		action: string;
		tool: string | null;
		output: string;
		success: boolean;
		duration_ms: number;
		source: string;
		tool_calls: string[];
		model?: string;
	}>;
	total_duration_ms: number;
	success_count: number;
	failure_count: number;
}> {
	const session = getSession(sessionId);
	if (!session) throw new Error(`Session not found: ${sessionId}`);
	if (!session.run_id) return { steps: [], total_duration_ms: 0, success_count: 0, failure_count: 0 };

	// Query all decision_trace nodes linked to this run
	const allNodes = await graphService.listNodes({
		node_type: 'decision_trace',
		limit: 50,
	});

	// Filter to traces belonging to this run (by metadata.run_id)
	const traces = (allNodes || [])
		.filter((n: any) => n.metadata?.run_id === session.run_id)
		.sort((a: any, b: any) => (a.metadata?.step_order || 0) - (b.metadata?.step_order || 0));

	const steps = traces.map((t: any) => ({
		step_order: t.metadata?.step_order || 0,
		action: t.title?.replace(/^Step \d+: /, '') || '',
		tool: t.metadata?.tool || null,
		output: t.metadata?.full_output || t.description || '',
		success: t.metadata?.success !== false,
		duration_ms: t.metadata?.duration_ms || 0,
		source: t.metadata?.source || 'unknown',
		tool_calls: (t.metadata?.tool_calls || []).map((tc: any) => typeof tc === 'string' ? tc : tc.name),
		model: t.metadata?.model,
	}));

	const total_duration_ms = steps.reduce((sum: number, s: any) => sum + s.duration_ms, 0);
	const success_count = steps.filter((s: any) => s.success).length;
	const failure_count = steps.filter((s: any) => !s.success).length;

	return { steps, total_duration_ms, success_count, failure_count };
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
// Delete Session + Associated Nodes
// ============================================================================

export async function deleteSession(sessionId: string): Promise<{ deleted_nodes: string[] }> {
	const session = getSession(sessionId);
	if (!session) throw new Error(`Session not found: ${sessionId}`);

	logger.info(`[TaskIntake] Deleting session ${sessionId} and associated nodes`);

	const deletedNodes: string[] = [];
	const nodeIds = [session.task_id, session.plan_id, session.gate_id, session.run_id, session.precedent_id].filter(Boolean) as string[];

	for (const nodeId of nodeIds) {
		try {
			await graphService.deleteNode(nodeId, session.agent_id);
			deletedNodes.push(nodeId);
		} catch (err: any) {
			logger.warn(`[TaskIntake] Failed to delete node ${nodeId}: ${err.message}`);
		}
	}

	sessions.delete(sessionId);
	logger.info(`[TaskIntake] Session ${sessionId} deleted. Removed ${deletedNodes.length} nodes.`);

	return { deleted_nodes: deletedNodes };
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

// ============================================================================
// Task Library — Reusable Task Templates
// ============================================================================

/** List all task templates (tasks with is_template=true) */
export async function listTaskTemplates(): Promise<TaskTemplate[]> {
	const allTasks = await graphService.listNodes({ node_type: 'task' });
	return allTasks
		.filter((t) => t.metadata?.is_template === true && !t.deleted_at)
		.map((t) => ({
			id: t.id,
			title: t.title,
			description: t.description || '',
			priority: t.metadata?.priority || 'medium',
			acceptance_criteria: t.metadata?.acceptance_criteria || [],
			estimated_hours: t.metadata?.estimated_hours || 0,
			tags: t.metadata?.tags || [],
			is_template: true,
		}));
}

/** Save an existing task as a reusable template */
export async function saveAsTemplate(
	taskId: string,
	overrides?: { title?: string; description?: string; tags?: string[] }
): Promise<TaskTemplate> {
	const task = await graphService.getNode(taskId);
	if (!task) throw new Error(`Task not found: ${taskId}`);

	// Update the task metadata to mark it as a template
	const updatedMeta: Record<string, any> = {
		...task.metadata,
		is_template: true,
		tags: overrides?.tags || task.metadata?.tags || [],
		saved_as_template_at: new Date().toISOString(),
	};

	await graphService.updateNode(taskId, {
		title: overrides?.title || task.title,
		description: overrides?.description || task.description,
		metadata: updatedMeta,
	}, 'system');

	logger.info(`[TaskLibrary] Task ${taskId} saved as template`);

	return {
		id: task.id,
		title: overrides?.title || task.title,
		description: overrides?.description || task.description || '',
		priority: updatedMeta.priority || 'medium',
		acceptance_criteria: updatedMeta.acceptance_criteria || [],
		estimated_hours: updatedMeta.estimated_hours || 0,
		tags: updatedMeta.tags,
		is_template: true,
	};
}

/** Create a brand-new template (not from an existing task) */
export async function createTemplate(input: {
	title: string;
	description?: string;
	priority?: string;
	acceptance_criteria?: string[];
	estimated_hours?: number;
	tags?: string[];
}): Promise<TaskTemplate> {
	const agentId = await ensureAgentNode();

	const task = await graphService.createNode({
		node_type: 'task',
		title: input.title,
		description: input.description,
		status: 'template',
		metadata: {
			priority: input.priority || 'medium',
			estimated_hours: input.estimated_hours,
			acceptance_criteria: (input.acceptance_criteria || []).map((text, i) => ({
				id: `ac-${i + 1}`,
				text,
				status: 'pending',
			})),
			tags: input.tags || [],
			is_template: true,
			saved_as_template_at: new Date().toISOString(),
		},
		created_by: agentId,
		source: 'ui',
	});

	logger.info(`[TaskLibrary] Created new template ${task.id}: "${input.title}"`);

	return {
		id: task.id,
		title: task.title,
		description: task.description || '',
		priority: input.priority || 'medium',
		acceptance_criteria: task.metadata?.acceptance_criteria || [],
		estimated_hours: input.estimated_hours || 0,
		tags: input.tags || [],
		is_template: true,
	};
}

/** Update an existing template */
export async function updateTemplate(
	templateId: string,
	input: { title?: string; description?: string; priority?: string; acceptance_criteria?: string[]; estimated_hours?: number; tags?: string[] }
): Promise<TaskTemplate> {
	const task = await graphService.getNode(templateId);
	if (!task) throw new Error(`Template not found: ${templateId}`);
	if (!task.metadata?.is_template) throw new Error(`Node ${templateId} is not a template`);

	const updatedMeta = { ...task.metadata };
	if (input.priority !== undefined) updatedMeta.priority = input.priority;
	if (input.estimated_hours !== undefined) updatedMeta.estimated_hours = input.estimated_hours;
	if (input.tags !== undefined) updatedMeta.tags = input.tags;
	if (input.acceptance_criteria !== undefined) {
		updatedMeta.acceptance_criteria = input.acceptance_criteria.map((text, i) => ({
			id: `ac-${i + 1}`,
			text,
			status: 'pending',
		}));
	}

	await graphService.updateNode(templateId, {
		title: input.title || task.title,
		description: input.description !== undefined ? input.description : task.description,
		metadata: updatedMeta,
	}, 'system');

	logger.info(`[TaskLibrary] Updated template ${templateId}`);

	return {
		id: task.id,
		title: input.title || task.title,
		description: (input.description !== undefined ? input.description : task.description) || '',
		priority: updatedMeta.priority || 'medium',
		acceptance_criteria: updatedMeta.acceptance_criteria || [],
		estimated_hours: updatedMeta.estimated_hours || 0,
		tags: updatedMeta.tags || [],
		is_template: true,
	};
}

/** Delete a template (soft-delete via graph service) */
export async function deleteTemplate(templateId: string): Promise<void> {
	const task = await graphService.getNode(templateId);
	if (!task) throw new Error(`Template not found: ${templateId}`);
	if (!task.metadata?.is_template) throw new Error(`Node ${templateId} is not a template`);

	await graphService.deleteNode(templateId, 'system');
	logger.info(`[TaskLibrary] Deleted template ${templateId}`);
}

/** Clone a template into a new live task for execution */
export async function runFromTemplate(
	templateId: string,
	overrides?: { title?: string; description?: string; priority?: string }
): Promise<{ task: graphService.Node; session: IntakeSession }> {
	const template = await graphService.getNode(templateId);
	if (!template) throw new Error(`Template not found: ${templateId}`);

	// Create a new intake session
	const session = await createSession();

	// Create a task from the template
	const result = await startTask(session.id, {
		title: overrides?.title || template.title,
		description: overrides?.description || template.description,
		priority: overrides?.priority || template.metadata?.priority || 'medium',
		estimated_hours: template.metadata?.estimated_hours,
		acceptance_criteria: (template.metadata?.acceptance_criteria || []).map((c: any) => c.text || c),
	});

	logger.info(`[TaskLibrary] Created task ${result.task.id} from template ${templateId}`);
	return result;
}
