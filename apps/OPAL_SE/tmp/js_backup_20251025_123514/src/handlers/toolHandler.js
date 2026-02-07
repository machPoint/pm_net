/**
 * Tool Handler
 * Manages tool-related operations and method handling
 */

const { sendResult } = require('../utils/jsonRpc');
const { executeApiTool } = require('../services/apiService');

class ToolHandler {
  constructor() {
    this.tools = new Map();
    this.apiIntegrations = [];
  }

  /**
   * Initialize tools based on API integrations
   * @param {Array} apiIntegrations - Available API integrations
   */
  initializeTools(apiIntegrations) {
    // Store API integrations for tool execution
    this.apiIntegrations = apiIntegrations;
    
    // Clear existing tools
    this.tools.clear();
    
    // Create a tool for each API endpoint
    apiIntegrations.forEach(api => {
      if (!api.endpoints) return;
      
      api.endpoints.forEach(endpoint => {
        const tool = {
          id: `api-tool-${endpoint.id}`,
          name: endpoint.description || `${endpoint.method} ${endpoint.path}`,
          description: endpoint.description || `Make a ${endpoint.method} request to ${endpoint.path}`,
          method: endpoint.method,
          path: endpoint.path,
          apiIntegrationId: api.id,
          parameters: {
            type: 'object',
            properties: {}
          }
        };
        
        this.tools.set(tool.id, tool);
      });
    });
  }

  /**
   * Handle tools/list method
   * @param {Object} client - Client connection info
   * @param {WebSocket} ws - WebSocket connection
   * @param {string|number} id - Request ID
   */
  handleList(client, ws, id) {
    const toolsList = Array.from(this.tools.values());
    sendResult(ws, id, { tools: toolsList });
  }

  /**
   * Handle tools/get method
   * @param {Object} client - Client connection info
   * @param {WebSocket} ws - WebSocket connection
   * @param {string|number} id - Request ID
   * @param {Object} params - Request parameters
   */
  handleGet(client, ws, id, params) {
    if (!params?.id) {
      throw new Error('Invalid params: id is required');
    }
    
    const tool = this.tools.get(params.id);
    if (!tool) {
      throw new Error(`Tool not found: ${params.id}`);
    }
    
    sendResult(ws, id, { tool });
  }

  /**
   * Handle tools/execute method
   * @param {Object} client - Client connection info
   * @param {WebSocket} ws - WebSocket connection
   * @param {string|number} id - Request ID
   * @param {Object} params - Request parameters
   */
  async handleExecute(client, ws, id, params) {
    if (!params?.id) {
      throw new Error('Invalid params: id is required');
    }
    
    const tool = this.tools.get(params.id);
    if (!tool) {
      throw new Error(`Tool not found: ${params.id}`);
    }
    
    try {
      const result = await executeApiTool(tool, params?.arguments || {}, this.apiIntegrations);
      sendResult(ws, id, { result });
    } catch (error) {
      throw new Error(`Tool execution error: ${error.message}`);
    }
  }

  /**
   * Get all tools
   * @returns {Map} Map of tools
   */
  getTools() {
    return this.tools;
  }

  /**
   * Get a specific tool
   * @param {string} id - Tool ID
   * @returns {Object|undefined} Tool object if found
   */
  getTool(id) {
    return this.tools.get(id);
  }

  /**
   * Add a new tool
   * @param {Object} tool - Tool object to add
   */
  addTool(tool) {
    if (!tool.id || !tool.name || !tool.method || !tool.path) {
      throw new Error('Invalid tool: id, name, method, and path are required');
    }
    
    this.tools.set(tool.id, tool);
  }

  /**
   * Update an existing tool
   * @param {string} id - Tool ID
   * @param {Object} updates - Updates to apply
   * @returns {Object} Updated tool
   */
  updateTool(id, updates) {
    const tool = this.tools.get(id);
    if (!tool) {
      throw new Error(`Tool not found: ${id}`);
    }
    
    const updatedTool = { ...tool, ...updates };
    this.tools.set(id, updatedTool);
    return updatedTool;
  }
}

module.exports = ToolHandler;
