// Service for Jira/Atlassian integration
interface JiraIssue {
  key: string;
  id: string;
  fields: {
    summary: string;
    description: string;
    status: {
      id: string;
      name: string;
      statusCategory: {
        id: number;
        key: string;
        colorName: string;
      };
    };
    issuetype: {
      id: string;
      name: string;
      iconUrl: string;
      subtask: boolean;
    };
    priority?: {
      id: string;
      name: string;
      iconUrl: string;
    };
    assignee?: {
      accountId: string;
      displayName: string;
      emailAddress: string;
      avatarUrls: Record<string, string>;
    };
    reporter: {
      accountId: string;
      displayName: string;
      emailAddress: string;
      avatarUrls: Record<string, string>;
    };
    project: {
      id: string;
      key: string;
      name: string;
    };
    created: string;
    updated: string;
    resolutiondate?: string;
    labels: string[];
    components: Array<{
      id: string;
      name: string;
    }>;
    customFields?: Record<string, any>;
  };
  changelog?: {
    histories: Array<{
      id: string;
      created: string;
      author: {
        displayName: string;
      };
      items: Array<{
        field: string;
        from: string;
        to: string;
      }>;
    }>;
  };
}

interface JiraProject {
  id: string;
  key: string;
  name: string;
  description?: string;
  projectTypeKey: string;
  lead: {
    displayName: string;
    accountId: string;
  };
}

class JiraService {
  private baseUrl: string = process.env.NEXT_PUBLIC_JIRA_BASE_URL || 'https://your-company.atlassian.net';
  private apiToken: string = process.env.NEXT_PUBLIC_JIRA_API_TOKEN || 'mock-token';
  private email: string = process.env.NEXT_PUBLIC_JIRA_EMAIL || 'user@company.com';

