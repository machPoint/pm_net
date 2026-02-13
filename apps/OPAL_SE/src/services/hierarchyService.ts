/**
 * Hierarchy Service
 *
 * Manages the 6-level mission hierarchy on top of the graph:
 *   Mission → Program → Project → Phase → Work Package (task) → Task (plan steps)
 *
 * The bottom two levels (task + plan steps/decision_trace) already exist.
 * This service adds the top four levels and connects them via `contains` edges.
 *
 * WBS numbering (e.g. "1.0", "1.1", "1.1.1", "1.1.1.1") is stored in
 * node metadata.wbs_number and auto-generated on creation.
 *
 * Phase gate reviews use the existing `gate` node type with
 * phase --requires_approval--> gate edges.
 */

import { v4 as uuid } from 'uuid';
import * as graphService from './graphService';
import { eventBus } from './eventBus';
import logger from '../logger';

// ============================================================================
// Hierarchy level definitions
// ============================================================================

/** Maps hierarchy level names to graph node_type values */
export const HIERARCHY_LEVELS = {
	mission: 'mission',
	program: 'program',
	project: 'project',
	phase: 'phase',
	work_package: 'task', // existing task node type, renamed in UI
} as const;

export type HierarchyLevel = keyof typeof HIERARCHY_LEVELS;

/** Parent → child level mapping */
const CHILD_LEVEL: Record<string, string> = {
	mission: 'program',
	program: 'project',
	project: 'phase',
	phase: 'task',
};

// ============================================================================
// WBS Numbering
// ============================================================================

/**
 * Generate the next WBS number for a child under a parent.
 * - Mission (top-level): "1.0", "2.0", "3.0"
 * - Program under mission "1.0": "1.1", "1.2"
 * - Project under program "1.1": "1.1.1", "1.1.2"
 * - Phase under project "1.1.1": "1.1.1.1", "1.1.1.2"
 * - Work package under phase "1.1.1.1": "1.1.1.1.1", "1.1.1.1.2"
 */
async function generateWBS(parentId: string | null, childNodeType: string): Promise<string> {
	if (!parentId) {
		// Top-level mission
		const missions = await graphService.listNodes({ node_type: 'mission', limit: 500 });
		let maxNum = 0;
		for (const m of missions) {
			const wbs = m.metadata?.wbs_number || '';
			const num = parseInt(wbs.split('.')[0], 10);
			if (!isNaN(num) && num > maxNum) maxNum = num;
		}
		return `${maxNum + 1}.0`;
	}

	// Find existing children of this parent
	const childEdges = await graphService.listEdges({
		edge_type: 'contains',
		source_node_id: parentId,
		limit: 500,
	});

	const parent = await graphService.getNode(parentId);
	const parentWBS = parent?.metadata?.wbs_number || '0';
	// Strip trailing ".0" for missions so children are "1.1" not "1.0.1"
	const baseWBS = parentWBS.endsWith('.0') ? parentWBS.slice(0, -2) : parentWBS;

	let maxChild = 0;
	for (const edge of childEdges) {
		const child = await graphService.getNode(edge.target_node_id);
		if (child && child.node_type === childNodeType) {
			const childWBS = child.metadata?.wbs_number || '';
			const parts = childWBS.split('.');
			const lastNum = parseInt(parts[parts.length - 1], 10);
			if (!isNaN(lastNum) && lastNum > maxChild) maxChild = lastNum;
		}
	}

	return `${baseWBS}.${maxChild + 1}`;
}

// ============================================================================
// Generic CRUD helpers
// ============================================================================

export interface CreateHierarchyNodeInput {
	title: string;
	description?: string;
	parent_id?: string | null;
	node_type: string;
	metadata?: Record<string, any>;
	created_by?: string;
}

/**
 * Create a hierarchy node (mission, program, project, or phase) and
 * link it to its parent via a `contains` edge. Auto-generates WBS number.
 */
