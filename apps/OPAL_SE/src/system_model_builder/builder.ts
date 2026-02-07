/**
 * System Model Builder
 * 
 * Derives a block model (system, subsystems, components, interfaces) from requirements
 * and stores it in the OPAL graph.
 */

interface Requirement {
  id: string;
  name: string;
  text: string;
  type: string;
  subsystem?: string;
  component?: string;
  parent_id?: string;
  tags?: string[];
  metadata?: any;
}

interface Block {
  id: string;
  name: string;
  block_type: 'system' | 'subsystem' | 'component' | 'external';
  metadata?: any;
}

interface BuilderOptions {
  rebuild?: boolean;
  systemName?: string;
}

interface BuildStats {
  systemBlocks: number;
  subsystemBlocks: number;
  componentBlocks: number;
  containsEdges: number;
  satisfiesEdges: number;
  interfacesEdges: number;
  requirementsProcessed: number;
}

/**
 * Build system model from requirements
 */
export async function buildSystemModelFromRequirements(
  options: BuilderOptions = {}
): Promise<BuildStats> {
  const { rebuild = false, systemName = 'Aerospace System' } = options;

  console.log('[System Model Builder] Starting build...');
  console.log(`[System Model Builder] Rebuild mode: ${rebuild}`);

  const stats: BuildStats = {
    systemBlocks: 0,
    subsystemBlocks: 0,
    componentBlocks: 0,
    containsEdges: 0,
    satisfiesEdges: 0,
    interfacesEdges: 0,
    requirementsProcessed: 0
  };

  try {
    // Step 1: Clear existing blocks if rebuild
    if (rebuild) {
      await clearExistingBlocks();
      console.log('[System Model Builder] Cleared existing blocks');
    }

    // Step 2: Load requirements
    const requirements = await loadRequirements();
    console.log(`[System Model Builder] Loaded ${requirements.length} requirements`);
    stats.requirementsProcessed = requirements.length;

    // Step 3: Create system block
    const systemBlock = await createSystemBlock(systemName);
    stats.systemBlocks = 1;
    console.log(`[System Model Builder] Created system block: ${systemBlock.id}`);

    // Step 4: Create subsystem blocks
    const subsystems = extractUniqueSubsystems(requirements);
    const subsystemBlocks: Map<string, Block> = new Map();
    
    for (const subsystemName of subsystems) {
      const block = await createSubsystemBlock(subsystemName);
      subsystemBlocks.set(subsystemName, block);
      stats.subsystemBlocks++;
      
      // Create CONTAINS edge from system to subsystem
      await createContainsEdge(systemBlock.id, block.id);
      stats.containsEdges++;
    }
    console.log(`[System Model Builder] Created ${stats.subsystemBlocks} subsystem blocks`);

    // Step 5: Create component blocks (if component field exists)
    const componentBlocks: Map<string, Block> = new Map();
    const components = extractUniqueComponents(requirements);
    
    for (const [subsystemName, componentName] of components) {
      const subsystemBlock = subsystemBlocks.get(subsystemName);
      if (!subsystemBlock) continue;

      const componentKey = `${subsystemName}::${componentName}`;
      const block = await createComponentBlock(componentName, subsystemName);
      componentBlocks.set(componentKey, block);
      stats.componentBlocks++;
      
      // Create CONTAINS edge from subsystem to component
      await createContainsEdge(subsystemBlock.id, block.id);
      stats.containsEdges++;
    }
    console.log(`[System Model Builder] Created ${stats.componentBlocks} component blocks`);

    // Step 6: Link blocks to requirements via SATISFIES
    for (const req of requirements) {
      // Ensure requirement node exists
      await ensureRequirementNode(req);

      // Find owner block
      let ownerBlockId: string;
      
      if (req.component) {
        const componentKey = `${req.subsystem}::${req.component}`;
        const componentBlock = componentBlocks.get(componentKey);
        if (componentBlock) {
          ownerBlockId = componentBlock.id;
        } else if (req.subsystem) {
          const subsystemBlock = subsystemBlocks.get(req.subsystem);
          ownerBlockId = subsystemBlock ? subsystemBlock.id : systemBlock.id;
        } else {
          ownerBlockId = systemBlock.id;
        }
      } else if (req.subsystem) {
        const subsystemBlock = subsystemBlocks.get(req.subsystem);
        ownerBlockId = subsystemBlock ? subsystemBlock.id : systemBlock.id;
      } else {
        ownerBlockId = systemBlock.id;
      }

      // Create SATISFIES edge
      await createSatisfiesEdge(ownerBlockId, req.id);
      stats.satisfiesEdges++;
    }
    console.log(`[System Model Builder] Created ${stats.satisfiesEdges} SATISFIES edges`);

    // Step 7: Create interface edges (simple version for v0.1)
    const interfaceEdges = await createInterfaceEdges(requirements, subsystemBlocks);
    stats.interfacesEdges = interfaceEdges;
    console.log(`[System Model Builder] Created ${stats.interfacesEdges} INTERFACES edges`);

    console.log('[System Model Builder] Build complete!');
    console.log('[System Model Builder] Stats:', stats);

    return stats;
  } catch (error) {
    console.error('[System Model Builder] Build failed:', error);
    throw error;
  }
}

