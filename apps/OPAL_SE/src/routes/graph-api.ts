/**
 * Graph API Routes
 * 
 * REST endpoints for the Network PM Core graph model.
 * Provides CRUD operations for nodes and edges, plus traversal and history queries.
 */

import express, { Request, Response } from 'express';
import * as graphService from '../services/graphService';
import logger from '../logger';

const router = express.Router();

// CORS middleware
router.use((req: Request, res: Response, next): void => {
	res.header('Access-Control-Allow-Origin', '*');
	res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
	res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
	if (req.method === 'OPTIONS') {
		res.sendStatus(200);
		return;
	}
	next();
});

// ============================================================================
// Node CRUD
// ============================================================================

/**
 * @route POST /api/nodes
 * @desc Create a new node
 */
router.post('/nodes', async (req: Request, res: Response) => {
	try {
		const { node_type, title, description, status, metadata, created_by, schema_layer } = req.body;

		if (!node_type || !title || !status || !created_by) {
			return res.status(400).json({
				error: 'Missing required fields: node_type, title, status, created_by'
			});
		}

		const node = await graphService.createNode({
			node_type,
			title,
			description,
			status,
			metadata,
			created_by,
			schema_layer,
		});

		res.status(201).json(node);
	} catch (error: any) {
		logger.error('Error creating node:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * @route GET /api/nodes/:id
 * @desc Get a node by ID
 */
router.get('/nodes/:id', async (req: Request, res: Response) => {
	try {
		const includeDeleted = req.query.include_deleted === 'true';
		const node = await graphService.getNode(req.params.id, includeDeleted);

		if (!node) {
			return res.status(404).json({ error: 'Node not found' });
		}

		res.json(node);
	} catch (error: any) {
		logger.error('Error getting node:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * @route GET /api/nodes
 * @desc List nodes with filters
 */
router.get('/nodes', async (req: Request, res: Response) => {
	try {
		const { node_type, status, created_by, limit, offset, include_deleted } = req.query;

		const nodes = await graphService.listNodes({
			node_type: node_type as string,
			status: status as string,
			created_by: created_by as string,
			limit: limit ? parseInt(limit as string) : undefined,
			offset: offset ? parseInt(offset as string) : undefined,
			include_deleted: include_deleted === 'true',
		});

		res.json({ nodes, count: nodes.length });
	} catch (error: any) {
		logger.error('Error listing nodes:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * @route PATCH /api/nodes/:id
 * @desc Update a node
 */
router.patch('/nodes/:id', async (req: Request, res: Response) => {
	try {
		const { title, description, status, metadata, change_reason, changed_by } = req.body;

		if (!changed_by) {
			return res.status(400).json({ error: 'changed_by is required' });
		}

		const node = await graphService.updateNode(
			req.params.id,
			{ title, description, status, metadata, change_reason },
			changed_by
		);

		if (!node) {
			return res.status(404).json({ error: 'Node not found' });
		}

		res.json(node);
	} catch (error: any) {
		logger.error('Error updating node:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * @route DELETE /api/nodes/:id
 * @desc Soft delete a node
 */
router.delete('/nodes/:id', async (req: Request, res: Response) => {
	try {
		const { changed_by, change_reason } = req.body;

		if (!changed_by) {
			return res.status(400).json({ error: 'changed_by is required' });
		}

		const deleted = await graphService.deleteNode(req.params.id, changed_by, change_reason);

		if (!deleted) {
			return res.status(404).json({ error: 'Node not found' });
		}

		res.json({ success: true });
	} catch (error: any) {
		logger.error('Error deleting node:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * @route GET /api/nodes/:id/history
 * @desc Get node change history
 */
router.get('/nodes/:id/history', async (req: Request, res: Response) => {
	try {
		const history = await graphService.getNodeHistory(req.params.id);
		res.json({ history });
	} catch (error: any) {
		logger.error('Error getting node history:', error);
		res.status(500).json({ error: error.message });
	}
});

// ============================================================================
// Edge CRUD
// ============================================================================

/**
 * @route POST /api/edges
 * @desc Create a new edge
 */
router.post('/edges', async (req: Request, res: Response) => {
	try {
		const {
			edge_type, source_node_id, target_node_id,
			weight, weight_metadata, directionality, metadata,
			created_by, schema_layer
		} = req.body;

		if (!edge_type || !source_node_id || !target_node_id || !created_by) {
			return res.status(400).json({
				error: 'Missing required fields: edge_type, source_node_id, target_node_id, created_by'
			});
		}

		const edge = await graphService.createEdge({
			edge_type,
			source_node_id,
			target_node_id,
			weight,
			weight_metadata,
			directionality,
			metadata,
			created_by,
			schema_layer,
		});

		res.status(201).json(edge);
	} catch (error: any) {
		logger.error('Error creating edge:', error);
		if (error.message.includes('not found') || error.message.includes('Duplicate')) {
			return res.status(400).json({ error: error.message });
		}
		res.status(500).json({ error: error.message });
	}
});

/**
 * @route GET /api/edges/:id
 * @desc Get an edge by ID
 */
router.get('/edges/:id', async (req: Request, res: Response) => {
	try {
		const includeDeleted = req.query.include_deleted === 'true';
		const edge = await graphService.getEdge(req.params.id, includeDeleted);

		if (!edge) {
			return res.status(404).json({ error: 'Edge not found' });
		}

		res.json(edge);
	} catch (error: any) {
		logger.error('Error getting edge:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * @route GET /api/edges
 * @desc List edges with filters
 */
router.get('/edges', async (req: Request, res: Response) => {
	try {
		const { edge_type, source_node_id, target_node_id, min_weight, limit, offset, include_deleted } = req.query;

		const edges = await graphService.listEdges({
			edge_type: edge_type as string,
			source_node_id: source_node_id as string,
			target_node_id: target_node_id as string,
			min_weight: min_weight ? parseFloat(min_weight as string) : undefined,
			limit: limit ? parseInt(limit as string) : undefined,
			offset: offset ? parseInt(offset as string) : undefined,
			include_deleted: include_deleted === 'true',
		});

		res.json({ edges, count: edges.length });
	} catch (error: any) {
		logger.error('Error listing edges:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * @route PATCH /api/edges/:id
 * @desc Update an edge
 */
router.patch('/edges/:id', async (req: Request, res: Response) => {
	try {
		const { weight, weight_metadata, metadata, change_reason, changed_by } = req.body;

		if (!changed_by) {
			return res.status(400).json({ error: 'changed_by is required' });
		}

		const edge = await graphService.updateEdge(
			req.params.id,
			{ weight, weight_metadata, metadata, change_reason },
			changed_by
		);

		if (!edge) {
			return res.status(404).json({ error: 'Edge not found' });
		}

		res.json(edge);
	} catch (error: any) {
		logger.error('Error updating edge:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * @route DELETE /api/edges/:id
 * @desc Soft delete an edge
 */
router.delete('/edges/:id', async (req: Request, res: Response) => {
	try {
		const { changed_by, change_reason } = req.body;

		if (!changed_by) {
			return res.status(400).json({ error: 'changed_by is required' });
		}

		const deleted = await graphService.deleteEdge(req.params.id, changed_by, change_reason);

		if (!deleted) {
			return res.status(404).json({ error: 'Edge not found' });
		}

		res.json({ success: true });
	} catch (error: any) {
		logger.error('Error deleting edge:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * @route GET /api/edges/:id/history
 * @desc Get edge change history
 */
router.get('/edges/:id/history', async (req: Request, res: Response) => {
	try {
		const history = await graphService.getEdgeHistory(req.params.id);
		res.json({ history });
	} catch (error: any) {
		logger.error('Error getting edge history:', error);
		res.status(500).json({ error: error.message });
	}
});

// ============================================================================
// Traversal & Queries
// ============================================================================

/**
 * @route POST /api/traverse
 * @desc Traverse the graph from a starting node
 */
router.post('/traverse', async (req: Request, res: Response) => {
	try {
		const {
			start_node_id, direction, edge_types, node_types,
			max_depth, min_weight, include_paths
		} = req.body;

		if (!start_node_id || !direction || max_depth === undefined) {
			return res.status(400).json({
				error: 'Missing required fields: start_node_id, direction, max_depth'
			});
		}

		const result = await graphService.traverse({
			start_node_id,
			direction,
			edge_types,
			node_types,
			max_depth,
			min_weight,
			include_paths,
		});

		res.json(result);
	} catch (error: any) {
		logger.error('Error traversing graph:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * @route POST /api/query/subgraph
 * @desc Extract local subgraph around seed nodes
 */
router.post('/query/subgraph', async (req: Request, res: Response) => {
	try {
		const { seed_ids, depth } = req.body;

		if (!seed_ids || !Array.isArray(seed_ids) || seed_ids.length === 0) {
			return res.status(400).json({ error: 'seed_ids array is required' });
		}

		const result = await graphService.extractSubgraph(seed_ids, depth || 2);
		res.json(result);
	} catch (error: any) {
		logger.error('Error extracting subgraph:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * @route POST /api/query/path
 * @desc Find path between two nodes
 */
router.post('/query/path', async (req: Request, res: Response) => {
	try {
		const { from_id, to_id, max_depth } = req.body;

		if (!from_id || !to_id) {
			return res.status(400).json({ error: 'from_id and to_id are required' });
		}

		const path = await graphService.findPath(from_id, to_id, max_depth || 10);

		if (!path) {
			return res.status(404).json({ error: 'No path found between nodes' });
		}

		res.json({ path });
	} catch (error: any) {
		logger.error('Error finding path:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * @route POST /api/query/impact
 * @desc Find all nodes impacted by a given node
 */
router.post('/query/impact', async (req: Request, res: Response) => {
	try {
		const { node_id, max_depth } = req.body;

		if (!node_id) {
			return res.status(400).json({ error: 'node_id is required' });
		}

		const impactedNodes = await graphService.findImpact(node_id, max_depth || 5);
		res.json({ nodes: impactedNodes, count: impactedNodes.length });
	} catch (error: any) {
		logger.error('Error finding impact:', error);
		res.status(500).json({ error: error.message });
	}
});

export default router;
