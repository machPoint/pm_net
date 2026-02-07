/**
 * Admin Health Metrics Routes
 * Provides endpoints for server health monitoring
 */

import express, { Request, Response } from 'express';
import { authenticateJWT, requireRole } from '../middleware/auth';
import logger from '../logger';
import metricsService from '../services/metricsService';

const router = express.Router();

/**
 * @route GET /admin/health-metrics
 * @desc Get comprehensive server health metrics
 * @access Private (admin only)
 */
router.get('/', authenticateJWT, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    // Use the metrics service to get comprehensive health metrics
    const healthMetrics = await metricsService.getHealthMetrics();
    
    res.json({ success: true, data: healthMetrics });
  } catch (error: any) {
    logger.error('Error getting health metrics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route GET /admin/health-metrics/status
 * @desc Get basic server status (can be used for monitoring tools)
 * @access Public
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    // Get basic status information
    const status = {
      status: 'online',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };
    
    res.json(status);
  } catch (error: any) {
    logger.error('Error getting server status:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
