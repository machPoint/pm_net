/**
 * Hierarchy API Routes
 *
 * REST endpoints for the 6-level mission hierarchy:
 *   Mission → Program → Project → Phase → Work Package (task)
 */

import { Router, Request, Response } from 'express';
import * as hierarchyService from '../services/hierarchyService';
import logger from '../logger';

const router = Router();

// ── Missions ────────────────────────────────────────────────────────────────

/** GET /hierarchy/missions — list all missions */
router.get('/missions', async (_req: Request, res: Response) => {
	try {
		const missions = await hierarchyService.listMissions();
		res.json({ ok: true, missions });
	} catch (err: any) {
		logger.error('[hierarchy] GET /missions error:', err);
		res.status(500).json({ ok: false, error: err.message });
	}
});

/** DELETE /hierarchy/work-packages/:id — cascade delete a work package and owned artifacts */
router.delete('/work-packages/:id', async (req: Request, res: Response) => {
	try {
		const changedBy = (req.body?.changed_by as string) || (req.query.changed_by as string) || 'user';
		const changeReason = (req.body?.change_reason as string) || 'User deleted work package';
		const result = await hierarchyService.deleteWorkPackageCascade(req.params.id, changedBy, changeReason);
		res.json({ ok: true, ...result });
	} catch (err: any) {
		logger.error(`[hierarchy] DELETE /work-packages/${req.params.id} error:`, err);
		res.status(400).json({ ok: false, error: err.message });
	}
});

/** DELETE /hierarchy/projects/:id — cascade delete project and owned hierarchy/artifacts */
router.delete('/projects/:id', async (req: Request, res: Response) => {
	try {
		const changedBy = (req.body?.changed_by as string) || (req.query.changed_by as string) || 'user';
		const changeReason = (req.body?.change_reason as string) || 'User requested project cleanup';
		const result = await hierarchyService.deleteProjectCascade(req.params.id, changedBy, changeReason);
		res.json({ ok: true, ...result });
	} catch (err: any) {
		logger.error(`[hierarchy] DELETE /projects/${req.params.id} error:`, err);
		res.status(400).json({ ok: false, error: err.message });
	}
});

/** POST /hierarchy/missions — create a mission */
router.post('/missions', async (req: Request, res: Response) => {
	try {
		const { title, description, success_criteria, target_completion } = req.body;
		if (!title) return res.status(400).json({ ok: false, error: 'Missing title' });
		const mission = await hierarchyService.createMission({
			title, description, success_criteria, target_completion,
		});
		res.json({ ok: true, mission });
	} catch (err: any) {
		logger.error('[hierarchy] POST /missions error:', err);
		res.status(400).json({ ok: false, error: err.message });
	}
});

/** GET /hierarchy/missions/:id — get a mission */
router.get('/missions/:id', async (req: Request, res: Response) => {
	try {
		const mission = await hierarchyService.getMission(req.params.id);
		if (!mission) return res.status(404).json({ ok: false, error: 'Not found' });
		res.json({ ok: true, mission });
	} catch (err: any) {
		logger.error(`[hierarchy] GET /missions/${req.params.id} error:`, err);
		res.status(500).json({ ok: false, error: err.message });
	}
});

/** PATCH /hierarchy/missions/:id — update a mission */
router.patch('/missions/:id', async (req: Request, res: Response) => {
	try {
		const mission = await hierarchyService.updateMission(req.params.id, req.body);
		if (!mission) return res.status(404).json({ ok: false, error: 'Not found' });
		res.json({ ok: true, mission });
	} catch (err: any) {
		logger.error(`[hierarchy] PATCH /missions/${req.params.id} error:`, err);
		res.status(400).json({ ok: false, error: err.message });
	}
});

/** GET /hierarchy/missions/:id/tree — full hierarchy tree from mission down */
router.get('/missions/:id/tree', async (req: Request, res: Response) => {
	try {
		const tree = await hierarchyService.getHierarchyTree(req.params.id);
		res.json({ ok: true, ...tree });
	} catch (err: any) {
		logger.error(`[hierarchy] GET /missions/${req.params.id}/tree error:`, err);
		res.status(400).json({ ok: false, error: err.message });
	}
});

