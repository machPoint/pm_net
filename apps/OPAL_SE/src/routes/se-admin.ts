/**
 * Systems Engineering Admin API Routes
 * REST endpoints for the SE admin dashboard panels
 */

import express, { Request, Response } from 'express';
import logger from '../logger';
import * as systemGraphService from '../services/se/systemGraphService';
import * as eventLogService from '../services/se/eventLogService';
import * as ruleEngineService from '../services/se/ruleEngineService';
import * as changeSetService from '../services/se/changeSetService';
import db from '../config/database';

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
 * @route GET /se/graph/stats
 * @desc Get system graph statistics
 * @access Public
 */
router.get('/graph/stats', async (req: Request, res: Response) => {
  try {
    const projectId = (req.query.project_id as string) || undefined;
    
    // Get node counts by type
    let nodeQuery = db('se_nodes').select('node_type').count('* as count').groupBy('node_type');
    if (projectId) {
      nodeQuery = nodeQuery.where('project_id', projectId);
    }
    const nodeCounts = await nodeQuery;
    
    // Get edge counts by relation type
    let edgeQuery = db('se_edges').select('relation_type').count('* as count').groupBy('relation_type');
    if (projectId) {
      edgeQuery = edgeQuery.where('project_id', projectId);
    }
    const edgeCounts = await edgeQuery;
    
    // Get project counts
    const projects = await db('se_nodes')
      .distinct('project_id')
      .select('project_id')
      .whereNotNull('project_id');
    
    // Get total counts
    let totalNodesQuery = db('se_nodes').count('* as count');
    let totalEdgesQuery = db('se_edges').count('* as count');
    if (projectId) {
      totalNodesQuery = totalNodesQuery.where('project_id', projectId);
      totalEdgesQuery = totalEdgesQuery.where('project_id', projectId);
    }
    
    const [totalNodes] = await totalNodesQuery;
    const [totalEdges] = await totalEdgesQuery;
    
    res.json({
      nodes: {
        total: parseInt(totalNodes.count as string),
        by_type: nodeCounts.reduce((acc, row) => {
          acc[row.node_type] = parseInt(row.count as string);
          return acc;
        }, {} as Record<string, number>)
      },
      edges: {
        total: parseInt(totalEdges.count as string),
        by_type: edgeCounts.reduce((acc, row) => {
          acc[row.relation_type] = parseInt(row.count as string);
          return acc;
        }, {} as Record<string, number>)
      },
      projects: projects.map(p => p.project_id),
      project_count: projects.length
    });
  } catch (error: any) {
    logger.error('Error getting graph stats:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /se/graph/nodes
 * @desc Get system graph nodes with pagination
 * @access Public
 */
router.get('/graph/nodes', async (req: Request, res: Response) => {
  try {
    const projectId = req.query.project_id as string;
    const nodeType = req.query.node_type as string;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    
    let query = db('se_nodes').select('*').orderBy('created_at', 'desc');
    
    if (projectId) {
      query = query.where('project_id', projectId);
    }
    if (nodeType) {
      query = query.where('node_type', nodeType);
    }
    
    const nodes = await query.limit(limit).offset(offset);
    
    // Get total count
    let countQuery = db('se_nodes').count('* as count');
    if (projectId) {
      countQuery = countQuery.where('project_id', projectId);
    }
    if (nodeType) {
      countQuery = countQuery.where('node_type', nodeType);
    }
    const [{ count }] = await countQuery;
    
    res.json({
      nodes,
      total: parseInt(count as string),
      limit,
      offset
    });
  } catch (error: any) {
    logger.error('Error getting graph nodes:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /se/events
 * @desc Get event stream with pagination
 * @access Public
 */
router.get('/events', async (req: Request, res: Response) => {
  try {
    const projectId = req.query.project_id as string;
    const sourceSystem = req.query.source_system as string;
    const entityType = req.query.entity_type as string;
    const eventType = req.query.event_type as string;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    
    let query = db('se_events').select('*').orderBy('timestamp', 'desc');
    
    if (projectId) {
      query = query.where('project_id', projectId);
    }
    if (sourceSystem) {
      query = query.where('source_system', sourceSystem);
    }
    if (entityType) {
      query = query.where('entity_type', entityType);
    }
    if (eventType) {
      query = query.where('event_type', eventType);
    }
    
    const events = await query.limit(limit).offset(offset);
    
    // Get total count
    let countQuery = db('se_events').count('* as count');
    if (projectId) {
      countQuery = countQuery.where('project_id', projectId);
    }
    if (sourceSystem) {
      countQuery = countQuery.where('source_system', sourceSystem);
    }
    if (entityType) {
      countQuery = countQuery.where('entity_type', entityType);
    }
    if (eventType) {
      countQuery = countQuery.where('event_type', eventType);
    }
    const [{ count }] = await countQuery;
    
    res.json({
      events,
      total: parseInt(count as string),
      limit,
      offset
    });
  } catch (error: any) {
    logger.error('Error getting events:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /se/events/stats
 * @desc Get event statistics
 * @access Public
 */
router.get('/events/stats', async (req: Request, res: Response) => {
  try {
    const projectId = (req.query.project_id as string) || undefined;
    
    // Get event counts by source_system
    let systemQuery = db('se_events').select('source_system').count('* as count').groupBy('source_system');
    if (projectId) {
      systemQuery = systemQuery.where('project_id', projectId);
    }
    const systemCounts = await systemQuery;
    
    // Get event counts by type
    let typeQuery = db('se_events').select('event_type').count('* as count').groupBy('event_type');
    if (projectId) {
      typeQuery = typeQuery.where('project_id', projectId);
    }
    const typeCounts = await typeQuery;
    
    // Get recent activity (last 24 hours)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    let recentQuery = db('se_events').count('* as count').where('timestamp', '>=', yesterday);
    if (projectId) {
      recentQuery = recentQuery.where('project_id', projectId);
    }
    const [{ count: recentCount }] = await recentQuery;
    
    // Get total events
    let totalQuery = db('se_events').count('* as count');
    if (projectId) {
      totalQuery = totalQuery.where('project_id', projectId);
    }
    const [{ count: totalEvents }] = await totalQuery;
    
    res.json({
      total: parseInt(totalEvents as string),
      recent_24h: parseInt(recentCount as string),
      by_source: systemCounts.reduce((acc, row) => {
        acc[row.source_system] = parseInt(row.count as string);
        return acc;
      }, {} as Record<string, number>),
      by_type: typeCounts.reduce((acc, row) => {
        acc[row.event_type] = parseInt(row.count as string);
        return acc;
      }, {} as Record<string, number>)
    });
  } catch (error: any) {
    logger.error('Error getting event stats:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /se/rules/violations
 * @desc Get rule violations (run consistency checks)
 * @access Public
 */
router.get('/rules/violations', async (req: Request, res: Response) => {
  try {
    const projectId = req.query.project_id as string || 'proj-001';
    const domain = req.query.domain as string;
    
    const result = await ruleEngineService.runConsistencyChecks(projectId, domain);
    
    res.json(result);
  } catch (error: any) {
    logger.error('Error getting rule violations:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /se/rules/stats
 * @desc Get rule violation statistics
 * @access Public
 */
router.get('/rules/stats', async (req: Request, res: Response) => {
  try {
    const projectId = req.query.project_id as string || 'proj-001';
    
    const result = await ruleEngineService.runConsistencyChecks(projectId);
    
    // Aggregate stats
    const stats = {
      total_violations: result.violations.length,
      by_severity: {
        critical: result.violations.filter(v => v.severity === 'critical').length,
        high: result.violations.filter(v => v.severity === 'high').length,
        medium: result.violations.filter(v => v.severity === 'medium').length,
        low: result.violations.filter(v => v.severity === 'low').length
      },
      by_rule: result.violations.reduce((acc, v) => {
        acc[v.rule_id] = (acc[v.rule_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      rules_checked: result.summary.rules_executed.length,
      execution_time_ms: result.summary.execution_time_ms
    };
    
    res.json(stats);
  } catch (error: any) {
    logger.error('Error getting rule stats:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /se/change-sets
 * @desc Get change sets
 * @access Public
 */
router.get('/change-sets', async (req: Request, res: Response) => {
  try {
    const projectId = req.query.project_id as string || 'proj-001';
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    
    // Get recent change sets
    let query = db('se_change_sets')
      .select('*')
      .where('project_id', projectId)
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);
    
    const changeSets = await query;
    
    // Get total count
    const [{ count }] = await db('se_change_sets')
      .count('* as count')
      .where('project_id', projectId);
    
    res.json({
      change_sets: changeSets,
      total: parseInt(count as string),
      limit,
      offset
    });
  } catch (error: any) {
    logger.error('Error getting change sets:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