async function createHierarchyNode(input: CreateHierarchyNodeInput): Promise<graphService.Node> {
	const createdBy = input.created_by || 'system';
	const parentId = input.parent_id || null;

	// Validate parent exists if provided
	if (parentId) {
		const parent = await graphService.getNode(parentId);
		if (!parent) throw new Error(`Parent node not found: ${parentId}`);
	}

	const wbs = await generateWBS(parentId, input.node_type);

	const defaultStatus: Record<string, string> = {
		mission: 'planning',
		program: 'planning',
		project: 'planning',
		phase: 'not_started',
	};

	const node = await graphService.createNode({
		node_type: input.node_type,
		title: input.title,
		description: input.description || '',
		status: defaultStatus[input.node_type] || 'planning',
		metadata: {
			...input.metadata,
			wbs_number: wbs,
			parent_id: parentId,
		},
		created_by: createdBy,
		source: 'ui',
	});

	// Link to parent
	if (parentId) {
		await graphService.createEdge({
			edge_type: 'contains',
			source_node_id: parentId,
			target_node_id: node.id,
			weight: 1.0,
			created_by: createdBy,
		});
	}

	logger.info(`[Hierarchy] Created ${input.node_type}: ${node.id} (WBS ${wbs}) — ${input.title}`);

	eventBus.emit({
		id: uuid(),
		event_type: 'created',
		entity_type: capitalize(input.node_type),
		entity_id: node.id,
		summary: `${capitalize(input.node_type)} created: ${input.title}`,
		source: 'ui',
		timestamp: new Date().toISOString(),
		metadata: {
			node_type: input.node_type,
			wbs_number: wbs,
			parent_id: parentId,
		},
	});

	return node;
}

/**
 * Get direct children of a hierarchy node (via `contains` edges).
 * Optionally filter by child node_type.
 */
async function getChildren(
	parentId: string,
	childNodeType?: string
): Promise<graphService.Node[]> {
	const edges = await graphService.listEdges({
		edge_type: 'contains',
		source_node_id: parentId,
		limit: 500,
	});

	const children: graphService.Node[] = [];
	for (const edge of edges) {
		const node = await graphService.getNode(edge.target_node_id);
		if (node && (!childNodeType || node.node_type === childNodeType)) {
			children.push(node);
		}
	}

	// Sort by WBS number
	children.sort((a, b) => {
		const wbsA = a.metadata?.wbs_number || '';
		const wbsB = b.metadata?.wbs_number || '';
		return wbsA.localeCompare(wbsB, undefined, { numeric: true });
	});

	return children;
}

// ============================================================================
// Mission CRUD
// ============================================================================

export interface CreateMissionInput {
	title: string;
	description?: string;
	success_criteria?: Array<{ metric: string; target: string; current?: string }>;
	target_completion?: string;
	created_by?: string;
}

export async function createMission(input: CreateMissionInput): Promise<graphService.Node> {
	return createHierarchyNode({
		title: input.title,
		description: input.description,
		node_type: 'mission',
		parent_id: null,
		metadata: {
			success_criteria: input.success_criteria || [],
			target_completion: input.target_completion,
		},
		created_by: input.created_by,
	});
}

export async function listMissions(): Promise<graphService.Node[]> {
	const missions = await graphService.listNodes({ node_type: 'mission', limit: 100 });
	missions.sort((a, b) => {
		const wbsA = a.metadata?.wbs_number || '';
		const wbsB = b.metadata?.wbs_number || '';
		return wbsA.localeCompare(wbsB, undefined, { numeric: true });
	});
	return missions;
}

export async function getMission(id: string): Promise<graphService.Node | null> {
	return graphService.getNode(id);
}

export async function updateMission(
	id: string,
	updates: { title?: string; description?: string; status?: string; metadata?: Record<string, any> },
	changedBy: string = 'system'
): Promise<graphService.Node | null> {
	await graphService.updateNode(id, updates, changedBy);
	return graphService.getNode(id);
}

// ============================================================================
// Program CRUD
// ============================================================================

export interface CreateProgramInput {
	mission_id: string;
	title: string;
	description?: string;
	objectives?: string;
	created_by?: string;
}

export async function createProgram(input: CreateProgramInput): Promise<graphService.Node> {
	const mission = await graphService.getNode(input.mission_id);
	if (!mission || mission.node_type !== 'mission') {
		throw new Error(`Mission not found: ${input.mission_id}`);
	}
	return createHierarchyNode({
		title: input.title,
		description: input.description,
		node_type: 'program',
		parent_id: input.mission_id,
		metadata: { objectives: input.objectives },
		created_by: input.created_by,
	});
}

export async function listPrograms(missionId: string): Promise<graphService.Node[]> {
	return getChildren(missionId, 'program');
}

// ============================================================================
// Project CRUD
// ============================================================================

export interface CreateProjectInput {
	program_id: string;
	title: string;
	description?: string;
	deliverables?: Array<{ name: string; description: string; acceptance_criteria?: string[] }>;
	created_by?: string;
}

