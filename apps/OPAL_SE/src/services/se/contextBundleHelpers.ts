/**
 * Context Bundle Helpers
 * 
 * Internal helper functions for common SE workflows that combine multiple
 * services/tools to provide high-value context bundles.
 */

import logger from '../../logger';
import {
  traceDownstreamImpact,
  getHistory,
  findVerificationGaps,
  getVerificationCoverageMetrics,
  TraceDownstreamImpactParams,
  GetHistoryParams
} from './seToolsService';
import { runConsistencyChecks } from './ruleEngineService';
import {
  buildChangeSetForWindow,
  buildChangeSetFromAnchor,
  getChangeSetStats
} from './changeSetService';
import { getNodesByFilter, getGraphStatistics } from './systemGraphService';

// ============================================================================
// Impact Analysis Context
// ============================================================================

/**
 * Impact Analysis Context Bundle
 * 
 * Provides comprehensive impact analysis for a change to one or more entities.
 * Combines downstream impact tracing, consistency checks, and change history.
 */
export interface ImpactAnalysisParams {
  project_id: string;
  start_node_ids: string[];
  max_depth?: number;
  include_history?: boolean;
  history_days?: number;
  subsystem?: string;
}

export interface ImpactAnalysisContext {
  // Impact trace
  impacted_nodes: any[];
  impacted_nodes_by_type: Record<string, any[]>;
  trace_edges: any[];
  
  // Consistency violations
  violations: any[];
  violations_summary: any;
  
  // Change history (if requested)
  history?: any[];
  
  // Metadata
  analysis_scope: {
    start_nodes: number;
    max_depth: number;
    subsystem?: string;
  };
  timestamp: string;
}

