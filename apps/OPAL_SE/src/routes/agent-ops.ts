/**
 * Agent Operations API Routes
 * 
 * REST endpoints that bridge the UI to the netService MCP tools.
 * Allows the frontend to:
 * - Assign tasks to agents
 * - Trigger plan submission
 * - Start execution runs
 * - Complete tasks with verification
 * - Query agent task status
 */

import express, { Request, Response } from 'express';
import * as netService from '../services/netService';
import * as graphService from '../services/graphService';
import logger from '../logger';

const router = express.Router();

async function resolveAssignableAgent(agentIdRaw: string): Promise<{
	agentNodeId: string;
	openclawAgentId: string | null;
}> {
	const agentId = String(agentIdRaw || '').trim();
	if (!agentId) throw new Error('agent_id is required');

	const existingNode = await graphService.getNode(agentId);
	if (existingNode) {
		const ocId = String(existingNode.metadata?.openclaw_agent_id || '').trim();
		return { agentNodeId: existingNode.id, openclawAgentId: ocId || null };
	}

	const openclawMatch = /^openclaw-(.+)$/.exec(agentId);
	if (!openclawMatch) {
		throw new Error(`Target node not found: ${agentId}`);
	}

	const openclawAgentId = openclawMatch[1].trim();
	if (!openclawAgentId) {
		throw new Error(`Invalid OpenClaw agent id: ${agentId}`);
	}

	const resources = await graphService.listNodes({ node_type: 'resource', limit: 500 });
	const mapped = (resources || []).find((n: any) => {
		const meta = n?.metadata || {};
		if (meta.resource_type !== 'agent') return false;
		return String(meta.openclaw_agent_id || '').trim() === openclawAgentId;
	});

	if (mapped) {
		return { agentNodeId: mapped.id, openclawAgentId };
	}

	const created = await graphService.createNode({
		node_type: 'resource',
		title: `OpenClaw: ${openclawAgentId}`,
		description: `OpenClaw agent binding for ${openclawAgentId}`,
		status: 'active',
		metadata: {
			resource_type: 'agent',
			agent_kind: 'openclaw',
			openclaw_agent_id: openclawAgentId,
		},
		created_by: 'ui-user',
		source: 'ui',
	});

	return { agentNodeId: created.id, openclawAgentId };
}

/**
 * @route GET /api/agent-ops/tasks/:agentId
 * @desc Get tasks assigned to a specific agent
 */