// ── Programs ────────────────────────────────────────────────────────────────

/** GET /hierarchy/missions/:id/programs — list programs under a mission */
router.get('/missions/:id/programs', async (req: Request, res: Response) => {
	try {
		const programs = await hierarchyService.listPrograms(req.params.id);
		res.json({ ok: true, programs });
	} catch (err: any) {
		logger.error(`[hierarchy] GET /missions/${req.params.id}/programs error:`, err);
		res.status(500).json({ ok: false, error: err.message });
	}
});

/** POST /hierarchy/missions/:id/programs — create a program under a mission */
router.post('/missions/:id/programs', async (req: Request, res: Response) => {
	try {
		const { title, description, objectives } = req.body;
		if (!title) return res.status(400).json({ ok: false, error: 'Missing title' });
		const program = await hierarchyService.createProgram({
			mission_id: req.params.id,
			title, description, objectives,
		});
		res.json({ ok: true, program });
	} catch (err: any) {
		logger.error(`[hierarchy] POST /missions/${req.params.id}/programs error:`, err);
		res.status(400).json({ ok: false, error: err.message });
	}
});

// ── Projects ────────────────────────────────────────────────────────────────

/** POST /hierarchy/projects — quick project create (same model as regular project) */
router.post('/projects', async (req: Request, res: Response) => {
	try {
		const { title, description, program_id, deliverables, status, category, created_by } = req.body;
		if (!title) return res.status(400).json({ ok: false, error: 'Missing title' });
		const project = await hierarchyService.createQuickProject({
			title,
			description,
			program_id,
			deliverables,
			status,
			category,
			created_by,
		});
		res.json({ ok: true, project });
	} catch (err: any) {
		logger.error('[hierarchy] POST /projects error:', err);
		res.status(400).json({ ok: false, error: err.message });
	}
});

/** GET /hierarchy/programs/:id/projects — list projects under a program */
router.get('/programs/:id/projects', async (req: Request, res: Response) => {
	try {
		const projects = await hierarchyService.listProjects(req.params.id);
		res.json({ ok: true, projects });
	} catch (err: any) {
		logger.error(`[hierarchy] GET /programs/${req.params.id}/projects error:`, err);
		res.status(500).json({ ok: false, error: err.message });
	}
});

/** POST /hierarchy/programs/:id/projects — create a project under a program */
router.post('/programs/:id/projects', async (req: Request, res: Response) => {
	try {
		const { title, description, deliverables } = req.body;
		if (!title) return res.status(400).json({ ok: false, error: 'Missing title' });
		const project = await hierarchyService.createProject({
			program_id: req.params.id,
			title, description, deliverables,
		});
		res.json({ ok: true, project });
	} catch (err: any) {
		logger.error(`[hierarchy] POST /programs/${req.params.id}/projects error:`, err);
		res.status(400).json({ ok: false, error: err.message });
	}
});

// ── Phases ───────────────────────────────────────────────────────────────────

/** GET /hierarchy/projects/:id/phases — list phases under a project */
router.get('/projects/:id/phases', async (req: Request, res: Response) => {
	try {
		const phases = await hierarchyService.listPhases(req.params.id);
		res.json({ ok: true, phases });
	} catch (err: any) {
		logger.error(`[hierarchy] GET /projects/${req.params.id}/phases error:`, err);
		res.status(500).json({ ok: false, error: err.message });
	}
});

/** POST /hierarchy/projects/:id/phases — create a phase under a project */
router.post('/projects/:id/phases', async (req: Request, res: Response) => {
	try {
		const { title, description, gate_criteria, estimated_duration_days } = req.body;
		if (!title) return res.status(400).json({ ok: false, error: 'Missing title' });
		const phase = await hierarchyService.createPhase({
			project_id: req.params.id,
			title, description, gate_criteria, estimated_duration_days,
		});
		res.json({ ok: true, phase });
	} catch (err: any) {
		logger.error(`[hierarchy] POST /projects/${req.params.id}/phases error:`, err);
		res.status(400).json({ ok: false, error: err.message });
	}
});

// ── Work Packages (tasks within a phase) ────────────────────────────────────

