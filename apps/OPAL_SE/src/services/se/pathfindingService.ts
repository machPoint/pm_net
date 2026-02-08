/**
 * Graph Pathfinding Service
 *
 * Provides weighted graph navigation algorithms for autonomous agents.
 * Agents use these functions to plan optimal traversal paths through
 * the system graph based on edge weights.
 */

import db from '../../config/database';
import logger from '../../logger';
import { SystemNode, SystemEdge, RelationType } from '../../types/se';
import { getNode } from './systemGraphService';

// ============================================================================
// Types
// ============================================================================

export interface PathfindingOptions {
  allowedRelationTypes?: RelationType[];
  avoidNodeTypes?: string[];
  maxWeight?: number; // Maximum cumulative weight threshold
  maxDepth?: number;  // Maximum hops
  bidirectionalEdges?: boolean; // Respect bidirectional flag
}

export interface GraphPath {
  nodes: SystemNode[];
  edges: SystemEdge[];
  totalWeight: number;
  steps: Array<{
    nodeId: string;
    edgeId: string | null;
    cumulativeWeight: number;
  }>;
}

interface WeightedNeighbor {
  nodeId: string;
  edgeId: string;
  weight: number;
}

interface AdjacencyList {
  [nodeId: string]: WeightedNeighbor[];
}

// ============================================================================
// Graph Construction
// ============================================================================

/**
 * Build weighted adjacency list from database edges
 */
async function buildAdjacencyList(
  projectId: string,
  options: PathfindingOptions = {}
): Promise<AdjacencyList> {
  try {
    let query = db('system_edges')
      .where({ project_id: projectId })
      .whereNull('deleted_at');

    // Apply relation type filter
    if (options.allowedRelationTypes && options.allowedRelationTypes.length > 0) {
      query = query.whereIn('relation_type', options.allowedRelationTypes);
    }

    const edges = await query;
    const adjacencyList: AdjacencyList = {};

    for (const edge of edges) {
      const weight = edge.weight || 1.0;

      // Add forward edge
      if (!adjacencyList[edge.from_node_id]) {
        adjacencyList[edge.from_node_id] = [];
      }
      adjacencyList[edge.from_node_id].push({
        nodeId: edge.to_node_id,
        edgeId: edge.id,
        weight
      });

      // Add reverse edge if bidirectional
      if (options.bidirectionalEdges !== false && edge.bidirectional) {
        if (!adjacencyList[edge.to_node_id]) {
          adjacencyList[edge.to_node_id] = [];
        }
        adjacencyList[edge.to_node_id].push({
          nodeId: edge.from_node_id,
          edgeId: edge.id,
          weight
        });
      }
    }

    logger.debug(`Built adjacency list with ${Object.keys(adjacencyList).length} nodes`);
    return adjacencyList;
  } catch (error: any) {
    logger.error('Error building adjacency list:', error);
    throw new Error(`Failed to build adjacency list: ${error.message}`);
  }
}

// ============================================================================
// Dijkstra's Algorithm
// ============================================================================

/**
 * Find shortest weighted path between two nodes using Dijkstra's algorithm
 */
