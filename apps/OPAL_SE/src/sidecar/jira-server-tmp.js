/**
 * Jira MCP Server - Sidecar Implementation (Placeholder)
 * 
 * This is a placeholder for a Jira MCP server that would provide
 * issue management, project tracking, and workflow tools.
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');

class JiraMCPServer {
  constructor(config = {}) {
    this.config = {
      port: config.port || 3002,
      name: 'jira-mcp',
      version: '1.0.0',
      ...config
    };
    
    this.app = express();
    this.server = null;
    this.tools = new Map();
    
    // Mock Jira data
    this.issues = new Map();
    this.projects = new Map();
    
    this.setupRoutes();
    this.initializeTools();
    this.initializeMockData();
  }

  setupRoutes() {
    this.app.use(express.json());
    
    this.app.post('/mcp/:method', this.handleMCPRequest.bind(this));
    this.app.get('/ping', (req, res) => {
      res.json({ 
        ok: true, 
        system: 'jira', 
        version: this.config.version,
        timestamp: new Date().toISOString()
      });
    });
    
    this.app.get('/capabilities', (req, res) => {
      res.json({
        tools: Array.from(this.tools.keys()),
        webhooks: true,
        limits: { rate_limit: 1000 },
        system: 'jira',
        version: this.config.version
      });
    });
  }

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

  initializeTools() {
    // Issue management tools
    this.tools.set('issue.search', {
      description: 'Search for issues in Jira',
      processor: this.searchIssues.bind(this)
    });

    this.tools.set('issue.get', {
      description: 'Get issue by key',
      processor: this.getIssue.bind(this)
    });

    this.tools.set('issue.create', {
      description: 'Create new issue',
      processor: this.createIssue.bind(this)
    });

    this.tools.set('issue.update', {
      description: 'Update existing issue',
      processor: this.updateIssue.bind(this)
    });

    this.tools.set('issue.transition', {
      description: 'Transition issue workflow',
      processor: this.transitionIssue.bind(this)
    });
  }

  initializeMockData() {
    // Mock project
    this.projects.set('DEMO', {
      id: 'DEMO',
      name: 'Demo Project',
      description: 'Demo project for testing'
    });

    // Mock issues
    const issues = [
      {
        key: 'DEMO-1',
        summary: 'Implement user authentication',
        description: 'Add OAuth 2.0 authentication to the application',
        status: 'To Do',
        priority: 'High',
        project: 'DEMO',
        created: '2024-01-01T10:00:00Z'
      },
      {
        key: 'DEMO-2',
        summary: 'Fix login bug',
        description: 'Users unable to login with special characters in password',
        status: 'In Progress', 
        priority: 'Medium',
        project: 'DEMO',
        created: '2024-01-01T11:00:00Z'
      }
    ];

    issues.forEach(issue => {
      this.issues.set(issue.key, issue);
    });
  }

  async start() {
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(this.config.port, (err) => {
        if (err) {
          reject(err);
          return;
        }
        console.log(`Jira MCP Server listening on port ${this.config.port}`);
        resolve();
      });
    });
  }

  async stop() {
    if (this.server) {
      this.server.close();
    }
  }

  async invokeTool(toolName, params) {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`Tool '${toolName}' not found`);
    }
    return await tool.processor(params);
  }

  // Tool implementations
  async searchIssues(params) {
    const { query, project, status, limit = 50 } = params;
    
    let results = Array.from(this.issues.values());
    
    if (project) {
      results = results.filter(i => i.project === project);
    }
    
    if (status) {
      results = results.filter(i => i.status === status);
    }
    
    if (query) {
      const lowerQuery = query.toLowerCase();
      results = results.filter(i => 
        i.summary.toLowerCase().includes(lowerQuery) ||
        i.description.toLowerCase().includes(lowerQuery)
      );
    }
    
    return {
      results: results.slice(0, limit),
      total: results.length
    };
  }

  async getIssue(params) {
    const { key } = params;
    const issue = this.issues.get(key);
    
    if (!issue) {
      throw new Error(`Issue '${key}' not found`);
    }
    
    return issue;
  }

  async createIssue(params) {
    const { project, summary, description, priority = 'Medium' } = params;
    
    const issueNum = this.issues.size + 1;
    const key = `${project}-${issueNum}`;
    
    const issue = {
      key,
      summary,
      description,
      status: 'To Do',
      priority,
      project,
      created: new Date().toISOString()
    };
    
    this.issues.set(key, issue);
    
    return { key, created: true };
  }

  async updateIssue(params) {
    const { key, ...updates } = params;
    
    const issue = this.issues.get(key);
    if (!issue) {
      throw new Error(`Issue '${key}' not found`);
    }
    
    Object.assign(issue, updates);
    issue.updated = new Date().toISOString();
    
    return { updated: true };
  }

  async transitionIssue(params) {
    const { key, transition } = params;
    
    const issue = this.issues.get(key);
    if (!issue) {
      throw new Error(`Issue '${key}' not found`);
    }
    
    const transitions = {
      'start': 'In Progress',
      'resolve': 'Done',
      'reopen': 'To Do'
    };
    
    if (transitions[transition]) {
      issue.status = transitions[transition];
      issue.updated = new Date().toISOString();
    }
    
    return { transitioned: true, new_status: issue.status };
  }
}

module.exports = JiraMCPServer;

// If run directly, start the server
if (require.main === module) {
  const server = new JiraMCPServer({ port: 3002 });
  
  server.start().then(() => {
    console.log('Jira MCP Server is running!');
    console.log('Test with: curl http://localhost:3002/ping');
  }).catch(console.error);
  
  process.on('SIGTERM', () => server.stop());
  process.on('SIGINT', () => server.stop());
}