  /**
   * Get Jira issues related to a requirement
   */
  async getIssuesForRequirement(requirementId: string): Promise<JiraIssue[]> {
    try {
      console.log(`🎫 Fetching Jira issues for requirement: ${requirementId}`);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock data - replace with actual Jira API call
      const mockJiraIssues: JiraIssue[] = [];
      
      // Generate mock issues based on requirement ID
      if (requirementId.includes('FCS') || requirementId.includes('flight-control')) {
        mockJiraIssues.push({
          key: 'GOES-1234',
          id: '10001',
          fields: {
            summary: 'Implement Flight Control Authority Logic',
            description: 'Develop the core flight control authority logic to meet requirement REQ-FCS-001. This includes primary and backup control paths with appropriate switching logic.',
            status: {
              id: '10001',
              name: 'In Progress',
              statusCategory: {
                id: 4,
                key: 'indeterminate',
                colorName: 'yellow'
              }
            },
            issuetype: {
              id: '10001',
              name: 'Story',
              iconUrl: 'https://example.com/story.png',
              subtask: false
            },
            priority: {
              id: '2',
              name: 'High',
              iconUrl: 'https://example.com/high.png'
            },
            assignee: {
              accountId: 'acc-123',
              displayName: 'Anna Kowalski',
              emailAddress: 'anna.kowalski@company.com',
              avatarUrls: {}
            },
            reporter: {
              accountId: 'acc-456',
              displayName: 'Dr. Sarah Mitchell',
              emailAddress: 'sarah.mitchell@company.com',
              avatarUrls: {}
            },
            project: {
              id: '10001',
              key: 'GOES',
              name: 'GOES-R Flight Systems'
            },
            created: '2024-01-10T10:00:00.000+0000',
            updated: '2024-01-15T14:30:00.000+0000',
            labels: ['flight-control', 'safety-critical', 'DAL-A'],
            components: [
              {
                id: '10001',
                name: 'Flight Control Software'
              }
            ],
            customFields: {
              requirementId: requirementId,
              verificationMethod: 'Code Review + Unit Test'
            }
          }
        });

        mockJiraIssues.push({
          key: 'GOES-1235',
          id: '10002',
          fields: {
            summary: 'Flight Control System Unit Tests',
            description: 'Create comprehensive unit tests for flight control authority implementation.',
            status: {
              id: '10002',
              name: 'To Do',
              statusCategory: {
                id: 2,
                key: 'new',
                colorName: 'blue-gray'
              }
            },
            issuetype: {
              id: '10002',
              name: 'Task',
              iconUrl: 'https://example.com/task.png',
              subtask: false
            },
            priority: {
              id: '2',
              name: 'High',
              iconUrl: 'https://example.com/high.png'
            },
            assignee: {
              accountId: 'acc-789',
              displayName: 'Michael Thompson',
              emailAddress: 'michael.thompson@company.com',
              avatarUrls: {}
            },
            reporter: {
              accountId: 'acc-456',
              displayName: 'Dr. Sarah Mitchell',
              emailAddress: 'sarah.mitchell@company.com',
              avatarUrls: {}
            },
            project: {
              id: '10001',
              key: 'GOES',
              name: 'GOES-R Flight Systems'
            },
            created: '2024-01-12T09:15:00.000+0000',
            updated: '2024-01-12T09:15:00.000+0000',
            labels: ['testing', 'flight-control', 'unit-tests'],
            components: [
              {
                id: '10002',
                name: 'Test Automation'
              }
            ]
          }
        });
      }

      if (requirementId.includes('NAV') || requirementId.includes('navigation')) {
        mockJiraIssues.push({
          key: 'GOES-2001',
          id: '20001',
          fields: {
            summary: 'Navigation System Integration Development',
            description: 'Implement navigation system integration with flight management computer.',
            status: {
              id: '10003',
              name: 'Done',
              statusCategory: {
                id: 3,
                key: 'done',
                colorName: 'green'
              }
            },
            issuetype: {
              id: '10003',
              name: 'Epic',
              iconUrl: 'https://example.com/epic.png',
              subtask: false
            },
            priority: {
              id: '3',
              name: 'Medium',
              iconUrl: 'https://example.com/medium.png'
            },
            assignee: {
              accountId: 'acc-321',
              displayName: 'James Rodriguez',
              emailAddress: 'james.rodriguez@company.com',
              avatarUrls: {}
            },
            reporter: {
              accountId: 'acc-654',
              displayName: 'Lisa Chen',
              emailAddress: 'lisa.chen@company.com',
              avatarUrls: {}
            },
            project: {
              id: '10002',
              key: 'NAV',
              name: 'GOES-R Navigation'
            },
            created: '2024-01-08T11:20:00.000+0000',
            updated: '2024-01-14T16:45:00.000+0000',
            resolutiondate: '2024-01-14T16:45:00.000+0000',
            labels: ['navigation', 'integration', 'DAL-B'],
            components: [
              {
                id: '20001',
                name: 'Navigation Software'
              }
            ]
          }
        });
      }

      if (requirementId.includes('HYD') || requirementId.includes('hydraulic')) {
        mockJiraIssues.push({
          key: 'GOES-3001',
          id: '30001',
          fields: {
            summary: 'Hydraulic Pressure Control Implementation',
            description: 'Develop hydraulic system pressure control algorithms and monitoring.',
            status: {
              id: '10001',
              name: 'In Progress',
              statusCategory: {
                id: 4,
                key: 'indeterminate',
                colorName: 'yellow'
              }
            },
            issuetype: {
              id: '10001',
              name: 'Story',
              iconUrl: 'https://example.com/story.png',
              subtask: false
            },
            priority: {
              id: '1',
              name: 'Highest',
              iconUrl: 'https://example.com/highest.png'
            },
            assignee: {
              accountId: 'acc-111',
              displayName: 'David Park',
              emailAddress: 'david.park@company.com',
              avatarUrls: {}
            },
            reporter: {
              accountId: 'acc-222',
              displayName: 'Anna Kowalski',
              emailAddress: 'anna.kowalski@company.com',
              avatarUrls: {}
            },
            project: {
              id: '10003',
              key: 'HYD',
              name: 'GOES-R Hydraulics'
            },
            created: '2024-01-09T08:30:00.000+0000',
            updated: '2024-01-13T15:20:00.000+0000',
            labels: ['hydraulic', 'control-system', 'DAL-A'],
            components: [
              {
                id: '30001',
                name: 'Hydraulic Control'
              }
            ]
          }
        });
      }

      // Add a generic issue if no specific matches
      if (mockJiraIssues.length === 0) {
        mockJiraIssues.push({
          key: 'GOES-9999',
          id: '99999',
          fields: {
            summary: `Implementation task for ${requirementId}`,
            description: `Development task to implement requirement ${requirementId}`,
            status: {
              id: '10002',
              name: 'To Do',
              statusCategory: {
                id: 2,
                key: 'new',
                colorName: 'blue-gray'
              }
            },
            issuetype: {
              id: '10001',
              name: 'Story',
              iconUrl: 'https://example.com/story.png',
              subtask: false
            },
            priority: {
              id: '3',
              name: 'Medium',
              iconUrl: 'https://example.com/medium.png'
            },
            reporter: {
              accountId: 'acc-000',
              displayName: 'System',
              emailAddress: 'system@company.com',
              avatarUrls: {}
            },
            project: {
              id: '10000',
              key: 'GOES',
              name: 'GOES-R General'
            },
            created: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            updated: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            labels: ['requirement', 'implementation'],
            components: []
          }
        });
      }

      console.log(`✅ Found ${mockJiraIssues.length} Jira issues for ${requirementId}`);
      return mockJiraIssues;

    } catch (error) {
      console.error(`❌ Error fetching Jira issues for ${requirementId}:`, error);
      throw error;
    }
  }

