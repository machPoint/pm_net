/**
 * LLM Gateway Admin API Routes
 * Manage LLM routing configuration and monitor AI calls
 */

import express, { Request, Response } from 'express';
import logger from '../logger';
import { llmGateway } from '../services/llm/gateway';
import { ToolModelMapping } from '../types/llm';

const router = express.Router();

// CORS middleware
router.use((req: Request, res: Response, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

/**
 * @route GET /llm/routing-configs
 * @desc Get all LLM routing configurations
 * @access Public
 */
router.get('/routing-configs', async (req: Request, res: Response) => {
  try {
    const configs = await llmGateway.getRoutingConfigs();
    res.json({ configs });
  } catch (error: any) {
    logger.error('Failed to get routing configs:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route POST /llm/routing-configs
 * @desc Create or update LLM routing configuration
 * @access Public
 */
router.post('/routing-configs', async (req: Request, res: Response) => {
  try {
    const config: ToolModelMapping = req.body;
    
    // Validate required fields
    if (!config.tool_name || !config.primary) {
      return res.status(400).json({ error: 'tool_name and primary are required' });
    }
    
    await llmGateway.updateRoutingConfig(config);
    res.json({ success: true, config });
  } catch (error: any) {
    logger.error('Failed to update routing config:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route PUT /llm/routing-configs/:toolName
 * @desc Update specific routing configuration
 * @access Public
 */
router.put('/routing-configs/:toolName', async (req: Request, res: Response) => {
  try {
    const { toolName } = req.params;
    const updates = req.body;
    
    const configs = await llmGateway.getRoutingConfigs();
    const existing = configs.find(c => c.tool_name === toolName);
    
    if (!existing) {
      return res.status(404).json({ error: 'Routing config not found' });
    }
    
    const updated = { ...existing, ...updates, tool_name: toolName };
    await llmGateway.updateRoutingConfig(updated);
    
    res.json({ success: true, config: updated });
  } catch (error: any) {
    logger.error('Failed to update routing config:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /llm/providers
 * @desc Get status of all LLM providers
 * @access Public
 */
router.get('/providers', async (req: Request, res: Response) => {
  try {
    const providers = await llmGateway.getProviderStatus();
    res.json({ providers });
  } catch (error: any) {
    logger.error('Failed to get provider status:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /llm/stats
 * @desc Get LLM call statistics
 * @access Public
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const { start, end } = req.query;
    
    let timeRange;
    if (start && end) {
      timeRange = {
        start: new Date(start as string),
        end: new Date(end as string)
      };
    } else {
      // Default to last 24 hours
      timeRange = {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: new Date()
      };
    }
    
    const stats = await llmGateway.getStats(timeRange);
    res.json(stats);
  } catch (error: any) {
    logger.error('Failed to get LLM stats:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route POST /llm/test
 * @desc Test LLM gateway with a simple call
 * @access Public
 */
router.post('/test', async (req: Request, res: Response) => {
  try {
    const { tool_name, message } = req.body;
    
    if (!tool_name || !message) {
      return res.status(400).json({ error: 'tool_name and message are required' });
    }
    
    const response = await llmGateway.chat(tool_name, {
      messages: [{ role: 'user', content: message }],
      max_tokens: 100
    });
    
    res.json({
      success: true,
      response: response.content,
      model: response.model,
      usage: response.usage
    });
  } catch (error: any) {
    logger.error('LLM test failed:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
