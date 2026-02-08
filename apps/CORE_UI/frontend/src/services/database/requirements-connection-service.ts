// Service for managing requirement connections and relationships

export interface RequirementConnection {
  id: string;
  sourceId: string;
  targetId: string;
  connectionType: 'depends_on' | 'blocks' | 'assigned_to' | 'produces' | 'mitigates' | 'requires_approval' | 'informs';
  strength: 'weak' | 'medium' | 'strong';
  description?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  metadata?: Record<string, any>;
}

export interface ConnectionCreateRequest {
  sourceId: string;
  targetId: string;
  connectionType: RequirementConnection['connectionType'];
  strength: RequirementConnection['strength'];
  description?: string;
  metadata?: Record<string, any>;
}

class RequirementsConnectionService {
  private baseUrl = process.env.NEXT_PUBLIC_FDS_API_URL || 'http://localhost:4000';

  /**
   * Get all connections for a specific requirement
   */
  async getRequirementConnections(requirementId: string): Promise<RequirementConnection[]> {
    try {
      console.log(`🔗 Fetching connections for requirement: ${requirementId}`);
      
      // For MVP, return mock data - replace with actual API call later
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Mock connections based on requirement patterns
      const mockConnections: RequirementConnection[] = this.getMockConnections(requirementId);
      
      console.log(`✅ Found ${mockConnections.length} connections for ${requirementId}`);
      return mockConnections;
      
    } catch (error) {
      console.error(`❌ Error fetching connections for ${requirementId}:`, error);
      throw error;
    }
  }

  /**
   * Get all connections in the system
   */
  async getAllConnections(): Promise<RequirementConnection[]> {
    try {
      console.log('🔗 Fetching all requirement connections');
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Mock all connections for the system
      const allRequirements = ['TASK-001', 'TASK-002', 'TASK-003', 'TASK-004', 'TASK-005'];
      let allConnections: RequirementConnection[] = [];
      
      for (const reqId of allRequirements) {
        const connections = await this.getRequirementConnections(reqId);
        allConnections = allConnections.concat(connections);
      }
      
      // Remove duplicates (since connections are bidirectional)
      const uniqueConnections = allConnections.filter((connection, index, self) =>
        index === self.findIndex(c => 
          (c.sourceId === connection.sourceId && c.targetId === connection.targetId) ||
          (c.sourceId === connection.targetId && c.targetId === connection.sourceId)
        )
      );
      
      console.log(`✅ Found ${uniqueConnections.length} total connections`);
      return uniqueConnections;
      
    } catch (error) {
      console.error('❌ Error fetching all connections:', error);
      throw error;
    }
  }

