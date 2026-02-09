/**
 * Task Intake API Routes
 * 
 * REST endpoints for the guided task creation walkthrough (Stages 0-7).
 * All routes are prefixed with /api/task-intake.
 */

import { Router, Request, Response } from 'express';
import * as taskIntake from '../services/taskIntakeService';
import logger from '../logger';

const router = Router();

// ── Session management ──────────────────────────────────────────────────────

/** POST /sessions — create a new intake session */
router.post('/sessions', async (_req: Request, res: Response) => {
	try {
		const session = await taskIntake.createSession();
		res.json({ ok: true, session });
	} catch (err: any) {
		logger.error('[task-intake] POST /sessions error:', err);
		res.status(500).json({ ok: false, error: err.message });
	}
});

/** GET /sessions — list all sessions */
router.get('/sessions', (_req: Request, res: Response) => {
	try {
		const sessions = taskIntake.listSessions();
		res.json({ ok: true, sessions });
	} catch (err: any) {
		logger.error('[task-intake] GET /sessions error:', err);
		res.status(500).json({ ok: false, error: err.message });
	}
});

/** GET /sessions/:id — get session with full graph state */
router.get('/sessions/:id', async (req: Request, res: Response) => {
	try {
		const state = await taskIntake.getSessionState(req.params.id);
		res.json({ ok: true, ...state });
	} catch (err: any) {
		logger.error(`[task-intake] GET /sessions/${req.params.id} error:`, err);
		res.status(404).json({ ok: false, error: err.message });
	}
});

// ── Stage 0: Start ──────────────────────────────────────────────────────────

/** POST /sessions/:id/start — create the task node */
router.post('/sessions/:id/start', async (req: Request, res: Response) => {
	try {
		const result = await taskIntake.startTask(req.params.id, req.body);
		res.json({ ok: true, ...result });
	} catch (err: any) {
		logger.error(`[task-intake] POST /sessions/${req.params.id}/start error:`, err);
		res.status(400).json({ ok: false, error: err.message });
	}
});

// ── Stage 1: Precedent lookup ───────────────────────────────────────────────

/** POST /sessions/:id/precedents — lookup similar past workflows */
router.post('/sessions/:id/precedents', async (req: Request, res: Response) => {
	try {
		const result = await taskIntake.lookupPrecedents(req.params.id);
		res.json({ ok: true, ...result });
	} catch (err: any) {
		logger.error(`[task-intake] POST /sessions/${req.params.id}/precedents error:`, err);
		res.status(400).json({ ok: false, error: err.message });
	}
});

/** POST /sessions/:id/select-precedent — select a precedent to base plan on */
router.post('/sessions/:id/select-precedent', async (req: Request, res: Response) => {
	try {
		const { precedent_id } = req.body;
		if (!precedent_id) {
			return res.status(400).json({ ok: false, error: 'precedent_id required' });
		}
		const result = await taskIntake.selectPrecedent(req.params.id, precedent_id);
		res.json({ ok: true, ...result });
	} catch (err: any) {
		logger.error(`[task-intake] POST /sessions/${req.params.id}/select-precedent error:`, err);
		res.status(400).json({ ok: false, error: err.message });
	}
});

// ── Stage 2: Clarify ────────────────────────────────────────────────────────

/** POST /sessions/:id/clarify — send a user message for clarification */
router.post('/sessions/:id/clarify', async (req: Request, res: Response) => {
	try {
		const { message } = req.body;
		if (!message) {
			return res.status(400).json({ ok: false, error: 'message required' });
		}
		const result = await taskIntake.clarify(req.params.id, message);
		res.json({ ok: true, ...result });
	} catch (err: any) {
		logger.error(`[task-intake] POST /sessions/${req.params.id}/clarify error:`, err);
		res.status(400).json({ ok: false, error: err.message });
	}
});

// ── Stage 3: Generate plan ──────────────────────────────────────────────────

/** POST /sessions/:id/plan — generate a plan node */
router.post('/sessions/:id/plan', async (req: Request, res: Response) => {
	try {
		const requiresGate = req.body.requires_gate !== false;
		const result = await taskIntake.generatePlan(req.params.id, requiresGate);
		res.json({ ok: true, ...result });
	} catch (err: any) {
		logger.error(`[task-intake] POST /sessions/${req.params.id}/plan error:`, err);
		res.status(400).json({ ok: false, error: err.message });
	}
});

// ── Stage 4: Approve / Reject ───────────────────────────────────────────────

/** POST /sessions/:id/approve — approve or reject the plan */
router.post('/sessions/:id/approve', async (req: Request, res: Response) => {
	try {
		const approved = req.body.approved !== false;
		const result = await taskIntake.approvePlan(req.params.id, approved);
		res.json({ ok: true, ...result });
	} catch (err: any) {
		logger.error(`[task-intake] POST /sessions/${req.params.id}/approve error:`, err);
		res.status(400).json({ ok: false, error: err.message });
	}
});

// ── Stage 5: Execute ────────────────────────────────────────────────────────

/** POST /sessions/:id/execute — start execution (create run node) */
router.post('/sessions/:id/execute', async (req: Request, res: Response) => {
	try {
		const result = await taskIntake.startExecution(req.params.id);
		res.json({ ok: true, ...result });
	} catch (err: any) {
		logger.error(`[task-intake] POST /sessions/${req.params.id}/execute error:`, err);
		res.status(400).json({ ok: false, error: err.message });
	}
});

/** POST /sessions/:id/decision-trace — log a decision trace during execution */
router.post('/sessions/:id/decision-trace', async (req: Request, res: Response) => {
	try {
		const result = await taskIntake.logDecisionTrace(req.params.id, req.body);
		res.json({ ok: true, ...result });
	} catch (err: any) {
		logger.error(`[task-intake] POST /sessions/${req.params.id}/decision-trace error:`, err);
		res.status(400).json({ ok: false, error: err.message });
	}
});

// ── Stage 6: Verify ─────────────────────────────────────────────────────────

/** POST /sessions/:id/verify — submit deliverables and verification results */
router.post('/sessions/:id/verify', async (req: Request, res: Response) => {
	try {
		const result = await taskIntake.completeVerification(req.params.id, req.body);
		res.json({ ok: true, ...result });
	} catch (err: any) {
		logger.error(`[task-intake] POST /sessions/${req.params.id}/verify error:`, err);
		res.status(400).json({ ok: false, error: err.message });
	}
});

// ── Stage 7: Learn ──────────────────────────────────────────────────────────

/** POST /sessions/:id/learn — create a precedent from the completed run */
router.post('/sessions/:id/learn', async (req: Request, res: Response) => {
	try {
		const result = await taskIntake.createPrecedent(req.params.id);
		res.json({ ok: true, ...result });
	} catch (err: any) {
		logger.error(`[task-intake] POST /sessions/${req.params.id}/learn error:`, err);
		res.status(400).json({ ok: false, error: err.message });
	}
});

// ── Delete session + associated nodes ───────────────────────────────────────

/** DELETE /sessions/:id — delete session and optionally its graph nodes */
router.delete('/sessions/:id', async (req: Request, res: Response) => {
	try {
		const result = await taskIntake.deleteSession(req.params.id);
		res.json({ ok: true, ...result });
	} catch (err: any) {
		logger.error(`[task-intake] DELETE /sessions/${req.params.id} error:`, err);
		res.status(400).json({ ok: false, error: err.message });
	}
});

export default router;
