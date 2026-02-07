/**
 * OPAL Sidecar MCP Connector Framework
 * 
 * This module provides the core infrastructure for connecting to external
 * MCP servers (sidecars) like Jama, Jira, etc. in a uniform way.
 */

const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const logger = require('../logger').default || require('../logger');

class SidecarManager {
  constructor(configs, wss) {
    this.configs = configs;
    this.wss = wss;
    this.adapters = new Map(); // Registered sidecar adapters
    this.connections = new Map(); // Active connections
    this.tools = new Map(); // Sidecar tools registry
  }

  /**
   * Initialize the sidecar manager and register core tools
   */
  async initialize() {
    logger.info('Initializing Sidecar MCP Connector...');
    
    await this.registerSidecarTools();
    
    logger.info(`Sidecar MCP Connector initialized with ${this.tools.size} management tools`);
  }

  /**
   * Register sidecar management tools with the main OPAL server
   */
  async registerSidecarTools() {
    const toolCreator = require('../utils/toolCreator');
    
    // 1. Registry and lifecycle tools
    await this.createSidecarTool(toolCreator, 'sidecar.register', 
      'Register a new sidecar MCP server', this.registerSidecar.bind(this));
    
    await this.createSidecarTool(toolCreator, 'sidecar.list', 
      'List all registered sidecar adapters', this.listSidecars.bind(this));
    
    await this.createSidecarTool(toolCreator, 'sidecar.health', 
      'Check health of a sidecar adapter', this.checkSidecarHealth.bind(this));
    
    await this.createSidecarTool(toolCreator, 'sidecar.disconnect', 
      'Disconnect from a sidecar adapter', this.disconnectSidecar.bind(this));
    
    // 2. Capability discovery tools
    await this.createSidecarTool(toolCreator, 'sidecar.capabilities', 
      'Get capabilities of a sidecar adapter', this.getSidecarCapabilities.bind(this));
    
    await this.createSidecarTool(toolCreator, 'sidecar.describe_tool', 
      'Get schema for a specific sidecar tool', this.describeSidecarTool.bind(this));
    
    // 3. Invocation proxy
    await this.createSidecarTool(toolCreator, 'sidecar.invoke', 
      'Invoke a tool on a sidecar adapter', this.invokeSidecarTool.bind(this));
    
    // 4. Event plumbing tools
    await this.createSidecarTool(toolCreator, 'sidecar.events.pull', 
      'Pull events from a sidecar adapter', this.pullSidecarEvents.bind(this));
    
    await this.createSidecarTool(toolCreator, 'sidecar.events.ack', 
      'Acknowledge processed events', this.ackSidecarEvents.bind(this));
    
    await this.createSidecarTool(toolCreator, 'sidecar.events.push', 
      'Push events to a sidecar adapter', this.pushSidecarEvents.bind(this));
    
    // 5. Cursor and sync helpers
    await this.createSidecarTool(toolCreator, 'sidecar.cursor.info', 
      'Get cursor information for a sidecar', this.getSidecarCursors.bind(this));
    
    await this.createSidecarTool(toolCreator, 'sidecar.cursor.set', 
      'Set cursors for a sidecar', this.setSidecarCursors.bind(this));
    
    await this.createSidecarTool(toolCreator, 'sidecar.sync.backfill', 
      'Perform backfill sync with a sidecar', this.syncSidecarBackfill.bind(this));
  }

  /**
   * Helper to create sidecar management tools
   */
  async createSidecarTool(toolCreator, name, description, processor) {
    const schema = this.getSidecarToolSchema(name);
    
    await toolCreator.createTool(this.configs, this.wss, {
      name,
      description,
      inputSchema: schema,
      _internal: {
        method: 'POST',
        path: `/sidecar/${name.replace('sidecar.', '').replace('.', '/')}`,
        processor: async (params) => {
          try {
            return await processor(params);
          } catch (error) {
            logger.error(`Sidecar tool ${name} error:`, error);
            return { 
              error: { 
                code: 'sidecar_error', 
                message: error.message, 
                retriable: error.retriable || false 
              } 
            };
          }
        }
      }
    });
    
    this.tools.set(name, { description, processor });
  }