  /**
   * Create a new connection between requirements
   */
  async createConnection(connection: ConnectionCreateRequest): Promise<RequirementConnection> {
    try {
      console.log(`➕ Creating connection: ${connection.sourceId} -> ${connection.targetId}`);
      
      // For MVP, simulate API call - replace with actual backend call
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const newConnection: RequirementConnection = {
        id: `CONN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        sourceId: connection.sourceId,
        targetId: connection.targetId,
        connectionType: connection.connectionType,
        strength: connection.strength,
        description: connection.description || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'system', // In real app, get from auth context
        metadata: connection.metadata || {}
      };
      
      // TODO: Persist to FDS backend database
      // const response = await fetch(`${this.baseUrl}/api/connections`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(newConnection)
      // });
      
      console.log(`✅ Created connection: ${newConnection.id}`);
      return newConnection;
      
    } catch (error) {
      console.error('❌ Error creating connection:', error);
      throw error;
    }
  }

  /**
   * Update an existing connection
   */
  async updateConnection(connectionId: string, updates: Partial<RequirementConnection>): Promise<RequirementConnection | null> {
    try {
      console.log(`📝 Updating connection: ${connectionId}`);
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Mock implementation - would fetch existing connection and update
      const updatedConnection: RequirementConnection = {
        id: connectionId,
        sourceId: updates.sourceId || 'TASK-001',
        targetId: updates.targetId || 'TASK-002',
        connectionType: updates.connectionType || 'depends_on',
        strength: updates.strength || 'medium',
        description: updates.description || '',
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: new Date().toISOString(),
        createdBy: 'system',
        metadata: updates.metadata || {}
      };
      
      console.log(`✅ Updated connection: ${connectionId}`);
      return updatedConnection;
      
    } catch (error) {
      console.error(`❌ Error updating connection ${connectionId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a connection
   */
  async deleteConnection(connectionId: string): Promise<boolean> {
    try {
      console.log(`🗑️ Deleting connection: ${connectionId}`);
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // TODO: Call FDS backend to delete
      // await fetch(`${this.baseUrl}/api/connections/${connectionId}`, {
      //   method: 'DELETE'
      // });
      
      console.log(`✅ Deleted connection: ${connectionId}`);
      return true;
      
    } catch (error) {
      console.error(`❌ Error deleting connection ${connectionId}:`, error);
      throw error;
    }
  }

  /**
   * Get downstream impacts for a requirement (used by impact analysis)
   */
  async getDownstreamImpacts(requirementId: string): Promise<{
    directImpacts: string[];
    indirectImpacts: string[];
    impactPaths: Array<{path: string[]; strength: number}>;
  }> {
    try {
      console.log(`📊 Calculating downstream impacts for: ${requirementId}`);
      
      const connections = await this.getAllConnections();
      const directImpacts: string[] = [];
      const indirectImpacts: string[] = [];
      const impactPaths: Array<{path: string[]; strength: number}> = [];
      
      // Find direct connections
      const directConnections = connections.filter(conn => 
        conn.sourceId === requirementId || conn.targetId === requirementId
      );
      
      directConnections.forEach(conn => {
        const impactedId = conn.sourceId === requirementId ? conn.targetId : conn.sourceId;
        directImpacts.push(impactedId);
        
        // Add path with strength
        const strength = conn.strength === 'strong' ? 1.0 : conn.strength === 'medium' ? 0.7 : 0.4;
        impactPaths.push({
          path: [requirementId, impactedId],
          strength
        });
      });
      
      // Find indirect impacts (2 levels deep for performance)
      for (const directId of directImpacts) {
        const indirectConnections = connections.filter(conn =>
          (conn.sourceId === directId || conn.targetId === directId) &&
          conn.sourceId !== requirementId && conn.targetId !== requirementId
        );
        
        indirectConnections.forEach(conn => {
          const indirectId = conn.sourceId === directId ? conn.targetId : conn.sourceId;
          if (!directImpacts.includes(indirectId) && !indirectImpacts.includes(indirectId)) {
            indirectImpacts.push(indirectId);
            
            const strength = (conn.strength === 'strong' ? 1.0 : conn.strength === 'medium' ? 0.7 : 0.4) * 0.5;
            impactPaths.push({
              path: [requirementId, directId, indirectId],
              strength
            });
          }
        });
      }
      
      console.log(`✅ Found ${directImpacts.length} direct and ${indirectImpacts.length} indirect impacts`);
      
      return {
        directImpacts,
        indirectImpacts,
        impactPaths
      };
      
    } catch (error) {
      console.error(`❌ Error calculating downstream impacts for ${requirementId}:`, error);
      throw error;
    }
  }

  /**
   * Generate mock connections for development
   */
  private getMockConnections(requirementId: string): RequirementConnection[] {
    const mockConnections: Record<string, RequirementConnection[]> = {
      'TASK-001': [
        {
          id: 'CONN-001-002',
          sourceId: 'TASK-001',
          targetId: 'TASK-002',
          connectionType: 'depends_on',
          strength: 'strong',
          description: 'Data pipeline depends on orchestration for task scheduling',
          createdAt: '2024-01-15T10:00:00Z',
          updatedAt: '2024-01-15T10:00:00Z',
          createdBy: 'Dr. Sarah Mitchell',
          metadata: { criticality: 'high', reviewStatus: 'approved' }
        },
        {
          id: 'CONN-001-003',
          sourceId: 'TASK-001',
          targetId: 'TASK-003',
          connectionType: 'depends_on',
          strength: 'strong',
          description: 'Data pipeline requires message queue for reliable delivery',
          createdAt: '2024-01-15T10:30:00Z',
          updatedAt: '2024-01-15T10:30:00Z',
          createdBy: 'Dr. Sarah Mitchell',
          metadata: { criticality: 'high', reviewStatus: 'approved' }
        }
      ],
      'TASK-002': [
        {
          id: 'CONN-002-005',
          sourceId: 'TASK-002',
          targetId: 'TASK-005',
          connectionType: 'informs',
          strength: 'medium',
          description: 'Orchestration layer interfaces with API gateway for request routing',
          createdAt: '2024-01-12T14:15:00Z',
          updatedAt: '2024-01-12T14:15:00Z',
          createdBy: 'James Rodriguez',
          metadata: { interface: 'gRPC', reviewStatus: 'pending' }
        }
      ],
      'TASK-003': [
        {
          id: 'CONN-003-004',
          sourceId: 'TASK-003',
          targetId: 'TASK-004',
          connectionType: 'blocks',
          strength: 'weak',
          description: 'Queue system failure may impact monitoring backup systems',
          createdAt: '2024-01-10T09:20:00Z',
          updatedAt: '2024-01-10T09:20:00Z',
          createdBy: 'Anna Kowalski',
          metadata: { riskLevel: 'medium', mitigationPlan: 'failover-secondary' }
        }
      ],
      'TASK-004': [
        {
          id: 'CONN-004-005',
          sourceId: 'TASK-004',
          targetId: 'TASK-005',
          connectionType: 'informs',
          strength: 'weak',
          description: 'Monitoring system status communicated via platform event bus',
          createdAt: '2024-01-08T16:45:00Z',
          updatedAt: '2024-01-08T16:45:00Z',
          createdBy: 'Lisa Chen',
          metadata: { dataLink: 'event-bus', frequency: 'periodic' }
        }
      ],
      'TASK-005': []
    };
    
    return mockConnections[requirementId] || [];
  }
}

// Export singleton instance
export const requirementsConnectionService = new RequirementsConnectionService();