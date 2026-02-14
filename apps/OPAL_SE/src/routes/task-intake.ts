/**
 * Task Intake API Routes
 * 
 * REST endpoints for the guided task creation walkthrough (Stages 0-7).
 * All routes are prefixed with /api/task-intake.
 */

import { Router, Request, Response } from 'express';
import * as taskIntake from '../services/taskIntakeService';
import * as graphService from '../services/graphService';
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

/** POST /sessions/:id/plan-steps — persist edited plan steps before approval */
router.post('/sessions/:id/plan-steps', async (req: Request, res: Response) => {
	try {
		const { steps } = req.body;
		if (!Array.isArray(steps)) {
			return res.status(400).json({ ok: false, error: 'steps array required' });
		}
		const result = await taskIntake.updatePlanSteps(req.params.id, steps);
		res.json({ ok: true, ...result });
	} catch (err: any) {
		logger.error(`[task-intake] POST /sessions/${req.params.id}/plan-steps error:`, err);
		res.status(400).json({ ok: false, error: err.message });
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
		const editedSteps = Array.isArray(req.body.steps) ? req.body.steps : undefined;
		const result = await taskIntake.approvePlan(req.params.id, approved, editedSteps);
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
		const { step_order, action, tool, expected_outcome, step_type } = req.body;
		if (!action) {
			return res.status(400).json({ ok: false, error: 'Missing action' });
		}
		const result = await taskIntake.executeStep(req.params.id, {
			step_order: step_order || 1,
			action,
			tool: tool || null,
			expected_outcome: expected_outcome || '',
			step_type,
		});
		res.json({ ok: true, ...result });
	} catch (err: any) {
		logger.error(`[task-intake] POST /sessions/${req.params.id}/execute-step error:`, err);
		res.status(400).json({ ok: false, error: err.message });
	}
});

/**
 * POST /sessions/:id/execute-stream — execute all plan steps and stream rich telemetry as SSE
 *
 * Body:
 * {
 *   steps: Array<{ order, action, tool, expected_outcome, step_type }>
 * }
 */
