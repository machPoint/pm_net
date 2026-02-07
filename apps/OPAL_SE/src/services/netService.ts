/**
 * Net Service (MCP Tools)
 * 
 * MCP tools for the Network PM Core, enabling AI agents to:
 * - Poll for assigned tasks
 * - Submit execution plans for approval
 * - Log reasoning traces
 * - Record verification evidence
 * 
 * Built on top of the generic graph model in graphService.ts
 */

import { v4 as uuid } from 'uuid';
import * as graphService from './graphService';
import logger from '../logger';

// ============================================================================
// Constants
// ============================================================================

const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000001';

// ============================================================================
// Types
// ============================================================================

export interface MCPContext {
	agentId: string;
}

export interface TaskSummary {
	id: string;
	title: string;
	status: string;
	priority: string;
	due_date?: string;
	acceptance_criteria?: string[];
}

export interface PlanStep {
	order: number;
	action: string;
	expected_outcome: string;
}

export interface SubmitPlanInput {
	task_id: string;
	steps: PlanStep[];
	rationale: string;
	estimated_duration?: string;
	risks?: string[];
}

export interface RunLogEntry {
	timestamp: string;
	level: 'info' | 'warn' | 'error';
	message: string;
	data?: Record<string, any>;
}

// ============================================================================
// MCP Tool Implementations
// ============================================================================

/**
 * MCP Tool: checkAssignedTasks
 * Poll for tasks assigned to the calling agent
 */
export async function checkAssignedTasks(
	ctx: MCPContext,
	filters?: { status?: string; priority?: string }
): Promise<{ tasks: TaskSummary[] }> {
	logger.info(`[Net] Agent ${ctx.agentId} checking assigned tasks`);

	// Find all edges where target is this agent and edge_type is 'assigned_to'
	const assignedEdges = await graphService.listEdges({
		edge_type: 'assigned_to',
		target_node_id: ctx.agentId,
	});

	// Get the task nodes
	const tasks: TaskSummary[] = [];
	for (const edge of assignedEdges) {
		const taskNode = await graphService.getNode(edge.source_node_id);
		if (!taskNode || taskNode.node_type !== 'task') continue;

		// Apply filters if provided
		if (filters?.status && taskNode.status !== filters.status) continue;
		if (filters?.priority && taskNode.metadata?.priority !== filters.priority) continue;

		tasks.push({
			id: taskNode.id,
			title: taskNode.title,
			status: taskNode.status,
			priority: taskNode.metadata?.priority || 'medium',
			due_date: taskNode.metadata?.due_date,
			acceptance_criteria: taskNode.metadata?.acceptance_criteria,
		});
	}

	logger.info(`[Net] Found ${tasks.length} tasks assigned to agent ${ctx.agentId}`);
	return { tasks };
}

/**
 * MCP Tool: getTaskContext
 * Get full context for a task including related nodes
 */
export async function getTaskContext(
	ctx: MCPContext,
	taskId: string
): Promise<{
	task: graphService.Node | null;
	plans: graphService.Node[];
	runs: graphService.Node[];
	assignee: graphService.Node | null;
	dependencies: graphService.Node[];
}> {
	logger.info(`[Net] Agent ${ctx.agentId} getting context for task ${taskId}`);

	const task = await graphService.getNode(taskId);
	if (!task || task.node_type !== 'task') {
		return { task: null, plans: [], runs: [], assignee: null, dependencies: [] };
	}

	// Get connected nodes via traversal
	const context = await graphService.traverse({
		start_node_id: taskId,
		direction: 'both',
		max_depth: 2,
	});

	// Categorize the connected nodes
	const plans = context.nodes.filter(n => n.node_type === 'plan');
	const runs = context.nodes.filter(n => n.node_type === 'run');
	const assignees = context.nodes.filter(n =>
		n.node_type === 'user' || n.node_type === 'agent'
	);
	const dependencies = context.nodes.filter(n => n.node_type === 'task' && n.id !== taskId);

	return {
		task,
		plans,
		runs,
		assignee: assignees[0] || null,
		dependencies,
	};
}

/**
 * MCP Tool: submitPlan
 * Submit a plan for human approval
 */
