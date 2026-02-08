/**
 * Chelex Governance Service
 * 
 * Implements MCP tools for the Chelex Agent Governance Layer.
 * Allows agents to:
 * - Poll for assigned tasks
 * - Submit execution plans for approval
 * - Log reasoning traces
 * - Record verification evidence
 */

import { v4 as uuid } from 'uuid';
import db from '../config/database';
import * as systemGraphService from './se/systemGraphService';
import * as seToolsService from './se/seToolsService';
import * as pathfindingService from './se/pathfindingService';
import logger from '../logger';

// Type definitions for MCP Context
interface MCPContext {
	agentId: string;
	requestId?: string;
}

/**
 * Tool: checkAssignedTasks
 * Agent polls for work assigned to them.
 */
export const checkAssignedTasks = {
	name: 'checkAssignedTasks',
	title: 'Check Assigned Tasks',
	description: 'Retrieve tasks assigned to this agent that are ready for work',
	inputSchema: {
		type: 'object',
		properties: {
			status_filter: {
				type: 'array',
				items: { enum: ['backlog', 'in_progress', 'review'] },
				default: ['backlog', 'in_progress']
			}
		}
	},
	handler: async (args: any, context: MCPContext) => {
		const agentId = context.agentId || 'default-agent'; // Fallback for dev without auth

		logger.info(`Agent ${agentId} checking for tasks`);

		// In a real scenario, we'd filter by assignee_id = agentId
		// For now, we'll return any unassigned agent tasks or tasks assigned to this agent
		const tasks = await db('chelex_tasks')
			.where(builder => {
				builder.where('assignee_type', 'agent')
					.andWhere(function () {
						this.where('assignee_id', agentId)
							.orWhereNull('assignee_id'); // Agents can pick up unassigned work
					});
			})
			.whereIn('status', args.status_filter || ['backlog', 'in_progress'])
			.orderBy('priority', 'asc')
			.orderBy('created_at', 'asc');

		return {
			content: [{
				type: 'text',
				text: JSON.stringify({ tasks }, null, 2)
			}]
		};
	}
};

/**
 * Tool: getTaskContext
 * Retrieve full graph context for a task.
 */
export const getTaskContext = {
	name: 'getTaskContext',
	title: 'Get Task Context',
	description: 'Retrieve task details and related graph nodes for context',
	inputSchema: {
		type: 'object',
		properties: {
			task_id: { type: 'string', format: 'uuid' }
		},
		required: ['task_id']
	},
	handler: async (args: any) => {
		const task = await db('chelex_tasks')
			.where({ id: args.task_id })
			.first();

		if (!task) throw new Error('Task not found');

		// Get related graph nodes if context_node_id exists
		let graphContext = null;
		if (task.context_node_id) {
			try {
				// Use existing SE graph query tools
				// Note: We might need to adapt the return type if getSystemSlice structure differs
				const slice = await seToolsService.getSystemSlice({
					project_id: task.project_id,
					start_node_ids: [task.context_node_id],
					max_depth: 2
				});
				graphContext = slice;
			} catch (err: any) {
				logger.warn(`Failed to get graph context for task ${args.task_id}: ${err.message}`);
			}
		}

		// Parse acceptance criteria if it's a string
		let parsedCriteria = task.acceptance_criteria;
		if (typeof parsedCriteria === 'string') {
			try { parsedCriteria = JSON.parse(parsedCriteria); } catch (e) { }
		}

		return {
			content: [{
				type: 'text',
				text: JSON.stringify({
					task,
					graph_context: graphContext,
					acceptance_criteria: parsedCriteria
				}, null, 2)
			}]
		};
	}
};

/**
 * Tool: submitPlan
 * Agent proposes execution plan.
 * Enhanced with graph pathfinding - if goal_node_id is provided,
 * automatically computes optimal path using weighted graph traversal.
 */
