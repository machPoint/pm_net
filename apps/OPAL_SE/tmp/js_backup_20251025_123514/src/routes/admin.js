/**
 * Admin panel routes for OPAL server
 * Serves the admin UI and handles admin-specific API endpoints
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const { authenticateJWT, requireRole } = require('../middleware/auth');
const logger = require('../logger');
const db = require('../config/database');
const adminTokensRouter = require('./admin-tokens');
const adminHealthRouter = require('./admin-health');

// Log requests to admin routes for debugging
router.use((req, res, next) => {
  logger.info(`Admin route accessed: ${req.method} ${req.originalUrl}`);
  next();
});

// Serve static files from the admin directory
router.use(express.static(path.join(__dirname, '../admin')));

// Use admin-tokens routes for token management
router.use('/tokens', adminTokensRouter);

// Use admin-health routes for health metrics
router.use('/health-metrics', adminHealthRouter);

// Route to serve the admin panel
router.get('/', (req, res) => {
  console.log('Admin panel requested');
  res.sendFile(path.join(__dirname, '../admin/index.html'));
});

// SDK routes
router.get('/sdk', (req, res) => {
  console.log('SDK demo app requested');
  res.sendFile(path.join(__dirname, '../sdk/demo-app.html'));
});

// Serve SDK files
router.use('/sdk', express.static(path.join(__dirname, '../sdk')));

// MCP Inspector route
router.get('/mcp-inspector', (req, res) => {
  console.log('MCP Inspector requested');
  res.sendFile(path.join(__dirname, '../admin/mcp-inspector.html'));
});

/**
 * @route GET /admin/status
 * @desc Get server status information
 * @access Private (admin only)
 */
router.get('/status', authenticateJWT, requireRole('admin'), async (req, res) => {
  try {
    // Get basic server status information
    const status = {
      version: process.env.npm_package_version || '1.0.0',
      uptime: Math.floor(process.uptime()),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString()
    };
    
    res.json(status);
  } catch (error) {
    logger.error('Error getting server status:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route POST /admin/reset-memory
 * @desc Reset all memories for a user
 * @access Private (admin only)
 */
router.post('/reset-memory', authenticateJWT, requireRole('admin'), async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    // Delete all memories for the user
    await db('memories').where({ user_id: userId }).delete();
    
    res.json({ message: 'Memories reset successfully' });
  } catch (error) {
    logger.error('Error resetting memories:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /admin/users
 * @desc Get all users
 * @access Private (admin only)
 */
router.get('/users', authenticateJWT, requireRole('admin'), async (req, res) => {
  try {
    const users = await db('users')
      .select('id', 'username', 'email', 'role', 'created_at', 'last_login')
      .orderBy('created_at', 'desc');
    
    res.json(users);
  } catch (error) {
    logger.error('Error getting users:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /admin/health-metrics
 * @desc Get comprehensive server health metrics
 * @access Private (admin only)
 */
router.get('/health-metrics', authenticateJWT, requireRole('admin'), async (req, res) => {
  try {
    // Use the metrics service to get comprehensive health metrics
    const metricsService = require('../services/metricsService');
    const healthMetrics = await metricsService.getHealthMetrics();
    
    res.json({ success: true, data: healthMetrics });
  } catch (error) {
    logger.error('Error getting health metrics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route POST /admin/users
 * @desc Create a new user
 * @access Private (admin only)
 */
router.post('/users', authenticateJWT, requireRole('admin'), async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }
    
    // Check if user already exists
    const existingUser = await db('users')
      .where({ username })
      .orWhere({ email })
      .first();
    
    if (existingUser) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }
    
    // Create new user (implementation would be in authService)
    const bcrypt = require('bcrypt');
    const passwordHash = await bcrypt.hash(password, 10);
    
    const [newUser] = await db('users').insert({
      username,
      email,
      password_hash: passwordHash,
      role: role || 'user'
    }).returning(['id', 'username', 'email', 'role', 'created_at']);
    
    res.status(201).json(newUser);
  } catch (error) {
    logger.error('Error creating user:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /admin/stats
 * @desc Get system statistics
 * @access Private (admin only)
 */
router.get('/stats', authenticateJWT, requireRole('admin'), async (req, res) => {
  try {
    // Get counts from various tables
    const userCount = await db('users').count('* as count').first();
    const memoryCount = await db('memories').count('* as count').first();
    const tokenCount = await db('api_tokens').count('* as count').first();
    const toolRunCount = await db('tool_runs').count('* as count').first();
    
    // Get recent activity
    const recentLogins = await db('users')
      .select('username', 'last_login')
      .whereNotNull('last_login')
      .orderBy('last_login', 'desc')
      .limit(5);
    
    const recentMemories = await db('memories')
      .select('title', 'created_at')
      .orderBy('created_at', 'desc')
      .limit(5);
    
    const stats = {
      counts: {
        users: userCount.count,
        memories: memoryCount.count,
        tokens: tokenCount.count,
        toolRuns: toolRunCount.count
      },
      system: {
        version: process.env.npm_package_version || '1.0.0',
        uptime: Math.floor(process.uptime()),
        memory: process.memoryUsage(),
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
      },
      recentActivity: {
        logins: recentLogins,
        memories: recentMemories
      }
    };
    
    res.json(stats);
  } catch (error) {
    logger.error('Error getting system stats:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /admin/tokens
 * @desc Get all API tokens in the system
 * @access Private (admin only)
 */
router.get('/tokens', authenticateJWT, requireRole('admin'), async (req, res) => {
  try {
    const tokens = await db('api_tokens')
      .select('api_tokens.*', 'users.username as user_name')
      .leftJoin('users', 'api_tokens.user_id', 'users.id')
      .orderBy('api_tokens.created_at', 'desc');
    
    // For security, mask the actual token values
    const maskedTokens = tokens.map(token => ({
      ...token,
      token: token.token.substring(0, 8) + '...'
    }));
    
    res.json(maskedTokens);
  } catch (error) {
    logger.error('Error getting API tokens:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
