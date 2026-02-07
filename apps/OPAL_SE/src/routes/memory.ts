/**
 * Memory routes for OPAL server
 * Handles memory creation, search, and management
 */

import express, { Request, Response } from 'express';
import * as memoryService from '../services/memoryService';
import { authenticateJWT } from '../middleware/auth';
import logger from '../logger';

const router = express.Router();

/**
 * @route POST /memory
 * @desc Create a new memory
 * @access Private
 */
router.post('/', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const { title, content, metadata } = req.body;
    const userId = req.user!.id!;
    
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }
    
    const memory = await memoryService.createMemory(userId, title, content, metadata);
    
    res.status(201).json(memory);
  } catch (error: any) {
    logger.error('Memory creation error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * @route GET /memory
 * @desc Get all memories for the user
 * @access Private
 */
router.get('/', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id!;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    
    const memories = await memoryService.getUserMemories(userId, limit, offset);
    
    res.json(memories);
  } catch (error: any) {
    logger.error('Memory retrieval error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * @route GET /memory/:id
 * @desc Get a specific memory
 * @access Private
 */
router.get('/:id', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id!;
    const memoryId = req.params.id;
    
    // Use getUserMemories with a filter to get a specific memory
    const memories = await memoryService.getUserMemories(userId);
    const memory = memories.find(m => m.id === memoryId);
    
    if (!memory) {
      return res.status(404).json({ error: 'Memory not found' });
    }
    
    res.json(memory);
  } catch (error: any) {
    logger.error('Memory retrieval error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * @route PUT /memory/:id
 * @desc Update a memory
 * @access Private
 */
router.put('/:id', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id!;
    const memoryId = parseInt(req.params.id);
    const { title, content, metadata } = req.body;
    
    const memory = await memoryService.updateMemory(memoryId, userId, {
      title,
      content,
      metadata
    });
    
    res.json(memory);
  } catch (error: any) {
    logger.error('Memory update error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * @route DELETE /memory/:id
 * @desc Delete a memory
 * @access Private
 */
router.delete('/:id', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id!;
    const memoryId = parseInt(req.params.id);
    
    await memoryService.deleteMemory(memoryId, userId);
    
    res.json({ message: 'Memory deleted successfully' });
  } catch (error: any) {
    logger.error('Memory deletion error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * @route POST /memory/search
 * @desc Search memories by content
 * @access Private
 */
router.post('/search', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id!;
    const { query, limit, threshold } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    const memories = await memoryService.searchMemories(
      userId,
      query,
      limit || 10,
      threshold || 0.7
    );
    
    res.json(memories);
  } catch (error: any) {
    logger.error('Memory search error:', error);
    res.status(400).json({ error: error.message });
  }
});

export default router;