export const submitPlan = {
	name: 'submitPlan',
	title: 'Submit Execution Plan',
	description: 'Propose a plan for task execution, awaiting human approval. Optionally provide goal_node_id to compute optimal graph path.',
	inputSchema: {
		type: 'object',
		properties: {
			task_id: { type: 'string', format: 'uuid' },
			goal_node_id: {
				type: 'string',
				format: 'uuid',
				description: 'Optional: Target node for graph traversal. If provided, optimal path will be computed automatically.'
			},
			allowed_relation_types: {
				type: 'array',
				items: { type: 'string' },
				description: 'Optional: Edge types to traverse (e.g., ["TRACES_TO", "VERIFIED_BY"])'
			},
			max_weight: {
				type: 'number',
				description: 'Optional: Maximum cumulative weight threshold'
			},
			steps: {
				type: 'array',
				items: {
					type: 'object',
					properties: {
						step_number: { type: 'integer' },
						action: { type: 'string' },
						tool: { type: 'string' },
						args: { type: 'object' },
						expected_output: { type: 'string' }
					},
					required: ['step_number', 'action', 'tool']
				},
				description: 'Manual execution steps (required if goal_node_id not provided)'
			},
			rationale: { type: 'string' },
			planned_traversal: { type: 'object' } // Deprecated - use goal_node_id instead
		},
		required: ['task_id', 'rationale']
	},
	handler: async (args: any, context: MCPContext) => {
		const planId = uuid();
		const agentId = context.agentId || 'default-agent';

		// Get task to access context_node_id
		const task = await db('chelex_tasks').where({ id: args.task_id }).first();
		if (!task) {
			throw new Error(`Task ${args.task_id} not found`);
		}

		let steps = args.steps;
		let plannedTraversal = args.planned_traversal;
		let enhancedRationale = args.rationale;

		// If goal_node_id provided, compute optimal path using pathfinding
		if (args.goal_node_id && task.context_node_id) {
			try {
				logger.info(`Computing optimal path from ${task.context_node_id} to ${args.goal_node_id}`);

				const path = await pathfindingService.findShortestPath(
					task.context_node_id,
					args.goal_node_id,
					task.project_id,
					{
						allowedRelationTypes: args.allowed_relation_types,
						maxWeight: args.max_weight
					}
				);

				if (!path) {
					throw new Error(`No path found from context node ${task.context_node_id} to goal ${args.goal_node_id}`);
				}

				// Generate steps from computed path
				steps = path.steps.map((step, idx) => ({
					step_number: idx + 1,
					action: `Traverse to node: ${step.nodeId}`,
					tool: step.edgeId ? 'traverseGraphEdge' : 'startAtNode',
					args: {
						node_id: step.nodeId,
						edge_id: step.edgeId,
						cumulative_weight: step.cumulativeWeight
					},
					expected_output: `Reached node ${step.nodeId} (cumulative weight: ${step.cumulativeWeight.toFixed(2)})`
				}));

				plannedTraversal = {
					path: path.nodes.map(n => n.id),
					edges: path.edges.map(e => e.id),
					total_weight: path.totalWeight,
					node_count: path.nodes.length,
					computed_by: 'pathfinding_service'
				};

				enhancedRationale = `${args.rationale}\n\nComputed optimal path with ${path.nodes.length} nodes and total weight ${path.totalWeight.toFixed(2)}. Path: ${path.nodes.map(n => n.name).join(' → ')}`;

				logger.info(`Pathfinding generated ${steps.length} steps with total weight ${path.totalWeight}`);
			} catch (error: any) {
				logger.error(`Pathfinding failed: ${error.message}`);
				// Fall back to manual steps if provided, otherwise throw
				if (!args.steps || args.steps.length === 0) {
					throw new Error(`Pathfinding failed and no manual steps provided: ${error.message}`);
				}
				enhancedRationale = `${args.rationale}\n\nNote: Automatic pathfinding failed (${error.message}), using manual steps.`;
			}
		} else if (!steps || steps.length === 0) {
			throw new Error('Either goal_node_id or manual steps must be provided');
		}

		await db('chelex_plans').insert({
			id: planId,
			task_id: args.task_id,
			proposed_by: agentId,
			steps: JSON.stringify(steps),
			rationale: enhancedRationale,
			planned_traversal: plannedTraversal ? JSON.stringify(plannedTraversal) : null,
			status: 'pending',
			created_at: new Date()
		});

		// Update task status
		await db('chelex_tasks')
			.where({ id: args.task_id })
			.update({
				status: 'review',
				updated_at: new Date()
			});

		logger.info(`Plan ${planId} submitted for task ${args.task_id} (${steps.length} steps)`);

		return {
			content: [{
				type: 'text',
				text: JSON.stringify({
					plan_id: planId,
					status: 'pending_approval',
					message: 'Plan submitted successfully, awaiting human review',
					steps_count: steps.length,
					used_pathfinding: !!args.goal_node_id,
					planned_traversal: plannedTraversal
				}, null, 2)
			}]
		};
	}
};

