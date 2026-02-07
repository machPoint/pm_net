/**
 * Jama MCP Server - Sidecar Implementation
 * 
 * This is a standalone MCP server that provides Jama-specific tools
 * for artifact management, requirements tracking, and test management.
 * 
 * This server can run independently and connect to OPAL via the sidecar framework.
 */

const WebSocket = require('ws');
const http = require('http');
const express = require('express');
const { v4: uuidv4 } = require('uuid');

class JamaMCPServer {
  constructor(config = {}) {
    this.config = {
      port: config.port || 3001,
      name: 'jama-mcp',
      version: '1.0.0',
      transport: config.transport || 'http',
      ...config
    };
    
    this.app = express();
    this.server = null;
    this.wss = null;
    this.tools = new Map();
    
    // Mock Jama data store
    this.artifacts = new Map();
    this.projects = new Map();
    this.relationships = new Map();
    
    this.setupRoutes();
    this.initializeTools();
    this.initializeMockData();
  }

  /**
   * Setup Express routes for HTTP transport
   */
  setupRoutes() {
    this.app.use(express.json());
    
    // MCP protocol endpoints
    this.app.post('/mcp/:method', this.handleMCPRequest.bind(this));
    this.app.get('/ping', (req, res) => {
      res.json({ 
        ok: true, 
        system: 'jama', 
        version: this.config.version,
        timestamp: new Date().toISOString()
      });
    });
    
    this.app.get('/capabilities', (req, res) => {
      res.json(this.getCapabilities());
    });
  }

  /**
   * Handle MCP protocol requests
   */
  async handleMCPRequest(req, res) {
    const { method } = req.params;
    const params = req.body;
    
    try {
      const result = await this.invokeTool(method, params);
      res.json({ result });
    } catch (error) {
      res.status(500).json({ 
        error: { 
          code: 'tool_error', 
          message: error.message 
        } 
      });
    }
  }

