/**
 * Resource Handler
 * Manages resource-related operations and method handling
 */

import { sendResult } from '../utils/jsonRpc';
import { ApiIntegration } from '../types/config';
import { WebSocket } from 'ws';

interface Resource {
  id: string;
  name: string;
  type: string;
  description: string;
  metadata: {
    baseUrl: string;
    authType: string;
  };
}

interface Client {
  [key: string]: any;
}

class ResourceHandler {
  private resources: Map<string, Resource>;

  constructor() {
    this.resources = new Map();
  }

  /**
   * Initialize resources based on API integrations
   */
  initializeResources(apiIntegrations: ApiIntegration[]): void {
    this.resources.clear();
    
    apiIntegrations.forEach(api => {
      const resource: Resource = {
        id: `api-${api.id}`,
        name: api.name,
        type: 'api',
        description: `API integration for ${api.name}`,
        metadata: {
          baseUrl: api.baseUrl,
          authType: api.authType
        }
      };
      
      this.resources.set(resource.id, resource);
    });
  }

  /**
   * Handle resources/list method
   */
  handleList(_client: Client, ws: WebSocket, id: string | number): void {
    const resourcesList = Array.from(this.resources.values());
    sendResult(ws, id, { resources: resourcesList });
  }

  /**
   * Handle resources/get method
   */
  handleGet(_client: Client, ws: WebSocket, id: string | number, params: any): void {
    if (!params?.id) {
      throw new Error('Invalid params: id is required');
    }
    
    const resource = this.resources.get(params.id);
    if (!resource) {
      throw new Error(`Resource not found: ${params.id}`);
    }
    
    sendResult(ws, id, { resource });
  }

  /**
   * Handle resources/subscribe method
   */
  handleSubscribe(_client: Client, ws: WebSocket, id: string | number, _params: any): void {
    // Implement subscription logic here if needed
    sendResult(ws, id, { subscribed: true });
  }

  /**
   * Get all resources
   */
  getResources(): Map<string, Resource> {
    return this.resources;
  }

  /**
   * Get a specific resource
   */
  getResource(id: string): Resource | undefined {
    return this.resources.get(id);
  }
}

export default ResourceHandler;
