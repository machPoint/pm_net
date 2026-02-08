/**
 * System Model Builder
 * 
 * Derives a block model (system, domains, agents, interfaces) from tasks
 * and stores it in the OPAL graph.
 */

interface Task {
  id: string;
  title: string;
  text: string;
  type: string;
  domain?: string;
  agent?: string;
  parent_id?: string;
  tags?: string[];
  metadata?: any;
}

interface Block {
  id: string;
  title: string;
  block_type: 'system' | 'domain' | 'agent' | 'external';
  metadata?: any;
}

interface BuilderOptions {
  rebuild?: boolean;
  systemName?: string;
}

interface BuildStats {
  systemBlocks: number;
  domainBlocks: number;
  agentBlocks: number;
  containsEdges: number;
  satisfiesEdges: number;
  interfacesEdges: number;
  tasksProcessed: number;
}

/**
 * Build system model from requirements
 */
export async function buildSystemModelFromRequirements(
  options: BuilderOptions = {}
): Promise<BuildStats> {
  const { rebuild = false, systemName = 'Task Management System' } = options;

  console.log('[System Model Builder] Starting build...');
  console.log(`[System Model Builder] Rebuild mode: ${rebuild}`);

  const stats: BuildStats = {
    systemBlocks: 0,
    domainBlocks: 0,
    agentBlocks: 0,
    containsEdges: 0,
    satisfiesEdges: 0,
    interfacesEdges: 0,
    tasksProcessed: 0
  };

  try {
    // Step 1: Clear existing blocks if rebuild
    if (rebuild) {
      await clearExistingBlocks();
      console.log('[System Model Builder] Cleared existing blocks');
    }

    // Step 2: Load tasks
    const tasks = await loadTasks();
    console.log(`[System Model Builder] Loaded ${tasks.length} tasks`);
    stats.tasksProcessed = tasks.length;

    // Step 3: Create system block
    const systemBlock = await createSystemBlock(systemName);
    stats.systemBlocks = 1;
    console.log(`[System Model Builder] Created system block: ${systemBlock.id}`);

    // Step 4: Create domain blocks
    const domains = extractUniqueDomains(tasks);
    const domainBlocks: Map<string, Block> = new Map();
    
    for (const domainName of domains) {
      const block = await createDomainBlock(domainName);
      domainBlocks.set(domainName, block);
      stats.domainBlocks++;
      
      // Create CONTAINS edge from system to domain
      await createContainsEdge(systemBlock.id, block.id);
      stats.containsEdges++;
    }
    console.log(`[System Model Builder] Created ${stats.domainBlocks} domain blocks`);

    // Step 5: Create agent blocks (if agent field exists)
    const agentBlocks: Map<string, Block> = new Map();
    const agents = extractUniqueAgents(tasks);
    
    for (const [domainName, agentName] of agents) {
      const domainBlock = domainBlocks.get(domainName);
      if (!domainBlock) continue;

      const agentKey = `${domainName}::${agentName}`;
      const block = await createAgentBlock(agentName, domainName);
      agentBlocks.set(agentKey, block);
      stats.agentBlocks++;
      
      // Create CONTAINS edge from domain to agent
      await createContainsEdge(domainBlock.id, block.id);
      stats.containsEdges++;
    }
    console.log(`[System Model Builder] Created ${stats.agentBlocks} agent blocks`);

    // Step 6: Link blocks to tasks via SATISFIES
    for (const task of tasks) {
      // Ensure task node exists
      await ensureTaskNode(task);

      // Find owner block
      let ownerBlockId: string;
      
      if (task.agent) {
        const agentKey = `${task.domain}::${task.agent}`;
        const agentBlock = agentBlocks.get(agentKey);
        if (agentBlock) {
          ownerBlockId = agentBlock.id;
        } else if (task.domain) {
          const domainBlock = domainBlocks.get(task.domain);
          ownerBlockId = domainBlock ? domainBlock.id : systemBlock.id;
        } else {
          ownerBlockId = systemBlock.id;
        }
      } else if (task.domain) {
        const domainBlock = domainBlocks.get(task.domain);
        ownerBlockId = domainBlock ? domainBlock.id : systemBlock.id;
      } else {
        ownerBlockId = systemBlock.id;
      }

      // Create SATISFIES edge
      await createSatisfiesEdge(ownerBlockId, task.id);
      stats.satisfiesEdges++;
    }
    console.log(`[System Model Builder] Created ${stats.satisfiesEdges} SATISFIES edges`);

    // Step 7: Create interface edges (simple version for v0.1)
    const interfaceEdges = await createInterfaceEdges(tasks, domainBlocks);
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
 * Load tasks from OPAL
 */
async function loadTasks(): Promise<Task[]> {
  // TODO: Implement actual task loading from OPAL graph or DB
  return getMockTasks();
}

/**
 * Create system block
 */
async function createSystemBlock(title: string): Promise<Block> {
  const block: Block = {
    id: 'SYS-1',
    title,
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
 * Create domain block
 */
async function createDomainBlock(domainName: string): Promise<Block> {
  const slug = domainName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const block: Block = {
    id: `DOM-${slug}`,
    title: domainName,
    block_type: 'domain',
    metadata: {
      created_at: new Date().toISOString()
    }
  };

  // TODO: Write to graph
  console.log(`[System Model Builder] Creating domain block: ${block.id}`);
  
  return block;
}

/**
 * Create agent block
 */
async function createAgentBlock(agentName: string, domainName: string): Promise<Block> {
  const slug = `${domainName}-${agentName}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const block: Block = {
    id: `AGT-${slug}`,
    title: agentName,
    block_type: 'agent',
    metadata: {
      domain: domainName,
      created_at: new Date().toISOString()
    }
  };

  // TODO: Write to graph
  console.log(`[System Model Builder] Creating agent block: ${block.id}`);
  
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
 * Ensure task node exists in graph
 */
async function ensureTaskNode(task: Task): Promise<void> {
  // TODO: Check if task node exists, create or update
  console.log(`[System Model Builder] Ensuring task node: ${task.id}`);
}

/**
 * Extract unique domains from tasks
 */
function extractUniqueDomains(tasks: Task[]): string[] {
  const domains = new Set<string>();
  
  for (const task of tasks) {
    if (task.domain && task.domain.trim()) {
      domains.add(task.domain.trim());
    }
  }
  
  return Array.from(domains).sort();
}

/**
 * Extract unique (domain, agent) pairs
 */
function extractUniqueAgents(tasks: Task[]): Array<[string, string]> {
  const agents = new Set<string>();
  
  for (const task of tasks) {
    if (task.domain && task.agent && task.agent.trim()) {
      agents.add(`${task.domain}::${task.agent}`);
    }
  }
  
  return Array.from(agents).map(key => {
    const [domain, agent] = key.split('::');
    return [domain, agent];
  });
}

/**
 * Create interface edges between domains
 */
async function createInterfaceEdges(
  tasks: Task[],
  domainBlocks: Map<string, Block>
): Promise<number> {
  let count = 0;
  
  // Find interface tasks
  for (const task of tasks) {
    if (task.type === 'interface' || task.tags?.includes('interface')) {
      // Try to extract source and target from metadata
      const sourceDomain = task.metadata?.source_domain;
      const targetDomain = task.metadata?.target_domain;
      
      if (sourceDomain && targetDomain) {
        const sourceBlock = domainBlocks.get(sourceDomain);
        const targetBlock = domainBlocks.get(targetDomain);
        
        if (sourceBlock && targetBlock) {
          // TODO: Create or update INTERFACES edge
          console.log(`[System Model Builder] Creating INTERFACES edge: ${sourceBlock.id} -> ${targetBlock.id} (task: ${task.id})`);
          count++;
        }
      }
    }
  }
  
  return count;
}

/**
 * Get mock tasks for testing
 */
function getMockTasks(): Task[] {
  return [
    {
      id: 'TASK-001',
      title: 'Data Ingestion Pipeline',
      text: 'Data ingestion agent shall process incoming records within 5 seconds',
      type: 'functional',
      domain: 'Data Processing',
      agent: 'Ingestion Agent'
    },
    {
      id: 'TASK-002',
      title: 'Query Response Accuracy',
      text: 'Search agent shall return relevant results with >90% precision',
      type: 'performance',
      domain: 'Search',
      agent: 'Search Agent'
    },
    {
      id: 'TASK-003',
      title: 'Anomaly Detection',
      text: 'Monitoring agent shall detect anomalies and alert within 30 seconds',
      type: 'guardrail',
      domain: 'Monitoring',
      agent: 'Monitor Agent'
    },
    {
      id: 'TASK-004',
      title: 'Task Scheduling',
      text: 'Scheduler agent shall assign tasks based on priority and capacity',
      type: 'functional',
      domain: 'Orchestration'
    },
    {
      id: 'TASK-005',
      title: 'Report Generation',
      text: 'Reporting agent shall generate daily summary reports by 06:00 UTC',
      type: 'performance',
      domain: 'Reporting',
      agent: 'Report Agent'
    },
    {
      id: 'TASK-006',
      title: 'Workflow Optimization',
      text: 'Optimizer agent shall suggest workflow improvements based on historical data',
      type: 'functional',
      domain: 'Orchestration',
      agent: 'Optimizer Agent'
    },
    {
      id: 'TASK-007',
      title: 'Data Validation',
      text: 'Validation agent shall check data integrity before downstream processing',
      type: 'validation',
      domain: 'Data Processing',
      agent: 'Validator Agent'
    },
    {
      id: 'TASK-008',
      title: 'Rate Limiting',
      text: 'Gateway agent shall enforce rate limits per client',
      type: 'guardrail',
      domain: 'Gateway',
      agent: 'Gateway Agent'
    },
    {
      id: 'TASK-009',
      title: 'Notification Delivery',
      text: 'Notification agent shall deliver alerts via configured channels',
      type: 'functional',
      domain: 'Notifications'
    },
    {
      id: 'TASK-010',
      title: 'Audit Logging',
      text: 'Audit agent shall log all state changes with provenance metadata',
      type: 'functional',
      domain: 'Compliance',
      agent: 'Audit Agent'
    }
  ];
}
