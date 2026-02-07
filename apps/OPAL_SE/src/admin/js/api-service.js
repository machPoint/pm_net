/**
 * API Service for OPAL Admin Panel
 * Handles all API requests to the backend
 */

// Mock data for development
const mockData = {
  memories: [
    { id: 1, title: 'OPAL Server Architecture', content: 'OPAL servers are containerized MCP implementations that provide API access and tool execution.', created_at: '2025-05-19T16:29:59.000Z' },
    { id: 2, title: 'API Integration Guide', content: 'To integrate a new API, add the configuration to the environment variables with the MCP_API prefix.', created_at: '2025-05-19T16:29:59.000Z' }
  ],
  toolRuns: [
    { id: 1, tool: 'summarizeContent', parameters: JSON.stringify({content: 'Long article about AI', type: 'headline'}), status: 'completed', duration: 120, executed_at: '2025-05-19T22:29:59.000Z' }
  ],
  // No mock API tokens - we always use real data from the database
  apiTokens: [],
  backups: []
};

// API Service
window.ApiService = window.ApiService || {
  // Base URL for API requests
  baseUrl: '/api',
  
  // Get authentication headers from AuthService
  authHeaders() {
    return AuthService.getAuthHeaders();
  },
  
  // Handle API response with authentication
  async handleApiResponse(response, endpoint) {
    // If unauthorized and we have a refresh token, try to refresh
    if (response.status === 401) {
      const refreshResult = await AuthService.refreshToken();
      if (refreshResult.success) {
        // Retry the request with the new token
        return fetch(endpoint, {
          headers: this.authHeaders()
        });
      } else {
        // If refresh failed, redirect to login
        AuthService.logout();
        throw new Error('Authentication failed. Please log in again.');
      }
    }
    
    // For other error statuses, throw an error
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `API error: ${response.status}`);
    }
    
    return response;
  },
  
  // Generic request method for all API calls
  async request(endpoint, method = 'GET', data = null) {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const options = {
        method,
        headers: this.authHeaders()
      };
      
      if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        options.body = JSON.stringify(data);
      }
      
      const response = await fetch(url, options);
      const processedResponse = await this.handleApiResponse(response, url);
      return await processedResponse.json();
    } catch (error) {
      console.error(`API request failed (${endpoint}):`, error);
      throw error;
    }
  },
  
  // Memory API
  memories: {
    async getAll(limit = 50, offset = 0) {
      // For development, return mock data
      return mockData.memories;
      
      // For production, uncomment this:
      // const response = await fetch(`${ApiService.baseUrl}/memory?limit=${limit}&offset=${offset}`, {
      //   headers: ApiService.authHeaders()
      // });
      // return await response.json();
    },
    
    async create(memory) {
      // For development, add to mock data
      const newMemory = {
        id: mockData.memories.length + 1,
        ...memory,
        created_at: new Date().toISOString()
      };
      mockData.memories.push(newMemory);
      return newMemory;
      
      // For production, uncomment this:
      // const response = await fetch(`${ApiService.baseUrl}/memory`, {
      //   method: 'POST',
      //   headers: ApiService.authHeaders(),
      //   body: JSON.stringify(memory)
      // });
      // return await response.json();
    },
    
    async update(id, memory) {
      // For development, update mock data
      const index = mockData.memories.findIndex(m => m.id === id);
      if (index !== -1) {
        mockData.memories[index] = { ...mockData.memories[index], ...memory };
        return mockData.memories[index];
      }
      throw new Error('Memory not found');
      
      // For production, uncomment this:
      // const response = await fetch(`${ApiService.baseUrl}/memory/${id}`, {
      //   method: 'PUT',
      //   headers: ApiService.authHeaders(),
      //   body: JSON.stringify(memory)
      // });
      // return await response.json();
    },
    
    async delete(id) {
      // For development, remove from mock data
      const index = mockData.memories.findIndex(m => m.id === id);
      if (index !== -1) {
        mockData.memories.splice(index, 1);
        return { success: true };
      }
      throw new Error('Memory not found');
      
      // For production, uncomment this:
      // const response = await fetch(`${ApiService.baseUrl}/memory/${id}`, {
      //   method: 'DELETE',
      //   headers: ApiService.authHeaders()
      // });
      // return await response.json();
    }
  },
  
  // Tool Runs API
  toolRuns: {
    async getAll(filters = {}) {
      // For development, return mock data
      return mockData.toolRuns;
      
      // For production, uncomment this:
      // const queryParams = new URLSearchParams(filters).toString();
      // const response = await fetch(`${ApiService.baseUrl}/audit/tool-runs?${queryParams}`, {
      //   headers: ApiService.authHeaders()
      // });
      // return await response.json();
    },
    
    async getStats() {
      // For development, return mock stats
      return {
        totalRuns: mockData.toolRuns.length,
        avgDuration: mockData.toolRuns.length ? 
          mockData.toolRuns.reduce((acc, run) => acc + run.duration, 0) / mockData.toolRuns.length : 0,
        topTools: ['summarizeContent']
      };
      
      // For production, uncomment this:
      // const response = await fetch(`${ApiService.baseUrl}/audit/tool-stats`, {
      //   headers: ApiService.authHeaders()
      // });
      // return await response.json();
    }
  },
  
  // API Tokens API
  apiTokens: {
    async getAll() {
      try {
        // Use the admin endpoint to get all tokens
        const endpoint = `${ApiService.baseUrl}/admin/tokens`;
        let response = await fetch(endpoint, {
          headers: ApiService.authHeaders()
        });
        
        // Handle authentication and other errors
        response = await ApiService.handleApiResponse(response, endpoint);
        
        return await response.json();
      } catch (error) {
        console.error('Error fetching API tokens:', error);
        // Never use mock data to ensure we're always showing real data
        throw error;
      }
    },
    
    async create(tokenData) {
      try {
        const endpoint = `${ApiService.baseUrl}/auth/token`;
        let response = await fetch(endpoint, {
          method: 'POST',
          headers: ApiService.authHeaders(),
          body: JSON.stringify(tokenData)
        });
        
        // Handle authentication and other errors
        response = await ApiService.handleApiResponse(response, endpoint);
        
        const result = await response.json();
        console.log('Token created successfully:', result);
        return result;
      } catch (error) {
        console.error('Error creating API token:', error);
        throw error;
      }
    },
    
    async delete(id) {
      try {
        // Use the admin endpoint for token deletion to ensure admin privileges
        const endpoint = `${ApiService.baseUrl}/admin/tokens/${id}`;
        console.log(`Deleting token with ID: ${id} using endpoint: ${endpoint}`);
        
        let response = await fetch(endpoint, {
          method: 'DELETE',
          headers: ApiService.authHeaders()
        });
        
        // Handle authentication and other errors
        response = await ApiService.handleApiResponse(response, endpoint);
        
        // If the admin endpoint fails, try the regular endpoint as fallback
        if (!response.ok) {
          console.log('Admin endpoint failed, trying regular endpoint');
          const regularEndpoint = `${ApiService.baseUrl}/auth/token/${id}`;
          let regularResponse = await fetch(regularEndpoint, {
            method: 'DELETE',
            headers: ApiService.authHeaders()
          });
          
          regularResponse = await ApiService.handleApiResponse(regularResponse, regularEndpoint);
          return await regularResponse.json();
        }
        
        return await response.json();
      } catch (error) {
        console.error('Error deleting API token:', error);
        throw error;
      }
    }
  },
  
  // Backups API
  backups: {
    async getAll() {
      // For development, return mock data
      return mockData.backups;
      
      // For production, uncomment this:
      // const response = await fetch(`${ApiService.baseUrl}/backup`, {
      //   headers: ApiService.authHeaders()
      // });
      // return await response.json();
    },
    
    async create() {
      // For development, add to mock data
      const newBackup = {
        id: mockData.backups.length + 1,
        filename: `backup-${Date.now()}.sqlite`,
        created_at: new Date().toISOString(),
        size: '1.2 MB'
      };
      mockData.backups.push(newBackup);
      return newBackup;
      
      // For production, uncomment this:
      // const response = await fetch(`${ApiService.baseUrl}/backup`, {
      //   method: 'POST',
      //   headers: ApiService.authHeaders()
      // });
      // return await response.json();
    },
    
    async restore(id) {
      // For development, simulate restore
      return { success: true };
      
      // For production, uncomment this:
      // const response = await fetch(`${ApiService.baseUrl}/backup/${id}/restore`, {
      //   method: 'POST',
      //   headers: ApiService.authHeaders()
      // });
      // return await response.json();
    },
    
    async delete(id) {
      // For development, remove from mock data
      const index = mockData.backups.findIndex(b => b.id === id);
      if (index !== -1) {
        mockData.backups.splice(index, 1);
        return { success: true };
      }
      throw new Error('Backup not found');
      
      // For production, uncomment this:
      // const response = await fetch(`${ApiService.baseUrl}/backup/${id}`, {
      //   method: 'DELETE',
      //   headers: ApiService.authHeaders()
      // });
      // return await response.json();
    }
  },
  
  // Tools API - for calling MCP tools
  async callTool(toolName, args = {}) {
    try {
      const endpoint = `${this.baseUrl}/tools/call`;
      let response = await fetch(endpoint, {
        method: 'POST',
        headers: this.authHeaders(),
        body: JSON.stringify({
          name: toolName,
          arguments: args
        })
      });
      
      // Handle authentication and other errors
      response = await this.handleApiResponse(response, endpoint);
      return await response.json();
    } catch (error) {
      console.error(`Error calling tool ${toolName}:`, error);
      throw error;
    }
  }
};
