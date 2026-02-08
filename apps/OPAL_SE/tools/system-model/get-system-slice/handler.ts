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
      label: 'Aerospace System',
      type: 'system',
      metadata: {
        discipline: 'Systems Engineering',
        created_at: new Date().toISOString()
      }
    },
    {
      id: 'SS-flight-control',
      label: 'Flight Control',
      type: 'subsystem',
      metadata: {}
    },
    {
      id: 'SS-avionics',
      label: 'Avionics',
      type: 'subsystem',
      metadata: {}
    },
    {
      id: 'SS-propulsion',
      label: 'Propulsion',
      type: 'subsystem',
      metadata: {}
    },
    {
      id: 'SS-landing-gear',
      label: 'Landing Gear',
      type: 'subsystem',
      metadata: {}
    },
    {
      id: 'SS-eclss',
      label: 'ECLSS',
      type: 'subsystem',
      metadata: {}
    },
    {
      id: 'SS-communication',
      label: 'Communication',
      type: 'subsystem',
      metadata: {}
    },
    {
      id: 'SS-hydraulics',
      label: 'Hydraulics',
      type: 'subsystem',
      metadata: {}
    },
    {
      id: 'SS-fuel-system',
      label: 'Fuel System',
      type: 'subsystem',
      metadata: {}
    },
    {
      id: 'SS-safety-systems',
      label: 'Safety Systems',
      type: 'subsystem',
      metadata: {}
    },
    {
      id: 'SS-electrical',
      label: 'Electrical',
      type: 'subsystem',
      metadata: {}
    },
    {
      id: 'COMP-flight-control-autopilot',
      label: 'Autopilot',
      type: 'component',
      metadata: { subsystem: 'Flight Control' }
    },
    {
      id: 'COMP-avionics-gps-receiver',
      label: 'GPS Receiver',
      type: 'component',
      metadata: { subsystem: 'Avionics' }
    },
    {
      id: 'COMP-avionics-fms',
      label: 'FMS',
      type: 'component',
      metadata: { subsystem: 'Avionics' }
    },
    {
      id: 'COMP-avionics-weather-radar',
      label: 'Weather Radar',
      type: 'component',
      metadata: { subsystem: 'Avionics' }
    },
    {
      id: 'COMP-propulsion-ecu',
      label: 'ECU',
      type: 'component',
      metadata: { subsystem: 'Propulsion' }
    },
    {
      id: 'COMP-eclss-pressure-controller',
      label: 'Pressure Controller',
      type: 'component',
      metadata: { subsystem: 'ECLSS' }
    },
    {
      id: 'COMP-eclss-oxygen-system',
      label: 'Oxygen System',
      type: 'component',
      metadata: { subsystem: 'ECLSS' }
    },
    {
      id: 'REQ-001',
      label: 'Flight Control Stability',
      type: 'requirement',
      metadata: { req_type: 'functional' }
    },
    {
      id: 'REQ-002',
      label: 'GPS Navigation Accuracy',
      type: 'requirement',
      metadata: { req_type: 'performance' }
    }
  ];

  const allEdges: Edge[] = [
    // CONTAINS edges from system to subsystems
    { id: 'e1', from: 'SYS-1', to: 'SS-flight-control', relation: 'CONTAINS', metadata: {} },
    { id: 'e2', from: 'SYS-1', to: 'SS-avionics', relation: 'CONTAINS', metadata: {} },
    { id: 'e3', from: 'SYS-1', to: 'SS-propulsion', relation: 'CONTAINS', metadata: {} },
    { id: 'e4', from: 'SYS-1', to: 'SS-landing-gear', relation: 'CONTAINS', metadata: {} },
    { id: 'e5', from: 'SYS-1', to: 'SS-eclss', relation: 'CONTAINS', metadata: {} },
    { id: 'e6', from: 'SYS-1', to: 'SS-communication', relation: 'CONTAINS', metadata: {} },
    { id: 'e7', from: 'SYS-1', to: 'SS-hydraulics', relation: 'CONTAINS', metadata: {} },
    { id: 'e8', from: 'SYS-1', to: 'SS-fuel-system', relation: 'CONTAINS', metadata: {} },
    { id: 'e9', from: 'SYS-1', to: 'SS-safety-systems', relation: 'CONTAINS', metadata: {} },
    { id: 'e10', from: 'SYS-1', to: 'SS-electrical', relation: 'CONTAINS', metadata: {} },
    
    // CONTAINS edges from subsystems to components
    { id: 'e11', from: 'SS-flight-control', to: 'COMP-flight-control-autopilot', relation: 'CONTAINS', metadata: {} },
    { id: 'e12', from: 'SS-avionics', to: 'COMP-avionics-gps-receiver', relation: 'CONTAINS', metadata: {} },
    { id: 'e13', from: 'SS-avionics', to: 'COMP-avionics-fms', relation: 'CONTAINS', metadata: {} },
    { id: 'e14', from: 'SS-avionics', to: 'COMP-avionics-weather-radar', relation: 'CONTAINS', metadata: {} },
    { id: 'e15', from: 'SS-propulsion', to: 'COMP-propulsion-ecu', relation: 'CONTAINS', metadata: {} },
    { id: 'e16', from: 'SS-eclss', to: 'COMP-eclss-pressure-controller', relation: 'CONTAINS', metadata: {} },
    { id: 'e17', from: 'SS-eclss', to: 'COMP-eclss-oxygen-system', relation: 'CONTAINS', metadata: {} },
    
    // SATISFIES edges from components to requirements
    { id: 'e18', from: 'COMP-flight-control-autopilot', to: 'REQ-001', relation: 'SATISFIES', metadata: {} },
    { id: 'e19', from: 'COMP-avionics-gps-receiver', to: 'REQ-002', relation: 'SATISFIES', metadata: {} },
    
    // INTERFACES edges between subsystems (example)
    { id: 'e20', from: 'SS-avionics', to: 'SS-flight-control', relation: 'INTERFACES', metadata: { supporting_requirements: ['REQ-001'] } },
    { id: 'e21', from: 'SS-propulsion', to: 'SS-flight-control', relation: 'INTERFACES', metadata: { supporting_requirements: [] } }
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
