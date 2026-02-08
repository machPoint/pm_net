// Service for Jama Connect integration
interface JamaItem {
  id: number;
  fields?: {
    name?: string;
    description?: string;
    status?: string;
    [key: string]: any;
  };
  itemType: number;
  project?: {
    id: number;
    name: string;
  };
  createdDate: string;
  modifiedDate: string;
  location?: {
    parent?: number;
    sequence?: number;
  };
  relationships?: {
    upstream: JamaRelationship[];
    downstream: JamaRelationship[];
  };
}

interface JamaRelationship {
  id: number;
  fromItem: number;
  toItem: number;
  relationshipType: number;
  suspect: boolean;
}

interface JamaProject {
  id: number;
  name: string;
  description?: string;
  projectKey: string;
}

class JamaService {
  private baseUrl: string = process.env.NEXT_PUBLIC_JAMA_BASE_URL || 'https://your-jama-instance.jamasoftware.com';
  private apiToken: string = process.env.NEXT_PUBLIC_JAMA_API_TOKEN || 'mock-token';

  /**
   * Get related Jama items for a requirement
   */
  async getRelatedItems(requirementId: string): Promise<JamaItem[]> {
    try {
      console.log(`🔗 Fetching Jama items for requirement: ${requirementId}`);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 400));
      
      // Mock data - replace with actual Jama API call
      const mockJamaItems: JamaItem[] = [];
      
      // Generate mock items based on requirement ID
      if (requirementId.includes('DIP') || requirementId.includes('data-pipeline')) {
        mockJamaItems.push({
          id: 12345,
          fields: {
            name: 'Data Pipeline Design Specification',
            description: 'Detailed design specification for the primary data pipeline including redundancy and fail-safe mechanisms.',
            status: 'Approved',
            documentType: 'System Design',
            version: '2.1'
          },
          itemType: 101, // Design Document
          project: {
            id: 1001,
            name: 'Agent Data Processing'
          },
          createdDate: '2024-01-10T10:00:00Z',
          modifiedDate: '2024-01-15T14:30:00Z',
          location: {
            parent: 10001,
            sequence: 1
          }
        });

        mockJamaItems.push({
          id: 12346,
          fields: {
            name: 'Pipeline Worker Agent Requirements',
            description: 'Functional and performance requirements for pipeline worker agents.',
            status: 'In Review',
            documentType: 'Component Requirements',
            version: '1.3'
          },
          itemType: 102, // Requirements
          project: {
            id: 1001,
            name: 'Agent Data Processing'
          },
          createdDate: '2024-01-08T09:00:00Z',
          modifiedDate: '2024-01-14T16:45:00Z',
          location: {
            parent: 10002,
            sequence: 2
          }
        });
      }

      if (requirementId.includes('NAV') || requirementId.includes('navigation')) {
        mockJamaItems.push({
          id: 12347,
          fields: {
            name: 'Orchestration Layer Architecture',
            description: 'System architecture for agent orchestration including task routing, scheduling, and coordination.',
            status: 'Approved',
            documentType: 'Architecture Document',
            version: '1.2'
          },
          itemType: 101,
          project: {
            id: 1002,
            name: 'Agent Orchestration'
          },
          createdDate: '2024-01-12T11:15:00Z',
          modifiedDate: '2024-01-12T17:20:00Z'
        });
      }

      if (requirementId.includes('HYD') || requirementId.includes('queue')) {
        mockJamaItems.push({
          id: 12348,
          fields: {
            name: 'Message Queue Architecture',
            description: 'Detailed message queue architecture showing primary and backup channels.',
            status: 'In Progress',
            documentType: 'Schematic',
            version: '1.0'
          },
          itemType: 103, // Design Artifact
          project: {
            id: 1003,
            name: 'Agent Infrastructure'
          },
          createdDate: '2024-01-10T08:30:00Z',
          modifiedDate: '2024-01-11T12:45:00Z'
        });
      }

