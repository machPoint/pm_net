/**
 * API Integration routes for OPAL server
 * Handles API endpoints for managing API integrations
 */

const express = require('express');
const router = express.Router();
const { authenticateJWT, requireRole } = require('../middleware/auth');
const logger = require('../logger');
const { loadApiIntegrationsFromEnv } = require('../config/apiConfig');

// Log requests to API integration routes for debugging
router.use((req, res, next) => {
  logger.info(`API integration route accessed: ${req.method} ${req.originalUrl}`);
  next();
});

/**
 * @route GET /api/api-integrations
 * @desc Get all API integrations
 * @access Private
 */
router.get('/', authenticateJWT, async (req, res) => {
  try {
    // Get API integrations from the environment
    const { apiIntegrations } = loadApiIntegrationsFromEnv();
    
    // Return the API integrations
    res.json(apiIntegrations);
  } catch (error) {
    logger.error('Error getting API integrations:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /api/api-integrations/:id
 * @desc Get a specific API integration by ID
 * @access Private
 */
router.get('/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get API integrations from the environment
    const { apiIntegrations } = loadApiIntegrationsFromEnv();
    
    // Find the API integration with the specified ID
    const apiIntegration = apiIntegrations.find(api => api.id === id);
    
    if (!apiIntegration) {
      return res.status(404).json({ error: 'API integration not found' });
    }
    
    // Return the API integration
    res.json(apiIntegration);
  } catch (error) {
    logger.error('Error getting API integration:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