  /**
   * Get a specific Jira issue by key
   */
  async getIssue(issueKey: string): Promise<JiraIssue | null> {
    try {
      console.log(`🎫 Fetching Jira issue: ${issueKey}`);
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Mock implementation - in real implementation would call Jira API
      console.log(`⚠️ Jira issue ${issueKey} not found (mock implementation)`);
      return null;

    } catch (error) {
      console.error(`❌ Error fetching Jira issue ${issueKey}:`, error);
      throw error;
    }
  }

  /**
   * Search for Jira issues using JQL
   */
  async searchIssues(jql: string, fields?: string[]): Promise<JiraIssue[]> {
    try {
      console.log(`🔍 Searching Jira issues with JQL: ${jql}`);
      
      await new Promise(resolve => setTimeout(resolve, 600));
      
      // Mock search results
      const searchResults: JiraIssue[] = [];
      
      console.log(`✅ Found ${searchResults.length} Jira issues matching JQL`);
      return searchResults;

    } catch (error) {
      console.error('❌ Error searching Jira issues:', error);
      throw error;
    }
  }

  /**
   * Get all Jira projects accessible to the user
   */
  async getProjects(): Promise<JiraProject[]> {
    try {
      console.log('📂 Fetching Jira projects');
      
      await new Promise(resolve => setTimeout(resolve, 400));
      
      // Mock projects
      const mockProjects: JiraProject[] = [
        {
          id: '10001',
          key: 'GOES',
          name: 'GOES-R Flight Systems',
          description: 'Main project for GOES-R flight control systems',
          projectTypeKey: 'software',
          lead: {
            displayName: 'Dr. Sarah Mitchell',
            accountId: 'acc-456'
          }
        },
        {
          id: '10002',
          key: 'NAV',
          name: 'GOES-R Navigation',
          description: 'Navigation and guidance systems',
          projectTypeKey: 'software',
          lead: {
            displayName: 'James Rodriguez',
            accountId: 'acc-321'
          }
        },
        {
          id: '10003',
          key: 'HYD',
          name: 'GOES-R Hydraulics',
          description: 'Hydraulic system development',
          projectTypeKey: 'software',
          lead: {
            displayName: 'Anna Kowalski',
            accountId: 'acc-222'
          }
        }
      ];

      console.log(`✅ Found ${mockProjects.length} Jira projects`);
      return mockProjects;

    } catch (error) {
      console.error('❌ Error fetching Jira projects:', error);
      throw error;
    }
  }

  /**
   * Create a new Jira issue
   */
  async createIssue(issue: {
    projectKey: string;
    issueType: string;
    summary: string;
    description?: string;
    priority?: string;
    assigneeAccountId?: string;
    labels?: string[];
    customFields?: Record<string, any>;
  }): Promise<JiraIssue | null> {
    try {
      console.log(`➕ Creating Jira issue: ${issue.summary}`);
      
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Mock issue creation
      console.log(`✅ Created Jira issue (mock implementation)`);
      return null; // In real implementation, would return created issue

    } catch (error) {
      console.error('❌ Error creating Jira issue:', error);
      throw error;
    }
  }

  /**
   * Update a Jira issue
   */
  async updateIssue(issueKey: string, updates: Record<string, any>): Promise<JiraIssue | null> {
    try {
      console.log(`📝 Updating Jira issue: ${issueKey}`);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock issue update
      console.log(`✅ Updated Jira issue ${issueKey} (mock implementation)`);
      return null; // In real implementation, would return updated issue

    } catch (error) {
      console.error(`❌ Error updating Jira issue ${issueKey}:`, error);
      throw error;
    }
  }

  /**
   * Test connection to Jira
   */
  async testConnection(): Promise<{ connected: boolean; message: string }> {
    try {
      console.log('🔌 Testing Jira connection...');
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock connection test
      const connected = true; // In real implementation, would attempt actual API call
      
      if (connected) {
        console.log('✅ Jira connection successful');
        return { connected: true, message: 'Connected to Jira successfully' };
      } else {
        console.log('❌ Jira connection failed');
        return { connected: false, message: 'Failed to connect to Jira' };
      }

    } catch (error) {
      console.error('❌ Error testing Jira connection:', error);
      return { connected: false, message: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

// Export singleton instance
export const jiraService = new JiraService();