import { Router, Request, Response } from 'express';
import * as scheduler from '../services/schedulerService';
import { listRuntimes } from '../services/agentDispatcher';
import logger from '../logger';

const router = Router();

// ── Standalone job CRUD ────────────────────────────────────────────────

/** POST /scheduler/jobs — create a standalone scheduled job */
router.post('/jobs', async (req: Request, res: Response) => {
	try {
		const { title, prompt, run_at, recurrence_cron, project_id, task_id, agent_id, runtime, metadata } = req.body || {};
		if (!title || !prompt || !run_at) {
			return res.status(400).json({ ok: false, error: 'Missing required fields: title, prompt, run_at' });
		}
		const job = await scheduler.createJob({
			title,
			prompt,
			run_at,
			recurrence_cron,
			project_id,
			task_id,
			agent_id,
			runtime,
			created_by: req.body?.created_by || 'user',
			metadata,
		});
		res.json({ ok: true, job });
	} catch (err: any) {
		logger.error('[scheduler] POST /jobs error:', err);
		res.status(400).json({ ok: false, error: err.message });
	}
});

/** GET /scheduler/jobs — list all jobs (optionally filter by status) */
router.get('/jobs', async (req: Request, res: Response) => {
	try {
		const status = req.query.status as string | undefined;
		const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
		const jobs = await scheduler.listAllJobs({ status, limit });
		res.json({ ok: true, jobs });
	} catch (err: any) {
		logger.error('[scheduler] GET /jobs error:', err);
		res.status(400).json({ ok: false, error: err.message });
	}
});

/** GET /scheduler/runtimes — list available agent runtimes */
router.get('/runtimes', async (_req: Request, res: Response) => {
	try {
		const runtimes = await listRuntimes();
		res.json({ ok: true, runtimes });
	} catch (err: any) {
		logger.error('[scheduler] GET /runtimes error:', err);
		res.status(500).json({ ok: false, error: err.message });
	}
});

// ── Project-scoped routes ──────────────────────────────────────────────

/** GET /scheduler/projects/:id/profile */
router.get('/projects/:id/profile', async (req: Request, res: Response) => {
	try {
		const profile = await scheduler.getProfile(req.params.id);
		res.json({ ok: true, profile });
	} catch (err: any) {
		logger.error(`[scheduler] GET /projects/${req.params.id}/profile error:`, err);
		res.status(400).json({ ok: false, error: err.message });
	}
});

/** PUT /scheduler/projects/:id/profile */
router.put('/projects/:id/profile', async (req: Request, res: Response) => {
	try {
		const profile = await scheduler.upsertProfile(req.params.id, req.body || {});
		res.json({ ok: true, profile });
	} catch (err: any) {
		logger.error(`[scheduler] PUT /projects/${req.params.id}/profile error:`, err);
		res.status(400).json({ ok: false, error: err.message });
	}
});

/** POST /scheduler/projects/:id/generate */
router.post('/projects/:id/generate', async (req: Request, res: Response) => {
	try {
		const created_by = (req.body?.created_by as string) || 'user';
		const start_at = req.body?.start_at as string | undefined;
		const replace_existing = req.body?.replace_existing === true;
		const result = await scheduler.generateProjectSchedule({
			project_id: req.params.id,
			start_at,
			created_by,
			replace_existing,
		});
		res.json({ ok: true, ...result });
	} catch (err: any) {
		logger.error(`[scheduler] POST /projects/${req.params.id}/generate error:`, err);
		res.status(400).json({ ok: false, error: err.message });
	}
});

/** GET /scheduler/projects/:id/jobs?from=...&to=... */
router.get('/projects/:id/jobs', async (req: Request, res: Response) => {
	try {
		const from = req.query.from as string | undefined;
		const to = req.query.to as string | undefined;
		const jobs = await scheduler.listProjectJobs(req.params.id, from, to);
		res.json({ ok: true, jobs });
	} catch (err: any) {
		logger.error(`[scheduler] GET /projects/${req.params.id}/jobs error:`, err);
		res.status(400).json({ ok: false, error: err.message });
	}
});

/** PATCH /scheduler/jobs/:id */
router.patch('/jobs/:id', async (req: Request, res: Response) => {
	try {
		const job = await scheduler.updateJob(req.params.id, req.body || {});
		res.json({ ok: true, job });
	} catch (err: any) {
		logger.error(`[scheduler] PATCH /jobs/${req.params.id} error:`, err);
		res.status(400).json({ ok: false, error: err.message });
	}
});

/** POST /scheduler/jobs/:id/cancel */
router.post('/jobs/:id/cancel', async (req: Request, res: Response) => {
	try {
		const result = await scheduler.cancelJob(req.params.id, req.body?.reason || 'Canceled by user');
		res.json({ ok: true, ...result });
	} catch (err: any) {
		logger.error(`[scheduler] POST /jobs/${req.params.id}/cancel error:`, err);
		res.status(400).json({ ok: false, error: err.message });
	}
});

/** POST /scheduler/dispatch/run-once */
router.post('/dispatch/run-once', async (_req: Request, res: Response) => {
	try {
		const result = await scheduler.dispatchDueJobs();
		res.json({ ok: true, ...result });
	} catch (err: any) {
		logger.error('[scheduler] POST /dispatch/run-once error:', err);
		res.status(500).json({ ok: false, error: err.message });
	}
});

export default router;
