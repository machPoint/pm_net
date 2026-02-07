/**
 * Graph Service
 * 
 * Core graph operations for the Network PM Core.
 * All entities are nodes, all relationships are edges.
 * Every mutation creates a history record.
 */

import { v4 as uuid } from 'uuid';
import db from '../config/database';
import logger from '../logger';

// ============================================================================
// Types
// ============================================================================

export interface Node {
	id: string;
	node_type: string;
	schema_layer: string;
	title: string;
	description?: string;
	status: string;
	metadata?: Record<string, any>;
	created_by: string;
	created_at: string;
	updated_at: string;
	deleted_at?: string;
	version: number;
}

export interface Edge {
	id: string;
	edge_type: string;
	source_node_id: string;
	target_node_id: string;
	schema_layer: string;
	weight: number;
	weight_metadata?: Record<string, any>;
	directionality: 'directed' | 'bidirectional';
	metadata?: Record<string, any>;
	created_by: string;
	created_at: string;
	updated_at: string;
	deleted_at?: string;
	version: number;
}

export interface CreateNodeInput {
	node_type: string;
	title: string;
	description?: string;
	status: string;
	metadata?: Record<string, any>;
	created_by: string;
	schema_layer?: string;
}

export interface UpdateNodeInput {
	title?: string;
	description?: string;
	status?: string;
	metadata?: Record<string, any>;
	change_reason?: string;
}

export interface CreateEdgeInput {
	edge_type: string;
	source_node_id: string;
	target_node_id: string;
	weight?: number;
	weight_metadata?: Record<string, any>;
	directionality?: 'directed' | 'bidirectional';
	metadata?: Record<string, any>;
	created_by: string;
	schema_layer?: string;
}

export interface UpdateEdgeInput {
	weight?: number;
	weight_metadata?: Record<string, any>;
	metadata?: Record<string, any>;
	change_reason?: string;
}

export interface TraverseOptions {
	start_node_id: string;
	direction: 'outgoing' | 'incoming' | 'both';
	edge_types?: string[];
	node_types?: string[];
	max_depth: number;
	min_weight?: number;
	include_paths?: boolean;
}

export interface TraverseResult {
	nodes: Node[];
	edges: Edge[];
	paths?: { node_ids: string[]; edge_ids: string[] }[];
}

// ============================================================================
// Node Operations
// ============================================================================

/**
 * Create a new node
 */
export async function createNode(input: CreateNodeInput): Promise<Node> {
	const now = new Date().toISOString();
	const id = uuid();

	const node: Node = {
		id,
		node_type: input.node_type,
		schema_layer: input.schema_layer || 'pm_core',
		title: input.title,
		description: input.description,
		status: input.status,
		metadata: input.metadata,
		created_by: input.created_by,
		created_at: now,
		updated_at: now,
		version: 1,
	};

	// Insert node
	await db('nodes').insert({
		...node,
		metadata: node.metadata ? JSON.stringify(node.metadata) : null,
	});

	// Create history record
	await db('node_history').insert({
		id: uuid(),
		node_id: id,
		version: 1,
		operation: 'create',
		changed_by: input.created_by,
		changed_at: now,
		change_reason: null,
		before_state: null,
		after_state: JSON.stringify(node),
	});

	logger.info(`Created node: ${id} (${input.node_type})`);
	return node;
}

/**
 * Get a node by ID
 */
export async function getNode(id: string, includeDeleted = false): Promise<Node | null> {
	let query = db('nodes').where({ id });
	if (!includeDeleted) {
		query = query.whereNull('deleted_at');
	}

	const row = await query.first();
	if (!row) return null;

	return {
		...row,
		metadata: row.metadata ? JSON.parse(row.metadata) : null,
	};
}

/**
 * List nodes with filters
 */