export async function findShortestPath(
  startNodeId: string,
  targetNodeId: string,
  projectId: string,
  options: PathfindingOptions = {}
): Promise<GraphPath | null> {
  try {
    logger.info(`Finding shortest path from ${startNodeId} to ${targetNodeId}`);

    // Build graph
    const adjacencyList = await buildAdjacencyList(projectId, options);

    // Dijkstra's algorithm
    const distances: { [key: string]: number } = {};
    const previous: { [key: string]: { nodeId: string; edgeId: string } | null } = {};
    const unvisited = new Set<string>();

    // Initialize all nodes
    const allNodeIds = new Set([
      ...Object.keys(adjacencyList),
      ...Object.values(adjacencyList).flatMap(neighbors => neighbors.map(n => n.nodeId))
    ]);

    for (const nodeId of allNodeIds) {
      distances[nodeId] = Infinity;
      previous[nodeId] = null;
      unvisited.add(nodeId);
    }

    distances[startNodeId] = 0;

    let iterations = 0;
    const maxIterations = options.maxDepth ? options.maxDepth * 1000 : 10000;

    while (unvisited.size > 0) {
      // Find node with minimum distance
      let currentNode: string | null = null;
      let minDistance = Infinity;

      for (const nodeId of unvisited) {
        if (distances[nodeId] < minDistance) {
          minDistance = distances[nodeId];
          currentNode = nodeId;
        }
      }

      // No path found
      if (currentNode === null || distances[currentNode] === Infinity) {
        logger.info('No path found: no reachable unvisited nodes');
        return null;
      }

      // Reached target
      if (currentNode === targetNodeId) {
        break;
      }

      // Safety check
      if (++iterations > maxIterations) {
        logger.warn('Dijkstra exceeded max iterations');
        break;
      }

      unvisited.delete(currentNode);

      // Update neighbors
      const neighbors = adjacencyList[currentNode] || [];
      for (const { nodeId: neighborId, edgeId, weight } of neighbors) {
        if (!unvisited.has(neighborId)) continue;

        const altDistance = distances[currentNode] + weight;

        // Check max weight threshold
        if (options.maxWeight && altDistance > options.maxWeight) {
          continue;
        }

        if (altDistance < distances[neighborId]) {
          distances[neighborId] = altDistance;
          previous[neighborId] = { nodeId: currentNode, edgeId };
        }
      }
    }

    // No path to target
    if (distances[targetNodeId] === Infinity) {
      logger.info('No path found: target not reachable');
      return null;
    }

    // Reconstruct path
    const path = await reconstructPath(
      startNodeId,
      targetNodeId,
      previous,
      distances,
      projectId
    );

    logger.info(`Found path with ${path.nodes.length} nodes, total weight: ${path.totalWeight}`);
    return path;

  } catch (error: any) {
    logger.error('Error in findShortestPath:', error);
    throw new Error(`Failed to find shortest path: ${error.message}`);
  }
}

/**
 * Reconstruct full path from Dijkstra's algorithm results
 */
async function reconstructPath(
  startNodeId: string,
  targetNodeId: string,
  previous: { [key: string]: { nodeId: string; edgeId: string } | null },
  distances: { [key: string]: number },
  projectId: string
): Promise<GraphPath> {
  const nodeIds: string[] = [];
  const edgeIds: string[] = [];
  let current: string | null = targetNodeId;

  // Walk backwards from target to start
  while (current !== null) {
    nodeIds.unshift(current);
    const prev = previous[current];
    if (prev) {
      edgeIds.unshift(prev.edgeId);
      current = prev.nodeId;
    } else {
      current = null;
    }
  }

  // Fetch full node and edge objects
  const nodes: SystemNode[] = [];
  for (const nodeId of nodeIds) {
    const node = await getNode(nodeId);
    if (node) nodes.push(node);
  }

  const edges: SystemEdge[] = [];
  if (edgeIds.length > 0) {
    const edgeRecords = await db('system_edges')
      .whereIn('id', edgeIds)
      .where({ project_id: projectId });

    for (const edgeRec of edgeRecords) {
      edges.push({
        ...edgeRec,
        weight: edgeRec.weight || 1.0,
        bidirectional: edgeRec.bidirectional || false,
        weight_metadata: edgeRec.weight_metadata ? JSON.parse(edgeRec.weight_metadata) : undefined,
        metadata: edgeRec.metadata ? JSON.parse(edgeRec.metadata) : undefined
      });
    }
  }

  // Build steps with cumulative weights
  const steps: GraphPath['steps'] = [];
  let cumulative = 0;

  for (let i = 0; i < nodeIds.length; i++) {
    steps.push({
      nodeId: nodeIds[i],
      edgeId: i < edgeIds.length ? edgeIds[i] : null,
      cumulativeWeight: cumulative
    });

    if (i < edges.length) {
      cumulative += edges[i].weight;
    }
  }

  return {
    nodes,
    edges,
    totalWeight: distances[targetNodeId],
    steps
  };
}

// ============================================================================
// Multi-Path Finding
// ============================================================================

/**
 * Find multiple paths between nodes (K-shortest paths)
 * Returns up to maxPaths distinct paths, sorted by weight
 */
export async function findMultiplePaths(
  startNodeId: string,
  targetNodeId: string,
  projectId: string,
  maxPaths: number = 3,
  options: PathfindingOptions = {}
): Promise<GraphPath[]> {
  // For v1, just return the single shortest path
  // TODO: Implement Yen's K-shortest paths algorithm
  const shortestPath = await findShortestPath(startNodeId, targetNodeId, projectId, options);
  return shortestPath ? [shortestPath] : [];
}