/** GET /hierarchy/phases/:id/work-packages — list work packages in a phase */
router.get('/phases/:id/work-packages', async (req: Request, res: Response) => {
	try {
		const workPackages = await hierarchyService.listWorkPackages(req.params.id);
		res.json({ ok: true, work_packages: workPackages });
	} catch (err: any) {
		logger.error(`[hierarchy] GET /phases/${req.params.id}/work-packages error:`, err);
		res.status(500).json({ ok: false, error: err.message });
	}
});

/** POST /hierarchy/phases/:id/work-packages — link an existing task to a phase */
router.post('/phases/:id/work-packages', async (req: Request, res: Response) => {
	try {
		const { task_id } = req.body;
		if (!task_id) return res.status(400).json({ ok: false, error: 'Missing task_id' });
		await hierarchyService.addWorkPackageToPhase(req.params.id, task_id);
		res.json({ ok: true });
	} catch (err: any) {
		logger.error(`[hierarchy] POST /phases/${req.params.id}/work-packages error:`, err);
		res.status(400).json({ ok: false, error: err.message });
	}
});

// ── Phase Gate Reviews ──────────────────────────────────────────────────────

/** POST /hierarchy/phases/:id/gate-review — submit a gate review decision */
router.post('/phases/:id/gate-review', async (req: Request, res: Response) => {
	try {
		const { decision, feedback } = req.body;
		if (!decision || !['proceed', 'hold', 'revise', 'cancel'].includes(decision)) {
			return res.status(400).json({ ok: false, error: 'Invalid decision (proceed|hold|revise|cancel)' });
		}
		const result = await hierarchyService.reviewPhaseGate(req.params.id, {
			decision, feedback, reviewed_by: 'user',
		});
		res.json({ ok: true, ...result });
	} catch (err: any) {
		logger.error(`[hierarchy] POST /phases/${req.params.id}/gate-review error:`, err);
		res.status(400).json({ ok: false, error: err.message });
	}
});

/** GET /hierarchy/gate-reviews/pending — all phases awaiting gate review */
router.get('/gate-reviews/pending', async (_req: Request, res: Response) => {
	try {
		const phases = await hierarchyService.getPendingGateReviews();
		res.json({ ok: true, phases });
	} catch (err: any) {
		logger.error('[hierarchy] GET /gate-reviews/pending error:', err);
		res.status(500).json({ ok: false, error: err.message });
	}
});

// ── Hierarchy Context (breadcrumbs) ─────────────────────────────────────────

/** GET /hierarchy/work-packages/:id/context — get full hierarchy breadcrumb for a task */
router.get('/work-packages/:id/context', async (req: Request, res: Response) => {
	try {
		const context = await hierarchyService.getWorkPackageContext(req.params.id);
		res.json({ ok: true, ...context });
	} catch (err: any) {
		logger.error(`[hierarchy] GET /work-packages/${req.params.id}/context error:`, err);
		res.status(400).json({ ok: false, error: err.message });
	}
});

// ── Generic node tree (from any level) ──────────────────────────────────────

/** GET /hierarchy/tree/:id — get hierarchy tree from any node */
router.get('/tree/:id', async (req: Request, res: Response) => {
	try {
		const depth = parseInt(req.query.depth as string) || 4;
		const tree = await hierarchyService.getHierarchyTree(req.params.id, Math.min(depth, 6));
		res.json({ ok: true, ...tree });
	} catch (err: any) {
		logger.error(`[hierarchy] GET /tree/${req.params.id} error:`, err);
		res.status(400).json({ ok: false, error: err.message });
	}
});

// ── Default Hierarchy (backward compat) ─────────────────────────────────────

/** POST /hierarchy/ensure-defaults — create default hierarchy for orphan tasks */
router.post('/ensure-defaults', async (_req: Request, res: Response) => {
	try {
		const defaults = await hierarchyService.ensureDefaultHierarchy();
		res.json({ ok: true, ...defaults });
	} catch (err: any) {
		logger.error('[hierarchy] POST /ensure-defaults error:', err);
		res.status(500).json({ ok: false, error: err.message });
	}
});

export default router;