export async function submitPlan(
	ctx: MCPContext,
	input: SubmitPlanInput
): Promise<{ plan_id: string; status: string }> {
	logger.info(`[Net] Agent ${ctx.agentId} submitting plan for task ${input.task_id}`);

	// Verify the task exists
	const task = await graphService.getNode(input.task_id);
	if (!task || task.node_type !== 'task') {
		throw new Error(`Task not found: ${input.task_id}`);
	}

	// Create the plan node
	const plan = await graphService.createNode({
		node_type: 'plan',
		title: `Plan for: ${task.title}`,
		description: input.rationale,
		status: 'pending_approval',
		metadata: {
			steps: input.steps,
			rationale: input.rationale,
			estimated_duration: input.estimated_duration,
			risks: input.risks,
		},
		created_by: ctx.agentId,
	});

	// Create has_plan edge (Task -> Plan)
	await graphService.createEdge({
		edge_type: 'has_plan',
		source_node_id: input.task_id,
		target_node_id: plan.id,
		created_by: ctx.agentId,
	});

	// Create proposed_by edge (Plan -> Agent)
	await graphService.createEdge({
		edge_type: 'proposed_by',
		source_node_id: plan.id,
		target_node_id: ctx.agentId,
		created_by: ctx.agentId,
	});

	logger.info(`[Net] Plan ${plan.id} created with status pending_approval`);
	return { plan_id: plan.id, status: 'pending_approval' };
}

/**
 * MCP Tool: checkPlanStatus
 * Check the approval status of a plan
 */
export async function checkPlanStatus(
	ctx: MCPContext,
	planId: string
): Promise<{ status: string; approval?: graphService.Node }> {
	logger.info(`[Net] Agent ${ctx.agentId} checking status of plan ${planId}`);

	const plan = await graphService.getNode(planId);
	if (!plan || plan.node_type !== 'plan') {
		throw new Error(`Plan not found: ${planId}`);
	}

	// Look for approval edges
	const approvalEdges = await graphService.listEdges({
		edge_type: 'approval_of',
		target_node_id: planId,
	});

	let approval: graphService.Node | undefined;
	if (approvalEdges.length > 0) {
		approval = await graphService.getNode(approvalEdges[0].source_node_id) ?? undefined;
	}

	return { status: plan.status, approval };
}

/**
 * MCP Tool: startRun
 * Start execution of an approved plan
 */
export async function startRun(
	ctx: MCPContext,
	planId: string
): Promise<{ run_id: string; status: string }> {
	logger.info(`[Net] Agent ${ctx.agentId} starting run for plan ${planId}`);

	// Verify plan is approved
	const plan = await graphService.getNode(planId);
	if (!plan || plan.node_type !== 'plan') {
		throw new Error(`Plan not found: ${planId}`);
	}
	if (plan.status !== 'approved') {
		throw new Error(`Plan is not approved (status: ${plan.status})`);
	}

	// Find the associated task
	const taskEdges = await graphService.listEdges({
		edge_type: 'has_plan',
		target_node_id: planId,
	});
	if (taskEdges.length === 0) {
		throw new Error(`No task found for plan ${planId}`);
	}
	const taskId = taskEdges[0].source_node_id;

	// Create the run node
	const run = await graphService.createNode({
		node_type: 'run',
		title: `Run of: ${plan.title}`,
		description: `Execution run for plan ${planId}`,
		status: 'running',
		metadata: {
			started_at: new Date().toISOString(),
			logs: [],
		},
		created_by: ctx.agentId,
	});

	// Create has_run edge (Task -> Run)
	await graphService.createEdge({
		edge_type: 'has_run',
		source_node_id: taskId,
		target_node_id: run.id,
		created_by: ctx.agentId,
	});

	// Create executed_plan edge (Run -> Plan)
	await graphService.createEdge({
		edge_type: 'executed_plan',
		source_node_id: run.id,
		target_node_id: planId,
		created_by: ctx.agentId,
	});

	// Create executed_by edge (Run -> Agent)
	await graphService.createEdge({
		edge_type: 'executed_by',
		source_node_id: run.id,
		target_node_id: ctx.agentId,
		created_by: ctx.agentId,
	});

	logger.info(`[Net] Run ${run.id} started`);
	return { run_id: run.id, status: 'running' };
}