router.get('/tasks/:agentId', async (req: Request, res: Response) => {
	try {
		const ctx: netService.MCPContext = { agentId: req.params.agentId };
		const filters = {
			status: req.query.status as string | undefined,
			priority: req.query.priority as string | undefined,
		};
		const result = await netService.checkAssignedTasks(ctx, filters);
		res.json(result);
	} catch (error: any) {
		logger.error('Error checking assigned tasks:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * @route GET /api/agent-ops/task-context/:taskId
 * @desc Get full context for a task (related plans, runs, assignees)
 */
router.get('/task-context/:taskId', async (req: Request, res: Response) => {
	try {
		const agentId = (req.query.agent_id as string) || 'ui-user';
		const ctx: netService.MCPContext = { agentId };
		const result = await netService.getTaskContext(ctx, req.params.taskId);
		res.json(result);
	} catch (error: any) {
		logger.error('Error getting task context:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * @route POST /api/agent-ops/assign
 * @desc Assign a task to an agent by creating an assigned_to edge
 */
router.post('/assign', async (req: Request, res: Response) => {
	try {
		const { task_id, agent_id } = req.body;
		if (!task_id || !agent_id) {
			return res.status(400).json({ error: 'task_id and agent_id are required' });
		}

		// Verify task exists
		const task = await graphService.getNode(task_id);
		if (!task) {
			return res.status(404).json({ error: `Task not found: ${task_id}` });
		}

		const resolved = await resolveAssignableAgent(agent_id);

		let edgeId: string | null = null;
		const existingEdges = await graphService.listEdges({
			edge_type: 'assigned_to',
			source_node_id: task_id,
			target_node_id: resolved.agentNodeId,
			limit: 1,
		});

		if (existingEdges.length > 0) {
			edgeId = existingEdges[0].id;
		} else {
			const edge = await graphService.createEdge({
				edge_type: 'assigned_to',
				source_node_id: task_id,
				target_node_id: resolved.agentNodeId,
				created_by: 'ui-user',
			});
			edgeId = edge.id;
		}

		const updatedTaskMetadata: Record<string, any> = {
			...(task.metadata || {}),
			assignee_type: 'agent',
			assigned_agent_node_id: resolved.agentNodeId,
			assigned_agent_id: resolved.openclawAgentId || resolved.agentNodeId,
		};
		if (resolved.openclawAgentId) {
			updatedTaskMetadata.execution_agent_id = resolved.openclawAgentId;
		}

		// Update task status and assignee metadata
		await graphService.updateNode(task_id, { status: 'in_progress', metadata: updatedTaskMetadata }, 'ui-user');

		logger.info(`Task ${task_id} assigned to agent ${resolved.agentNodeId}${resolved.openclawAgentId ? ` (openclaw:${resolved.openclawAgentId})` : ''}`);
		res.json({
			success: true,
			edge_id: edgeId,
			agent_node_id: resolved.agentNodeId,
			execution_agent_id: resolved.openclawAgentId,
		});
	} catch (error: any) {
		logger.error('Error assigning task:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * @route POST /api/agent-ops/submit-plan
 * @desc Submit an execution plan for a task
 */
router.post('/submit-plan', async (req: Request, res: Response) => {
	try {
		const { agent_id, task_id, steps, rationale, estimated_duration, risks } = req.body;
		if (!task_id || !agent_id) {
			return res.status(400).json({ error: 'task_id and agent_id are required' });
		}

		const ctx: netService.MCPContext = { agentId: agent_id };
		const result = await netService.submitPlan(ctx, {
			task_id,
			steps: steps || [],
			rationale: rationale || '',
			estimated_duration,
			risks,
		});

		res.json(result);
	} catch (error: any) {
		logger.error('Error submitting plan:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * @route GET /api/agent-ops/plan-status/:planId
 * @desc Check the approval status of a plan
 */
router.get('/plan-status/:planId', async (req: Request, res: Response) => {
	try {
		const agentId = (req.query.agent_id as string) || 'ui-user';
		const ctx: netService.MCPContext = { agentId };
		const result = await netService.checkPlanStatus(ctx, req.params.planId);
		res.json(result);
	} catch (error: any) {
		logger.error('Error checking plan status:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * @route POST /api/agent-ops/approve-plan
 * @desc Approve a pending plan (human action from UI)
 */
router.post('/approve-plan', async (req: Request, res: Response) => {
	try {
		const { plan_id, approved_by } = req.body;
		if (!plan_id) {
			return res.status(400).json({ error: 'plan_id is required' });
		}

		const plan = await graphService.getNode(plan_id);
		if (!plan) {
			return res.status(404).json({ error: `Plan not found: ${plan_id}` });
		}

		await graphService.updateNode(plan_id, { status: 'approved' }, approved_by || 'ui-user');

		logger.info(`Plan ${plan_id} approved by ${approved_by || 'ui-user'}`);
		res.json({ success: true, status: 'approved' });
	} catch (error: any) {
		logger.error('Error approving plan:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * @route POST /api/agent-ops/start-run
 * @desc Start execution of an approved plan
 */
router.post('/start-run', async (req: Request, res: Response) => {
	try {
		const { agent_id, plan_id } = req.body;
		if (!plan_id || !agent_id) {
			return res.status(400).json({ error: 'plan_id and agent_id are required' });
		}

		const ctx: netService.MCPContext = { agentId: agent_id };
		const result = await netService.startRun(ctx, plan_id);
		res.json(result);
	} catch (error: any) {
		logger.error('Error starting run:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * @route POST /api/agent-ops/complete-task
 * @desc Mark a task as complete with verification evidence
 */
router.post('/complete-task', async (req: Request, res: Response) => {
	try {
		const { agent_id, task_id, run_id, verifications } = req.body;
		if (!task_id || !run_id || !agent_id) {
			return res.status(400).json({ error: 'task_id, run_id, and agent_id are required' });
		}

		const ctx: netService.MCPContext = { agentId: agent_id };
		const result = await netService.completeTask(ctx, {
			task_id,
			run_id,
			verifications: verifications || [],
		});
		res.json(result);
	} catch (error: any) {
		logger.error('Error completing task:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * @route POST /api/agent-ops/log-decision
 * @desc Record a decision trace during execution
 */
router.post('/log-decision', async (req: Request, res: Response) => {
	try {
		const { agent_id, run_id, decision_type, alternatives_considered, chosen_option, rationale } = req.body;
		if (!run_id || !agent_id) {
			return res.status(400).json({ error: 'run_id and agent_id are required' });
		}

		const ctx: netService.MCPContext = { agentId: agent_id };
		const result = await netService.logDecision(ctx, {
			run_id,
			decision_type: decision_type || 'general',
			alternatives_considered: alternatives_considered || [],
			chosen_option: chosen_option || '',
			rationale: rationale || '',
		});
		res.json(result);
	} catch (error: any) {
		logger.error('Error logging decision:', error);
		res.status(500).json({ error: error.message });
	}
});

export default router;