      // Add a generic item if no specific matches
      if (mockJamaItems.length === 0) {
        mockJamaItems.push({
          id: 19999,
          fields: {
            name: `Design Document for ${requirementId}`,
            description: `Associated design documentation for requirement ${requirementId}`,
            status: 'Draft',
            documentType: 'Design Document',
            version: '0.1'
          },
          itemType: 101,
          project: {
            id: 9999,
            name: 'Agent Platform'
          },
          createdDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          modifiedDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
        });
      }

      console.log(`✅ Found ${mockJamaItems.length} Jama items for ${requirementId}`);
      return mockJamaItems;

    } catch (error) {
      console.error(`❌ Error fetching Jama items for ${requirementId}:`, error);
      throw error;
    }
  }

  /**
   * Get a specific Jama item by ID
   */
  async getItem(itemId: number): Promise<JamaItem | null> {
    try {
      console.log(`🔍 Fetching Jama item: ${itemId}`);
      
      // Mock implementation
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Return null for now - in real implementation, would call Jama API
      console.log(`⚠️ Jama item ${itemId} not found (mock implementation)`);
      return null;

    } catch (error) {
      console.error(`❌ Error fetching Jama item ${itemId}:`, error);
      throw error;
    }
  }

  /**
   * Get all projects accessible to the user
   */
  async getProjects(): Promise<JamaProject[]> {
    try {
      console.log('📂 Fetching Jama projects');
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Mock projects
      const mockProjects: JamaProject[] = [
        {
          id: 1001,
          name: 'Agent Data Processing',
          description: 'Data processing pipeline requirements and design',
          projectKey: 'FCS'
        },
        {
          id: 1002,
          name: 'Agent Orchestration',
          description: 'Agent orchestration and coordination specifications',
          projectKey: 'NAV'
        },
        {
          id: 1003,
          name: 'Agent Infrastructure',
          description: 'Infrastructure and queue system requirements',
          projectKey: 'HYD'
        }
      ];

      console.log(`✅ Found ${mockProjects.length} Jama projects`);
      return mockProjects;

    } catch (error) {
      console.error('❌ Error fetching Jama projects:', error);
      throw error;
    }
  }

  /**
   * Search for items in Jama
   */
  async searchItems(query: string, projectId?: number): Promise<JamaItem[]> {
    try {
      console.log(`🔍 Searching Jama items: "${query}"${projectId ? ` in project ${projectId}` : ''}`);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock search results - in real implementation would use Jama search API
      const searchResults: JamaItem[] = [];
      
      console.log(`✅ Found ${searchResults.length} Jama items matching "${query}"`);
      return searchResults;

    } catch (error) {
      console.error(`❌ Error searching Jama items:`, error);
      throw error;
    }
  }

  /**
   * Get relationships for a Jama item
   */
  async getItemRelationships(itemId: number): Promise<{
    upstream: JamaRelationship[];
    downstream: JamaRelationship[];
  }> {
    try {
      console.log(`🔗 Fetching relationships for Jama item: ${itemId}`);
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Mock relationships
      const relationships = {
        upstream: [] as JamaRelationship[],
        downstream: [] as JamaRelationship[]
      };

      console.log(`✅ Found ${relationships.upstream.length} upstream and ${relationships.downstream.length} downstream relationships`);
      return relationships;

    } catch (error) {
      console.error(`❌ Error fetching relationships for Jama item ${itemId}:`, error);
      throw error;
    }
  }

  /**
   * Test connection to Jama
   */
  async testConnection(): Promise<{ connected: boolean; message: string }> {
    try {
      console.log('🔌 Testing Jama connection...');
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock connection test
      const connected = true; // In real implementation, would attempt actual API call
      
      if (connected) {
        console.log('✅ Jama connection successful');
        return { connected: true, message: 'Connected to Jama successfully' };
      } else {
        console.log('❌ Jama connection failed');
        return { connected: false, message: 'Failed to connect to Jama' };
      }

    } catch (error) {
      console.error('❌ Error testing Jama connection:', error);
      return { connected: false, message: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

// Export singleton instance
export const jamaService = new JamaService();