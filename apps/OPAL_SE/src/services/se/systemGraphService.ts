/**
 * System Graph Service
 * 
 * Core service for managing the systems engineering graph including:
 * - CRUD operations for nodes (artifacts) and edges (relationships)
 * - Graph traversal and querying
 * - Integration with event logging
 */

import { v4 as uuidv4 } from 'uuid';
import db from '../../config/database';
import logger from '../../logger';
import {
  SystemNode,
  SystemEdge,
  NodeFilter,
  EdgeFilter,
  TraversalDirection,
  GraphTraversal,
  SystemNodeRecord,
  SystemEdgeRecord,
  NodeType,
  RelationType,
  ExternalRefs
} from '../../types/se';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert database record to SystemNode
 */
function recordToNode(record: SystemNodeRecord): SystemNode {
  return {
    ...record,
    external_refs: JSON.parse(record.external_refs || '{}'),
    metadata: JSON.parse(record.metadata || '{}')
  };
}

/**
 * Convert SystemNode to database record
 */
function nodeToRecord(node: Partial<SystemNode>): Partial<SystemNodeRecord> {
  const record: any = { ...node };
  if (node.external_refs) {
    record.external_refs = JSON.stringify(node.external_refs);
  }
  if (node.metadata) {
    record.metadata = JSON.stringify(node.metadata);
  }
  return record;
}

/**
 * Convert database record to SystemEdge
 */
function recordToEdge(record: SystemEdgeRecord): SystemEdge {
  return {
    ...record,
    weight: record.weight || 1.0,
    bidirectional: record.bidirectional || false,
    weight_metadata: record.weight_metadata ? JSON.parse(record.weight_metadata) : undefined,
    metadata: record.metadata ? JSON.parse(record.metadata) : undefined
  };
}

/**
 * Convert SystemEdge to database record
 */
function edgeToRecord(edge: Partial<SystemEdge>): Partial<SystemEdgeRecord> {
  const record: any = { ...edge };
  if (edge.weight_metadata) {
    record.weight_metadata = JSON.stringify(edge.weight_metadata);
  }
  if (edge.metadata) {
    record.metadata = JSON.stringify(edge.metadata);
  }
  // Ensure weight has default
  if (record.weight === undefined) {
    record.weight = 1.0;
  }
  if (record.bidirectional === undefined) {
    record.bidirectional = false;
  }
  return record;
}

// ============================================================================
// Node CRUD Operations
// ============================================================================

/**
 * Create a new node in the system graph
 */
export async function createNode(node: Partial<SystemNode>): Promise<SystemNode> {
  try {
    const id = node.id || uuidv4();
    const now = new Date();
    
    const nodeData = nodeToRecord({
      ...node,
      id,
      created_at: now,
      updated_at: now
    });

    const [created] = await db('system_nodes')
      .insert(nodeData)
      .returning('*');

    const result = recordToNode(created);
    logger.info(`Created system node: ${result.id} (type: ${result.type}, project: ${result.project_id})`);
    
    return result;
  } catch (error: any) {
    logger.error('Error creating system node:', error);
    throw new Error(`Failed to create system node: ${error.message}`);
  }
}

/**
 * Update an existing node
 */
export async function updateNode(id: string, updates: Partial<SystemNode>): Promise<SystemNode> {
  try {
    // Check if node exists
    const existing = await getNode(id);
    if (!existing) {
      throw new Error(`Node not found: ${id}`);
    }

    const updateData = nodeToRecord({
      ...updates,
      updated_at: new Date()
    });

    // Remove fields that shouldn't be updated
    delete (updateData as any).id;
    delete (updateData as any).created_at;

    const [updated] = await db('system_nodes')
      .where({ id })
      .update(updateData)
      .returning('*');

    const result = recordToNode(updated);
    logger.info(`Updated system node: ${id}`);
    
    return result;
  } catch (error: any) {
    logger.error(`Error updating system node ${id}:`, error);
    throw new Error(`Failed to update system node: ${error.message}`);
  }
}

/**
 * Get a node by ID
 */
export async function getNode(id: string): Promise<SystemNode | null> {
  try {
    const record = await db('system_nodes')
      .where({ id })
      .first();

    if (!record) {
      return null;
    }

    return recordToNode(record);
  } catch (error: any) {
    logger.error(`Error getting system node ${id}:`, error);
    throw new Error(`Failed to get system node: ${error.message}`);
  }
}

/**
 * Delete a node (and all its edges via CASCADE)
 */
export async function deleteNode(id: string): Promise<boolean> {
  try {
    const deleted = await db('system_nodes')
      .where({ id })
      .del();

    if (deleted > 0) {
      logger.info(`Deleted system node: ${id}`);
      return true;
    }

    return false;
  } catch (error: any) {
    logger.error(`Error deleting system node ${id}:`, error);
    throw new Error(`Failed to delete system node: ${error.message}`);
  }
}

// ============================================================================
// Edge CRUD Operations
// ============================================================================

/**
 * Create a new edge in the system graph
 */