/**
 * Tool: checkPlanStatus
 * Agent checks if plan was approved.
 */
export const checkPlanStatus = {
	name: 'checkPlanStatus',
	title: 'Check Plan Status',
	description: 'Check if a submitted plan has been approved, rejected, or needs changes',
	inputSchema: {
		type: 'object',
		properties: {
			plan_id: { type: 'string', format: 'uuid' }
		},
		required: ['plan_id']
	},
	handler: async (args: any) => {
		const plan = await db('chelex_plans')
			.where({ id: args.plan_id })
			.first();

		if (!plan) throw new Error(`Plan ${args.plan_id} not found`);

		const approvals = await db('chelex_approvals')
			.where({ plan_id: args.plan_id })
			.orderBy('timestamp', 'desc');

		return {
			content: [{
				type: 'text',
				text: JSON.stringify({
					plan_status: plan.status,
					approvals: approvals,
					can_execute: plan.status === 'approved'
				})
			}]
		};
	}
};

/**
 * Tool: startRun
 * Agent begins execution after approval.
 */
export const startRun = {
	name: 'startRun',
	title: 'Start Task Execution',
	description: 'Begin executing an approved plan',
	inputSchema: {
		type: 'object',
		properties: {
			task_id: { type: 'string', format: 'uuid' },
			plan_id: { type: 'string', format: 'uuid' }
		},
		required: ['task_id', 'plan_id']
	},
	handler: async (args: any, context: MCPContext) => {
		// Verify plan is approved
		const plan = await db('chelex_plans')
			.where({ id: args.plan_id })
			.first();

		if (!plan) throw new Error('Plan not found');

		if (plan.status !== 'approved') {
			throw new Error(`Plan status is ${plan.status}, must be approved`);
		}

		const runId = uuid();

		await db('chelex_runs').insert({
			id: runId,
			task_id: args.task_id,
			plan_id: args.plan_id,
			status: 'running',
			started_at: new Date()
		});

		// Update task status
		await db('chelex_tasks')
			.where({ id: args.task_id })
			.update({ status: 'in_progress', updated_at: new Date() });

		// Update plan status
		await db('chelex_plans')
			.where({ id: args.plan_id })
			.update({ status: 'executed', executed_at: new Date() });

		return {
			content: [{
				type: 'text',
				text: JSON.stringify({
					run_id: runId,
					status: 'running',
					message: 'Execution started, log all actions to this run_id'
				})
			}]
		};
	}
};

/**
 * Tool: logDecision
 * Capture agent reasoning during execution.
 */
