/**
 * Diagnostics API Routes
 * Test and verify system capabilities
 */

import express, { Request, Response } from 'express';
import logger from '../logger';
import db from '../config/database';
import * as seToolsService from '../services/se/seToolsService';

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
 * @route GET /diagnostics/health
 * @desc Overall system health check
 * @access Public
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    // Test database connection
    await db.raw('SELECT 1');
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        api: 'operational'
      }
    });
  } catch (error: any) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

/**
 * @route POST /diagnostics/test-tool
 * @desc Test an MCP tool by calling its underlying service
 * @access Public
 */
router.post('/test-tool', async (req: Request, res: Response) => {
  try {
    const { toolName, params } = req.body;
    
    if (!toolName) {
      return res.status(400).json({ error: 'toolName is required' });
    }
    
    logger.info(`Testing tool: ${toolName}`);
    
    // Map tool names to their service functions
    let result;
    switch (toolName) {
      case 'querySystemModel':
        result = await seToolsService.querySystemModel(params || { project_id: 'test', limit: 10 });
        break;
        
      case 'getSystemSlice':
        result = await seToolsService.getSystemSlice(params || { project_id: 'test', max_depth: 2 });
        break;
        
      case 'traceDownstreamImpact':
        result = await seToolsService.traceDownstreamImpact(params || { 
          project_id: 'test', 
          start_node_ids: ['test_node'], 
          max_depth: 2 
        });
        break;
        
      case 'traceUpstreamRationale':
        result = await seToolsService.traceUpstreamRationale(params || { 
          project_id: 'test', 
          start_node_ids: ['test_node'], 
          max_depth: 2 
        });
        break;
        
      case 'findVerificationGaps':
        result = await seToolsService.findVerificationGaps(params || { project_id: 'test' });
        break;
        
      case 'checkAllocationConsistency':
        result = await seToolsService.checkAllocationConsistency(params || { project_id: 'test' });
        break;
        
      case 'getVerificationCoverageMetrics':
        result = await seToolsService.getVerificationCoverageMetrics(params || { project_id: 'test' });
        break;
        
      case 'getHistory':
        result = await seToolsService.getHistory(params || { 
          project_id: 'test', 
          entity_id: 'test_entity' 
        });
        break;
        
      case 'findSimilarPastChanges':
        result = await seToolsService.findSimilarPastChanges(params || { 
          project_id: 'test', 
          change_description: 'test change' 
        });
        break;
        
      case 'runConsistencyChecks':
        const ruleEngineService = require('../services/se/ruleEngineService');
        result = await ruleEngineService.runConsistencyChecks(params || { 
          project_id: 'test', 
          rule_set: 'default' 
        });
        break;
        
      default:
        return res.status(400).json({ 
          error: 'Unknown tool', 
          toolName,
          availableTools: [
            'querySystemModel',
            'getSystemSlice',
            'traceDownstreamImpact',
            'traceUpstreamRationale',
            'findVerificationGaps',
            'checkAllocationConsistency',
            'getVerificationCoverageMetrics',
            'getHistory',
            'findSimilarPastChanges',
            'runConsistencyChecks'
          ]
        });
    }
    
    res.json({
      status: 'success',
      toolName,
      result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    logger.error(`Tool test failed for ${req.body.toolName}:`, error);
    res.status(500).json({
      status: 'error',
      error: error.message,
      toolName: req.body.toolName
    });
  }
});

/**
 * @route GET /diagnostics/tools
 * @desc List all available MCP tools
 * @access Public
 */
router.get('/tools', async (req: Request, res: Response) => {
  try {
    const tools = [
      { name: 'querySystemModel', status: 'available', category: 'Query' },
      { name: 'getSystemSlice', status: 'available', category: 'Analysis' },
      { name: 'traceDownstreamImpact', status: 'available', category: 'Traceability' },
      { name: 'traceUpstreamRationale', status: 'available', category: 'Traceability' },
      { name: 'findVerificationGaps', status: 'available', category: 'Verification' },
      { name: 'checkAllocationConsistency', status: 'available', category: 'Validation' },
      { name: 'getVerificationCoverageMetrics', status: 'available', category: 'Metrics' },
      { name: 'getHistory', status: 'available', category: 'History' },
      { name: 'findSimilarPastChanges', status: 'available', category: 'Analysis' },
      { name: 'runConsistencyChecks', status: 'available', category: 'Validation' }
    ];
    
    res.json({
      total: tools.length,
      tools
    });
  } catch (error: any) {
    logger.error('Failed to list tools:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /diagnostics/services
 * @desc Check status of all services
 * @access Public
 */
router.get('/services', async (req: Request, res: Response) => {
  try {
    const services = [];
    
    // Check database
    try {
      await db.raw('SELECT 1');
      services.push({ name: 'Database', status: 'healthy', type: 'storage' });
    } catch {
      services.push({ name: 'Database', status: 'unhealthy', type: 'storage' });
    }
    
    // Check OpenAI API key
    const hasApiKey = !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your-openai-api-key';
    services.push({ 
      name: 'OpenAI API', 
      status: hasApiKey ? 'configured' : 'not_configured', 
      type: 'ai' 
    });
    
    // AI Chat
    services.push({ name: 'AI Chat', status: 'available', endpoint: '/api/ai/chat', type: 'ai' });
    
    // AI Relationship Discovery
    services.push({ name: 'AI Relationship Discovery', status: 'available', endpoint: '/api/ai/analyze', type: 'ai' });
    
    // Memory Service
    services.push({ name: 'Memory Service', status: 'available', endpoint: '/api/memory', type: 'knowledge' });
    
    // Audit Service
    services.push({ name: 'Audit Service', status: 'available', endpoint: '/api/audit', type: 'logging' });
    
    res.json({
      timestamp: new Date().toISOString(),
      services
    });
  } catch (error: any) {
    logger.error('Failed to check services:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
