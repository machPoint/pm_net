/**
 * Chelex OpenClaw Worker Skill
 * 
 * This skill enables an OpenClaw agent to participate in the Chelex governance workflow.
 * It wraps the low-level MCP tools into high-level agent behaviors.
 * 
 * Usage:
 * const chelex = new OpenClawWorkerSkill(mcpClient);
 * await chelex.pollAndExecute();
 */

export class OpenClawWorkerSkill {
	private client: any;
	private agentId: string;

	constructor(mcpClient: any, agentId: string) {
		this.client = mcpClient;
		this.agentId = agentId;
	}

	/**
	 * Main loop: Check for tasks and process them
	 */
	async pollAndExecute() {
		console.log(`[OpenClaw] Polling for tasks assigned to ${this.agentId}...`);

		// 1. Check for assigned tasks
		const tasksResult = await this.client.callTool('checkAssignedTasks', {
			status_filter: ['backlog', 'in_progress', 'review']
		});

		const tasks = JSON.parse(tasksResult.content[0].text).tasks;

		if (tasks.length === 0) {
			console.log('[Chelex] No tasks found.');
			return;
		}

		console.log(`[Chelex] Found ${tasks.length} tasks.`);

		for (const task of tasks) {
			await this.processTask(task);
		}
	}

	/**
	 * Process a single task through its lifecycle
	 */
	async processTask(task: any) {
		const taskId = task.id;
		console.log(`[Chelex] Processing Task: ${task.title} (${task.status})`);

		// 2. Get Context
		const contextResult = await this.client.callTool('getTaskContext', { task_id: taskId });
		const { graph_context, acceptance_criteria } = JSON.parse(contextResult.content[0].text);

		if (task.status === 'backlog') {
			await this.createAndSubmitPlan(task, graph_context);
		}
		else if (task.status === 'review') {
			await this.checkPlanAndStart(task);
		}
		else if (task.status === 'in_progress') {
			// Resume execution if needed, or assume it's running
			// For this reference, we'll assume 'in_progress' implies we need to continue a run
			console.log(`[Chelex] Task ${taskId} is in progress. Resuming...`);
		}
	}

	/**
	 * Step 3: Create and Submit Plan
	 */
	private async createAndSubmitPlan(task: any, context: any) {
		console.log(`[Chelex] Generative Plan for: ${task.title}`);

		// (In a real agent, LLM logic generates this based on context)
		const proposedPlan = {
			task_id: task.id,
			rationale: `Based on the graph context of ${context?.nodes?.length || 0} nodes, I will perform safe analysis.`,
			steps: [
				{
					step_number: 1,
					action: "Analyze Impact",
					tool: "traceDownstreamImpact",
					args: { start_node_ids: [task.context_node_id || "root"], depth: 2 },
					expected_output: "List of impacted nodes"
				},
				{
					step_number: 2,
					action: "Verify Constraints",
					tool: "runConsistencyChecks",
					args: { project_id: task.project_id },
					expected_output: "No consistency errors"
				}
			]
		};

		const result = await this.client.callTool('submitPlan', proposedPlan);
		const response = JSON.parse(result.content[0].text);
		console.log(`[Chelex] Plan Submitted: ${response.plan_id} (${response.status})`);
	}

	/**
	 * Step 4 & 5: Check Plan Status and Start Run
	 */
	private async checkPlanAndStart(task: any) {
		// We need to find the pending plan for this task
		// (Simplification: In real usage, we'd query plans by task_id, but here we assume we track it)
		console.log(`[Chelex] Checking status for task ${task.id}...`);

		// NOTE: In a real implementation, we would list plans for the task. 
		// For this example, we assume we know the plan ID or fetch it via a separate query
		// const planStatus = await this.client.callTool('checkPlanStatus', { plan_id: ... });

		// If approved:
		// await this.client.callTool('startRun', { task_id: task.id, plan_id: ... });

		console.log(`[Chelex] Waiting for human approval on task ${task.id}.`);
	}

	/**
	 * Step 6 & 7: Execute and Complete
	 */
	async executeRun(runId: string, plan: any) {
		console.log(`[Chelex] Executing Run ${runId}`);

		for (const step of plan.steps) {
			// Log decision
			await this.client.callTool('logDecision', {
				run_id: runId,
				decision_type: 'tool_choice',
				reasoning: `Executing step ${step.step_number} per approved plan`,
				selected_option: step.tool
			});

			// Execute tool
			// const output = await this.client.callTool(step.tool, step.args);

			console.log(`[Chelex] Executed step ${step.step_number}`);
		}

		// Complete
		await this.client.callTool('completeTask', {
			task_id: plan.task_id,
			run_id: runId,
			artifacts: []
		});

		console.log(`[Chelex] Run ${runId} completed.`);
	}
}