/**
 * Clear existing Block nodes and their relations
 */
async function clearExistingBlocks(): Promise<void> {
  // TODO: Implement graph deletion
  // Delete all Block nodes and CONTAINS/INTERFACES/SATISFIES edges
  // Do NOT delete Requirement nodes
  console.log('[System Model Builder] Clearing blocks (stub)');
}

/**
 * Load requirements from OPAL
 */
async function loadRequirements(): Promise<Requirement[]> {
  // TODO: Implement actual requirement loading from OPAL graph or DB
  // For now, return mock aerospace requirements
  return getMockRequirements();
}

/**
 * Create system block
 */
async function createSystemBlock(name: string): Promise<Block> {
  const block: Block = {
    id: 'SYS-1',
    name,
    block_type: 'system',
    metadata: {
      created_at: new Date().toISOString(),
      discipline: 'Systems Engineering'
    }
  };

  // TODO: Write to graph
  console.log(`[System Model Builder] Creating system block: ${block.id}`);
  
  return block;
}

/**
 * Create subsystem block
 */
async function createSubsystemBlock(subsystemName: string): Promise<Block> {
  const slug = subsystemName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const block: Block = {
    id: `SS-${slug}`,
    name: subsystemName,
    block_type: 'subsystem',
    metadata: {
      created_at: new Date().toISOString()
    }
  };

  // TODO: Write to graph
  console.log(`[System Model Builder] Creating subsystem block: ${block.id}`);
  
  return block;
}

/**
 * Create component block
 */