export async function createProject(input: CreateProjectInput): Promise<graphService.Node> {
	const program = await graphService.getNode(input.program_id);
	if (!program || program.node_type !== 'program') {
		throw new Error(`Program not found: ${input.program_id}`);
	}
	return createHierarchyNode({
		title: input.title,
		description: input.description,
		node_type: 'project',
		parent_id: input.program_id,
		metadata: { deliverables: input.deliverables || [] },
		created_by: input.created_by,
	});
}

export async function listProjects(programId: string): Promise<graphService.Node[]> {
	return getChildren(programId, 'project');
}

// ============================================================================
// Phase CRUD
// ============================================================================

export interface CreatePhaseInput {
	project_id: string;
	title: string;
	description?: string;
	gate_criteria?: Array<{ criterion: string; weight?: number }>;
	estimated_duration_days?: number;
	created_by?: string;
}

export async function createPhase(input: CreatePhaseInput): Promise<graphService.Node> {
	const project = await graphService.getNode(input.project_id);
	if (!project || project.node_type !== 'project') {
		throw new Error(`Project not found: ${input.project_id}`);
	}
	return createHierarchyNode({
		title: input.title,
		description: input.description,
		node_type: 'phase',
		parent_id: input.project_id,
		metadata: {
			gate_criteria: input.gate_criteria || [],
			estimated_duration_days: input.estimated_duration_days,
		},
		created_by: input.created_by,
	});
}

export async function listPhases(projectId: string): Promise<graphService.Node[]> {
	return getChildren(projectId, 'phase');
}

// ============================================================================
// Work Package (task) — link existing tasks into a phase
// ============================================================================

export async function addWorkPackageToPhase(
	phaseId: string,
	taskId: string,
	createdBy: string = 'system'
): Promise<void> {
	const phase = await graphService.getNode(phaseId);
	if (!phase || phase.node_type !== 'phase') throw new Error(`Phase not found: ${phaseId}`);
	const task = await graphService.getNode(taskId);
	if (!task || task.node_type !== 'task') throw new Error(`Task not found: ${taskId}`);

	// Generate WBS for the work package under this phase
	const wbs = await generateWBS(phaseId, 'task');

	// Update task metadata with WBS and phase reference
	await graphService.updateNode(taskId, {
		metadata: {
			...task.metadata,
			wbs_number: wbs,
			phase_id: phaseId,
		},
	}, createdBy);

	// phase --contains--> task
	await graphService.createEdge({
		edge_type: 'contains',
		source_node_id: phaseId,
		target_node_id: taskId,
		weight: 1.0,
		created_by: createdBy,
	});

	logger.info(`[Hierarchy] Linked task ${taskId} to phase ${phaseId} (WBS ${wbs})`);
}

export async function listWorkPackages(phaseId: string): Promise<graphService.Node[]> {
	return getChildren(phaseId, 'task');
}

// ============================================================================
// Phase Gate Review
// ============================================================================

export interface PhaseGateDecision {
	decision: 'proceed' | 'hold' | 'revise' | 'cancel';
	feedback?: string;
	reviewed_by?: string;
}

/**
 * Submit a gate review for a phase.
 * - 'proceed': marks phase complete, starts next phase if available
 * - 'hold': keeps phase at_gate
 * - 'revise': sends phase back to in_progress
 * - 'cancel': cancels phase
 */
