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

/** POST /sessions/:id/finalize-execution — advance to verify after all steps complete */
router.post('/sessions/:id/finalize-execution', async (req: Request, res: Response) => {
	try {
		const result = await taskIntake.finalizeExecution(req.params.id);
		res.json({ ok: true, ...result });
	} catch (err: any) {
		logger.error(`[task-intake] POST /sessions/${req.params.id}/finalize-execution error:`, err);
		res.status(400).json({ ok: false, error: err.message });
	}
});

/** POST /sessions/:id/execute-step — execute a single plan step via AI agent */
router.post('/sessions/:id/execute-step', async (req: Request, res: Response) => {
	try {
		const { step_order, action, tool, expected_outcome } = req.body;
		if (!action) {
			return res.status(400).json({ ok: false, error: 'Missing action' });
		}
		const result = await taskIntake.executeStep(req.params.id, {
			step_order: step_order || 1,
			action,
			tool: tool || null,
			expected_outcome: expected_outcome || '',
		});
		res.json({ ok: true, ...result });
	} catch (err: any) {
		logger.error(`[task-intake] POST /sessions/${req.params.id}/execute-step error:`, err);
		res.status(400).json({ ok: false, error: err.message });
	}
});

/** GET /sessions/:id/execution-results — fetch step outputs from the completed run */
router.get('/sessions/:id/execution-results', async (req: Request, res: Response) => {
	try {
		const result = await taskIntake.getExecutionResults(req.params.id);
		res.json({ ok: true, ...result });
	} catch (err: any) {
		logger.error(`[task-intake] GET /sessions/${req.params.id}/execution-results error:`, err);
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

// ============================================================================
// Task Library — Reusable Templates
// ============================================================================

/** GET /library — list all task templates */
router.get('/library', async (_req: Request, res: Response) => {
	try {
		const templates = await taskIntake.listTaskTemplates();
		res.json({ ok: true, templates });
	} catch (err: any) {
		logger.error('[task-intake] GET /library error:', err);
		res.status(500).json({ ok: false, error: err.message });
	}
});

/** POST /library — create a new template */
router.post('/library', async (req: Request, res: Response) => {
	try {
		const { title } = req.body;
		if (!title) {
			return res.status(400).json({ ok: false, error: 'title required' });
		}
		const template = await taskIntake.createTemplate(req.body);
		res.json({ ok: true, template });
	} catch (err: any) {
		logger.error('[task-intake] POST /library error:', err);
		res.status(400).json({ ok: false, error: err.message });
	}
});

/** PUT /library/:id — update a template */
router.put('/library/:id', async (req: Request, res: Response) => {
	try {
		const template = await taskIntake.updateTemplate(req.params.id, req.body);
		res.json({ ok: true, template });
	} catch (err: any) {
		logger.error(`[task-intake] PUT /library/${req.params.id} error:`, err);
		res.status(400).json({ ok: false, error: err.message });
	}
});

/** DELETE /library/:id — delete a template */
router.delete('/library/:id', async (req: Request, res: Response) => {
	try {
		await taskIntake.deleteTemplate(req.params.id);
		res.json({ ok: true });
	} catch (err: any) {
		logger.error(`[task-intake] DELETE /library/${req.params.id} error:`, err);
		res.status(400).json({ ok: false, error: err.message });
	}
});

/** POST /library/:id/save-from-task — save an existing task as a template */
router.post('/library/:id/save-from-task', async (req: Request, res: Response) => {
	try {
		const template = await taskIntake.saveAsTemplate(req.params.id, req.body);
		res.json({ ok: true, template });
	} catch (err: any) {
		logger.error(`[task-intake] POST /library/${req.params.id}/save-from-task error:`, err);
		res.status(400).json({ ok: false, error: err.message });
	}
});

/** POST /library/:id/run — clone a template into a new live task */
router.post('/library/:id/run', async (req: Request, res: Response) => {
	try {
		const result = await taskIntake.runFromTemplate(req.params.id, req.body);
		res.json({ ok: true, ...result });
	} catch (err: any) {
		logger.error(`[task-intake] POST /library/${req.params.id}/run error:`, err);
		res.status(400).json({ ok: false, error: err.message });
	}
});

export default router;