/**
 * MCP Tool: logDecision
 * Record a decision trace during execution
 */
export async function logDecision(
	ctx: MCPContext,
	input: {
		run_id: string;
		decision_type: string;
		alternatives_considered: { option: string; pros: string[]; cons: string[]; rejected_reason?: string }[];
		chosen_option: string;
		rationale: string;
	}
): Promise<{ decision_id: string }> {
	logger.info(`[Net] Agent ${ctx.agentId} logging decision for run ${input.run_id}`);

	// Verify the run exists
	const run = await graphService.getNode(input.run_id);
	if (!run || run.node_type !== 'run') {
		throw new Error(`Run not found: ${input.run_id}`);
	}

	// Create decision trace node
	const decision = await graphService.createNode({
		node_type: 'decision_trace',
		title: `Decision: ${input.decision_type}`,
		description: input.rationale,
		status: 'recorded',
		metadata: {
			decision_type: input.decision_type,
			alternatives_considered: input.alternatives_considered,
			chosen_option: input.chosen_option,
			rationale: input.rationale,
		},
		created_by: ctx.agentId,
	});

	// Create has_decision edge (Run -> DecisionTrace)
	await graphService.createEdge({
		edge_type: 'has_decision',
		source_node_id: input.run_id,
		target_node_id: decision.id,
		created_by: ctx.agentId,
	});

	logger.info(`[Net] Decision ${decision.id} recorded`);
	return { decision_id: decision.id };
}

/**
 * MCP Tool: completeTask
 * Mark a task as complete with verification
 */
export async function completeTask(
	ctx: MCPContext,
	input: {
		task_id: string;
		run_id: string;
		verifications: {
			criterion: string;
			evidence_type: 'artifact' | 'run_output' | 'manual_check' | 'external';
			evidence_reference: string;
			notes?: string;
		}[];
	}
): Promise<{ success: boolean; verification_ids: string[] }> {
	logger.info(`[Net] Agent ${ctx.agentId} completing task ${input.task_id}`);

	const task = await graphService.getNode(input.task_id);
	if (!task || task.node_type !== 'task') {
		throw new Error(`Task not found: ${input.task_id}`);
	}

	const run = await graphService.getNode(input.run_id);
	if (!run || run.node_type !== 'run') {
		throw new Error(`Run not found: ${input.run_id}`);
	}

	// Create verification nodes
	const verificationIds: string[] = [];
	for (const v of input.verifications) {
		const verification = await graphService.createNode({
			node_type: 'verification',
			title: `Verification: ${v.criterion}`,
			description: v.notes,
			status: 'verified',
			metadata: {
				criterion: v.criterion,
				evidence_type: v.evidence_type,
				evidence_reference: v.evidence_reference,
				notes: v.notes,
			},
			created_by: ctx.agentId,
		});
		verificationIds.push(verification.id);

		// Create has_verification edge (Task -> Verification)
		await graphService.createEdge({
			edge_type: 'has_verification',
			source_node_id: input.task_id,
			target_node_id: verification.id,
			created_by: ctx.agentId,
		});

		// Create evidenced_by edge (Verification -> Run)
		await graphService.createEdge({
			edge_type: 'evidenced_by',
			source_node_id: verification.id,
			target_node_id: input.run_id,
			created_by: ctx.agentId,
		});
	}

	// Update run status to completed
	await graphService.updateNode(
		input.run_id,
		{
			status: 'completed',
			metadata: {
				...run.metadata,
				completed_at: new Date().toISOString(),
			},
		},
		ctx.agentId
	);

	// Update task status to review (human needs to sign off)
	await graphService.updateNode(
		input.task_id,
		{ status: 'review' },
		ctx.agentId
	);

	logger.info(`[Net] Task ${input.task_id} marked for review with ${verificationIds.length} verifications`);
	return { success: true, verification_ids: verificationIds };
}

/**
 * MCP Tool: queryPrecedents
 * Find relevant precedents for decision-making
 */