export async function reviewPhaseGate(
	phaseId: string,
	decision: PhaseGateDecision
): Promise<{ phase: graphService.Node; next_phase?: graphService.Node | null }> {
	const phase = await graphService.getNode(phaseId);
	if (!phase || phase.node_type !== 'phase') {
		throw new Error(`Phase not found: ${phaseId}`);
	}

	const reviewedBy = decision.reviewed_by || 'user';
	const now = new Date().toISOString();

	// Check all work packages are done (for 'proceed')
	if (decision.decision === 'proceed') {
		const workPackages = await listWorkPackages(phaseId);
		const allDone = workPackages.every(wp => wp.status === 'done');
		if (!allDone && workPackages.length > 0) {
			throw new Error('Cannot proceed: not all work packages are complete');
		}
	}

	// Map decision to new phase status
	const statusMap: Record<string, string> = {
		proceed: 'complete',
		hold: 'at_gate',
		revise: 'in_progress',
		cancel: 'cancelled',
	};

	await graphService.updateNode(phaseId, {
		status: statusMap[decision.decision],
		metadata: {
			...phase.metadata,
			gate_review: {
				decision: decision.decision,
				feedback: decision.feedback,
				reviewed_by: reviewedBy,
				reviewed_at: now,
			},
		},
	}, reviewedBy);

	logger.info(`[Hierarchy] Phase gate review: ${phaseId} → ${decision.decision}`);

	eventBus.emit({
		id: uuid(),
		event_type: 'updated',
		entity_type: 'PhaseGate',
		entity_id: phaseId,
		summary: `Phase gate: ${decision.decision} — ${phase.title}`,
		source: 'ui',
		timestamp: now,
		metadata: {
			phase_id: phaseId,
			wbs_number: phase.metadata?.wbs_number,
			decision: decision.decision,
			feedback: decision.feedback,
		},
	});

	let nextPhase: graphService.Node | null = null;

	// If proceeding, start next phase
	if (decision.decision === 'proceed') {
		const projectId = phase.metadata?.parent_id;
		if (projectId) {
			const phases = await listPhases(projectId);
			const currentIdx = phases.findIndex(p => p.id === phaseId);
			if (currentIdx >= 0 && currentIdx < phases.length - 1) {
				nextPhase = phases[currentIdx + 1];
				await graphService.updateNode(nextPhase.id, { status: 'in_progress' }, reviewedBy);
				nextPhase = await graphService.getNode(nextPhase.id);
				logger.info(`[Hierarchy] Auto-started next phase: ${nextPhase?.id}`);
			} else {
				// No more phases — check if project is complete
				const allPhasesComplete = phases.every(
					p => p.id === phaseId || p.status === 'complete' || p.status === 'cancelled'
				);
				if (allPhasesComplete) {
					await graphService.updateNode(projectId, { status: 'complete' }, reviewedBy);
					logger.info(`[Hierarchy] Project ${projectId} marked complete (all phases done)`);
				}
			}
		}
	}

	const updatedPhase = await graphService.getNode(phaseId);
	return { phase: updatedPhase!, next_phase: nextPhase };
}

// ============================================================================
// Full Hierarchy Tree — for drill-down UI
// ============================================================================

export interface HierarchyTree {
	node: graphService.Node;
	children: HierarchyTree[];
	stats: {
		total_children: number;
		work_packages_total: number;
		work_packages_done: number;
		phases_at_gate: number;
	};
}

/**
 * Build a full hierarchy tree from any node downward.
 * Depth-limited to avoid runaway queries.
 */
export async function getHierarchyTree(
	nodeId: string,
	maxDepth: number = 4
): Promise<HierarchyTree> {
	const node = await graphService.getNode(nodeId);
	if (!node) throw new Error(`Node not found: ${nodeId}`);

	return buildTree(node, maxDepth, 0);
}

async function buildTree(
	node: graphService.Node,
	maxDepth: number,
	currentDepth: number
): Promise<HierarchyTree> {
	const childType = CHILD_LEVEL[node.node_type];
	let children: HierarchyTree[] = [];
	let wpTotal = 0;
	let wpDone = 0;
	let phasesAtGate = 0;

	if (childType && currentDepth < maxDepth) {
		const childNodes = await getChildren(node.id, childType);

		children = await Promise.all(
			childNodes.map(c => buildTree(c, maxDepth, currentDepth + 1))
		);

		// Aggregate stats
		for (const child of children) {
			wpTotal += child.stats.work_packages_total;
			wpDone += child.stats.work_packages_done;
			phasesAtGate += child.stats.phases_at_gate;
		}
	}

	// If this is a phase, count its work packages directly
	if (node.node_type === 'phase') {
		const wps = await getChildren(node.id, 'task');
		wpTotal += wps.length;
		wpDone += wps.filter(wp => wp.status === 'done').length;
		if (node.status === 'at_gate') phasesAtGate += 1;
	}

	return {
		node,
		children,
		stats: {
			total_children: children.length,
			work_packages_total: wpTotal,
			work_packages_done: wpDone,
			phases_at_gate: phasesAtGate,
		},
	};
}

// ============================================================================
// Pending Gate Reviews — across all projects
// ============================================================================

export async function getPendingGateReviews(): Promise<graphService.Node[]> {
	const phases = await graphService.listNodes({ node_type: 'phase', status: 'at_gate', limit: 50 });
	return phases;
}

// ============================================================================
// Hierarchy Context — breadcrumb chain for a work package
// ============================================================================

export interface HierarchyContext {
	mission?: graphService.Node;
	program?: graphService.Node;
	project?: graphService.Node;
	phase?: graphService.Node;
	work_package: graphService.Node;
}