export async function createEdge(edge: Partial<SystemEdge>): Promise<SystemEdge> {
  try {
    const id = edge.id || uuidv4();
    const now = new Date();
    
    const edgeData = edgeToRecord({
      ...edge,
      id,
      created_at: now,
      updated_at: now
    });

    const [created] = await db('system_edges')
      .insert(edgeData)
      .returning('*');

    const result = recordToEdge(created);
    logger.info(`Created system edge: ${result.id} (${result.from_node_id} -> ${result.to_node_id}, type: ${result.relation_type})`);
    
    return result;
  } catch (error: any) {
    logger.error('Error creating system edge:', error);
    throw new Error(`Failed to create system edge: ${error.message}`);
  }
}

/**
 * Update an existing edge
 */
export async function updateEdge(id: string, updates: Partial<SystemEdge>): Promise<SystemEdge> {
  try {
    // Check if edge exists
    const existing = await getEdge(id);
    if (!existing) {
      throw new Error(`Edge not found: ${id}`);
    }

    const updateData = edgeToRecord({
      ...updates,
      updated_at: new Date()
    });

    // Remove fields that shouldn't be updated
    delete (updateData as any).id;
    delete (updateData as any).created_at;

    const [updated] = await db('system_edges')
      .where({ id })
      .update(updateData)
      .returning('*');

    const result = recordToEdge(updated);
    logger.info(`Updated system edge: ${id}`);
    
    return result;
  } catch (error: any) {
    logger.error(`Error updating system edge ${id}:`, error);
    throw new Error(`Failed to update system edge: ${error.message}`);
  }
}

/**
 * Get an edge by ID
 */
export async function getEdge(id: string): Promise<SystemEdge | null> {
  try {
    const record = await db('system_edges')
      .where({ id })
      .first();

    if (!record) {
      return null;
    }

    return recordToEdge(record);
  } catch (error: any) {
    logger.error(`Error getting system edge ${id}:`, error);
    throw new Error(`Failed to get system edge: ${error.message}`);
  }
}

/**
 * Delete an edge
 */
export async function deleteEdge(id: string): Promise<boolean> {
  try {
    const deleted = await db('system_edges')
      .where({ id })
      .del();

    if (deleted > 0) {
      logger.info(`Deleted system edge: ${id}`);
      return true;
    }

    return false;
  } catch (error: any) {
    logger.error(`Error deleting system edge ${id}:`, error);
    throw new Error(`Failed to delete system edge: ${error.message}`);
  }
}

// ============================================================================
// Query & Filter Operations
// ============================================================================

/**
 * Query nodes by filter criteria
 */
export async function getNodesByFilter(filters: NodeFilter): Promise<SystemNode[]> {
  try {
    let query = db('system_nodes').select('*');

    // Apply filters
    if (filters.project_id) {
      query = query.where('project_id', filters.project_id);
    }

    if (filters.type) {
      if (Array.isArray(filters.type)) {
        query = query.whereIn('type', filters.type);
      } else {
        query = query.where('type', filters.type);
      }
    }

    if (filters.subsystem) {
      if (Array.isArray(filters.subsystem)) {
        query = query.whereIn('subsystem', filters.subsystem);
      } else {
        query = query.where('subsystem', filters.subsystem);
      }
    }

    if (filters.status) {
      if (Array.isArray(filters.status)) {
        query = query.whereIn('status', filters.status);
      } else {
        query = query.where('status', filters.status);
      }
    }

    if (filters.ids && filters.ids.length > 0) {
      query = query.whereIn('id', filters.ids);
    }

    if (filters.owner) {
      query = query.where('owner', filters.owner);
    }

    // Apply pagination
    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    if (filters.offset) {
      query = query.offset(filters.offset);
    }

    const records = await query;
    return records.map(recordToNode);
  } catch (error: any) {
    logger.error('Error querying system nodes:', error);
    throw new Error(`Failed to query system nodes: ${error.message}`);
  }
}

/**
 * Query edges by filter criteria
 */
export async function getEdgesByFilter(filters: EdgeFilter): Promise<SystemEdge[]> {
  try {
    let query = db('system_edges').select('*');

    // Apply filters
    if (filters.project_id) {
      query = query.where('project_id', filters.project_id);
    }

    if (filters.from_node_id) {
      if (Array.isArray(filters.from_node_id)) {
        query = query.whereIn('from_node_id', filters.from_node_id);
      } else {
        query = query.where('from_node_id', filters.from_node_id);
      }
    }

    if (filters.to_node_id) {
      if (Array.isArray(filters.to_node_id)) {
        query = query.whereIn('to_node_id', filters.to_node_id);
      } else {
        query = query.where('to_node_id', filters.to_node_id);
      }
    }

    if (filters.relation_type) {
      if (Array.isArray(filters.relation_type)) {
        query = query.whereIn('relation_type', filters.relation_type);
      } else {
        query = query.where('relation_type', filters.relation_type);
      }
    }

    if (filters.source_system) {
      if (Array.isArray(filters.source_system)) {
        query = query.whereIn('source_system', filters.source_system);
      } else {
        query = query.where('source_system', filters.source_system);
      }
    }

    // Apply pagination
    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    if (filters.offset) {
      query = query.offset(filters.offset);
    }

    const records = await query;
    return records.map(recordToEdge);
  } catch (error: any) {
    logger.error('Error querying system edges:', error);
    throw new Error(`Failed to query system edges: ${error.message}`);
  }
}

