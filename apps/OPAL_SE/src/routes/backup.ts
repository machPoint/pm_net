/**
 * Backup routes for OPAL server
 * Handles database backup and restore operations
 */

import express, { Request, Response } from 'express';
import * as backupService from '../services/backupService';
import { authenticateJWT, requireRole } from '../middleware/auth';
import logger from '../logger';

const router = express.Router();

/**
 * @route POST /backup
 * @desc Create a database backup
 * @access Private (admin only)
 */
router.post('/', authenticateJWT, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    
    const backup = await backupService.createBackup(name);
    
    res.status(201).json(backup);
  } catch (error: any) {
    logger.error('Backup creation error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /backup
 * @desc List available backups
 * @access Private (admin only)
 */
router.get('/', authenticateJWT, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const backups = await backupService.listBackups();
    
    res.json(backups);
  } catch (error: any) {
    logger.error('Backup listing error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route POST /backup/restore
 * @desc Restore database from backup
 * @access Private (admin only)
 */
router.post('/restore', authenticateJWT, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { filename } = req.body;
    
    if (!filename) {
      return res.status(400).json({ error: 'Backup filename is required' });
    }
    
    await backupService.restoreBackup(filename);
    
    res.json({ message: 'Database restored successfully' });
  } catch (error: any) {
    logger.error('Backup restoration error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route DELETE /backup/:filename
 * @desc Delete a backup
 * @access Private (admin only)
 */
router.delete('/:filename', authenticateJWT, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    
    await backupService.deleteBackup(filename);
    
    res.json({ message: 'Backup deleted successfully' });
  } catch (error: any) {
    logger.error('Backup deletion error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
