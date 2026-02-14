import { Router, Request, Response } from 'express';
import * as scheduler from '../services/schedulerService';
import logger from '../logger';

const router = Router();

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
