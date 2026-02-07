/**
 * Tool Handler
 * Manages tool-related operations and method handling
 */

import { sendResult } from '../utils/jsonRpc';
import { executeApiTool } from '../services/apiService';
import { ApiIntegration } from '../types/config';
import { WebSocket } from 'ws';

interface Tool {
  id: string;
  name: string;
  description: string;
  method: string;
  path: string;
  apiIntegrationId: string;
  parameters: {
    type: string;
    properties: Record<string, unknown>;
  };
}

interface Client {
  [key: string]: any;
}

class ToolHandler {
  private tools: Map<string, Tool>;
  private apiIntegrations: ApiIntegration[];

  constructor() {
    this.tools = new Map();
    this.apiIntegrations = [];
  }

  /**
   * Initialize tools based on API integrations
   */
  initializeTools(apiIntegrations: ApiIntegration[]): void {
    this.apiIntegrations = apiIntegrations;
    this.tools.clear();
    
    apiIntegrations.forEach(api => {
      if (!api.endpoints) return;
      
      api.endpoints.forEach(endpoint => {
        const tool: Tool = {
          id: `api-tool-${endpoint.path}`,
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
   */
  handleList(client: Client, ws: WebSocket, id: string | number): void {
    const toolsList = Array.from(this.tools.values());
    sendResult(ws, id, { tools: toolsList });
  }

  /**
   * Handle tools/get method
   */
  handleGet(client: Client, ws: WebSocket, id: string | number, params: any): void {
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
   */
  async handleExecute(client: Client, ws: WebSocket, id: string | number, params: any): Promise<void> {
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
    } catch (error: any) {
      throw new Error(`Tool execution error: ${error.message}`);
    }
  }

  /**
   * Get all tools
   */
  getTools(): Map<string, Tool> {
    return this.tools;
  }

  /**
   * Get a specific tool
   */
  getTool(id: string): Tool | undefined {
    return this.tools.get(id);
  }

  /**
   * Add a new tool
   */
  addTool(tool: Tool): void {
    if (!tool.id || !tool.name || !tool.method || !tool.path) {
      throw new Error('Invalid tool: id, name, method, and path are required');
    }
    
    this.tools.set(tool.id, tool);
  }

  /**
   * Update an existing tool
   */
  updateTool(id: string, updates: Partial<Tool>): Tool {
    const tool = this.tools.get(id);
    if (!tool) {
      throw new Error(`Tool not found: ${id}`);
    }
    
    const updatedTool = { ...tool, ...updates };
    this.tools.set(id, updatedTool);
    return updatedTool;
  }
}

export default ToolHandler;
