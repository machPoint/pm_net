/**
 * Agent Graph Navigation Tools
 *
 * MCP tools that expose the weighted graph to autonomous agents.
 * These tools enable agents to discover, plan, and validate graph traversals.
 */

import { findShortestPath, getNeighbors, scoreTraversalPlan } from './pathfindingService';
import { getNode, getNodesByFilter } from './systemGraphService';
import logger from '../../logger';
import { RelationType } from '../../types/se';

// ============================================================================
// Agent Navigation Tools
// ============================================================================

/**
 * Find optimal path between two nodes
 * Used by agents to plan traversal routes
 */
export const findOptimalPath = {
  name: 'findOptimalPath',
  description: 'Find the optimal (lowest weight) path between two nodes in the graph. Returns a sequence of nodes and edges that agents can traverse.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      project_id: {
        type: 'string',
        description: 'Project ID containing the nodes'
      },
      start_node_id: {
        type: 'string',
        description: 'Starting node ID'
      },
      target_node_id: {
        type: 'string',
        description: 'Target/goal node ID'
      },
      allowed_relation_types: {
        type: 'array',
        items: { type: 'string' },
        description: 'Optional: Only traverse these edge types (e.g., ["TRACES_TO", "VERIFIED_BY"])'
      },
      max_weight: {
        type: 'number',
        description: 'Optional: Maximum cumulative weight threshold'
      },
      max_depth: {
        type: 'number',
        description: 'Optional: Maximum number of hops'
      }
    },
    required: ['project_id', 'start_node_id', 'target_node_id']
  },
  handler: async (args: any) => {
    try {
      const { project_id, start_node_id, target_node_id, allowed_relation_types, max_weight, max_depth } = args;

      const path = await findShortestPath(
        start_node_id,
        target_node_id,
        project_id,
        {
          allowedRelationTypes: allowed_relation_types,
          maxWeight: max_weight,
          maxDepth: max_depth
        }
      );

      if (!path) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              found: false,
              message: 'No path found between the specified nodes'
            }, null, 2)
          }]
        };
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            found: true,
            path: {
              node_ids: path.nodes.map(n => n.id),
              node_titles: path.nodes.map(n => n.name),
              edge_ids: path.edges.map(e => e.id),
              total_weight: path.totalWeight,
              steps: path.steps
            },
            details: {
              nodes: path.nodes,
              edges: path.edges
            }
          }, null, 2)
        }]
      };
    } catch (error: any) {
      logger.error('Error in findOptimalPath:', error);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ error: error.message }, null, 2)
        }]
      };
    }
  }
};

/**
 * Get traversable edges from current node
 * Helps agents discover next possible steps
 */
export const getTraversableEdges = {
  name: 'getTraversableEdges',
  description: 'Get all edges that an agent can traverse from a given node. Returns neighbors sorted by weight (lowest first = easiest to traverse).',
  inputSchema: {
    type: 'object' as const,
    properties: {
      project_id: {
        type: 'string',
        description: 'Project ID'
      },
      node_id: {
        type: 'string',
        description: 'Current node ID'
      },
      direction: {
        type: 'string',
        enum: ['outgoing', 'incoming', 'both'],
        description: 'Traversal direction (default: outgoing)'
      },
      allowed_relation_types: {
        type: 'array',
        items: { type: 'string' },
        description: 'Optional: Filter to these edge types'
      }
    },
    required: ['project_id', 'node_id']
  },
  handler: async (args: any) => {
    try {
      const { project_id, node_id, direction, allowed_relation_types } = args;

      const neighbors = await getNeighbors(
        node_id,
        project_id,
        direction || 'outgoing',
        { allowedRelationTypes: allowed_relation_types }
      );

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            current_node: node_id,
            neighbor_count: neighbors.length,
            neighbors: neighbors.map(n => ({
              node_id: n.node.id,
              node_type: n.node.type,
              node_title: n.node.name,
              edge_id: n.edge.id,
              edge_type: n.edge.relation_type,
              weight: n.weight,
              bidirectional: n.edge.bidirectional
            }))
          }, null, 2)
        }]
      };
    } catch (error: any) {
      logger.error('Error in getTraversableEdges:', error);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ error: error.message }, null, 2)
        }]
      };
    }
  }
};

