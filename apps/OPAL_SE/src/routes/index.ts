/**
 * Main routes index for OPAL server
 * Exports all route handlers
 */

import express from 'express';
import authRoutes from './auth';
import memoryRoutes from './memory';
import auditRoutes from './audit';
import backupRoutes from './backup';
import adminRoutes from './admin';
import adminApiRoutes from './admin-api';
import apiIntegrationsRoutes from './api-integrations';
import seAdminRoutes from './se-admin';
import aiChatRoutes from './ai-chat';
import impactRoutes from './impact-api';

const router = express.Router();

// Register routes
router.use('/auth', authRoutes);
router.use('/memory', memoryRoutes);
router.use('/audit', auditRoutes);
router.use('/backup', backupRoutes);
router.use('/api-integrations', apiIntegrationsRoutes);
router.use('/se', seAdminRoutes);
router.use('/ai', aiChatRoutes);
router.use('/requirements', impactRoutes);

// Register admin API routes (for the admin UI)
router.use('/', adminApiRoutes);

// Register admin routes at the root level
router.use('/admin', adminRoutes);

export default router;

