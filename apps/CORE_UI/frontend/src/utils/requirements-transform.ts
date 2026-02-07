// Utility functions to transform requirements data for TraceGraph visualization

import { requirementsService } from '@/services/database/requirements-service';
import { requirementsConnectionService, type RequirementConnection } from '@/services/database/requirements-connection-service';

// TraceNode interface from the TraceGraph component
interface TraceNode {
  id: string;
  type: "requirement" | "design" | "code" | "test" | "component" | "certification";
  title: string;
  status: "active" | "pending" | "completed" | "verified" | "failed";
  connections: string[];
  metadata: {
    owner: string;
    lastUpdated: string;
    source: string;
    criticality?: "DAL-A" | "DAL-B" | "DAL-C" | "DAL-D" | "DAL-E";
  };
  position?: { x: number; y: number };
  details?: {
    description: string;
    documentId: string;
    version: string;
    approvalStatus: string;
    certificationBasis: string;
    verificationMethod: string;
    parentRequirement?: string;
    childRequirements?: string[];
    testCases?: string[];
    riskAssessment: string;
    complianceStatus: string;
    lastReviewDate: string;
    nextReviewDate: string;
    stakeholders: string[];
    tags: string[];
    changeHistory: Array<{
      date: string;
      author: string;
      change: string;
      reason: string;
    }>;
  };
}

/**
 * Convert a requirement from the requirements service into a TraceNode
 */
export function requirementToTraceNode(
  requirement: any, 
  connections: RequirementConnection[] = [],
  position?: { x: number; y: number }
): TraceNode {
  // Extract connected requirement IDs
  const connectedIds = connections.map(conn => 
    conn.sourceId === requirement.id ? conn.targetId : conn.sourceId
  );

  // Map requirement status to TraceNode status
  const mapStatus = (status: string): TraceNode['status'] => {
    switch (status.toLowerCase()) {
      case 'verified': return 'verified';
      case 'active': return 'active';
      case 'pending': return 'pending';
      case 'completed': return 'completed';
      case 'failed': return 'failed';
      default: return 'active';
    }
  };

  // Extract DAL criticality from metadata
  const criticality = requirement.metadata?.criticality as TraceNode['metadata']['criticality'];

  return {
    id: requirement.id,
    type: 'requirement',
    title: requirement.title || requirement.name || requirement.id,
    status: mapStatus(requirement.status),
    connections: connectedIds,
    metadata: {
      owner: requirement.owner || 'Unknown',
      lastUpdated: requirement.lastUpdated || new Date().toISOString(),
      source: requirement.source || 'Unknown',
      criticality: criticality
    },
    position: position || generateAutomaticPosition(requirement.id),
    details: {
      description: requirement.description || '',
      documentId: requirement.id,
      version: requirement.version || '1.0',
      approvalStatus: requirement.status || 'pending',
      certificationBasis: requirement.metadata?.certificationBasis || '',
      verificationMethod: requirement.metadata?.verificationMethod || '',
      parentRequirement: undefined, // TODO: Extract from connections
      childRequirements: [], // TODO: Extract from connections
      testCases: [], // TODO: Add test cases integration
      riskAssessment: 'Medium', // TODO: Calculate from criticality
      complianceStatus: requirement.status === 'verified' ? 'Compliant' : 'Pending',
      lastReviewDate: requirement.lastUpdated || new Date().toISOString(),
      nextReviewDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      stakeholders: [requirement.owner || 'Unknown'],
      tags: [requirement.category, requirement.priority].filter(Boolean),
      changeHistory: [{
        date: requirement.lastUpdated || new Date().toISOString(),
        author: requirement.owner || 'System',
        change: 'Requirement created',
        reason: 'Initial requirement definition'
      }]
    }
  };
}

/**
 * Generate automatic positioning for requirements nodes
 */
