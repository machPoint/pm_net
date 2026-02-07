/**
 * Audit routes for OPAL server
 * Handles tool run auditing and log retrieval
 */

import express, { Request, Response } from 'express';
import * as auditService from '../services/auditService';
import { authenticateJWT, requireRole } from '../middleware/auth';
import logger from '../logger';

const router = express.Router();

/**
 * @route GET /audit/tool-runs
 * @desc Get audit logs for the user
 * @access Private
 */
router.get('/tool-runs', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id!;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    
    const logs = await auditService.getUserAuditLogs(userId, limit, offset);
    
    res.json(logs);
  } catch (error: any) {
    logger.error('Audit log retrieval error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * @route GET /audit/tool/:name
 * @desc Get audit logs for a specific tool
 * @access Private (admin only)
 */
router.get('/tool/:name', authenticateJWT, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const toolName = req.params.name;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    
    const logs = await auditService.getToolAuditLogs(toolName, limit, offset);
    
    res.json(logs);
  } catch (error: any) {
    logger.error('Tool audit log retrieval error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * @route GET /audit/stats
 * @desc Get audit statistics
 * @access Private (admin only)
 */
router.get('/stats', authenticateJWT, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { userId, toolName, startDate, endDate } = req.query;
    
    // Parse dates if provided
    const parsedStartDate = startDate ? new Date(startDate as string) : null;
    const parsedEndDate = endDate ? new Date(endDate as string) : null;
    
    const stats = await auditService.getAuditStats(
      userId ? parseInt(userId as string) : null,
      toolName as string | null,
      parsedStartDate,
      parsedEndDate
    );
    
    res.json(stats);
  } catch (error: any) {
    logger.error('Audit stats retrieval error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * @route GET /audit/user/:userId
 * @desc Get audit logs for a specific user (admin only)
 * @access Private (admin only)
 */
router.get('/user/:userId', authenticateJWT, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    
    const logs = await auditService.getUserAuditLogs(userId, limit, offset);
    
    res.json(logs);
  } catch (error: any) {
    logger.error('User audit log retrieval error:', error);
    res.status(400).json({ error: error.message });
  }
});

export default router;
