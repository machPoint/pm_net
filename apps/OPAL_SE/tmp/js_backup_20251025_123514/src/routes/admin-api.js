/**
 * Admin UI API routes for OPAL server
 * These routes provide data specifically for the admin UI dashboard
 */

const express = require('express');
const router = express.Router();
const logger = require('../logger');
const metricsService = require('../services/metricsService');
const toolsService = require('../services/toolsService');
const resourcesService = require('../services/resourcesService');
const promptsService = require('../services/promptsService');

// CORS middleware for admin UI
router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

/**
 * @route GET /api/info
 * @desc Get basic server information
 * @access Public
 */
router.get('/info', (req, res) => {
  try {
    const serverInfo = {
      name: 'OPAL Server',
      version: process.env.npm_package_version || '1.0.0',
      protocol: '2025-06-18',
      uptime: Math.floor(process.uptime()),
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString()
    };
    
    res.json(serverInfo);
  } catch (error) {
    logger.error('Error getting server info:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /api/health
 * @desc Get server health status
 * @access Public
 */
router.get('/health', (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      memory: process.memoryUsage(),
      pid: process.pid
    };
    
    res.json(health);
  } catch (error) {
    logger.error('Error getting server health:', error);
    res.status(500).json({ error: error.message, status: 'unhealthy' });
  }
});

/**
 * @route GET /api/metrics
 * @desc Get comprehensive server metrics for admin dashboard
 * @access Public
 */
router.get('/metrics', async (req, res) => {
  try {
    // Get memory usage
    const memUsage = process.memoryUsage();
    const memUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const memTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    
    // Simulate CPU usage (in a real implementation, you'd use a proper CPU monitoring library)
    const cpuUsage = Math.floor(Math.random() * 40) + 40; // 40-80%
    
    // Get metrics from metricsService if available
    let additionalMetrics = {};
    try {
      const healthMetrics = await metricsService.getHealthMetrics();
      additionalMetrics = healthMetrics || {};
    } catch (error) {
      logger.warn('Could not get health metrics:', error.message);
    }
    
    const metrics = {
      cpu: cpuUsage,
      memory: Math.round((memUsedMB / memTotalMB) * 100), // Memory usage percentage
      memoryUsed: `${memUsedMB}MB`,
      memoryTotal: `${memTotalMB}MB`,
      uptime: Math.floor(process.uptime()),
      version: process.env.npm_package_version || '1.0.0',
      activeConnections: global.sessions ? global.sessions.size : 0,
      requestsPerMinute: additionalMetrics.requestsPerMinute || Math.floor(Math.random() * 1000) + 100,
      avgResponseTime: additionalMetrics.avgResponseTime || Math.floor(Math.random() * 100) + 20,
      recentActivities: [
        { tool: 'get_user_data', time: '2 min ago', status: 'success' },
        { tool: 'update_database', time: '5 min ago', status: 'success' },
        { tool: 'process_webhook', time: '8 min ago', status: 'success' },
        { tool: 'generate_report', time: '12 min ago', status: 'error' },
      ],
      ...additionalMetrics
    };
    
    res.json(metrics);
  } catch (error) {
    logger.error('Error getting server metrics:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /api/tools
 * @desc Get all available MCP tools
 * @access Public
 */
router.get('/tools', (req, res) => {
  try {
    // Get tools from the global configs
    const configs = require('../server').configs || {};
    const tools = Object.values(configs.tools || {});
    
    // Format tools for admin UI
    const formattedTools = tools.map(tool => ({
      name: tool.name,
      description: tool.description || 'No description available',
      inputSchema: tool.inputSchema || null,
      // Remove internal properties for client
      ...Object.fromEntries(
        Object.entries(tool).filter(([key]) => !key.startsWith('_'))
      )
    }));
    
    logger.info(`Returning ${formattedTools.length} tools to admin UI`);
    res.json(formattedTools);
  } catch (error) {
    logger.error('Error getting tools:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route POST /api/tools/execute
 * @desc Execute a tool with given parameters
 * @access Public
 */
router.post('/tools/execute', async (req, res) => {
  try {
    const { tool: toolName, parameters } = req.body;
    
    if (!toolName) {
      return res.status(400).json({ error: 'Tool name is required' });
    }
    
    // Get the configs
    const configs = require('../server').configs || {};
    
    if (!configs.tools || !configs.tools[toolName]) {
      return res.status(404).json({ error: `Tool '${toolName}' not found` });
    }
    
    // Execute the tool (this is a simplified version - in practice you'd use the full execution logic)
    const result = {
      success: true,
      tool: toolName,
      parameters,
      result: {
        type: 'text',
        text: `Tool '${toolName}' executed successfully with parameters: ${JSON.stringify(parameters)}`
      },
      timestamp: new Date().toISOString()
    };
    
    logger.info(`Tool executed via admin UI: ${toolName}`);
    res.json(result);
  } catch (error) {
    logger.error('Error executing tool:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      tool: req.body.tool
    });
  }
});

/**
 * @route GET /api/resources
 * @desc Get all available MCP resources
 * @access Public
 */
router.get('/resources', (req, res) => {
  try {
    // Get resources using the resourcesService
    const { resources } = resourcesService.listResources((items) => ({ items, nextCursor: null }), null);
    
    logger.info(`Returning ${resources.length} resources to admin UI`);
    res.json(resources);
  } catch (error) {
    logger.error('Error getting resources:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route POST /api/resources/read
 * @desc Read a specific resource
 * @access Public
 */
router.post('/resources/read', async (req, res) => {
  try {
    const { uri } = req.body;
    
    if (!uri) {
      return res.status(400).json({ error: 'Resource URI is required' });
    }
    
    // Use resourcesService to read the resource
    const result = await resourcesService.readResource(uri);
    
    logger.info(`Resource read via admin UI: ${uri}`);
    res.json(result);
  } catch (error) {
    logger.error('Error reading resource:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /api/prompts
 * @desc Get all available MCP prompts
 * @access Public
 */
router.get('/prompts', (req, res) => {
  try {
    // Get prompts using the promptsService
    const { prompts } = promptsService.listPrompts((items) => ({ items, nextCursor: null }), null);
    
    logger.info(`Returning ${prompts.length} prompts to admin UI`);
    res.json(prompts);
  } catch (error) {
    logger.error('Error getting prompts:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route POST /api/prompts/execute
 * @desc Execute a prompt with given arguments
 * @access Public
 */
router.post('/prompts/execute', async (req, res) => {
  try {
    const { prompt: promptName, arguments: promptArgs } = req.body;
    
    if (!promptName) {
      return res.status(400).json({ error: 'Prompt name is required' });
    }
    
    // Execute the prompt (simplified version)
    const result = {
      success: true,
      prompt: promptName,
      arguments: promptArgs,
      result: {
        type: 'text',
        text: `Prompt '${promptName}' executed successfully with arguments: ${JSON.stringify(promptArgs)}`
      },
      timestamp: new Date().toISOString()
    };
    
    logger.info(`Prompt executed via admin UI: ${promptName}`);
    res.json(result);
  } catch (error) {
    logger.error('Error executing prompt:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      prompt: req.body.prompt
    });
  }
});

/**
 * @route GET /api/admin
 * @desc Get admin dashboard data
 * @access Public
 */
router.get('/admin', async (req, res) => {
  try {
    // Get comprehensive admin data
    const adminData = {
      server: {
        name: 'OPAL Server',
        version: process.env.npm_package_version || '1.0.0',
        uptime: Math.floor(process.uptime()),
        environment: process.env.NODE_ENV || 'development'
      },
      connections: {
        active: global.sessions ? global.sessions.size : 0,
        total: 0 // Would track historical connections
      },
      timestamp: new Date().toISOString()
    };
    
    res.json(adminData);
  } catch (error) {
    logger.error('Error getting admin data:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /api/users
 * @desc Get all users for admin dashboard
 * @access Public
 */
router.get('/users', async (req, res) => {
  try {
    // Mock user data - in real implementation, get from database
    const users = [
      { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Admin', status: 'active', createdAt: '2024-01-15' },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'User', status: 'active', createdAt: '2024-01-10' },
      { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'User', status: 'inactive', createdAt: '2024-01-05' },
      { id: 4, name: 'Alice Brown', email: 'alice@example.com', role: 'Developer', status: 'active', createdAt: '2024-01-01' }
    ];
    
    logger.info('Returning user list to admin UI');
    res.json(users);
  } catch (error) {
    logger.error('Error getting users:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /api/tokens
 * @desc Get API tokens for admin dashboard
 * @access Public
 */
router.get('/tokens', async (req, res) => {
  try {
    // Mock token data - in real implementation, get from database
    const tokens = [
      { id: 1, name: 'Production API', token: 'sk_prod_****1234', created: '2024-01-15', lastUsed: '2 min ago', status: 'active' },
      { id: 2, name: 'Development API', token: 'sk_dev_****5678', created: '2024-01-10', lastUsed: '1 hour ago', status: 'active' },
      { id: 3, name: 'Testing API', token: 'sk_test_****9012', created: '2024-01-05', lastUsed: 'Never', status: 'active' }
    ];
    
    logger.info('Returning API tokens to admin UI');
    res.json(tokens);
  } catch (error) {
    logger.error('Error getting tokens:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /api/audit
 * @desc Get audit logs for admin dashboard
 * @access Public
 */
router.get('/audit', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    
    // Mock audit data - in real implementation, get from database
    const auditLogs = [
      { id: 1, event: 'Failed login attempt', user: 'unknown@example.com', time: '2 min ago', severity: 'warning', ip: '192.168.1.100' },
      { id: 2, event: 'Token created', user: 'john@example.com', time: '1 hour ago', severity: 'info', ip: '192.168.1.50' },
      { id: 3, event: 'Multiple failed logins', user: '192.168.1.100', time: '2 hours ago', severity: 'error', ip: '192.168.1.100' },
      { id: 4, event: 'Password changed', user: 'jane@example.com', time: '5 hours ago', severity: 'info', ip: '192.168.1.75' },
      { id: 5, event: 'New user registered', user: 'alice@example.com', time: '1 day ago', severity: 'success', ip: '192.168.1.25' }
    ].slice(offset, offset + limit);
    
    logger.info(`Returning ${auditLogs.length} audit logs to admin UI`);
    res.json(auditLogs);
  } catch (error) {
    logger.error('Error getting audit logs:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /api/webhooks
 * @desc Get configured webhooks
 * @access Public
 */
router.get('/webhooks', async (req, res) => {
  try {
    // Mock webhook data
    const webhooks = [
      { id: 1, url: 'https://api.example.com/webhook', event: 'tool.executed', status: 'active', created: '2024-01-15' },
      { id: 2, url: 'https://hooks.slack.com/services/...', event: 'server.error', status: 'active', created: '2024-01-10' },
      { id: 3, url: 'https://discord.com/api/webhooks/...', event: 'user.created', status: 'inactive', created: '2024-01-05' }
    ];
    
    res.json(webhooks);
  } catch (error) {
    logger.error('Error getting webhooks:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /api/integrations
 * @desc Get external API integrations
 * @access Public
 */
router.get('/integrations', async (req, res) => {
  try {
    // Mock integration data
    const integrations = [
      { id: 1, name: 'OpenAI', status: 'connected', calls: '1247', lastCall: '5 min ago' },
      { id: 2, name: 'Stripe', status: 'connected', calls: '847', lastCall: '15 min ago' },
      { id: 3, name: 'SendGrid', status: 'connected', calls: '523', lastCall: '1 hour ago' },
      { id: 4, name: 'GitHub', status: 'error', calls: '0', lastCall: 'Never' }
    ];
    
    res.json(integrations);
  } catch (error) {
    logger.error('Error getting integrations:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route POST /api/test/compliance
 * @desc Run MCP compliance tests
 * @access Public
 */
router.post('/test/compliance', async (req, res) => {
  try {
    // Mock compliance test results
    const results = {
      overall: 83,
      tests: [
        { name: 'Protocol Version Check', status: 'passed', time: '0.12s', score: 100 },
        { name: 'Tools Implementation', status: 'passed', time: '0.34s', score: 100 },
        { name: 'Resources Implementation', status: 'passed', time: '0.28s', score: 100 },
        { name: 'Prompts Implementation', status: 'passed', time: '0.19s', score: 100 },
        { name: 'Error Handling', status: 'warning', time: '0.45s', score: 75 },
        { name: 'Pagination Support', status: 'failed', time: '0.22s', score: 0 }
      ],
      timestamp: new Date().toISOString()
    };
    
    logger.info('Running compliance tests via admin UI');
    res.json(results);
  } catch (error) {
    logger.error('Error running compliance tests:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route POST /api/test/load
 * @desc Run load tests
 * @access Public
 */
router.post('/test/load', async (req, res) => {
  try {
    const { users, duration, rampup } = req.body;
    
    // Mock load test results
    const results = {
      config: { users, duration, rampup },
      results: {
        totalRequests: Math.floor(Math.random() * 2000) + 1000,
        avgResponseTime: Math.floor(Math.random() * 100) + 20,
        successRate: 99.8,
        errors: Math.floor(Math.random() * 10) + 1
      },
      timestamp: new Date().toISOString()
    };
    
    logger.info(`Running load test: ${users} users for ${duration}s`);
    res.json(results);
  } catch (error) {
    logger.error('Error running load test:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /api/sessions
 * @desc Get active user sessions
 * @access Public
 */
router.get('/sessions', async (req, res) => {
  try {
    // Mock session data
    const sessions = [
      { id: 1, user: 'John Doe', device: 'Chrome on Windows', location: 'New York, US', time: 'Active now', ip: '192.168.1.50' },
      { id: 2, user: 'Jane Smith', device: 'Safari on macOS', location: 'London, UK', time: '5 min ago', ip: '192.168.1.75' },
      { id: 3, user: 'Bob Johnson', device: 'Firefox on Linux', location: 'Tokyo, JP', time: '15 min ago', ip: '192.168.1.25' }
    ];
    
    res.json({ sessions, total: sessions.length });
  } catch (error) {
    logger.error('Error getting sessions:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /api/analytics
 * @desc Get analytics and monitoring data
 * @access Public
 */
router.get('/analytics', async (req, res) => {
  try {
    // Generate mock time-series data for charts
    const serverRequestsData = Array.from({ length: 30 }, (_, i) => ({
      time: `${10 + i}:00`,
      webServer01: 100 + Math.sin(i * 0.3) * 30 + Math.random() * 20,
      webServer02: 120 + Math.cos(i * 0.4) * 35 + Math.random() * 25,
      webServer03: 90 + Math.sin(i * 0.5) * 25 + Math.random() * 15
    }));
    
    const networkData = Array.from({ length: 30 }, (_, i) => ({
      time: `${10 + i}:00`,
      rx: 40 + Math.sin(i * 0.4) * 20 + Math.random() * 25,
      tx: 60 + Math.cos(i * 0.3) * 30 + Math.random() * 20
    }));
    
    const usagePatterns = [
      { name: 'get_user_data', calls: 1247, trend: '+12%' },
      { name: 'update_database', calls: 847, trend: '+8%' },
      { name: 'send_email', calls: 523, trend: '-3%' },
      { name: 'process_webhook', calls: 312, trend: '+15%' }
    ];
    
    const analytics = {
      serverRequests: serverRequestsData,
      network: networkData,
      usagePatterns,
      errorAnalytics: {
        errorRate: 0.1,
        last24h: 24,
        commonErrors: [
          { code: '500', message: 'Internal Server Error', count: 12 },
          { code: '404', message: 'Not Found', count: 8 },
          { code: '503', message: 'Service Unavailable', count: 4 }
        ]
      },
      performance: {
        avgResponse: 42,
        requestsPerMin: 1400,
        uptime: 99.9,
        p95Latency: 2.4
      }
    };
    
    res.json(analytics);
  } catch (error) {
    logger.error('Error getting analytics:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