// ============================================================================
// Neighbor Discovery
// ============================================================================

/**
 * Get all neighbors of a node with weights
 * Used by agents to discover next possible steps
 */
export async function getNeighbors(
  nodeId: string,
  projectId: string,
  direction: 'outgoing' | 'incoming' | 'both' = 'outgoing',
  options: PathfindingOptions = {}
): Promise<Array<{
  node: SystemNode;
  edge: SystemEdge;
  weight: number;
}>> {
  try {
    let edgeQuery = db('system_edges')
      .where({ project_id: projectId })
      .whereNull('deleted_at');

    // Apply direction
    if (direction === 'outgoing') {
      edgeQuery = edgeQuery.where({ from_node_id: nodeId });
    } else if (direction === 'incoming') {
      edgeQuery = edgeQuery.where({ to_node_id: nodeId });
    } else {
      edgeQuery = edgeQuery.where(function() {
        this.where({ from_node_id: nodeId }).orWhere({ to_node_id: nodeId });
      });
    }

    // Apply filters
    if (options.allowedRelationTypes && options.allowedRelationTypes.length > 0) {
      edgeQuery = edgeQuery.whereIn('relation_type', options.allowedRelationTypes);
    }

    const edges = await edgeQuery;
    const results: Array<{ node: SystemNode; edge: SystemEdge; weight: number }> = [];

    for (const edgeRec of edges) {
      // Determine neighbor node ID based on direction
      let neighborId: string;
      if (direction === 'outgoing') {
        neighborId = edgeRec.to_node_id;
      } else if (direction === 'incoming') {
        neighborId = edgeRec.from_node_id;
      } else {
        neighborId = edgeRec.from_node_id === nodeId ? edgeRec.to_node_id : edgeRec.from_node_id;
      }

      const node = await getNode(neighborId);
      if (node) {
        // Filter by node type if needed
        if (options.avoidNodeTypes && options.avoidNodeTypes.includes(node.type)) {
          continue;
        }

        results.push({
          node,
          edge: {
            ...edgeRec,
            weight: edgeRec.weight || 1.0,
            bidirectional: edgeRec.bidirectional || false,
            weight_metadata: edgeRec.weight_metadata ? JSON.parse(edgeRec.weight_metadata) : undefined,
            metadata: edgeRec.metadata ? JSON.parse(edgeRec.metadata) : undefined
          },
          weight: edgeRec.weight || 1.0
        });
      }
    }

    // Sort by weight (ascending - lower weight = better)
    results.sort((a, b) => a.weight - b.weight);

    return results;
  } catch (error: any) {
    logger.error('Error getting neighbors:', error);
    throw new Error(`Failed to get neighbors: ${error.message}`);
  }
}

// ============================================================================
// Path Validation
// ============================================================================

/**
 * Score and validate a proposed traversal plan
 * Used to evaluate agent-generated paths before execution
 */
export async function scoreTraversalPlan(
  plan: {
    path: string[]; // Node IDs
    edgeTypes?: RelationType[];
  },
  projectId: string
): Promise<{
  feasible: boolean;
  estimatedCost: number;
  issues: string[];
  alternativePaths?: GraphPath[];
}> {
  try {
    const issues: string[] = [];

    // Validate all nodes exist
    for (const nodeId of plan.path) {
      const node = await getNode(nodeId);
      if (!node) {
        issues.push(`Node ${nodeId} does not exist`);
      }
    }

    // Validate edges exist between consecutive nodes
    let estimatedCost = 0;
    for (let i = 0; i < plan.path.length - 1; i++) {
      const fromId = plan.path[i];
      const toId = plan.path[i + 1];

      const edge = await db('system_edges')
        .where({
          project_id: projectId,
          from_node_id: fromId,
          to_node_id: toId
        })
        .whereNull('deleted_at')
        .first();

      if (!edge) {
        issues.push(`No edge exists from ${fromId} to ${toId}`);
      } else {
        estimatedCost += (edge.weight || 1.0);
      }
    }

    const feasible = issues.length === 0;

    return {
      feasible,
      estimatedCost,
      issues
    };
  } catch (error: any) {
    logger.error('Error scoring traversal plan:', error);
    throw new Error(`Failed to score traversal plan: ${error.message}`);
  }
}