/**
 * Evaluate a proposed traversal path
 * Validates agent-generated plans before execution
 */
export const evaluatePathPlan = {
  name: 'evaluatePathPlan',
  description: 'Validate and score a proposed traversal plan. Checks if all edges exist and calculates estimated cost.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      project_id: {
        type: 'string',
        description: 'Project ID'
      },
      path: {
        type: 'array',
        items: { type: 'string' },
        description: 'Sequence of node IDs to traverse'
      }
    },
    required: ['project_id', 'path']
  },
  handler: async (args: any) => {
    try {
      const { project_id, path } = args;

      const result = await scoreTraversalPlan(
        { path },
        project_id
      );

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            feasible: result.feasible,
            estimated_cost: result.estimatedCost,
            issues: result.issues,
            path_length: path.length
          }, null, 2)
        }]
      };
    } catch (error: any) {
      logger.error('Error in evaluatePathPlan:', error);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ error: error.message }, null, 2)
        }]
      };
    }
  }
};

/**
 * Get node details for agent context
 * Provides full node information for decision making
 */
export const getNodeContext = {
  name: 'getNodeContext',
  description: 'Get detailed information about a node including its metadata, connections, and graph position.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      node_id: {
        type: 'string',
        description: 'Node ID to get context for'
      },
      include_neighbors: {
        type: 'boolean',
        description: 'Include immediate neighbors in context (default: true)'
      }
    },
    required: ['node_id']
  },
  handler: async (args: any) => {
    try {
      const { node_id, include_neighbors } = args;

      const node = await getNode(node_id);
      if (!node) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ error: 'Node not found' }, null, 2)
          }]
        };
      }

      let neighbors = null;
      if (include_neighbors !== false) {
        neighbors = await getNeighbors(node_id, node.project_id, 'both');
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            node: {
              id: node.id,
              type: node.type,
              name: node.name,
              description: node.description,
              status: node.status,
              subsystem: node.subsystem,
              owner: node.owner,
              metadata: node.metadata,
              external_refs: node.external_refs
            },
            graph_context: neighbors ? {
              outgoing_count: neighbors.filter(n => n.edge.from_node_id === node_id).length,
              incoming_count: neighbors.filter(n => n.edge.to_node_id === node_id).length,
              total_weight: neighbors.reduce((sum, n) => sum + n.weight, 0)
            } : null,
            neighbors: neighbors ? neighbors.map(n => ({
              node_id: n.node.id,
              node_type: n.node.type,
              node_title: n.node.name,
              edge_type: n.edge.relation_type,
              weight: n.weight
            })) : null
          }, null, 2)
        }]
      };
    } catch (error: any) {
      logger.error('Error in getNodeContext:', error);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ error: error.message }, null, 2)
        }]
      };
    }
  }
};

/**
 * Find nodes by type for agent task discovery
 * Helps agents find relevant work items
 */
export const findNodesByType = {
  name: 'findNodesByType',
  description: 'Find nodes of specific types in the graph. Useful for discovering requirements, tests, tasks, etc.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      project_id: {
        type: 'string',
        description: 'Project ID'
      },
      node_types: {
        type: 'array',
        items: { type: 'string' },
        description: 'Node types to find (e.g., ["Requirement", "Test", "Task"])'
      },
      status: {
        type: 'array',
        items: { type: 'string' },
        description: 'Optional: Filter by status'
      },
      subsystem: {
        type: 'string',
        description: 'Optional: Filter by subsystem'
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results (default: 50)'
      }
    },
    required: ['project_id', 'node_types']
  },
  handler: async (args: any) => {
    try {
      const { project_id, node_types, status, subsystem, limit } = args;

      const nodes = await getNodesByFilter({
        project_id,
        type: node_types,
        status,
        subsystem,
        limit: limit || 50
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            count: nodes.length,
            nodes: nodes.map(n => ({
              id: n.id,
              type: n.type,
              name: n.name,
              status: n.status,
              subsystem: n.subsystem,
              owner: n.owner
            }))
          }, null, 2)
        }]
      };
    } catch (error: any) {
      logger.error('Error in findNodesByType:', error);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ error: error.message }, null, 2)
        }]
      };
    }
  }
};