async function createComponentBlock(componentName: string, subsystemName: string): Promise<Block> {
  const slug = `${subsystemName}-${componentName}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const block: Block = {
    id: `COMP-${slug}`,
    name: componentName,
    block_type: 'component',
    metadata: {
      subsystem: subsystemName,
      created_at: new Date().toISOString()
    }
  };

  // TODO: Write to graph
  console.log(`[System Model Builder] Creating component block: ${block.id}`);
  
  return block;
}

/**
 * Create CONTAINS edge
 */
async function createContainsEdge(fromId: string, toId: string): Promise<void> {
  // TODO: Write edge to graph
  console.log(`[System Model Builder] Creating CONTAINS edge: ${fromId} -> ${toId}`);
}

/**
 * Create SATISFIES edge
 */
async function createSatisfiesEdge(blockId: string, requirementId: string): Promise<void> {
  // TODO: Write edge to graph
  console.log(`[System Model Builder] Creating SATISFIES edge: ${blockId} -> ${requirementId}`);
}

/**
 * Ensure requirement node exists in graph
 */
async function ensureRequirementNode(req: Requirement): Promise<void> {
  // TODO: Check if requirement node exists, create or update
  console.log(`[System Model Builder] Ensuring requirement node: ${req.id}`);
}

/**
 * Extract unique subsystems from requirements
 */
function extractUniqueSubsystems(requirements: Requirement[]): string[] {
  const subsystems = new Set<string>();
  
  for (const req of requirements) {
    if (req.subsystem && req.subsystem.trim()) {
      subsystems.add(req.subsystem.trim());
    }
  }
  
  return Array.from(subsystems).sort();
}

/**
 * Extract unique (subsystem, component) pairs
 */
function extractUniqueComponents(requirements: Requirement[]): Array<[string, string]> {
  const components = new Set<string>();
  
  for (const req of requirements) {
    if (req.subsystem && req.component && req.component.trim()) {
      components.add(`${req.subsystem}::${req.component}`);
    }
  }
  
  return Array.from(components).map(key => {
    const [subsystem, component] = key.split('::');
    return [subsystem, component];
  });
}

/**
 * Create interface edges between subsystems
 */
async function createInterfaceEdges(
  requirements: Requirement[],
  subsystemBlocks: Map<string, Block>
): Promise<number> {
  let count = 0;
  
  // Find interface requirements
  for (const req of requirements) {
    if (req.type === 'interface' || req.tags?.includes('interface')) {
      // Try to extract source and target from metadata
      const sourceSubsystem = req.metadata?.source_subsystem;
      const targetSubsystem = req.metadata?.target_subsystem;
      
      if (sourceSubsystem && targetSubsystem) {
        const sourceBlock = subsystemBlocks.get(sourceSubsystem);
        const targetBlock = subsystemBlocks.get(targetSubsystem);
        
        if (sourceBlock && targetBlock) {
          // TODO: Create or update INTERFACES edge with supporting_requirements
          console.log(`[System Model Builder] Creating INTERFACES edge: ${sourceBlock.id} -> ${targetBlock.id} (req: ${req.id})`);
          count++;
        }
      }
    }
  }
  
  return count;
}

/**
 * Get mock aerospace requirements for testing
 */
function getMockRequirements(): Requirement[] {
  return [
    {
      id: 'REQ-001',
      name: 'Flight Control Stability',
      text: 'Flight Control System shall maintain aircraft stability during all flight phases',
      type: 'functional',
      subsystem: 'Flight Control',
      component: 'Autopilot'
    },
    {
      id: 'REQ-002',
      name: 'GPS Navigation Accuracy',
      text: 'Avionics Navigation System shall provide GPS accuracy within 3 meters CEP',
      type: 'performance',
      subsystem: 'Avionics',
      component: 'GPS Receiver'
    },
    {
      id: 'REQ-003',
      name: 'Engine Temperature Monitoring',
      text: 'Engine Control Unit shall monitor turbine temperature and limit to 1200°C maximum',
      type: 'safety',
      subsystem: 'Propulsion',
      component: 'ECU'
    },
    {
      id: 'REQ-004',
      name: 'Landing Gear Deployment',
      text: 'Landing Gear System shall deploy and retract within 15 seconds',
      type: 'functional',
      subsystem: 'Landing Gear'
    },
    {
      id: 'REQ-005',
      name: 'Cabin Pressure Control',
      text: 'Environmental Control System shall maintain cabin pressure at 8000 ft equivalent',
      type: 'performance',
      subsystem: 'ECLSS',
      component: 'Pressure Controller'
    },
    {
      id: 'REQ-006',
      name: 'Flight Path Optimization',
      text: 'Flight Management System shall calculate optimal flight path for fuel efficiency',
      type: 'functional',
      subsystem: 'Avionics',
      component: 'FMS'
    },
    {
      id: 'REQ-007',
      name: 'Weather Radar Range',
      text: 'Weather Radar shall detect precipitation up to 160 nautical miles',
      type: 'performance',
      subsystem: 'Avionics',
      component: 'Weather Radar'
    },
    {
      id: 'REQ-008',
      name: 'Altitude Hold Accuracy',
      text: 'Autopilot System shall maintain altitude within ±100 feet during cruise',
      type: 'performance',
      subsystem: 'Flight Control',
      component: 'Autopilot'
    },
    {
      id: 'REQ-009',
      name: 'VHF Radio Coverage',
      text: 'Communication System shall provide VHF radio coverage on 118-137 MHz band',
      type: 'functional',
      subsystem: 'Communication'
    },
    {
      id: 'REQ-010',
      name: 'Hydraulic Pressure',
      text: 'Hydraulic System shall operate at 3000 PSI nominal pressure',
      type: 'performance',
      subsystem: 'Hydraulics'
    },
    {
      id: 'REQ-011',
      name: 'Fuel Quantity Monitoring',
      text: 'Fuel Management System shall monitor fuel quantity with ±2% accuracy',
      type: 'performance',
      subsystem: 'Fuel System'
    },
    {
      id: 'REQ-012',
      name: 'Ice Protection',
      text: 'Ice Protection System shall prevent ice accumulation on critical surfaces',
      type: 'safety',
      subsystem: 'ECLSS'
    },
    {
      id: 'REQ-013',
      name: 'Emergency Oxygen Supply',
      text: 'Emergency Oxygen System shall provide 15 minutes supply at 25000 ft',
      type: 'safety',
      subsystem: 'ECLSS',
      component: 'Oxygen System'
    },
    {
      id: 'REQ-014',
      name: 'Fire Detection Response',
      text: 'Fire Detection System shall alert crew within 10 seconds of detection',
      type: 'safety',
      subsystem: 'Safety Systems'
    },
    {
      id: 'REQ-015',
      name: 'Electrical Power Distribution',
      text: 'Electrical Power System shall provide 28V DC and 115V AC power',
      type: 'functional',
      subsystem: 'Electrical'
    }
  ];
}