export async function queryPrecedents(
	ctx: MCPContext,
	filters: { pattern?: string; context?: string }
): Promise<{ precedents: graphService.Node[] }> {
	logger.info(`[Net] Agent ${ctx.agentId} querying precedents`);

	// Get all active precedent nodes
	const allPrecedents = await graphService.listNodes({
		node_type: 'precedent',
		status: 'active',
		limit: 100,
	});

	// Filter by pattern/context if provided (simple string matching for now)
	let precedents = allPrecedents;
	if (filters.pattern) {
		precedents = precedents.filter(p =>
			p.metadata?.pattern?.toLowerCase().includes(filters.pattern!.toLowerCase())
		);
	}
	if (filters.context) {
		precedents = precedents.filter(p =>
			p.metadata?.context?.toLowerCase().includes(filters.context!.toLowerCase())
		);
	}

	logger.info(`[Net] Found ${precedents.length} relevant precedents`);
	return { precedents };
}

// ============================================================================
// MCP Tool Registry (for integration with MCP server)
// ============================================================================

export const NET_MCP_TOOLS = {
	'net/checkAssignedTasks': {
		name: 'net/checkAssignedTasks',
		description: 'Poll for tasks assigned to the calling agent',
		inputSchema: {
			type: 'object',
			properties: {
				status: { type: 'string', description: 'Filter by task status' },
				priority: { type: 'string', description: 'Filter by priority' },
			},
		},
		handler: checkAssignedTasks,
	},
	'net/getTaskContext': {
		name: 'net/getTaskContext',
		description: 'Get full context for a task including related nodes',
		inputSchema: {
			type: 'object',
			properties: {
				task_id: { type: 'string', description: 'Task ID' },
			},
			required: ['task_id'],
		},
		handler: getTaskContext,
	},
	'net/submitPlan': {
		name: 'net/submitPlan',
		description: 'Submit a plan for human approval',
		inputSchema: {
			type: 'object',
			properties: {
				task_id: { type: 'string' },
				steps: {
					type: 'array',
					items: {
						type: 'object',
						properties: {
							order: { type: 'number' },
							action: { type: 'string' },
							expected_outcome: { type: 'string' },
						},
					},
				},
				rationale: { type: 'string' },
				estimated_duration: { type: 'string' },
				risks: { type: 'array', items: { type: 'string' } },
			},
			required: ['task_id', 'steps', 'rationale'],
		},
		handler: submitPlan,
	},
	'net/checkPlanStatus': {
		name: 'net/checkPlanStatus',
		description: 'Check the approval status of a plan',
		inputSchema: {
			type: 'object',
			properties: {
				plan_id: { type: 'string' },
			},
			required: ['plan_id'],
		},
		handler: checkPlanStatus,
	},
	'net/startRun': {
		name: 'net/startRun',
		description: 'Start execution of an approved plan',
		inputSchema: {
			type: 'object',
			properties: {
				plan_id: { type: 'string' },
			},
			required: ['plan_id'],
		},
		handler: startRun,
	},
	'net/logDecision': {
		name: 'net/logDecision',
		description: 'Record a decision trace during execution',
		inputSchema: {
			type: 'object',
			properties: {
				run_id: { type: 'string' },
				decision_type: { type: 'string' },
				alternatives_considered: { type: 'array' },
				chosen_option: { type: 'string' },
				rationale: { type: 'string' },
			},
			required: ['run_id', 'decision_type', 'alternatives_considered', 'chosen_option', 'rationale'],
		},
		handler: logDecision,
	},
	'net/completeTask': {
		name: 'net/completeTask',
		description: 'Mark a task as complete with verification',
		inputSchema: {
			type: 'object',
			properties: {
				task_id: { type: 'string' },
				run_id: { type: 'string' },
				verifications: { type: 'array' },
			},
			required: ['task_id', 'run_id', 'verifications'],
		},
		handler: completeTask,
	},
	'net/queryPrecedents': {
		name: 'net/queryPrecedents',
		description: 'Find relevant precedents for decision-making',
		inputSchema: {
			type: 'object',
			properties: {
				pattern: { type: 'string' },
				context: { type: 'string' },
			},
		},
		handler: queryPrecedents,
	},
};
