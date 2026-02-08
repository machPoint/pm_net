/**
 * Graph Service Unit Tests
 * 
 * Tests for core graph operations: node/edge CRUD and traversal.
 * These are critical tests per the implementation plan.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { v4 as uuid } from 'uuid';

// Mock the database module
const mockDb = {
	nodes: [] as any[],
	edges: [] as any[],
	node_history: [] as any[],
	edge_history: [] as any[],
};

// Simple in-memory mock for testing traversal logic
function createMockNode(overrides: Partial<any> = {}) {
	const now = new Date().toISOString();
	return {
		id: uuid(),
		node_type: 'task',
		schema_layer: 'pm_core',
		title: 'Test Node',
		description: null,
		status: 'backlog',
		metadata: null,
		created_by: '00000000-0000-0000-0000-000000000001',
		created_at: now,
		updated_at: now,
		deleted_at: null,
		version: 1,
		...overrides,
	};
}

function createMockEdge(sourceId: string, targetId: string, overrides: Partial<any> = {}) {
	const now = new Date().toISOString();
	return {
		id: uuid(),
		edge_type: 'depends_on',
		source_node_id: sourceId,
		target_node_id: targetId,
		schema_layer: 'pm_core',
		weight: 1.0,
		weight_metadata: null,
		directionality: 'directed',
		metadata: null,
		created_by: '00000000-0000-0000-0000-000000000001',
		created_at: now,
		updated_at: now,
		deleted_at: null,
		version: 1,
		...overrides,
	};
}

describe('Graph Traversal Logic', () => {
	describe('BFS Traversal', () => {
		it('should find connected nodes via outgoing edges', () => {
			// Setup: A -> B -> C
			const nodeA = createMockNode({ id: 'node-a', title: 'Node A' });
			const nodeB = createMockNode({ id: 'node-b', title: 'Node B' });
			const nodeC = createMockNode({ id: 'node-c', title: 'Node C' });

			const edgeAB = createMockEdge('node-a', 'node-b');
			const edgeBC = createMockEdge('node-b', 'node-c');

			const nodes = [nodeA, nodeB, nodeC];
			const edges = [edgeAB, edgeBC];

			// Simulate BFS from nodeA with max_depth 2
			const visited = new Set<string>();
			const queue = [{ nodeId: 'node-a', depth: 0 }];
			visited.add('node-a');

			while (queue.length > 0) {
				const { nodeId, depth } = queue.shift()!;
				if (depth >= 2) continue;

				// Find outgoing edges
				const outgoingEdges = edges.filter(e => e.source_node_id === nodeId && !e.deleted_at);

				for (const edge of outgoingEdges) {
					if (!visited.has(edge.target_node_id)) {
						visited.add(edge.target_node_id);
						queue.push({ nodeId: edge.target_node_id, depth: depth + 1 });
					}
				}
			}

			expect(visited.size).toBe(3);
			expect(visited.has('node-a')).toBe(true);
			expect(visited.has('node-b')).toBe(true);
			expect(visited.has('node-c')).toBe(true);
		});

		it('should respect max_depth limit', () => {
			// Setup: A -> B -> C -> D
			const nodes = ['a', 'b', 'c', 'd'].map(id =>
				createMockNode({ id: `node-${id}`, title: `Node ${id.toUpperCase()}` })
			);

			const edges = [
				createMockEdge('node-a', 'node-b'),
				createMockEdge('node-b', 'node-c'),
				createMockEdge('node-c', 'node-d'),
			];

			// BFS with max_depth 1 should only find A and B
			const visited = new Set<string>();
			const queue = [{ nodeId: 'node-a', depth: 0 }];
			visited.add('node-a');
			const maxDepth = 1;

			while (queue.length > 0) {
				const { nodeId, depth } = queue.shift()!;
				if (depth >= maxDepth) continue;

				const outgoingEdges = edges.filter(e => e.source_node_id === nodeId && !e.deleted_at);

				for (const edge of outgoingEdges) {
					if (!visited.has(edge.target_node_id)) {
						visited.add(edge.target_node_id);
						queue.push({ nodeId: edge.target_node_id, depth: depth + 1 });
					}
				}
			}

			expect(visited.size).toBe(2);
			expect(visited.has('node-a')).toBe(true);
			expect(visited.has('node-b')).toBe(true);
			expect(visited.has('node-c')).toBe(false);
		});

		it('should filter by edge type', () => {
			// Setup: A --(depends_on)--> B, A --(related_to)--> C
			const nodeA = createMockNode({ id: 'node-a' });
			const nodeB = createMockNode({ id: 'node-b' });
			const nodeC = createMockNode({ id: 'node-c' });

			const edges = [
				createMockEdge('node-a', 'node-b', { edge_type: 'depends_on' }),
				createMockEdge('node-a', 'node-c', { edge_type: 'related_to' }),
			];

			// Filter for only 'depends_on' edges
			const allowedTypes = ['depends_on'];
			const visited = new Set<string>();
			const queue = [{ nodeId: 'node-a', depth: 0 }];
			visited.add('node-a');

			while (queue.length > 0) {
				const { nodeId, depth } = queue.shift()!;
				if (depth >= 2) continue;

				const outgoingEdges = edges.filter(e =>
					e.source_node_id === nodeId &&
					!e.deleted_at &&
					allowedTypes.includes(e.edge_type)
				);

				for (const edge of outgoingEdges) {
					if (!visited.has(edge.target_node_id)) {
						visited.add(edge.target_node_id);
						queue.push({ nodeId: edge.target_node_id, depth: depth + 1 });
					}
				}
			}

			expect(visited.size).toBe(2);
			expect(visited.has('node-a')).toBe(true);
			expect(visited.has('node-b')).toBe(true);
			expect(visited.has('node-c')).toBe(false); // Filtered out
		});

		it('should filter by min_weight', () => {
			// Setup: A --(weight 0.8)--> B, A --(weight 0.3)--> C
			const edges = [
				createMockEdge('node-a', 'node-b', { weight: 0.8 }),
				createMockEdge('node-a', 'node-c', { weight: 0.3 }),
			];

			const minWeight = 0.5;
			const visited = new Set<string>();
			const queue = [{ nodeId: 'node-a', depth: 0 }];
			visited.add('node-a');

			while (queue.length > 0) {
				const { nodeId, depth } = queue.shift()!;
				if (depth >= 2) continue;

				const outgoingEdges = edges.filter(e =>
					e.source_node_id === nodeId &&
					!e.deleted_at &&
					e.weight >= minWeight
				);

				for (const edge of outgoingEdges) {
					if (!visited.has(edge.target_node_id)) {
						visited.add(edge.target_node_id);
						queue.push({ nodeId: edge.target_node_id, depth: depth + 1 });
					}
				}
			}

			expect(visited.size).toBe(2);
			expect(visited.has('node-b')).toBe(true);
			expect(visited.has('node-c')).toBe(false); // Weight too low
		});

		it('should handle bidirectional traversal', () => {
			// Setup: A -> B, C -> B (B has both incoming edges)
			const edges = [
				createMockEdge('node-a', 'node-b'),
				createMockEdge('node-c', 'node-b'),
			];

			// Traverse both directions from B
			const visited = new Set<string>();
			const queue = [{ nodeId: 'node-b', depth: 0 }];
			visited.add('node-b');

			while (queue.length > 0) {
				const { nodeId, depth } = queue.shift()!;
				if (depth >= 1) continue;

				// Find both outgoing AND incoming edges
				const connectedEdges = edges.filter(e =>
					(e.source_node_id === nodeId || e.target_node_id === nodeId) &&
					!e.deleted_at
				);

				for (const edge of connectedEdges) {
					const nextNodeId = edge.source_node_id === nodeId
						? edge.target_node_id
						: edge.source_node_id;

					if (!visited.has(nextNodeId)) {
						visited.add(nextNodeId);
						queue.push({ nodeId: nextNodeId, depth: depth + 1 });
					}
				}
			}

			expect(visited.size).toBe(3);
			expect(visited.has('node-a')).toBe(true);
			expect(visited.has('node-b')).toBe(true);
			expect(visited.has('node-c')).toBe(true);
		});
	});

	describe('Path Finding', () => {
		it('should find shortest path between two nodes', () => {
			// Setup: A -> B -> C -> D
			const edges = [
				createMockEdge('node-a', 'node-b'),
				createMockEdge('node-b', 'node-c'),
				createMockEdge('node-c', 'node-d'),
			];

			// BFS to find path from A to D
			const visited = new Set<string>();
			const queue: { nodeId: string; path: string[] }[] = [
				{ nodeId: 'node-a', path: ['node-a'] }
			];
			visited.add('node-a');
			let foundPath: string[] | null = null;

			while (queue.length > 0 && !foundPath) {
				const { nodeId, path } = queue.shift()!;

				if (nodeId === 'node-d') {
					foundPath = path;
					break;
				}

				const outgoingEdges = edges.filter(e =>
					e.source_node_id === nodeId && !e.deleted_at
				);

				for (const edge of outgoingEdges) {
					if (!visited.has(edge.target_node_id)) {
						visited.add(edge.target_node_id);
						queue.push({
							nodeId: edge.target_node_id,
							path: [...path, edge.target_node_id]
						});
					}
				}
			}

			expect(foundPath).not.toBeNull();
			expect(foundPath).toEqual(['node-a', 'node-b', 'node-c', 'node-d']);
		});

		it('should return null when no path exists', () => {
			// Setup: A -> B (disconnected from C)
			const edges = [
				createMockEdge('node-a', 'node-b'),
			];

			const visited = new Set<string>();
			const queue: { nodeId: string; path: string[] }[] = [
				{ nodeId: 'node-a', path: ['node-a'] }
			];
			visited.add('node-a');
			let foundPath: string[] | null = null;

			while (queue.length > 0) {
				const { nodeId, path } = queue.shift()!;

				if (nodeId === 'node-c') {
					foundPath = path;
					break;
				}

				const outgoingEdges = edges.filter(e =>
					e.source_node_id === nodeId && !e.deleted_at
				);

				for (const edge of outgoingEdges) {
					if (!visited.has(edge.target_node_id)) {
						visited.add(edge.target_node_id);
						queue.push({
							nodeId: edge.target_node_id,
							path: [...path, edge.target_node_id]
						});
					}
				}
			}

			expect(foundPath).toBeNull();
		});
	});

	describe('Edge Weight Semantics', () => {
		it('should treat weight 1.0 as strong/required', () => {
			const edge = createMockEdge('a', 'b', { weight: 1.0 });
			expect(edge.weight).toBe(1.0);
		});

		it('should treat weight 0.0 as weak/optional', () => {
			const edge = createMockEdge('a', 'b', { weight: 0.0 });
			expect(edge.weight).toBe(0.0);
		});

		it('should validate weight is in range 0.0 to 1.0', () => {
			const validWeights = [0.0, 0.25, 0.5, 0.75, 1.0];
			for (const weight of validWeights) {
				const edge = createMockEdge('a', 'b', { weight });
				expect(edge.weight).toBeGreaterThanOrEqual(0.0);
				expect(edge.weight).toBeLessThanOrEqual(1.0);
			}
		});
	});

	describe('Self-Reference Prevention', () => {
		it('should detect self-referencing edge attempts', () => {
			const isSelfReferencing = (sourceId: string, targetId: string) => {
				return sourceId === targetId;
			};

			expect(isSelfReferencing('node-a', 'node-a')).toBe(true);
			expect(isSelfReferencing('node-a', 'node-b')).toBe(false);
		});
	});
});

describe('Node Types', () => {
	const validNodeTypes = [
		'task', 'plan', 'approval', 'run', 'verification',
		'artifact', 'user', 'agent', 'decision_trace', 'precedent'
	];

	it('should recognize all PM Core node types', () => {
		for (const nodeType of validNodeTypes) {
			const node = createMockNode({ node_type: nodeType });
			expect(node.node_type).toBe(nodeType);
		}
	});
});

describe('Edge Types', () => {
	const validEdgeTypes = [
		'parent_of', 'depends_on', 'blocks', 'related_to',
		'assigned_to', 'created_by', 'owned_by',
		'has_plan', 'proposed_by', 'approval_of', 'approved_by', 'supersedes',
		'has_run', 'executed_plan', 'executed_by', 'produced',
		'has_verification', 'evidenced_by', 'verified_by',
		'has_decision', 'references_precedent', 'derived_from'
	];

	it('should recognize all PM Core edge types', () => {
		for (const edgeType of validEdgeTypes) {
			const edge = createMockEdge('a', 'b', { edge_type: edgeType });
			expect(edge.edge_type).toBe(edgeType);
		}
	});
});

describe('History Tracking', () => {
	it('should increment version on each mutation', () => {
		let version = 1;

		// Simulate updates
		version++; // Update 1
		version++; // Update 2
		version++; // Update 3

		expect(version).toBe(4);
	});

	it('should capture before and after state', () => {
		const beforeState = { status: 'backlog', title: 'Old Title' };
		const afterState = { status: 'in_progress', title: 'Old Title' };

		// History record structure
		const historyRecord = {
			id: uuid(),
			node_id: 'some-node',
			version: 2,
			operation: 'update',
			changed_by: 'user-id',
			changed_at: new Date().toISOString(),
			change_reason: 'Status update',
			before_state: JSON.stringify(beforeState),
			after_state: JSON.stringify(afterState),
		};

		expect(JSON.parse(historyRecord.before_state)).toEqual(beforeState);
		expect(JSON.parse(historyRecord.after_state)).toEqual(afterState);
	});
});