function generateAutomaticPosition(requirementId: string): { x: number; y: number } {
  // Simple hash-based positioning to ensure consistent placement
  let hash = 0;
  for (let i = 0; i < requirementId.length; i++) {
    const char = requirementId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  const x = Math.abs(hash % 800) + 100; // 100-900 range
  const y = Math.abs((hash >> 16) % 600) + 100; // 100-700 range
  
  return { x, y };
}

/**
 * Load all requirements and transform them into TraceNodes
 */
export async function loadRequirementsAsTraceNodes(): Promise<TraceNode[]> {
  try {
    console.log('🔄 Loading requirements for TraceGraph...');
    
    // Load requirements and connections in parallel
    const [requirementsResult, allConnections] = await Promise.all([
      requirementsService.getAllRequirements(1, 100),
      requirementsConnectionService.getAllConnections()
    ]);
    
    const requirements = requirementsResult.requirements;
    
    // Transform each requirement into a TraceNode
    const traceNodes: TraceNode[] = requirements.map((requirement, index) => {
      // Find connections for this requirement
      const reqConnections = allConnections.filter(conn =>
        conn.sourceId === requirement.id || conn.targetId === requirement.id
      );
      
      // Generate position in a circular layout for better visualization
      const angle = (index / requirements.length) * 2 * Math.PI;
      const radius = 200;
      const centerX = 400;
      const centerY = 300;
      
      const position = {
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius
      };
      
      return requirementToTraceNode(requirement, reqConnections, position);
    });
    
    console.log(`✅ Loaded ${traceNodes.length} requirements as TraceNodes`);
    return traceNodes;
    
  } catch (error) {
    console.error('❌ Error loading requirements as TraceNodes:', error);
    throw error;
  }
}

/**
 * Create a new connection between requirements and update the TraceNodes
 */
export async function createRequirementConnection(
  sourceId: string,
  targetId: string,
  connectionType: RequirementConnection['connectionType'] = 'related_to',
  strength: RequirementConnection['strength'] = 'medium',
  description?: string
): Promise<RequirementConnection> {
  try {
    console.log(`🔗 Creating connection: ${sourceId} -> ${targetId}`);
    
    const newConnection = await requirementsConnectionService.createConnection({
      sourceId,
      targetId,
      connectionType,
      strength,
      description
    });
    
    console.log(`✅ Created connection: ${newConnection.id}`);
    return newConnection;
    
  } catch (error) {
    console.error('❌ Error creating requirement connection:', error);
    throw error;
  }
}

/**
 * Get impact analysis data for a requirement based on connections
 */
export async function getRequirementImpactData(requirementId: string) {
  try {
    console.log(`📊 Getting impact data for: ${requirementId}`);
    
    const impactData = await requirementsConnectionService.getDownstreamImpacts(requirementId);
    
    // Also get the requirement details
    const requirement = await requirementsService.getRequirement(requirementId);
    
    return {
      requirement,
      ...impactData
    };
    
  } catch (error) {
    console.error(`❌ Error getting impact data for ${requirementId}:`, error);
    throw error;
  }
}

/**
 * Search and filter requirements for TraceGraph
 */
export async function searchRequirementsForTrace(
  query?: string,
  filters?: {
    status?: string;
    category?: string;
    criticality?: string;
  }
): Promise<TraceNode[]> {
  try {
    console.log(`🔍 Searching requirements for TraceGraph: "${query}"`);
    
    // Search requirements using the service
    const searchResults = await requirementsService.searchRequirements(query || '', {
      status: filters?.status,
      category: filters?.category
    });
    
    // Filter by criticality if specified
    let filteredResults = searchResults;
    if (filters?.criticality) {
      filteredResults = searchResults.filter(req => 
        req.metadata?.criticality === filters.criticality
      );
    }
    
    // Get all connections
    const allConnections = await requirementsConnectionService.getAllConnections();
    
    // Transform to TraceNodes
    const traceNodes = filteredResults.map((requirement, index) => {
      const reqConnections = allConnections.filter(conn =>
        conn.sourceId === requirement.id || conn.targetId === requirement.id
      );
      
      // Arrange in a grid layout for search results
      const gridSize = Math.ceil(Math.sqrt(filteredResults.length));
      const row = Math.floor(index / gridSize);
      const col = index % gridSize;
      
      const position = {
        x: 150 + col * 250,
        y: 150 + row * 200
      };
      
      return requirementToTraceNode(requirement, reqConnections, position);
    });
    
    console.log(`✅ Found ${traceNodes.length} requirements matching search`);
    return traceNodes;
    
  } catch (error) {
    console.error('❌ Error searching requirements for trace:', error);
    throw error;
  }
}

/**
 * Update TraceNode positions and persist any changes
 */
export async function updateTraceNodePositions(nodes: TraceNode[]): Promise<void> {
  try {
    console.log(`💾 Updating positions for ${nodes.length} TraceNodes`);
    
    // For now, just store in sessionStorage since we don't have position persistence in backend
    const positions = nodes.reduce((acc, node) => {
      if (node.position) {
        acc[node.id] = node.position;
      }
      return acc;
    }, {} as Record<string, { x: number; y: number }>);
    
    sessionStorage.setItem('traceNodePositions', JSON.stringify(positions));
    
    console.log('✅ Updated TraceNode positions');
    
  } catch (error) {
    console.error('❌ Error updating TraceNode positions:', error);
    throw error;
  }
}

/**
 * Load saved TraceNode positions from storage
 */
export function loadSavedTraceNodePositions(): Record<string, { x: number; y: number }> {
  try {
    const saved = sessionStorage.getItem('traceNodePositions');
    return saved ? JSON.parse(saved) : {};
  } catch (error) {
    console.error('❌ Error loading saved positions:', error);
    return {};
  }
}