  /**
   * Initialize Jama-specific tools
   */
  initializeTools() {
    // Artifact management tools
    this.tools.set('artifact.search', {
      description: 'Search for artifacts in Jama',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
          project_id: { type: 'string', description: 'Project ID filter' },
          item_type: { type: 'string', description: 'Artifact type filter' },
          limit: { type: 'integer', description: 'Max results', default: 50 }
        },
        required: ['query']
      },
      processor: this.searchArtifacts.bind(this)
    });

    this.tools.set('artifact.get', {
      description: 'Get artifact by ID',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Artifact ID' },
          include_children: { type: 'boolean', description: 'Include child artifacts' },
          include_relationships: { type: 'boolean', description: 'Include relationships' }
        },
        required: ['id']
      },
      processor: this.getArtifact.bind(this)
    });

    this.tools.set('artifact.create', {
      description: 'Create new artifact',
      inputSchema: {
        type: 'object',
        properties: {
          project_id: { type: 'string', description: 'Project ID' },
          item_type: { type: 'string', description: 'Artifact type' },
          fields: { type: 'object', description: 'Artifact fields' }
        },
        required: ['project_id', 'item_type', 'fields']
      },
      processor: this.createArtifact.bind(this)
    });

    this.tools.set('artifact.update', {
      description: 'Update existing artifact',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Artifact ID' },
          fields: { type: 'object', description: 'Fields to update' },
          lock_version: { type: 'integer', description: 'Version for optimistic locking' }
        },
        required: ['id', 'fields']
      },
      processor: this.updateArtifact.bind(this)
    });

    this.tools.set('artifact.transition', {
      description: 'Transition artifact workflow state',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Artifact ID' },
          transition: { type: 'string', description: 'Transition name' },
          comment: { type: 'string', description: 'Optional comment' }
        },
        required: ['id', 'transition']
      },
      processor: this.transitionArtifact.bind(this)
    });

    this.tools.set('artifact.links', {
      description: 'Get artifact relationships/links',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Artifact ID' },
          direction: { type: 'string', enum: ['upstream', 'downstream', 'both'], default: 'both' }
        },
        required: ['id']
      },
      processor: this.getArtifactLinks.bind(this)
    });

    // Event and sync tools
    this.tools.set('events.consume', {
      description: 'Consume events from Jama',
      inputSchema: {
        type: 'object',
        properties: {
          cursor: { type: 'string', description: 'Event cursor' },
          limit: { type: 'integer', description: 'Max events', default: 100 }
        },
        required: []
      },
      processor: this.consumeEvents.bind(this)
    });

    this.tools.set('sync.backfill', {
      description: 'Perform backfill sync',
      inputSchema: {
        type: 'object',
        properties: {
          since: { type: 'string', description: 'ISO8601 timestamp' },
          project_ids: { type: 'array', items: { type: 'string' }, description: 'Project filters' },
          limit: { type: 'integer', description: 'Max items', default: 1000 }
        },
        required: []
      },
      processor: this.performBackfill.bind(this)
    });
  }

  /**
   * Initialize mock data for testing
   */
  initializeMockData() {
    // Create mock projects
    this.projects.set('PROJ-001', {
      id: 'PROJ-001',
      name: 'Sample Requirements Project',
      description: 'Mock project for testing',
      created: '2024-01-01T00:00:00Z'
    });

    // Create mock artifacts
    const artifacts = [
      {
        id: 'REQ-001',
        project_id: 'PROJ-001',
        item_type: 'requirement',
        fields: {
          name: 'User Authentication',
          description: 'System shall provide user authentication capabilities',
          priority: 'High',
          status: 'Draft'
        },
        created: '2024-01-01T10:00:00Z',
        modified: '2024-01-01T10:00:00Z',
        lock_version: 1
      },
      {
        id: 'REQ-002',
        project_id: 'PROJ-001',
        item_type: 'requirement',
        fields: {
          name: 'Password Security',
          description: 'Passwords must meet complexity requirements',
          priority: 'Medium',
          status: 'Approved'
        },
        created: '2024-01-01T11:00:00Z',
        modified: '2024-01-01T11:00:00Z',
        lock_version: 1
      },
      {
        id: 'TEST-001',
        project_id: 'PROJ-001',
        item_type: 'test_case',
        fields: {
          name: 'Login Test',
          description: 'Verify user can login with valid credentials',
          priority: 'High',
          status: 'Draft'
        },
        created: '2024-01-01T12:00:00Z',
        modified: '2024-01-01T12:00:00Z',
        lock_version: 1
      }
    ];

    artifacts.forEach(artifact => {
      this.artifacts.set(artifact.id, artifact);
    });

    // Create mock relationships
    this.relationships.set('REQ-002->REQ-001', {
      id: 'REL-001',
      from_item: 'REQ-002',
      to_item: 'REQ-001',
      relationship_type: 'derives_from'
    });

    this.relationships.set('TEST-001->REQ-001', {
      id: 'REL-002',
      from_item: 'TEST-001',
      to_item: 'REQ-001',
      relationship_type: 'verifies'
    });
  }

  /**
   * Start the MCP server
   */
  async start() {
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(this.config.port, (err) => {
        if (err) {
          reject(err);
          return;
        }
        
        console.log(`Jama MCP Server listening on port ${this.config.port}`);
        console.log(`Transport: ${this.config.transport}`);
        resolve();
      });
    });
  }

  /**
   * Stop the server
   */
  async stop() {
    if (this.server) {
      this.server.close();
    }
    if (this.wss) {
      this.wss.close();
    }
  }

  /**
   * Get server capabilities
   */
  getCapabilities() {
    return {
      tools: Array.from(this.tools.keys()),
      webhooks: true,
      limits: {
        rate_limit: 1000,
        max_query_results: 1000
      },
      system: 'jama',
      version: this.config.version
    };
  }

  /**
   * Invoke a tool by name
   */
  async invokeTool(toolName, params) {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`Tool '${toolName}' not found`);
    }
    
    return await tool.processor(params);
  }

  // Tool implementations
  async searchArtifacts(params) {
    const { query, project_id, item_type, limit = 50 } = params;
    
    let results = Array.from(this.artifacts.values());
    
    // Apply filters
    if (project_id) {
      results = results.filter(a => a.project_id === project_id);
    }
    
    if (item_type) {
      results = results.filter(a => a.item_type === item_type);
    }
    
    // Simple text search
    if (query) {
      const lowerQuery = query.toLowerCase();
      results = results.filter(a => 
        a.fields.name.toLowerCase().includes(lowerQuery) ||
        a.fields.description.toLowerCase().includes(lowerQuery)
      );
    }
    
    return {
      results: results.slice(0, limit),
      total: results.length
    };
  }

  async getArtifact(params) {
    const { id, include_children = false, include_relationships = false } = params;
    
    const artifact = this.artifacts.get(id);
    if (!artifact) {
      throw new Error(`Artifact '${id}' not found`);
    }
    
    const result = { ...artifact };
    
    if (include_relationships) {
      result.relationships = this.getArtifactRelationships(id);
    }
    
    return result;
  }

  async createArtifact(params) {
    const { project_id, item_type, fields } = params;
    
    const id = `${item_type.toUpperCase()}-${String(this.artifacts.size + 1).padStart(3, '0')}`;
    
    const artifact = {
      id,
      project_id,
      item_type,
      fields,
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      lock_version: 1
    };
    
    this.artifacts.set(id, artifact);
    
    return { id, created: true };
  }

  async updateArtifact(params) {
    const { id, fields, lock_version } = params;
    
    const artifact = this.artifacts.get(id);
    if (!artifact) {
      throw new Error(`Artifact '${id}' not found`);
    }
    
    if (lock_version && artifact.lock_version !== lock_version) {
      throw new Error(`Version conflict: expected ${lock_version}, got ${artifact.lock_version}`);
    }
    
    artifact.fields = { ...artifact.fields, ...fields };
    artifact.modified = new Date().toISOString();
    artifact.lock_version += 1;
    
    return { updated: true, lock_version: artifact.lock_version };
  }

  async transitionArtifact(params) {
    const { id, transition, comment } = params;
    
    const artifact = this.artifacts.get(id);
    if (!artifact) {
      throw new Error(`Artifact '${id}' not found`);
    }
    
    // Simple state transitions (extend as needed)
    const transitions = {
      'approve': 'Approved',
      'reject': 'Rejected',
      'complete': 'Completed'
    };
    
    if (transitions[transition]) {
      artifact.fields.status = transitions[transition];
      artifact.modified = new Date().toISOString();
      artifact.lock_version += 1;
    }
    
    return { transitioned: true, new_status: artifact.fields.status };
  }

  async getArtifactLinks(params) {
    const { id, direction = 'both' } = params;
    
    return this.getArtifactRelationships(id, direction);
  }

  getArtifactRelationships(artifactId, direction = 'both') {
    const relationships = [];
    
    for (const [key, rel] of this.relationships) {
      const shouldInclude = 
        (direction === 'both') ||
        (direction === 'upstream' && rel.to_item === artifactId) ||
        (direction === 'downstream' && rel.from_item === artifactId);
        
      if (shouldInclude && (rel.from_item === artifactId || rel.to_item === artifactId)) {
        relationships.push(rel);
      }
    }
    
    return relationships;
  }

  async consumeEvents(params) {
    const { cursor, limit = 100 } = params;
    
    // Mock events - in production, integrate with Jama webhooks
    const events = [
      {
        id: uuidv4(),
        type: 'artifact.updated',
        artifact_id: 'REQ-001',
        timestamp: new Date().toISOString(),
        data: { field: 'status', old_value: 'Draft', new_value: 'Review' }
      }
    ];
    
    return {
      events,
      next_cursor: `cursor_${Date.now()}`
    };
  }

  async performBackfill(params) {
    const { since, project_ids, limit = 1000 } = params;
    
    let items = Array.from(this.artifacts.values());
    
    if (project_ids && project_ids.length > 0) {
      items = items.filter(item => project_ids.includes(item.project_id));
    }
    
    if (since) {
      items = items.filter(item => item.modified >= since);
    }
    
    return {
      items: items.slice(0, limit),
      next_cursor: items.length > limit ? `backfill_${Date.now()}` : null
    };
  }
}

// Export for use as module
module.exports = JamaMCPServer;

// If run directly, start the server
if (require.main === module) {
  const server = new JamaMCPServer({ port: 3001 });
  
  server.start().then(() => {
    console.log('Jama MCP Server is running!');
    console.log('Test with: curl http://localhost:3001/ping');
  }).catch(console.error);
  
  process.on('SIGTERM', () => server.stop());
  process.on('SIGINT', () => server.stop());
}