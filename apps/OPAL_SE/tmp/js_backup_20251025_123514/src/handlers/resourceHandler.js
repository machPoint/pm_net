/**
 * Resource Handler
 * Manages resource-related operations and method handling
 */

const { sendResult } = require('../utils/jsonRpc');

class ResourceHandler {
  constructor() {
    this.resources = new Map();
  }

  /**
   * Initialize resources based on API integrations
   * @param {Array} apiIntegrations - Available API integrations
   */
  initializeResources(apiIntegrations) {
    // Clear existing resources
    this.resources.clear();
    
    // Create a resource for each API integration
    apiIntegrations.forEach(api => {
      const resource = {
        id: `api-${api.id}`,
        name: api.name,
        type: 'api',
        description: api.description || `API integration for ${api.name}`,
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
   * @param {Object} client - Client connection info
   * @param {WebSocket} ws - WebSocket connection
   * @param {string|number} id - Request ID
   */
  handleList(client, ws, id) {
    const resourcesList = Array.from(this.resources.values());
    sendResult(ws, id, { resources: resourcesList });
  }

  /**
   * Handle resources/get method
   * @param {Object} client - Client connection info
   * @param {WebSocket} ws - WebSocket connection
   * @param {string|number} id - Request ID
   * @param {Object} params - Request parameters
   */
  handleGet(client, ws, id, params) {
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
   * @param {Object} client - Client connection info
   * @param {WebSocket} ws - WebSocket connection
   * @param {string|number} id - Request ID
   * @param {Object} params - Request parameters
   */
  handleSubscribe(client, ws, id, params) {
    // Implement subscription logic here if needed
    sendResult(ws, id, { subscribed: true });
  }

  /**
   * Get all resources
   * @returns {Map} Map of resources
   */
  getResources() {
    return this.resources;
  }

  /**
   * Get a specific resource
   * @param {string} id - Resource ID
   * @returns {Object|undefined} Resource object if found
   */
  getResource(id) {
    return this.resources.get(id);
  }
}

module.exports = ResourceHandler;