export async function listNodes(filters: {
	node_type?: string;
	status?: string;
	created_by?: string;
	limit?: number;
	offset?: number;
	include_deleted?: boolean;
}): Promise<Node[]> {
	let query = db('nodes');

	if (!filters.include_deleted) {
		query = query.whereNull('deleted_at');
	}
	if (filters.node_type) {
		query = query.where('node_type', filters.node_type);
	}
	if (filters.status) {
		query = query.where('status', filters.status);
	}
	if (filters.created_by) {
		query = query.where('created_by', filters.created_by);
	}

	query = query.limit(filters.limit || 50).offset(filters.offset || 0);
	query = query.orderBy('created_at', 'desc');

	const rows = await query;
	return rows.map((row: any) => ({
		...row,
		metadata: row.metadata ? JSON.parse(row.metadata) : null,
	}));
}

/**
 * Update a node
 */
export async function updateNode(
	id: string,
	input: UpdateNodeInput,
	changedBy: string
): Promise<Node | null> {
	const existing = await getNode(id);
	if (!existing) return null;

	const now = new Date().toISOString();
	const newVersion = existing.version + 1;

	const updates: Partial<Node> = {
		updated_at: now,
		version: newVersion,
	};

	if (input.title !== undefined) updates.title = input.title;
	if (input.description !== undefined) updates.description = input.description;
	if (input.status !== undefined) updates.status = input.status;
	if (input.metadata !== undefined) updates.metadata = input.metadata;

	// Update node
	await db('nodes').where({ id }).update({
		...updates,
		metadata: updates.metadata ? JSON.stringify(updates.metadata) : existing.metadata ? JSON.stringify(existing.metadata) : null,
	});

	const updatedNode = { ...existing, ...updates };

	// Create history record
	await db('node_history').insert({
		id: uuid(),
		node_id: id,
		version: newVersion,
		operation: 'update',
		changed_by: changedBy,
		changed_at: now,
		change_reason: input.change_reason || null,
		before_state: JSON.stringify(existing),
		after_state: JSON.stringify(updatedNode),
	});

	logger.info(`Updated node: ${id} -> v${newVersion}`);
	return updatedNode;
}

/**
 * Soft delete a node
 */
export async function deleteNode(
	id: string,
	changedBy: string,
	changeReason?: string
): Promise<boolean> {
	const existing = await getNode(id);
	if (!existing) return false;

	const now = new Date().toISOString();
	const newVersion = existing.version + 1;

	await db('nodes').where({ id }).update({
		deleted_at: now,
		updated_at: now,
		version: newVersion,
	});

	const deletedNode = { ...existing, deleted_at: now, version: newVersion };

	// Create history record
	await db('node_history').insert({
		id: uuid(),
		node_id: id,
		version: newVersion,
		operation: 'delete',
		changed_by: changedBy,
		changed_at: now,
		change_reason: changeReason || null,
		before_state: JSON.stringify(existing),
		after_state: JSON.stringify(deletedNode),
	});

	logger.info(`Deleted node: ${id}`);
	return true;
}

/**
 * Get node history
 */
export async function getNodeHistory(nodeId: string): Promise<any[]> {
	const rows = await db('node_history')
		.where({ node_id: nodeId })
		.orderBy('version', 'asc');

	return rows.map((row: any) => ({
		...row,
		before_state: row.before_state ? JSON.parse(row.before_state) : null,
		after_state: JSON.parse(row.after_state),
	}));
}

// ============================================================================
// Edge Operations
// ============================================================================

/**
 * Create a new edge
 */