router.post('/sessions/:id/execute-stream', async (req: Request, res: Response) => {
	const sessionId = req.params.id;
	const steps = Array.isArray(req.body?.steps) ? req.body.steps : [];

	if (steps.length === 0) {
		return res.status(400).json({ ok: false, error: 'steps array required' });
	}

	res.writeHead(200, {
		'Content-Type': 'text/event-stream',
		'Cache-Control': 'no-cache, no-transform',
		Connection: 'keep-alive',
	});

	const send = (event: string, payload: Record<string, any>) => {
		res.write(`event: ${event}\n`);
		res.write(`data: ${JSON.stringify(payload)}\n\n`);
	};

	try {
		const state = await taskIntake.getSessionState(sessionId);
		if (!state?.session) {
			send('run_error', { session_id: sessionId, error: 'Session not found' });
			return res.end();
		}

		// Ensure run is initialized once before step execution
		if (!state.session.run_id) {
			await taskIntake.startExecution(sessionId);
		}

		const refreshedState = await taskIntake.getSessionState(sessionId);
		send('run_started', {
			session_id: sessionId,
			run_id: refreshedState.session.run_id,
			agent_id: refreshedState.session.agent_id,
			task_id: refreshedState.session.task_id,
			project: {
				id: refreshedState.task?.id,
				title: refreshedState.task?.title,
				description: refreshedState.task?.description,
			},
			total_steps: steps.length,
			started_at: new Date().toISOString(),
		});

		const runStart = Date.now();
		const stepSummaries: Array<Record<string, any>> = [];

		for (let i = 0; i < steps.length; i++) {
			const step = steps[i];
			const stepOrder = step.order || i + 1;
			let chunkIndex = 0;

			send('step_started', {
				session_id: sessionId,
				run_id: refreshedState.session.run_id,
				step_order: stepOrder,
				step_index: i,
				action: step.action,
				expected_outcome: step.expected_outcome || '',
				tool: step.tool || null,
				step_type: step.step_type || (step.tool === 'approval_gate' ? 'approval_gate' : 'task'),
				status: 'running',
				timestamp: new Date().toISOString(),
			});

			try {
				const result = await taskIntake.executeStep(sessionId, {
					step_order: stepOrder,
					action: step.action,
					tool: step.tool || null,
					expected_outcome: step.expected_outcome || '',
					step_type: step.step_type,
				}, {
					onOutputChunk: (chunk: string) => {
						if (!chunk) return;
						send('step_output_chunk', {
							session_id: sessionId,
							run_id: refreshedState.session.run_id,
							step_order: stepOrder,
							step_index: i,
							action: step.action,
							status: 'running',
							chunk_index: chunkIndex++,
							chunk,
							timestamp: new Date().toISOString(),
						});
					},
				});

				// If this is an approval gate, poll until human resolves it
				if (result.source === 'approval_gate' && result.oc_session_id) {
					const gateNodeId = result.oc_session_id;
					send('gate_waiting', {
						session_id: sessionId,
						run_id: refreshedState.session.run_id,
						step_order: stepOrder,
						step_index: i,
						gate_node_id: gateNodeId,
						action: step.action,
						message: 'Approval gate reached. Waiting for human approval before continuing.',
						timestamp: new Date().toISOString(),
					});

					// Poll gate node status every 3s (max 30 min)
					const maxWaitMs = 30 * 60 * 1000;
					const pollIntervalMs = 3000;
					const gateStart = Date.now();
					let gateResolved = false;
					let gateApproved = false;

					while (Date.now() - gateStart < maxWaitMs) {
						await new Promise(r => setTimeout(r, pollIntervalMs));
						try {
							const gateNode = await graphService.getNode(gateNodeId);
							if (!gateNode || gateNode.status !== 'pending_approval') {
								gateResolved = true;
								gateApproved = gateNode?.status === 'approved';
								break;
							}
						} catch { break; }
					}

					const gateStatus = gateApproved ? 'approved' : (gateResolved ? 'rejected' : 'timeout');
					send('gate_resolved', {
						session_id: sessionId,
						run_id: refreshedState.session.run_id,
						step_order: stepOrder,
						step_index: i,
						gate_node_id: gateNodeId,
						status: gateStatus,
						timestamp: new Date().toISOString(),
					});

					if (!gateApproved) {
						// Gate was rejected or timed out — stop execution
						stepSummaries.push({
							step_order: stepOrder,
							action: step.action,
							source: 'approval_gate',
							success: false,
							error: gateStatus === 'rejected' ? 'Gate rejected by user' : 'Gate approval timed out',
						});
						send('step_completed', {
							session_id: sessionId,
							run_id: refreshedState.session.run_id,
							step_order: stepOrder,
							step_index: i,
							action: step.action,
							step_type: 'approval_gate',
							status: 'failed',
							source: 'approval_gate',
							full_output: `Approval gate ${gateStatus}. Execution stopped.`,
							duration_ms: Date.now() - gateStart,
							timestamp: new Date().toISOString(),
						});
						break; // Stop the execution loop
					}

					// Gate approved — update result output and fall through to step_completed
					result.output = `Approval gate approved. Continuing execution.`;
				}

				stepSummaries.push({
					step_order: stepOrder,
					action: step.action,
					source: result.source,
					success: result.success,
					duration_ms: result.duration_ms,
					tool_calls_count: result.tool_calls?.length || 0,
				});

				send('step_completed', {
					session_id: sessionId,
					run_id: refreshedState.session.run_id,
					agent_id: refreshedState.session.agent_id,
					project: {
						id: refreshedState.task?.id,
						title: refreshedState.task?.title,
					},
					step_order: stepOrder,
					step_index: i,
					action: step.action,
					expected_outcome: step.expected_outcome || '',
					tool: step.tool || null,
					step_type: step.step_type || (step.tool === 'approval_gate' ? 'approval_gate' : 'task'),
					status: result.success ? 'completed' : 'failed',
					source: result.source,
					model: result.model,
					oc_session_id: result.oc_session_id,
					duration_ms: result.duration_ms,
					tool_calls: result.tool_calls || [],
					tool_calls_count: result.tool_calls?.length || 0,
					full_output: result.output || '',
					timestamp: new Date().toISOString(),
				});
			} catch (stepErr: any) {
				stepSummaries.push({
					step_order: stepOrder,
					action: step.action,
					source: 'error',
					success: false,
					error: stepErr.message,
				});

				send('step_failed', {
					session_id: sessionId,
					run_id: refreshedState.session.run_id,
					step_order: stepOrder,
					step_index: i,
					action: step.action,
					status: 'failed',
					error: stepErr.message,
					timestamp: new Date().toISOString(),
				});
			}
		}

		await taskIntake.finalizeExecution(sessionId);
		const finalState = await taskIntake.getSessionState(sessionId);

		send('run_completed', {
			session_id: sessionId,
			run_id: finalState.session.run_id,
			agent_id: finalState.session.agent_id,
			task_id: finalState.session.task_id,
			project: {
				id: finalState.task?.id,
				title: finalState.task?.title,
			},
			total_steps: steps.length,
			completed_steps: stepSummaries.filter((s) => s.success).length,
			failed_steps: stepSummaries.filter((s) => s.success === false).length,
			duration_ms: Date.now() - runStart,
			stage: finalState.session.stage,
			steps: stepSummaries,
			finished_at: new Date().toISOString(),
		});
	} catch (err: any) {
		logger.error(`[task-intake] POST /sessions/${sessionId}/execute-stream error:`, err);
		send('run_error', {
			session_id: sessionId,
			error: err.message,
			timestamp: new Date().toISOString(),
		});
	}

	res.end();
});

/** POST /gates/:gateId/resolve — approve or reject an approval gate */
router.post('/gates/:gateId/resolve', async (req: Request, res: Response) => {
	try {
		const { gateId } = req.params;
		const { approved, reason } = req.body;
		const newStatus = approved ? 'approved' : 'rejected';

		await graphService.updateNode(gateId, {
			status: newStatus,
			metadata: {
				resolved_at: new Date().toISOString(),
				resolved_by: req.body.resolved_by || 'ui-user',
				reason: reason || '',
			},
		}, req.body.resolved_by || 'ui-user');

		logger.info(`[task-intake] Gate ${gateId} resolved as ${newStatus}`);
		res.json({ ok: true, gate_id: gateId, status: newStatus });
	} catch (err: any) {
		logger.error(`[task-intake] POST /gates/${req.params.gateId}/resolve error:`, err);
		res.status(400).json({ ok: false, error: err.message });
	}
});

/** GET /gates/pending — list all pending approval gates */
router.get('/gates/pending', async (_req: Request, res: Response) => {
	try {
		const gates = await graphService.listNodes({ node_type: 'gate', limit: 100 });
		const pending = gates.filter(g => g.status === 'pending_approval' && !g.deleted_at);
		res.json({ ok: true, gates: pending });
	} catch (err: any) {
		logger.error('[task-intake] GET /gates/pending error:', err);
		res.status(500).json({ ok: false, error: err.message });
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
