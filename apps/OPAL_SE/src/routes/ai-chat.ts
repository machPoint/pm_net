/**
 * AI Chat Routes with System Context
 * Provides AI assistant functionality with access to system graph data
 */

import express, { Request, Response } from 'express';
import logger from '../logger';
import db from '../config/database';

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

    // Get OpenAI API key
    const openaiApiKey = process.env.OPENAI_API_KEY;
    
    if (!openaiApiKey || openaiApiKey === 'your-openai-api-key') {
      logger.error('OpenAI API key not configured in OPAL_SE');
      return res.status(500).json({ 
        error: 'OpenAI API key not configured in OPAL_SE'
      });
    }

    // Build messages array
    const messages: any[] = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: userPrompt });

    logger.info(`AI Analyze request - Temperature: ${temperature}, Max tokens: ${max_tokens}`);

    // Call OpenAI
    const requestBody: any = {
      model: process.env.MODEL || 'gpt-4o',
      messages,
      temperature,
      max_tokens
    };

    // Add response format if specified
    if (response_format === 'json_object') {
      requestBody.response_format = { type: 'json_object' };
    }

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      logger.error('OpenAI API error:', errorText);
      return res.status(openaiResponse.status).json({
        error: 'Failed to get AI response from OpenAI',
        details: `Status: ${openaiResponse.status}`,
        openai_error: errorText
      });
    }

    const data = await openaiResponse.json();
    const aiMessage = data.choices[0]?.message?.content;

    if (!aiMessage) {
      return res.status(500).json({ error: 'No response from OpenAI' });
    }

    return res.json({
      message: aiMessage,
      content: aiMessage,
      model: data.model,
      usage: data.usage
    });

  } catch (error: any) {
    logger.error('AI analyze error:', error);
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

    // Get OpenAI API key
    const openaiApiKey = process.env.OPENAI_API_KEY;
    
    logger.info(`OpenAI API Key loaded: ${openaiApiKey ? 'Yes (length: ' + openaiApiKey.length + ')' : 'No'}`);
    
    if (!openaiApiKey || openaiApiKey === 'your-openai-api-key') {
      logger.error('OpenAI API key not configured in OPAL_SE');
      return res.status(500).json({ 
        error: 'OpenAI API key not configured in OPAL_SE',
        debug: `Key present: ${!!openaiApiKey}, Key length: ${openaiApiKey?.length || 0}`
      });
    }

    // Gather system context based on request
    let systemContext = '';
    
    // Get system graph statistics
    try {
      const nodeCount = await db('system_nodes').count('* as count').first();
      const edgeCount = await db('system_edges').count('* as count').first();
      const eventCount = await db('events').count('* as count').first();
      
      systemContext += `\n\nSystem Graph Context:
- Total Nodes: ${nodeCount?.count || 0} (requirements, tests, issues, parts, etc.)
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
          .orWhere({ name: context_id })
          .first();
        
        if (node) {
          systemContext += `\n\nCurrent Context - ${node.type}:
- ID: ${node.id}
- Name: ${node.name}
- Status: ${node.status}
- Description: ${node.description || 'N/A'}`;
          
          // Get related nodes
          const related = await db('system_edges')
            .where({ source_id: node.id })
            .orWhere({ target_id: node.id })
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
          recentEvents.forEach(event => {
            systemContext += `\n- ${event.event_type}: ${event.summary}`;
          });
        }
      } catch (error) {
        logger.warn('Could not fetch recent events:', error);
      }
    }

    // Build system message with context
    const systemMessage = `You are an AI assistant for the CORE-SE systems engineering platform. You have access to a live system graph with requirements, tests, issues, and their relationships.

${systemContext}

You can help with:
- Requirements analysis and traceability
- Impact analysis of changes
- Test coverage analysis  
- System engineering queries
- Data exploration and insights

Provide specific, actionable responses based on the system context above.`;

    // Prepare messages for OpenAI
    const messages = [
      {
        role: 'system',
        content: systemMessage
      },
      // Include recent history (last 10 messages)
      ...history.slice(-10).map((msg: any) => ({
        role: msg.role,
        content: msg.content
      })),
      {
        role: 'user',
        content: message
      }
    ];

    // Call OpenAI
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.MODEL || 'gpt-4o',
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      logger.error('OpenAI API error:', { status: openaiResponse.status, error: errorText });
      return res.status(500).json({ 
        error: 'Failed to get AI response from OpenAI',
        details: `Status: ${openaiResponse.status}`,
        openai_error: errorText.substring(0, 200)
      });
    }

    const openaiData = await openaiResponse.json();
    const aiMessage = openaiData.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

    // Generate context-aware suggestions
    const suggestions = [
      'Query system graph statistics',
      'Analyze requirement traceability',
      'Find gaps in test coverage',
      'Show recent system changes',
      'Explain impact of a change'
    ];

    res.json({
      message: aiMessage,
      timestamp: new Date().toISOString(),
      context_used: {
        context_type,
        context_id,
        include_requirements,
        system_stats: systemContext.includes('System Graph Context')
      },
      suggestions
    });

  } catch (error: any) {
    logger.error('AI chat error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

export default router;