export async function getImpactAnalysisContext(
  params: ImpactAnalysisParams
): Promise<ImpactAnalysisContext> {
  try {
    logger.info(`Building impact analysis context for ${params.start_node_ids.length} nodes`);
    
    // 1. Trace downstream impact
    const impactParams: TraceDownstreamImpactParams = {
      project_id: params.project_id,
      start_node_ids: params.start_node_ids,
      max_depth: params.max_depth,
      include_relation_types: ['TRACES_TO', 'VERIFIED_BY', 'ALLOCATED_TO', 'INTERFACES_WITH']
    };
    
    const impactResult = await traceDownstreamImpact(impactParams);
    
    // 2. Run consistency checks on impacted area
    const checksResult = await runConsistencyChecks({
      project_id: params.project_id,
      subsystem: params.subsystem
    });
    
    // 3. Get change history if requested
    let history: any[] | undefined;
    
    if (params.include_history) {
      const historyParams: GetHistoryParams = {
        project_id: params.project_id,
        entity_ids: params.start_node_ids,
        days: params.history_days || 30
      };
      
      const historyResult = await getHistory(historyParams);
      history = historyResult.events;
    }
    
    return {
      impacted_nodes: impactResult.impacted_nodes,
      impacted_nodes_by_type: impactResult.impacted_nodes_by_type,
      trace_edges: impactResult.trace_edges,
      violations: checksResult.violations,
      violations_summary: checksResult.summary,
      history,
      analysis_scope: {
        start_nodes: params.start_node_ids.length,
        max_depth: params.max_depth || 3,
        subsystem: params.subsystem
      },
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    logger.error('Error building impact analysis context:', error);
    throw new Error(`Failed to build impact analysis context: ${error.message}`);
  }
}

// ============================================================================
// Daily Summary Context
// ============================================================================

/**
 * Daily Summary Context Bundle
 * 
 * Provides a comprehensive daily summary of changes, activities, and violations.
 * Combines change sets, graph statistics, and consistency check results.
 */
export interface DailySummaryParams {
  project_id: string;
  date?: string; // ISO date string, defaults to today
  subsystem?: string;
}

export interface DailySummaryContext {
  // Date range
  date: string;
  
  // Change set for the day
  change_set: any;
  
  // Graph statistics
  graph_stats: any;
  
  // Consistency violations
  violations: any[];
  violations_summary: any;
  
  // Activity summary
  activity_summary: {
    total_events: number;
    by_source_system: Record<string, number>;
    by_entity_type: Record<string, number>;
    by_event_type: Record<string, number>;
  };
  
  timestamp: string;
}

export async function getDailySummaryContext(
  params: DailySummaryParams
): Promise<DailySummaryContext> {
  try {
    const date = params.date || new Date().toISOString().split('T')[0];
    
    logger.info(`Building daily summary context for ${date}`);
    
    // 1. Build change set for the day
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const changeSet = await buildChangeSetForWindow({
      project_id: params.project_id,
      start_time: startOfDay.toISOString(),
      end_time: endOfDay.toISOString(),
      label: `Daily Summary ${date}`
    });
    
    // 2. Get graph statistics
    const graphStats = await getGraphStatistics({
      project_id: params.project_id,
      subsystem: params.subsystem
    });
    
    // 3. Run consistency checks
    const checksResult = await runConsistencyChecks({
      project_id: params.project_id,
      subsystem: params.subsystem
    });
    
    // 4. Build activity summary from change set stats
    const stats = changeSet.stats ? JSON.parse(changeSet.stats) : {};
    
    const activitySummary = {
      total_events: changeSet.event_count || 0,
      by_source_system: stats.by_source_system || {},
      by_entity_type: stats.by_entity_type || {},
      by_event_type: stats.by_event_type || {}
    };
    
    return {
      date,
      change_set: changeSet,
      graph_stats: graphStats,
      violations: checksResult.violations,
      violations_summary: checksResult.summary,
      activity_summary: activitySummary,
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    logger.error('Error building daily summary context:', error);
    throw new Error(`Failed to build daily summary context: ${error.message}`);
  }
}

// ============================================================================
// Verification Review Context
// ============================================================================

/**
 * Verification Review Context Bundle
 * 
 * Provides comprehensive verification status for a project or subsystem.
 * Combines verification gaps analysis with coverage metrics.
 */
export interface VerificationReviewParams {
  project_id: string;
  subsystem?: string;
  requirement_type?: string;
}

export interface VerificationReviewContext {
  // Verification gaps
  gaps: {
    requirements_missing_tests: any[];
    tests_without_requirements: any[];
    broken_chains: any[];
  };
  
  // Coverage metrics
  coverage_metrics: {
    overall_coverage: number;
    by_type: Record<string, any>;
    by_level?: Record<string, any>;
    by_subsystem?: Record<string, any>;
  };
  
  // Summary statistics
  summary: {
    total_requirements: number;
    verified_requirements: number;
    unverified_requirements: number;
    total_tests: number;
    orphan_tests: number;
    broken_chains: number;
  };
  
  // Scope
  scope: {
    project_id: string;
    subsystem?: string;
    requirement_type?: string;
  };
  
  timestamp: string;
}

export async function getVerificationReviewContext(
  params: VerificationReviewParams
): Promise<VerificationReviewContext> {
  try {
    logger.info(`Building verification review context for project ${params.project_id}`);
    
    // 1. Find verification gaps
    const gapsResult = await findVerificationGaps({
      project_id: params.project_id,
      subsystem: params.subsystem,
      requirement_type: params.requirement_type
    });
    
    // 2. Get coverage metrics
    const metricsResult = await getVerificationCoverageMetrics({
      project_id: params.project_id,
      subsystem: params.subsystem
    });
    
    // 3. Build summary statistics
    const summary = {
      total_requirements: gapsResult.requirements_missing_tests.length + 
                         (metricsResult.overall_coverage * 100 / 100),
      verified_requirements: Math.round(metricsResult.overall_coverage * 100) || 0,
      unverified_requirements: gapsResult.requirements_missing_tests.length,
      total_tests: gapsResult.tests_without_requirements.length + 
                  (metricsResult.overall_coverage * 100 / 100),
      orphan_tests: gapsResult.tests_without_requirements.length,
      broken_chains: gapsResult.broken_chains.length
    };
    
    return {
      gaps: {
        requirements_missing_tests: gapsResult.requirements_missing_tests,
        tests_without_requirements: gapsResult.tests_without_requirements,
        broken_chains: gapsResult.broken_chains
      },
      coverage_metrics: {
        overall_coverage: metricsResult.overall_coverage,
        by_type: metricsResult.by_type || {},
        by_level: metricsResult.by_level,
        by_subsystem: metricsResult.by_subsystem
      },
      summary,
      scope: {
        project_id: params.project_id,
        subsystem: params.subsystem,
        requirement_type: params.requirement_type
      },
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    logger.error('Error building verification review context:', error);
    throw new Error(`Failed to build verification review context: ${error.message}`);
  }
}

// ============================================================================
// Change Set Context
// ============================================================================

/**
 * Change Set Context Bundle
 * 
 * Provides detailed context for a specific change set (e.g. ECN, PR).
 * Includes events, impacted entities, and consistency analysis.
 */
export interface ChangeSetContextParams {
  project_id: string;
  anchor: string; // ECN-045, PR-123, etc.
  include_impact_analysis?: boolean;
}

export interface ChangeSetContext {
  // Change set
  change_set: any;
  
  // Events in change set
  events: any[];
  
  // Statistics
  stats: any;
  
  // Impact analysis (if requested)
  impact?: ImpactAnalysisContext;
  
  timestamp: string;
}

export async function getChangeSetContext(
  params: ChangeSetContextParams
): Promise<ChangeSetContext> {
  try {
    logger.info(`Building change set context for ${params.anchor}`);
    
    // 1. Build or retrieve change set
    const changeSet = await buildChangeSetFromAnchor({
      project_id: params.project_id,
      anchor: params.anchor,
      label: `Change Set: ${params.anchor}`
    });
    
    // 2. Get statistics
    const stats = await getChangeSetStats(changeSet.id);
    
    // 3. Optionally perform impact analysis
    let impact: ImpactAnalysisContext | undefined;
    
    if (params.include_impact_analysis && changeSet.event_ids && changeSet.event_ids.length > 0) {
      // Extract unique node IDs from events
      const nodeIds = new Set<string>();
      
      // This would require fetching events and extracting entity_ids
      // For now, we'll skip detailed implementation
      logger.info('Impact analysis for change sets not yet fully implemented');
    }
    
    return {
      change_set: changeSet,
      events: [], // Would be populated from change_set_events join
      stats,
      impact,
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    logger.error('Error building change set context:', error);
    throw new Error(`Failed to build change set context: ${error.message}`);
  }
}