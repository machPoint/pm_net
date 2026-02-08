/**
 * Handler for getSystemSlice tool
 * 
 * Returns a slice of the system block model from the OPAL graph
 */

import {
  GetSystemSliceInput,
  GetSystemSliceOutput,
  SystemSlice,
  Node,
  Edge,
  validateInput
} from './schema';

/**
 * Main handler function
 */
export async function getSystemSlice(input: GetSystemSliceInput): Promise<GetSystemSliceOutput> {
  // Validate input
  const validation = validateInput(input);
  if (!validation.valid) {
    throw new Error(`Invalid input: ${validation.error}`);
  }

  const { entityIds, radius = 1, includeTypes } = input;

  console.log(`[getSystemSlice] Getting slice for entities: ${entityIds.join(', ')}, radius: ${radius}`);

  try {
    // Get slice from graph
    const slice = await getSliceFromGraph(entityIds, radius, includeTypes);

    // Generate summary
    const summary = generateSummary(slice, entityIds, radius);

    console.log(`[getSystemSlice] Found ${slice.nodes.length} nodes and ${slice.edges.length} edges`);

    return {
      slice,
      summary
    };
  } catch (error) {
    console.error('[getSystemSlice] Error:', error);
    throw error;
  }
}

/**
 * Get slice from OPAL graph
 */
async function getSliceFromGraph(
  entityIds: string[],
  radius: number,
  includeTypes?: string[]
): Promise<SystemSlice> {
  // TODO: Implement actual graph traversal
  // For now, return mock data based on system model builder output
  
  return getMockSystemSlice(entityIds, radius, includeTypes);
}

/**
 * Generate human-readable summary
 */
function generateSummary(slice: SystemSlice, entityIds: string[], radius: number): string {
  const nodeCount = slice.nodes.length;
  const edgeCount = slice.edges.length;
  const startingPoints = entityIds.join(', ');

  if (nodeCount === 0) {
    return `No nodes found starting from ${startingPoints}`;
  }

  const nodeTypes = new Set(slice.nodes.map(n => n.type));
  const typesSummary = Array.from(nodeTypes).join(', ');

  return `Found ${nodeCount} nodes (${typesSummary}) and ${edgeCount} edges around ${startingPoints} with radius ${radius}`;
}

/**
 * Get mock system slice for testing
 */
