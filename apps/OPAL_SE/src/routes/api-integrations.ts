/**
 * API Integration routes for OPAL server
 * Handles API endpoints for managing API integrations
 */

import express, { Request, Response, NextFunction } from 'express';
import { authenticateJWT } from '../middleware/auth';
import logger from '../logger';
import { loadApiIntegrationsFromEnv } from '../config/apiConfig';

const router = express.Router();

// Log requests to API integration routes for debugging
router.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(`API integration route accessed: ${req.method} ${req.originalUrl}`);
  next();
});

/**
 * @route GET /api/api-integrations
 * @desc Get all API integrations
 * @access Private
 */
router.get('/', authenticateJWT, async (req: Request, res: Response) => {
  try {
    // Get API integrations from the environment
    const { apiIntegrations } = loadApiIntegrationsFromEnv();
    
    // Return the API integrations
    res.json(apiIntegrations);
  } catch (error: any) {
    logger.error('Error getting API integrations:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /api/api-integrations/:id
 * @desc Get a specific API integration by ID
 * @access Private
 */
router.get('/:id', authenticateJWT, async (req: Request, res: Response) => {
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
  } catch (error: any) {
    logger.error('Error getting API integration:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