export async function createEdge(input: CreateEdgeInput): Promise<Edge> {
	// Validate: no self-referencing edges
	if (input.source_node_id === input.target_node_id) {
		throw new Error('Self-referencing edges are not allowed');
	}

	// Validate: source and target nodes exist
	const sourceNode = await getNode(input.source_node_id);
	const targetNode = await getNode(input.target_node_id);
	if (!sourceNode) throw new Error(`Source node not found: ${input.source_node_id}`);
	if (!targetNode) throw new Error(`Target node not found: ${input.target_node_id}`);

	// Check for duplicate active edge
	const existingEdge = await db('edges')
		.where({
			source_node_id: input.source_node_id,
			target_node_id: input.target_node_id,
			edge_type: input.edge_type,
		})
		.whereNull('deleted_at')
		.first();

	if (existingEdge) {
		throw new Error(`Duplicate edge: ${input.edge_type} already exists between these nodes`);
	}

	const now = new Date().toISOString();
	const id = uuid();

	const edge: Edge = {
		id,
		edge_type: input.edge_type,
		source_node_id: input.source_node_id,
		target_node_id: input.target_node_id,
		schema_layer: input.schema_layer || 'pm_core',
		weight: input.weight ?? 1.0,
		weight_metadata: input.weight_metadata,
		directionality: input.directionality || 'directed',
		metadata: input.metadata,
		created_by: input.created_by,
		created_at: now,
		updated_at: now,
		version: 1,
	};

	// Insert edge
	await db('edges').insert({
		...edge,
		weight_metadata: edge.weight_metadata ? JSON.stringify(edge.weight_metadata) : null,
		metadata: edge.metadata ? JSON.stringify(edge.metadata) : null,
	});

	// Create history record
	await db('edge_history').insert({
		id: uuid(),
		edge_id: id,
		version: 1,
		operation: 'create',
		changed_by: input.created_by,
		changed_at: now,
		change_reason: null,
		before_state: null,
		after_state: JSON.stringify(edge),
	});

	logger.info(`Created edge: ${id} (${input.edge_type}: ${input.source_node_id} -> ${input.target_node_id})`);
	return edge;
}

/**
 * Get an edge by ID
 */
export async function getEdge(id: string, includeDeleted = false): Promise<Edge | null> {
	let query = db('edges').where({ id });
	if (!includeDeleted) {
		query = query.whereNull('deleted_at');
	}

	const row = await query.first();
	if (!row) return null;

	return {
		...row,
		weight_metadata: row.weight_metadata ? JSON.parse(row.weight_metadata) : null,
		metadata: row.metadata ? JSON.parse(row.metadata) : null,
	};
}

/**
 * List edges with filters
 */
export async function listEdges(filters: {
	edge_type?: string;
	source_node_id?: string;
	target_node_id?: string;
	min_weight?: number;
	limit?: number;
	offset?: number;
	include_deleted?: boolean;
}): Promise<Edge[]> {
	let query = db('edges');

	if (!filters.include_deleted) {
		query = query.whereNull('deleted_at');
	}
	if (filters.edge_type) {
		query = query.where('edge_type', filters.edge_type);
	}
	if (filters.source_node_id) {
		query = query.where('source_node_id', filters.source_node_id);
	}
	if (filters.target_node_id) {
		query = query.where('target_node_id', filters.target_node_id);
	}
	if (filters.min_weight !== undefined) {
		query = query.where('weight', '>=', filters.min_weight);
	}

	query = query.limit(filters.limit || 50).offset(filters.offset || 0);

	const rows = await query;
	return rows.map((row: any) => ({
		...row,
		weight_metadata: row.weight_metadata ? JSON.parse(row.weight_metadata) : null,
		metadata: row.metadata ? JSON.parse(row.metadata) : null,
	}));
}

/**
 * Update an edge
 */
export async function updateEdge(
	id: string,
	input: UpdateEdgeInput,
	changedBy: string
): Promise<Edge | null> {
	const existing = await getEdge(id);
	if (!existing) return null;

	const now = new Date().toISOString();
	const newVersion = existing.version + 1;

	const updates: Partial<Edge> = {
		updated_at: now,
		version: newVersion,
	};

	if (input.weight !== undefined) updates.weight = input.weight;
	if (input.weight_metadata !== undefined) updates.weight_metadata = input.weight_metadata;
	if (input.metadata !== undefined) updates.metadata = input.metadata;

	// Update edge
	await db('edges').where({ id }).update({
		...updates,
		weight_metadata: updates.weight_metadata ? JSON.stringify(updates.weight_metadata) : undefined,
		metadata: updates.metadata ? JSON.stringify(updates.metadata) : undefined,
	});

	const updatedEdge = { ...existing, ...updates };

	// Create history record
	await db('edge_history').insert({
		id: uuid(),
		edge_id: id,
		version: newVersion,
		operation: 'update',
		changed_by: changedBy,
		changed_at: now,
		change_reason: input.change_reason || null,
		before_state: JSON.stringify(existing),
		after_state: JSON.stringify(updatedEdge),
	});

	logger.info(`Updated edge: ${id} -> v${newVersion}`);
	return updatedEdge;
}