function getMockSystemSlice(
  entityIds: string[],
  radius: number,
  includeTypes?: string[]
): SystemSlice {
  // Mock system model based on builder output
  const allNodes: Node[] = [
    {
      id: 'SYS-1',
      label: 'Agent Platform',
      type: 'system',
      metadata: {
        discipline: 'Platform Engineering',
        created_at: new Date().toISOString()
      }
    },
    {
      id: 'DOM-ingestion',
      label: 'Data Ingestion',
      type: 'domain',
      metadata: {}
    },
    {
      id: 'DOM-orchestration',
      label: 'Orchestration',
      type: 'domain',
      metadata: {}
    },
    {
      id: 'DOM-monitoring',
      label: 'Monitoring',
      type: 'domain',
      metadata: {}
    },
    {
      id: 'DOM-scheduling',
      label: 'Scheduling',
      type: 'domain',
      metadata: {}
    },
    {
      id: 'DOM-governance',
      label: 'Governance',
      type: 'domain',
      metadata: {}
    },
    {
      id: 'DOM-messaging',
      label: 'Messaging',
      type: 'domain',
      metadata: {}
    },
    {
      id: 'DOM-storage',
      label: 'Storage',
      type: 'domain',
      metadata: {}
    },
    {
      id: 'DOM-api-gateway',
      label: 'API Gateway',
      type: 'domain',
      metadata: {}
    },
    {
      id: 'DOM-security',
      label: 'Security',
      type: 'domain',
      metadata: {}
    },
    {
      id: 'DOM-reporting',
      label: 'Reporting',
      type: 'domain',
      metadata: {}
    },
    {
      id: 'AGT-ingestion-worker',
      label: 'Ingestion Worker',
      type: 'agent',
      metadata: { domain: 'Data Ingestion' }
    },
    {
      id: 'AGT-orchestration-scheduler',
      label: 'Task Scheduler',
      type: 'agent',
      metadata: { domain: 'Orchestration' }
    },
    {
      id: 'AGT-orchestration-router',
      label: 'Task Router',
      type: 'agent',
      metadata: { domain: 'Orchestration' }
    },
    {
      id: 'AGT-monitoring-health',
      label: 'Health Monitor',
      type: 'agent',
      metadata: { domain: 'Monitoring' }
    },
    {
      id: 'AGT-governance-auditor',
      label: 'Audit Agent',
      type: 'agent',
      metadata: { domain: 'Governance' }
    },
    {
      id: 'AGT-governance-policy',
      label: 'Policy Enforcer',
      type: 'agent',
      metadata: { domain: 'Governance' }
    },
    {
      id: 'AGT-reporting-generator',
      label: 'Report Generator',
      type: 'agent',
      metadata: { domain: 'Reporting' }
    },
    {
      id: 'TASK-001',
      label: 'Pipeline Throughput SLA',
      type: 'task',
      metadata: { task_type: 'functional' }
    },
    {
      id: 'TASK-002',
      label: 'Agent Health Check Interval',
      type: 'task',
      metadata: { task_type: 'performance' }
    }
  ];

  const allEdges: Edge[] = [
    // CONTAINS edges from system to domains
    { id: 'e1', from: 'SYS-1', to: 'DOM-ingestion', relation: 'CONTAINS', metadata: {} },
    { id: 'e2', from: 'SYS-1', to: 'DOM-orchestration', relation: 'CONTAINS', metadata: {} },
    { id: 'e3', from: 'SYS-1', to: 'DOM-monitoring', relation: 'CONTAINS', metadata: {} },
    { id: 'e4', from: 'SYS-1', to: 'DOM-scheduling', relation: 'CONTAINS', metadata: {} },
    { id: 'e5', from: 'SYS-1', to: 'DOM-governance', relation: 'CONTAINS', metadata: {} },
    { id: 'e6', from: 'SYS-1', to: 'DOM-messaging', relation: 'CONTAINS', metadata: {} },
    { id: 'e7', from: 'SYS-1', to: 'DOM-storage', relation: 'CONTAINS', metadata: {} },
    { id: 'e8', from: 'SYS-1', to: 'DOM-api-gateway', relation: 'CONTAINS', metadata: {} },
    { id: 'e9', from: 'SYS-1', to: 'DOM-security', relation: 'CONTAINS', metadata: {} },
    { id: 'e10', from: 'SYS-1', to: 'DOM-reporting', relation: 'CONTAINS', metadata: {} },
    
    // CONTAINS edges from domains to agents
    { id: 'e11', from: 'DOM-ingestion', to: 'AGT-ingestion-worker', relation: 'CONTAINS', metadata: {} },
    { id: 'e12', from: 'DOM-orchestration', to: 'AGT-orchestration-scheduler', relation: 'CONTAINS', metadata: {} },
    { id: 'e13', from: 'DOM-orchestration', to: 'AGT-orchestration-router', relation: 'CONTAINS', metadata: {} },
    { id: 'e14', from: 'DOM-monitoring', to: 'AGT-monitoring-health', relation: 'CONTAINS', metadata: {} },
    { id: 'e15', from: 'DOM-governance', to: 'AGT-governance-auditor', relation: 'CONTAINS', metadata: {} },
    { id: 'e16', from: 'DOM-governance', to: 'AGT-governance-policy', relation: 'CONTAINS', metadata: {} },
    { id: 'e17', from: 'DOM-reporting', to: 'AGT-reporting-generator', relation: 'CONTAINS', metadata: {} },
    
    // SATISFIES edges from agents to tasks
    { id: 'e18', from: 'AGT-ingestion-worker', to: 'TASK-001', relation: 'SATISFIES', metadata: {} },
    { id: 'e19', from: 'AGT-monitoring-health', to: 'TASK-002', relation: 'SATISFIES', metadata: {} },
    
    // INTERFACES edges between domains
    { id: 'e20', from: 'DOM-orchestration', to: 'DOM-ingestion', relation: 'INTERFACES', metadata: { supporting_tasks: ['TASK-001'] } },
    { id: 'e21', from: 'DOM-monitoring', to: 'DOM-ingestion', relation: 'INTERFACES', metadata: { supporting_tasks: [] } }
  ];

  // Simple traversal: start from entityIds and include nodes within radius
  const includedNodeIds = new Set<string>(entityIds);
  const includedEdges: Edge[] = [];

  // Traverse outward from starting nodes
  for (let i = 0; i <= radius; i++) {
    const currentNodes = Array.from(includedNodeIds);
    for (const nodeId of currentNodes) {
      // Find edges from this node
      for (const edge of allEdges) {
        if (edge.from === nodeId) {
          includedNodeIds.add(edge.to);
          if (!includedEdges.find(e => e.id === edge.id)) {
            includedEdges.push(edge);
          }
        }
        // Also include edges TO this node for complete picture
        if (edge.to === nodeId) {
          includedNodeIds.add(edge.from);
          if (!includedEdges.find(e => e.id === edge.id)) {
            includedEdges.push(edge);
          }
        }
      }
    }
  }

  // Filter nodes
  let nodes = allNodes.filter(n => includedNodeIds.has(n.id));
  
  // Apply type filter if specified
  if (includeTypes && includeTypes.length > 0) {
    nodes = nodes.filter(n => includeTypes.includes(n.type));
    // Also filter edges to only include those between included nodes
    const includedIds = new Set(nodes.map(n => n.id));
    return {
      nodes,
      edges: includedEdges.filter(e => includedIds.has(e.from) && includedIds.has(e.to))
    };
  }

  return {
    nodes,
    edges: includedEdges
  };
}
