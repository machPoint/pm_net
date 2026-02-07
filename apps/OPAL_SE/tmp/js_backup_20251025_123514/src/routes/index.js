/**
 * Main routes index for OPAL server
 * Exports all route handlers
 */

const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth');
const memoryRoutes = require('./memory');
const auditRoutes = require('./audit');
const backupRoutes = require('./backup');
const adminRoutes = require('./admin');
const adminApiRoutes = require('./admin-api');
const apiIntegrationsRoutes = require('./api-integrations');

// Register routes
router.use('/auth', authRoutes);
router.use('/memory', memoryRoutes);
router.use('/audit', auditRoutes);
router.use('/backup', backupRoutes);
router.use('/api-integrations', apiIntegrationsRoutes);

// Register admin API routes (for the admin UI)
router.use('/', adminApiRoutes);

// Register admin routes at the root level
router.use('/admin', adminRoutes);

module.exports = router;