/**
 * Soft delete an edge
 */
export async function deleteEdge(
	id: string,
	changedBy: string,
	changeReason?: string
): Promise<boolean> {
	const existing = await getEdge(id);
	if (!existing) return false;

	const now = new Date().toISOString();
	const newVersion = existing.version + 1;

	await db('edges').where({ id }).update({
		deleted_at: now,
		updated_at: now,
		version: newVersion,
	});

	const deletedEdge = { ...existing, deleted_at: now, version: newVersion };

	// Create history record
	await db('edge_history').insert({
		id: uuid(),
		edge_id: id,
		version: newVersion,
		operation: 'delete',
		changed_by: changedBy,
		changed_at: now,
		change_reason: changeReason || null,
		before_state: JSON.stringify(existing),
		after_state: JSON.stringify(deletedEdge),
	});

	logger.info(`Deleted edge: ${id}`);
	return true;
}

/**
 * Get edge history
 */
export async function getEdgeHistory(edgeId: string): Promise<any[]> {
	const rows = await db('edge_history')
		.where({ edge_id: edgeId })
		.orderBy('version', 'asc');

	return rows.map((row: any) => ({
		...row,
		before_state: row.before_state ? JSON.parse(row.before_state) : null,
		after_state: JSON.parse(row.after_state),
	}));
}

// ============================================================================
// Traversal Operations
// ============================================================================

/**
 * Traverse the graph from a starting node
 */
export async function traverse(options: TraverseOptions): Promise<TraverseResult> {
	const visitedNodes = new Map<string, Node>();
	const visitedEdges = new Map<string, Edge>();
	const paths: { node_ids: string[]; edge_ids: string[] }[] = [];

	// BFS traversal
	const queue: { nodeId: string; depth: number; path: { node_ids: string[]; edge_ids: string[] } }[] = [
		{ nodeId: options.start_node_id, depth: 0, path: { node_ids: [options.start_node_id], edge_ids: [] } }
	];

	// Get and add starting node
	const startNode = await getNode(options.start_node_id);
	if (!startNode) {
		throw new Error(`Start node not found: ${options.start_node_id}`);
	}
	visitedNodes.set(startNode.id, startNode);

	while (queue.length > 0) {
		const { nodeId, depth, path } = queue.shift()!;

		if (depth >= options.max_depth) {
			if (options.include_paths && path.node_ids.length > 1) {
				paths.push(path);
			}
			continue;
		}

		// Find connected edges
		let edgeQuery = db('edges').whereNull('deleted_at');

		if (options.direction === 'outgoing') {
			edgeQuery = edgeQuery.where('source_node_id', nodeId);
		} else if (options.direction === 'incoming') {
			edgeQuery = edgeQuery.where('target_node_id', nodeId);
		} else {
			edgeQuery = edgeQuery.where(function () {
				this.where('source_node_id', nodeId).orWhere('target_node_id', nodeId);
			});
		}

		if (options.edge_types && options.edge_types.length > 0) {
			edgeQuery = edgeQuery.whereIn('edge_type', options.edge_types);
		}

		if (options.min_weight !== undefined) {
			edgeQuery = edgeQuery.where('weight', '>=', options.min_weight);
		}

		const edges = await edgeQuery;

		for (const edgeRow of edges) {
			const edge: Edge = {
				...edgeRow,
				weight_metadata: edgeRow.weight_metadata ? JSON.parse(edgeRow.weight_metadata) : null,
				metadata: edgeRow.metadata ? JSON.parse(edgeRow.metadata) : null,
			};

			// Determine the next node to visit
			let nextNodeId: string;
			if (options.direction === 'outgoing') {
				nextNodeId = edge.target_node_id;
			} else if (options.direction === 'incoming') {
				nextNodeId = edge.source_node_id;
			} else {
				nextNodeId = edge.source_node_id === nodeId ? edge.target_node_id : edge.source_node_id;
			}

			// Skip if already visited
			if (visitedNodes.has(nextNodeId)) {
				continue;
			}

			// Get next node
			const nextNode = await getNode(nextNodeId);
			if (!nextNode) continue;

			// Filter by node type if specified
			if (options.node_types && options.node_types.length > 0) {
				if (!options.node_types.includes(nextNode.node_type)) {
					continue;
				}
			}

			// Add to visited
			visitedNodes.set(nextNode.id, nextNode);
			visitedEdges.set(edge.id, edge);

			// Continue traversal
			const newPath = {
				node_ids: [...path.node_ids, nextNodeId],
				edge_ids: [...path.edge_ids, edge.id],
			};

			queue.push({ nodeId: nextNodeId, depth: depth + 1, path: newPath });
		}
	}

	return {
		nodes: Array.from(visitedNodes.values()),
		edges: Array.from(visitedEdges.values()),
		paths: options.include_paths ? paths : undefined,
	};
}

