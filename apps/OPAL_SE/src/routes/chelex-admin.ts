/**
 * Chelex Admin API Routes
 * 
 * REST endpoints to support the Chelex Governance UI.
 * Allows humans to:
 * - View tasks and their status
 * - Review and approve agent plans
 * - Monitor agent execution runs
 * - See system-wide activity
 */

import express, { Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import db from '../config/database';
import logger from '../logger';

const router = express.Router();

// CORS middleware specific to this router if needed (inherits from app)
router.use((req: Request, res: Response, next) => {
	res.header('Access-Control-Allow-Origin', '*');
	res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
	res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
	if (req.method === 'OPTIONS') return res.sendStatus(200);
	next();
});

/**
 * @route GET /api/chelex/tasks
 * @desc List tasks with filters
 */
router.get('/tasks', async (req: Request, res: Response) => {
	try {
		const { assignee_type, status, project_id } = req.query;

		let query = db('chelex_tasks');

		if (assignee_type) query = query.where('assignee_type', assignee_type as string);
		if (status) query = query.where('status', status as string);
		if (project_id) query = query.where('project_id', project_id as string);

		const tasks = await query.orderBy('created_at', 'desc');

		// Parse acceptance criteria if stored as string
		const parsedTasks = tasks.map(t => ({
			...t,
			acceptance_criteria: typeof t.acceptance_criteria === 'string'
				? JSON.parse(t.acceptance_criteria)
				: t.acceptance_criteria
		}));

		res.json({ tasks: parsedTasks });
	} catch (error: any) {
		logger.error('Error getting Chelex tasks:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * @route GET /api/chelex/plans/pending
 * @desc Get plans awaiting approval
 */
router.get('/plans/pending', async (req: Request, res: Response) => {
	try {
		const plans = await db('chelex_plans')
			.where({ status: 'pending' })
			.join('chelex_tasks', 'chelex_plans.task_id', 'chelex_tasks.id')
			.select('chelex_plans.*', 'chelex_tasks.title as task_title')
			.orderBy('chelex_plans.created_at', 'asc');

		// Parse JSON fields
		const parsedPlans = plans.map(p => ({
			...p,
			steps: typeof p.steps === 'string' ? JSON.parse(p.steps) : p.steps,
			planned_traversal: p.planned_traversal && typeof p.planned_traversal === 'string'
				? JSON.parse(p.planned_traversal)
				: p.planned_traversal
		}));

		res.json({ plans: parsedPlans });
	} catch (error: any) {
		logger.error('Error getting pending plans:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * @route POST /api/chelex/approvals
 * @desc Approve or reject a plan
 */
router.post('/approvals', async (req: Request, res: Response) => {
	try {
		const { plan_id, decision, rationale, approved_by, authority_level } = req.body;

		// Validate decision
		if (!['approved', 'rejected', 'changes_requested'].includes(decision)) {
			return res.status(400).json({ error: 'Invalid decision' });
		}

		if (!plan_id || !approved_by) {
			return res.status(400).json({ error: 'plan_id and approved_by are required' });
		}

		// Create approval record
		await db('chelex_approvals').insert({
			id: uuid(),
			plan_id,
			approved_by,
			decision,
			rationale,
			requested_changes: decision === 'changes_requested' ? rationale : null,
			authority_level: authority_level || 'engineer',
			timestamp: new Date()
		});

		// Update plan status
		await db('chelex_plans')
			.where({ id: plan_id })
			.update({
				status: decision === 'approved' ? 'approved' : 'rejected',
				approved_at: decision === 'approved' ? new Date() : null
			});

		// If approved, update task status back to in_progress
		if (decision === 'approved') {
			const plan = await db('chelex_plans').where({ id: plan_id }).first();
			await db('chelex_tasks')
				.where({ id: plan.task_id })
				.update({ status: 'in_progress', updated_at: new Date() });
		}

		logger.info(`Plan ${plan_id} ${decision} by ${approved_by}`);

		res.json({ success: true, decision });
	} catch (error: any) {
		logger.error('Error recording approval:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * @route GET /api/chelex/runs/:task_id
 * @desc Get execution history for a task
 */
router.get('/runs/:task_id', async (req: Request, res: Response) => {
	try {
		const runs = await db('chelex_runs')
			.where({ task_id: req.params.task_id })
			.orderBy('started_at', 'desc');

		// Enrich with decision traces and verifications
		for (const run of runs) {
			// Get decisions
			run.decision_traces = await db('chelex_decision_traces')
				.where({ run_id: run.id })
				.orderBy('timestamp', 'asc');

			// Parse JSON fields in traces
			run.decision_traces = run.decision_traces.map((t: any) => ({
				...t,
				context_snapshot: typeof t.context_snapshot === 'string' ? JSON.parse(t.context_snapshot) : t.context_snapshot,
				options_considered: typeof t.options_considered === 'string' ? JSON.parse(t.options_considered) : t.options_considered
			}));

			// Get verifications
			run.verifications = await db('chelex_verifications')
				.where({ run_id: run.id });

			// Parse JSON fields in run
			run.artifacts = typeof run.artifacts === 'string' ? JSON.parse(run.artifacts) : run.artifacts;
			run.actual_traversal = typeof run.actual_traversal === 'string' ? JSON.parse(run.actual_traversal) : run.actual_traversal;
		}

		res.json({ runs });
	} catch (error: any) {
		logger.error('Error getting task runs:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * @route GET /api/chelex/activity
 * @desc Activity feed for audit
 */
router.get('/activity', async (req: Request, res: Response) => {
	try {
		// Aggregate events from tasks, plans, approvals
		const taskEvents = await db('chelex_tasks')
			.select('id', 'title', 'status', 'created_at as timestamp',
				db.raw("'task_created' as event_type"))
			.orderBy('created_at', 'desc')
			.limit(50);

		const planEvents = await db('chelex_plans')
			.select('id', 'task_id', 'status', 'created_at as timestamp',
				db.raw("'plan_submitted' as event_type"))
			.orderBy('created_at', 'desc')
			.limit(50);

		const approvalEvents = await db('chelex_approvals')
			.select('id', 'plan_id', 'decision', 'timestamp',
				db.raw("'plan_decision' as event_type"))
			.orderBy('timestamp', 'desc')
			.limit(50);

		// Merge and sort
		const allEvents = [...taskEvents, ...planEvents, ...approvalEvents]
			.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
			.slice(0, 100);

		res.json({ events: allEvents });
	} catch (error: any) {
		logger.error('Error getting Chelex activity:', error);
		res.status(500).json({ error: error.message });
	}
});

export default router;