  /**
   * Get input schema for sidecar tools
   */
  getSidecarToolSchema(toolName) {
    const schemas = {
      'sidecar.register': {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Sidecar name' },
          url: { type: 'string', description: 'Sidecar URL' },
          transport: { type: 'string', enum: ['wss', 'http'], description: 'Transport type' },
          auth: { type: 'object', description: 'Authentication configuration' },
          tenant: { type: 'string', description: 'Tenant identifier' },
          scopes: { type: 'array', items: { type: 'string' }, description: 'Permission scopes' }
        },
        required: ['name', 'url', 'transport', 'auth']
      },
      'sidecar.list': {
        type: 'object',
        properties: {},
        required: []
      },
      'sidecar.health': {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Sidecar name' }
        },
        required: ['name']
      },
      'sidecar.capabilities': {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Sidecar name' }
        },
        required: ['name']
      },
      'sidecar.invoke': {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Sidecar name' },
          tool: { type: 'string', description: 'Tool name' },
          args: { type: 'object', description: 'Tool arguments' }
        },
        required: ['name', 'tool', 'args']
      }
    };
    
    return schemas[toolName] || { type: 'object', properties: {} };
  }

  /**
   * Register a new sidecar adapter
   */
  async registerSidecar(params) {
    const { name, url, transport, auth, tenant, scopes = [] } = params;
    
    if (this.adapters.has(name)) {
      throw new Error(`Sidecar ${name} already registered`);
    }
    
    const adapter = {
      name,
      url,
      transport,
      auth,
      tenant,
      scopes,
      registered: new Date().toISOString(),
      status: 'registered',
      last_seen: null,
      capabilities: null
    };
    
    this.adapters.set(name, adapter);
    
    logger.info(`Registered sidecar: ${name} at ${url}`);
    
    // Attempt initial connection
    try {
      await this.connectToSidecar(name);
    } catch (error) {
      logger.warn(`Failed to connect to sidecar ${name}: ${error.message}`);
      adapter.status = 'connection_failed';
    }
    
    return { name, status: adapter.status };
  }

  /**
   * List all registered sidecars
   */
  async listSidecars() {
    const adapters = [];
    
    for (const [name, adapter] of this.adapters) {
      adapters.push({
        name: adapter.name,
        url: adapter.url,
        system: adapter.capabilities?.system || null,
        status: adapter.status,
        last_seen: adapter.last_seen
      });
    }
    
    return { adapters };
  }

  /**
   * Check health of a sidecar
   */
  async checkSidecarHealth(params) {
    const { name } = params;
    
    if (!this.adapters.has(name)) {
      throw new Error(`Sidecar ${name} not found`);
    }
    
    const adapter = this.adapters.get(name);
    
    try {
      // Attempt to ping the sidecar
      const response = await this.invokeSidecarMethod(name, 'ping', {});
      
      adapter.last_seen = new Date().toISOString();
      adapter.status = 'healthy';
      
      return {
        reachable: true,
        system: response.system || 'unknown',
        version: response.version || 'unknown',
        auth_ok: true,
        rate_budgets: response.rate_budgets || null
      };
    } catch (error) {
      adapter.status = 'unhealthy';
      return {
        reachable: false,
        system: null,
        version: null,
        auth_ok: false,
        rate_budgets: null
      };
    }
  }

  /**
   * Get capabilities of a sidecar
   */
  async getSidecarCapabilities(params) {
    const { name } = params;
    
    const adapter = this.adapters.get(name);
    if (!adapter) {
      throw new Error(`Sidecar ${name} not found`);
    }
    
    if (!adapter.capabilities) {
      // Fetch capabilities from sidecar
      try {
        const response = await this.invokeSidecarMethod(name, 'capabilities', {});
        adapter.capabilities = response;
      } catch (error) {
        throw new Error(`Failed to get capabilities from ${name}: ${error.message}`);
      }
    }
    
    return adapter.capabilities;
  }

  /**
   * Invoke a tool on a sidecar adapter
   */
  async invokeSidecarTool(params) {
    const { name, tool, args } = params;
    
    // Check RBAC and policy before proxying
    // TODO: Integrate with rbac.check and policy.enforce
    
    return await this.invokeSidecarMethod(name, tool, args);
  }

  /**
   * Connect to a sidecar adapter
   */
  async connectToSidecar(name) {
    const adapter = this.adapters.get(name);
    if (!adapter) {
      throw new Error(`Sidecar ${name} not registered`);
    }
    
    if (adapter.transport === 'wss') {
      const ws = new WebSocket(adapter.url);
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 10000);
        
        ws.on('open', () => {
          clearTimeout(timeout);
          this.connections.set(name, { type: 'websocket', connection: ws });
          adapter.status = 'connected';
          adapter.last_seen = new Date().toISOString();
          logger.info(`Connected to sidecar: ${name}`);
          resolve();
        });
        
        ws.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });
    } else {
      // HTTP connection - just validate the endpoint
      const response = await fetch(`${adapter.url}/ping`);
      if (!response.ok) {
        throw new Error(`HTTP sidecar ${name} not reachable`);
      }
      adapter.status = 'connected';
      adapter.last_seen = new Date().toISOString();
    }
  }

  /**
   * Invoke a method on a sidecar
   */
  async invokeSidecarMethod(name, method, args) {
    const adapter = this.adapters.get(name);
    if (!adapter) {
      throw new Error(`Sidecar ${name} not found`);
    }
    
    // For demo purposes, return mock responses
    // In production, this would actually call the sidecar
    const mockResponses = {
      'ping': { ok: true, system: 'mock', version: '1.0.0' },
      'capabilities': { 
        tools: ['artifact.search', 'artifact.get', 'artifact.create'],
        webhooks: true,
        limits: { rate_limit: 1000 }
      }
    };
    
    logger.info(`Invoking ${method} on sidecar ${name} with args:`, args);
    
    return mockResponses[method] || { result: 'mock_response', method, args };
  }

  // Placeholder implementations for remaining methods
  async disconnectSidecar(params) { return { ok: true }; }
  async describeSidecarTool(params) { return { schema: {} }; }
  async pullSidecarEvents(params) { return { events: [], next_cursor: null }; }
  async ackSidecarEvents(params) { return { ok: true }; }
  async pushSidecarEvents(params) { return { accepted: params.events?.length || 0 }; }
  async getSidecarCursors(params) { return { cursors: {} }; }
  async setSidecarCursors(params) { return { ok: true }; }
  async syncSidecarBackfill(params) { return { items: [], next_cursor: null }; }
}

module.exports = SidecarManager;