/**
 * Extract a subgraph around seed nodes
 */
export async function extractSubgraph(
	seedIds: string[],
	depth: number
): Promise<TraverseResult> {
	const allNodes = new Map<string, Node>();
	const allEdges = new Map<string, Edge>();

	for (const seedId of seedIds) {
		const result = await traverse({
			start_node_id: seedId,
			direction: 'both',
			max_depth: depth,
		});

		for (const node of result.nodes) {
			allNodes.set(node.id, node);
		}
		for (const edge of result.edges) {
			allEdges.set(edge.id, edge);
		}
	}

	return {
		nodes: Array.from(allNodes.values()),
		edges: Array.from(allEdges.values()),
	};
}

/**
 * Find path between two nodes
 */
export async function findPath(
	fromId: string,
	toId: string,
	maxDepth: number = 10
): Promise<{ node_ids: string[]; edge_ids: string[] } | null> {
	// BFS to find shortest path
	const visited = new Set<string>();
	const queue: { nodeId: string; path: { node_ids: string[]; edge_ids: string[] } }[] = [
		{ nodeId: fromId, path: { node_ids: [fromId], edge_ids: [] } }
	];

	visited.add(fromId);

	while (queue.length > 0) {
		const { nodeId, path } = queue.shift()!;

		if (path.node_ids.length > maxDepth + 1) {
			continue;
		}

		if (nodeId === toId) {
			return path;
		}

		// Find connected edges (both directions)
		const edges = await db('edges')
			.whereNull('deleted_at')
			.where(function () {
				this.where('source_node_id', nodeId).orWhere('target_node_id', nodeId);
			});

		for (const edgeRow of edges) {
			const nextNodeId = edgeRow.source_node_id === nodeId
				? edgeRow.target_node_id
				: edgeRow.source_node_id;

			if (visited.has(nextNodeId)) {
				continue;
			}

			visited.add(nextNodeId);
			queue.push({
				nodeId: nextNodeId,
				path: {
					node_ids: [...path.node_ids, nextNodeId],
					edge_ids: [...path.edge_ids, edgeRow.id],
				},
			});
		}
	}

	return null; // No path found
}

/**
 * Find all nodes impacted by changes to a given node (downstream traversal)
 */
export async function findImpact(
	nodeId: string,
	maxDepth: number = 5
): Promise<Node[]> {
	const result = await traverse({
		start_node_id: nodeId,
		direction: 'outgoing',
		max_depth: maxDepth,
		edge_types: ['depends_on', 'blocks', 'parent_of'],
	});

	// Exclude the starting node from impact results
	return result.nodes.filter(n => n.id !== nodeId);
}