/**
 * Walk up the `contains` edges from a task to build the full breadcrumb.
 */
export async function getWorkPackageContext(taskId: string): Promise<HierarchyContext> {
	const task = await graphService.getNode(taskId);
	if (!task) throw new Error(`Task not found: ${taskId}`);

	const ctx: HierarchyContext = { work_package: task };

	// Walk up: task → phase → project → program → mission
	let currentId = taskId;
	const levelOrder: Array<keyof Omit<HierarchyContext, 'work_package'>> = ['phase', 'project', 'program', 'mission'];
	let levelIdx = 0;

	while (levelIdx < levelOrder.length) {
		const parentEdges = await graphService.listEdges({
			edge_type: 'contains',
			target_node_id: currentId,
			limit: 1,
		});

		if (parentEdges.length === 0) break;

		const parent = await graphService.getNode(parentEdges[0].source_node_id);
		if (!parent) break;

		const expectedType = levelOrder[levelIdx];
		if (parent.node_type === expectedType) {
			ctx[expectedType] = parent;
			currentId = parent.id;
			levelIdx++;
		} else {
			// Skip levels if hierarchy is incomplete
			levelIdx++;
			// Don't advance currentId — try next level with same parent
		}
	}

	return ctx;
}

// ============================================================================
// Default Hierarchy — for backward compatibility with existing orphan tasks
// ============================================================================

/**
 * Ensure a default Mission → Program → Project → Phase exists.
 * Returns the default phase ID so orphan tasks can be linked to it.
 */
export async function ensureDefaultHierarchy(): Promise<{
	mission: graphService.Node;
	program: graphService.Node;
	project: graphService.Node;
	phase: graphService.Node;
}> {
	// Check if default mission already exists
	const missions = await graphService.listNodes({ node_type: 'mission', limit: 100 });
	let defaultMission = missions.find(m => m.metadata?.is_default === true);

	if (!defaultMission) {
		defaultMission = await graphService.createNode({
			node_type: 'mission',
			title: 'Operational Tasks',
			description: 'Default mission for existing tasks during migration',
			status: 'active',
			metadata: {
				wbs_number: '1.0',
				is_default: true,
			},
			created_by: 'system',
			source: 'system',
		});
		logger.info(`[Hierarchy] Created default mission: ${defaultMission.id}`);
	}

	// Default program
	let programs = await getChildren(defaultMission.id, 'program');
	let defaultProgram = programs.find(p => p.metadata?.is_default === true);
	if (!defaultProgram) {
		defaultProgram = await createProgram({
			mission_id: defaultMission.id,
			title: 'General Operations',
			description: 'Default program for existing tasks',
			created_by: 'system',
		});
		await graphService.updateNode(defaultProgram.id, {
			status: 'active',
			metadata: { ...defaultProgram.metadata, is_default: true },
		}, 'system');
		defaultProgram = (await graphService.getNode(defaultProgram.id))!;
	}

	// Default project
	let projects = await getChildren(defaultProgram.id, 'project');
	let defaultProject = projects.find(p => p.metadata?.is_default === true);
	if (!defaultProject) {
		defaultProject = await createProject({
			program_id: defaultProgram.id,
			title: 'Ongoing Tasks',
			description: 'Default project for existing tasks',
			created_by: 'system',
		});
		await graphService.updateNode(defaultProject.id, {
			status: 'active',
			metadata: { ...defaultProject.metadata, is_default: true },
		}, 'system');
		defaultProject = (await graphService.getNode(defaultProject.id))!;
	}

	// Default phase
	let phases = await getChildren(defaultProject.id, 'phase');
	let defaultPhase = phases.find(p => p.metadata?.is_default === true);
	if (!defaultPhase) {
		defaultPhase = await createPhase({
			project_id: defaultProject.id,
			title: 'Execution Phase',
			description: 'Default phase for existing tasks',
			created_by: 'system',
		});
		await graphService.updateNode(defaultPhase.id, {
			status: 'in_progress',
			metadata: { ...defaultPhase.metadata, is_default: true },
		}, 'system');
		defaultPhase = (await graphService.getNode(defaultPhase.id))!;
	}

	return {
		mission: defaultMission,
		program: defaultProgram,
		project: defaultProject,
		phase: defaultPhase,
	};
}

// ============================================================================
// Helpers
// ============================================================================

function capitalize(s: string): string {
	return s.charAt(0).toUpperCase() + s.slice(1);
}
