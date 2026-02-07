/**
 * Admin Health Metrics Routes
 * Provides endpoints for server health monitoring
 */

const express = require('express');
const router = express.Router();
const { authenticateJWT, requireRole } = require('../middleware/auth');
const logger = require('../logger');
const metricsService = require('../services/metricsService');

/**
 * @route GET /admin/health-metrics
 * @desc Get comprehensive server health metrics
 * @access Private (admin only)
 */
router.get('/', authenticateJWT, requireRole('admin'), async (req, res) => {
  try {
    // Use the metrics service to get comprehensive health metrics
    const healthMetrics = await metricsService.getHealthMetrics();
    
    res.json({ success: true, data: healthMetrics });
  } catch (error) {
    logger.error('Error getting health metrics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route GET /admin/health-metrics/status
 * @desc Get basic server status (can be used for monitoring tools)
 * @access Public
 */
router.get('/status', async (req, res) => {
  try {
    // Get basic status information
    const status = {
      status: 'online',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };
    
    res.json(status);
  } catch (error) {
    logger.error('Error getting server status:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