// ============================================================================
// Graph Traversal Operations
// ============================================================================

/**
 * Get neighboring nodes via graph traversal
 */
export async function getNeighbors(
  nodeIds: string[],
  relationTypes: RelationType[],
  direction: TraversalDirection = 'both',
  depth: number = 1
): Promise<GraphTraversal> {
  try {
    const visited = new Set<string>(nodeIds);
    const allNodes: SystemNode[] = [];
    const allEdges: SystemEdge[] = [];
    let currentLevel = nodeIds;

    for (let level = 0; level < depth; level++) {
      if (currentLevel.length === 0) break;

      // Build edge query based on direction
      let edgeQuery = db('system_edges').select('*');

      if (direction === 'outgoing') {
        edgeQuery = edgeQuery.whereIn('from_node_id', currentLevel);
      } else if (direction === 'incoming') {
        edgeQuery = edgeQuery.whereIn('to_node_id', currentLevel);
      } else {
        // both directions
        edgeQuery = edgeQuery.where(function() {
          this.whereIn('from_node_id', currentLevel)
            .orWhereIn('to_node_id', currentLevel);
        });
      }

      // Filter by relation types
      if (relationTypes.length > 0) {
        edgeQuery = edgeQuery.whereIn('relation_type', relationTypes);
      }

      const edges = await edgeQuery;
      const edgeResults = edges.map(recordToEdge);

      // Collect neighbor node IDs
      const neighborIds = new Set<string>();
      for (const edge of edgeResults) {
        allEdges.push(edge);

        // Add neighbors based on direction
        if (direction === 'outgoing' && !visited.has(edge.to_node_id)) {
          neighborIds.add(edge.to_node_id);
          visited.add(edge.to_node_id);
        } else if (direction === 'incoming' && !visited.has(edge.from_node_id)) {
          neighborIds.add(edge.from_node_id);
          visited.add(edge.from_node_id);
        } else if (direction === 'both') {
          if (!visited.has(edge.to_node_id)) {
            neighborIds.add(edge.to_node_id);
            visited.add(edge.to_node_id);
          }
          if (!visited.has(edge.from_node_id)) {
            neighborIds.add(edge.from_node_id);
            visited.add(edge.from_node_id);
          }
        }
      }

      // Fetch neighbor nodes
      if (neighborIds.size > 0) {
        const nodes = await getNodesByFilter({ ids: Array.from(neighborIds) });
        allNodes.push(...nodes);
      }

      // Prepare for next level
      currentLevel = Array.from(neighborIds);
    }

    logger.info(`Graph traversal completed: ${allNodes.length} nodes, ${allEdges.length} edges`);

    return {
      nodes: allNodes,
      edges: allEdges
    };
  } catch (error: any) {
    logger.error('Error in graph traversal:', error);
    throw new Error(`Failed to traverse graph: ${error.message}`);
  }
}

/**
 * Get node count by type for a project
 */
export async function getNodeCountsByType(project_id: string): Promise<Record<NodeType, number>> {
  try {
    const counts = await db('system_nodes')
      .where({ project_id })
      .select('type')
      .count('* as count')
      .groupBy('type');

    const result: any = {};
    for (const row of counts) {
      result[row.type] = parseInt(row.count as string);
    }

    return result;
  } catch (error: any) {
    logger.error('Error getting node counts:', error);
    throw new Error(`Failed to get node counts: ${error.message}`);
  }
}

/**
 * Get edge count by relation type for a project
 */
export async function getEdgeCountsByType(project_id: string): Promise<Record<RelationType, number>> {
  try {
    const counts = await db('system_edges')
      .where({ project_id })
      .select('relation_type')
      .count('* as count')
      .groupBy('relation_type');

    const result: any = {};
    for (const row of counts) {
      result[row.relation_type] = parseInt(row.count as string);
    }

    return result;
  } catch (error: any) {
    logger.error('Error getting edge counts:', error);
    throw new Error(`Failed to get edge counts: ${error.message}`);
  }
}

/**
 * Get total node and edge counts for a project
 */
export async function getGraphStats(project_id: string): Promise<{
  total_nodes: number;
  total_edges: number;
  nodes_by_type: Record<NodeType, number>;
  edges_by_type: Record<RelationType, number>;
}> {
  try {
    const [nodeCount] = await db('system_nodes')
      .where({ project_id })
      .count('* as count');

    const [edgeCount] = await db('system_edges')
      .where({ project_id })
      .count('* as count');

    const nodesByType = await getNodeCountsByType(project_id);
    const edgesByType = await getEdgeCountsByType(project_id);

    return {
      total_nodes: parseInt(nodeCount.count as string),
      total_edges: parseInt(edgeCount.count as string),
      nodes_by_type: nodesByType,
      edges_by_type: edgesByType
    };
  } catch (error: any) {
    logger.error('Error getting graph stats:', error);
    throw new Error(`Failed to get graph stats: ${error.message}`);
  }
}