export const logDecision = {
	name: 'logDecision',
	title: 'Log Decision Trace',
	description: 'Record why the agent made a specific decision during execution',
	inputSchema: {
		type: 'object',
		properties: {
			run_id: { type: 'string', format: 'uuid' },
			decision_type: {
				enum: ['path_selection', 'tool_choice', 'parameter_selection', 'termination']
			},
			context_snapshot: { type: 'object' },
			options_considered: { type: 'array' },
			selected_option: { type: 'string' },
			reasoning: { type: 'string' },
			confidence: { type: 'number', minimum: 0, maximum: 1 }
		},
		required: ['run_id', 'decision_type', 'reasoning']
	},
	handler: async (args: any) => {
		await db('chelex_decision_traces').insert({
			id: uuid(),
			run_id: args.run_id,
			decision_type: args.decision_type,
			context_snapshot: args.context_snapshot ? JSON.stringify(args.context_snapshot) : null,
			options_considered: args.options_considered ? JSON.stringify(args.options_considered) : null,
			selected_option: args.selected_option,
			reasoning: args.reasoning,
			confidence: args.confidence || 0.8,
			timestamp: new Date()
		});

		return {
			content: [{
				type: 'text',
				text: JSON.stringify({ logged: true })
			}]
		};
	}
};

/**
 * Tool: completeTask
 * Agent reports completion with evidence.
 */
export const completeTask = {
	name: 'completeTask',
	title: 'Complete Task',
	description: 'Mark task as complete and provide evidence for verification',
	inputSchema: {
		type: 'object',
		properties: {
			task_id: { type: 'string', format: 'uuid' },
			run_id: { type: 'string', format: 'uuid' },
			artifacts: {
				type: 'array',
				items: {
					type: 'object',
					properties: {
						type: { type: 'string' },
						name: { type: 'string' },
						url: { type: 'string' },
						hash: { type: 'string' }
					}
				}
			},
			actual_traversal: { type: 'object' }
		},
		required: ['task_id', 'run_id', 'artifacts']
	},
	handler: async (args: any) => {
		// Update run
		await db('chelex_runs')
			.where({ id: args.run_id })
			.update({
				status: 'completed',
				completed_at: new Date(),
				artifacts: JSON.stringify(args.artifacts),
				actual_traversal: args.actual_traversal ? JSON.stringify(args.actual_traversal) : null
			});

		// Auto-verify acceptance criteria
		const task = await db('chelex_tasks')
			.where({ id: args.task_id })
			.first();

		let criteria: any[] = [];
		try {
			if (task.acceptance_criteria) {
				criteria = typeof task.acceptance_criteria === 'string'
					? JSON.parse(task.acceptance_criteria)
					: task.acceptance_criteria;
			}
		} catch (e) {
			logger.warn('Failed to parse acceptance criteria for verification');
		}

		if (Array.isArray(criteria)) {
			for (const criterion of criteria) {
				// Simple auto-verification logic
				await db('chelex_verifications').insert({
					id: uuid(),
					task_id: args.task_id,
					run_id: args.run_id,
					criterion_id: criterion.id || uuid(),
					criterion_text: criterion.text || 'Unknown criterion',
					evidence_type: 'artifact',
					evidence_ref: JSON.stringify({ artifacts: args.artifacts }),
					verified_by: 'auto',
					verified_at: new Date(),
					status: 'pending' // Human can review
				});
			}
		}

		// Update task status
		await db('chelex_tasks')
			.where({ id: args.task_id })
			.update({ status: 'done', updated_at: new Date() });

		return {
			content: [{
				type: 'text',
				text: JSON.stringify({
					task_status: 'done',
					verifications_created: criteria.length,
					message: 'Task marked complete, verifications pending review'
				})
			}]
		};
	}
};

/**
 * Tool: queryPrecedents
 * Search for similar past tasks and patterns.
 */
export const queryPrecedents = {
	name: 'queryPrecedents',
	title: 'Query Precedents',
	description: 'Find similar past tasks and successful patterns',
	inputSchema: {
		type: 'object',
		properties: {
			task_pattern: { type: 'string' },
			node_types: { type: 'array', items: { type: 'string' } }
		},
		required: ['task_pattern']
	},
	handler: async (args: any) => {
		// Simple text search using ILIKE
		const precedents = await db('chelex_precedents')
			.where('task_pattern', 'like', `%${args.task_pattern}%`)
			.orderBy('success_count', 'desc')
			.limit(5);

		return {
			content: [{
				type: 'text',
				text: JSON.stringify({
					precedents,
					message: `Found ${precedents.length} similar patterns`
				})
			}]
		};
	}
};
