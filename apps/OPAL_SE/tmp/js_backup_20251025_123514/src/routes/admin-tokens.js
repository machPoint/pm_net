/**
 * Admin token management routes for OPAL server
 * Handles admin-specific API token endpoints
 */

const express = require('express');
const router = express.Router();
const { authenticateJWT, requireRole } = require('../middleware/auth');
const authService = require('../services/authService');
const logger = require('../logger');
const db = require('../config/database');

/**
 * @route DELETE /api/admin/tokens/:id
 * @desc Delete an API token (admin can delete any token)
 * @access Private (admin only)
 */
router.delete('/:id', authenticateJWT, requireRole('admin'), async (req, res) => {
  try {
    const tokenId = req.params.id;
    const userId = req.user.id;
    
    logger.info(`Admin attempting to delete token: ${tokenId}`);
    
    // Check if token exists
    const token = await db('api_tokens')
      .where({ id: tokenId })
      .first();
    
    if (!token) {
      logger.warn(`Token not found: ${tokenId}`);
      return res.status(404).json({ error: 'Token not found' });
    }
    
    // Delete the token using a transaction
    const trx = await db.transaction();
    
    try {
      await trx('api_tokens')
        .where({ id: tokenId })
        .del();
      
      await trx.commit();
      
      // Force SQLite to synchronize with disk to ensure persistence
      if (db.client.config.client === 'sqlite3') {
        await db.raw('PRAGMA wal_checkpoint(FULL)');
      }
      
      logger.info(`Admin successfully deleted token: ${tokenId}`);
      res.json({ success: true, message: 'Token deleted successfully' });
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  } catch (error) {
    logger.error(`Error deleting token: ${error.message}`);
    res.status(500).json({ error: `Failed to delete token: ${error.message}` });
  }
});

module.exports = router;
