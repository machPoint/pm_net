/**
 * AI Chat Routes with System Context
 * Provides AI assistant functionality with access to system graph data
 */

import express, { Request, Response } from 'express';
import logger from '../logger';
import db from '../config/database';
import { callLLM, testConnection, getGatewayStats, GatewayError } from '../services/agentGateway';

const router = express.Router();

// CORS middleware
router.use((req: Request, res: Response, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

/**
 * @route POST /api/ai/analyze
 * @desc AI analysis with custom prompts (for relationship discovery, etc.)
 * @access Public
 */
router.post('/analyze', async (req: Request, res: Response) => {
  try {
    const { systemPrompt, userPrompt, temperature = 0.7, max_tokens = 2000, response_format } = req.body;

    if (!userPrompt) {
      return res.status(400).json({ error: 'userPrompt is required' });
    }

    const result = await callLLM({
      caller: 'ai-analyze',
      system_prompt: systemPrompt,
      user_prompt: userPrompt,
      temperature,
      max_tokens,
      json_mode: response_format === 'json_object',
    });

    return res.json({
      message: result.content,
      content: result.content,
      model: result.model,
      usage: result.usage,
      request_id: result.request_id,
    });

  } catch (error: any) {
    logger.error('AI analyze error:', error);
    if (error instanceof GatewayError) {
      return res.status(500).json(error.toJSON());
    }
    return res.status(500).json({
      error: 'Failed to process AI analysis',
      details: error.message
    });
  }
});

/**
 * @route POST /api/ai/chat
 * @desc AI chat with system engineering context
 * @access Public
 */
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { message, history, context_type, context_id, include_requirements } = req.body;

    // Gather system context based on request
    let systemContext = '';
    
    // Get system graph statistics
    try {
      const nodeCount = await db('system_nodes').count('* as count').first();
      const edgeCount = await db('system_edges').count('* as count').first();
      const eventCount = await db('events').count('* as count').first();
      
      systemContext += `\n\nSystem Graph Context:
- Total Nodes: ${nodeCount?.count || 0}
- Total Relationships: ${edgeCount?.count || 0}
- Total Events: ${eventCount?.count || 0}`;
    } catch (error) {
      logger.warn('Could not fetch system statistics:', error);
    }

    // Get context-specific data
    if (context_id) {
      try {
        const node = await db('system_nodes')
          .where({ id: context_id })
          .orWhere({ title: context_id })
          .first();
        
        if (node) {
          systemContext += `\n\nCurrent Context - ${node.type}:
- ID: ${node.id}
- Title: ${node.title}
- Status: ${node.status}
- Description: ${node.description || 'N/A'}`;
          
          // Get related nodes
          const related = await db('system_edges')
            .where({ source_node_id: node.id })
            .orWhere({ target_node_id: node.id })
            .limit(10);
          
          if (related.length > 0) {
            systemContext += `\n- Related Items: ${related.length}`;
          }
        }
      } catch (error) {
        logger.warn('Could not fetch context node:', error);
      }
    }

    // Get recent events for context
    if (include_requirements || context_type === 'requirement') {
      try {
        const recentEvents = await db('events')
          .orderBy('timestamp', 'desc')
          .limit(5)
          .select('event_type', 'summary', 'timestamp');
        
        if (recentEvents.length > 0) {
          systemContext += `\n\nRecent System Activity:`;
          recentEvents.forEach((event: any) => {
            systemContext += `\n- ${event.event_type}: ${event.summary}`;
          });
        }
      } catch (error) {
        logger.warn('Could not fetch recent events:', error);
      }
    }

    // Build system message with context
    const systemMessage = `You are an AI assistant for the OPAL task management and coordination platform. You have access to a live system graph with tasks, validations, agents, and their relationships.

${systemContext}

You can help with:
- Task analysis and traceability
- Impact analysis of changes
- Validation coverage analysis  
- System graph queries
- Data exploration and insights

Provide specific, actionable responses based on the system context above.`;

    // Build history for gateway
    const chatHistory = (history || []).slice(-10).map((msg: any) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content
    }));

    // Call LLM through gateway
    const result = await callLLM({
      caller: 'ai-chat',
      system_prompt: systemMessage,
      user_prompt: message,
      history: chatHistory,
      temperature: 0.7,
      max_tokens: 1000,
    });

    // Generate context-aware suggestions
    const suggestions = [
      'Query system graph statistics',
      'Analyze task traceability',
      'Find gaps in validation coverage',
      'Show recent system changes',
      'Explain impact of a change'
    ];

    res.json({
      message: result.content,
      timestamp: new Date().toISOString(),
      context_used: {
        context_type,
        context_id,
        include_requirements,
        system_stats: systemContext.includes('System Graph Context')
      },
      suggestions,
      request_id: result.request_id,
    });

  } catch (error: any) {
    logger.error('AI chat error:', error);
    if (error instanceof GatewayError) {
      return res.status(500).json(error.toJSON());
    }
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

/**
 * @route GET /api/ai/test-connection
 * @desc Test the LLM connection (replaces direct browser→OpenAI calls)
 * @access Public
 */
router.get('/test-connection', async (_req: Request, res: Response) => {
  try {
    const result = await testConnection();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ status: 'error', error: error.message });
  }
});

/**
 * @route GET /api/ai/gateway-stats
 * @desc Get agent gateway statistics
 * @access Public
 */
router.get('/gateway-stats', async (_req: Request, res: Response) => {
  res.json(getGatewayStats());
});

export default router;
