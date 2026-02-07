/**
 * Authentication routes for OPAL server
 * Handles user login, registration, and token management
 */

import express, { Request, Response } from 'express';
import * as authService from '../services/authService';
import { authenticateJWT, requireRole } from '../middleware/auth';
import logger from '../logger';

const router = express.Router();

/**
 * @route POST /auth/login
 * @desc Authenticate user and get tokens
 * @access Public
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    const result = await authService.login(username, password);
    
    res.json(result);
  } catch (error: any) {
    logger.error('Login error:', error);
    res.status(401).json({ error: error.message });
  }
});

/**
 * @route POST /auth/register
 * @desc Register a new user
 * @access Public (could be restricted in production)
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }
    
    const user = await authService.register(username, email, password);
    
    res.status(201).json(user);
  } catch (error: any) {
    logger.error('Registration error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * @route POST /auth/refresh
 * @desc Refresh access token
 * @access Public
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }
    
    const result = await authService.refreshToken(refreshToken);
    
    res.json(result);
  } catch (error: any) {
    logger.error('Token refresh error:', error);
    res.status(401).json({ error: error.message });
  }
});

/**
 * @route POST /auth/logout
 * @desc Logout user
 * @access Public
 */
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }
    
    await authService.logout(refreshToken);
    
    res.json({ message: 'Logged out successfully' });
  } catch (error: any) {
    logger.error('Logout error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * @route POST /auth/token
 * @desc Create API token
 * @access Private
 */
router.post('/token', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const { name, permissions, expiresIn } = req.body;
    const userId = req.user!.id!;
    
    if (!name) {
      return res.status(400).json({ error: 'Token name is required' });
    }
    
    // Calculate expiration date if expiresIn is provided (in days)
    const expiresAt = expiresIn 
      ? new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000)
      : null;
    
    const token = await authService.createApiToken(userId, name, permissions, expiresAt);
    
    res.status(201).json(token);
  } catch (error: any) {
    logger.error('API token creation error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * @route GET /auth/token
 * @desc Get all API tokens for the current user
 * @access Private
 */
router.get('/token', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id!;
    const tokens = await authService.getUserApiTokens(userId);
    res.json(tokens);
  } catch (error: any) {
    logger.error('API token retrieval error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * @route DELETE /auth/token/:id
 * @desc Delete an API token
 * @access Private
 */
router.delete('/token/:id', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id!;
    const tokenId = req.params.id;
    
    await authService.deleteApiToken(tokenId, userId);
    
    res.json({ message: 'Token deleted successfully' });
  } catch (error: any) {
    logger.error('API token deletion error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * @route GET /auth/me
 * @desc Get current user info
 * @access Private
 */
router.get('/me', authenticateJWT, (req: Request, res: Response) => {
  res.json(req.user);
});

/**
 * @route POST /auth/admin/create
 * @desc Create a new admin user (restricted)
 * @access Private (admin only)
 */
router.post('/admin/create', authenticateJWT, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }
    
    const user = await authService.register(username, email, password, 'admin');
    
    res.status(201).json(user);
  } catch (error: any) {
    logger.error('Admin creation error:', error);
    res.status(400).json({ error: error.message });
  }
});

export default router;
