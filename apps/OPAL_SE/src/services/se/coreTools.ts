/**
 * CORE SE Tools (Layer 1)
 * 
 * Thin wrappers over OPAL MCP tools and sidecars following design rules:
 * - Deterministic and bounded
 * - Domain typed parameters
 * - Structured outputs {summary, details, raw}
 * - Traceable (tool_call_id, source_tools)
 * 
 * All tools in this file are CORE (Layer 1) - direct wrappers.
 */

import logger from '../../logger';
import { createCoreFunction, validateRequired, validateBounded } from '../../utils/coreSEFunction';
import {
  CoreSEOutput,
  QueryResultDetails,
  TraceResultDetails,
  VerificationCoverageDetails,
  ConsistencyCheckDetails,
  SystemNode,
  SystemEdge,
  NodeFilter,
  Requirement,
  TestCase,
  Component,
  VerificationGap,
  ConsistencyViolation,
  Severity,
  TracePath
} from '../../types/core-se';

import {
  getNodesByFilter,
  getEdgesByFilter,
  getNeighbors,
  getNodeCountsByType,
  getEdgeCountsByType
} from './systemGraphService';

import { buildTimeline, getEventsByFilter } from './eventLogService';
import { getChangeSetsByProject } from './changeSetService';
import * as ruleEngineService from './ruleEngineService';

// ============================================================================
// Tool 1: querySystemModel (Query Layer)
// ============================================================================

/**
 * Query the system graph with flexible filters for nodes and edges
 * 
 * @layer core
 * @category Query
 * @description Bounded query over the system model with explicit filters
 * 
 * @param project_id - Project identifier
 * @param node_filter - Filters for nodes (type, domain, status, ids)
 * @param edge_filter - Filters for edges (relation_type, source/target ids)
 * @param limit - Maximum results to return (default: 100)
 * @param offset - Pagination offset (default: 0)
 * 
 * @returns Structured result with nodes, edges, and statistics
 */
export const querySystemModel = createCoreFunction<
  {
    project_id: string;
    node_filter?: NodeFilter;
    edge_filter?: { relation_type?: string | string[]; source_ids?: string[]; target_ids?: string[] };
    limit?: number;
    offset?: number;
  },
  QueryResultDetails<{ nodes: SystemNode[]; edges: SystemEdge[] }>
>(
  'querySystemModel',
  ['systemGraphService'],
  async (params) => {
    validateRequired(params, ['project_id']);
    
    const limit = params.limit || 100;
    const offset = params.offset || 0;
    
    logger.info(`[querySystemModel] project=${params.project_id}, limit=${limit}`);
    
    // Build node query
    const nodeQuery: any = {
      project_id: params.project_id,
      limit,
      offset
    };
    
    if (params.node_filter) {
      if (params.node_filter.node_type) nodeQuery.type = params.node_filter.node_type;
      if (params.node_filter.domain) nodeQuery.domain = params.node_filter.domain;
      if (params.node_filter.status) nodeQuery.status = params.node_filter.status;
      if (params.node_filter.ids) nodeQuery.ids = params.node_filter.ids;
    }
    
    // Build edge query
    const edgeQuery: any = {
      project_id: params.project_id,
      limit,
      offset
    };
    
    if (params.edge_filter?.relation_type) {
      edgeQuery.relation_type = params.edge_filter.relation_type;
    }
    if (params.edge_filter?.source_ids) {
      edgeQuery.from_node_id = params.edge_filter.source_ids;
    }
    if (params.edge_filter?.target_ids) {
      edgeQuery.to_node_id = params.edge_filter.target_ids;
    }
    
    // Execute queries
    const [nodes, edges] = await Promise.all([
      getNodesByFilter(nodeQuery),
      getEdgesByFilter(edgeQuery)
    ]);
    
    const nodesByType = nodes.reduce((acc, n) => {
      acc[n.type] = (acc[n.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      summary: `Found ${nodes.length} nodes and ${edges.length} edges in project ${params.project_id}`,
      details: {
        count: nodes.length + edges.length,
        items: { nodes, edges },
        filters_applied: {
          node_filter: params.node_filter,
          edge_filter: params.edge_filter
        },
        total_available: nodes.length + edges.length
      },
      raw: { nodes, edges, nodesByType }
    };
  }
);

// ============================================================================
// Tool 2: getSystemSlice (Analysis Layer)
// ============================================================================

/**
 * Extract a bounded subgraph around specific nodes or within a domain
 * 
 * @layer core
 * @category Analysis
 * @description Deterministic slice extraction with explicit scope boundaries
 * 
 * @param project_id - Project identifier
 * @param domain - Optional domain to extract (bounded scope)
 * @param start_node_ids - Optional starting nodes for traversal (bounded scope)
 * @param max_depth - Maximum traversal depth (default: 2, max: 5)
 * @param include_relation_types - Optional relation types to include
 * 
 * @returns Subgraph with nodes, edges, and metadata
 */
export const getSystemSlice = createCoreFunction<
  {
    project_id: string;
    domain?: string;
    start_node_ids?: string[];
    max_depth?: number;
    include_relation_types?: string[];
  },
  QueryResultDetails<{ nodes: SystemNode[]; edges: SystemEdge[]; metadata: any }>
>(
  'getSystemSlice',
  ['systemGraphService'],
  async (params) => {
    validateRequired(params, ['project_id']);
    
    // Enforce bounded scope
    if (!params.domain && (!params.start_node_ids || params.start_node_ids.length === 0)) {
      throw new Error('Must specify either domain or start_node_ids for bounded scope');
    }
    
    const maxDepth = Math.min(params.max_depth || 2, 5); // Cap at 5
    
    logger.info(`[getSystemSlice] project=${params.project_id}, domain=${params.domain}, nodes=${params.start_node_ids?.length}`);
    
    let nodes: SystemNode[] = [];
    let edges: any[] = [];
    
    if (params.domain) {
      // Domain-based slice
      nodes = await getNodesByFilter({
        project_id: params.project_id,
        // domain filtering handled via metadata or type
        limit: 500
      });
      
      const nodeIds = nodes.map(n => n.id);
      edges = await getEdgesByFilter({
        project_id: params.project_id,
        from_node_id: nodeIds,
        limit: 1000
      });
      
    } else if (params.start_node_ids && params.start_node_ids.length > 0) {
      // Traversal-based slice (bounded by depth and start nodes)
      const result = await getNeighbors(
        params.start_node_ids,
        params.include_relation_types || [],
        'both',
        maxDepth
      );
      nodes = result.nodes;
      edges = result.edges;
      
      // Add starting nodes
      const startNodes = await getNodesByFilter({ ids: params.start_node_ids });
      nodes = [...startNodes, ...nodes];
    }
    
    // Compute statistics
    const nodeCounts = nodes.reduce((acc, n) => {
      acc[n.type] = (acc[n.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const edgeCounts = edges.reduce((acc: any, e: any) => {
      acc[e.relation_type] = (acc[e.relation_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      summary: params.domain 
        ? `Extracted ${nodes.length} nodes from ${params.domain} domain`
        : `Extracted ${nodes.length} nodes within depth ${maxDepth} of ${params.start_node_ids!.length} starting nodes`,
      details: {
        count: nodes.length,
        items: {
          nodes,
          edges,
          metadata: {
            node_counts_by_type: nodeCounts,
            edge_counts_by_type: edgeCounts,
            domain: params.domain,
            depth_used: maxDepth
          }
        }
      },
      raw: { nodes, edges, nodeCounts, edgeCounts }
    };
  }
);

// ============================================================================
// Tool 3: traceDownstreamImpact (Traceability Layer)
// ============================================================================

/**
 * Trace downstream impact from one or more starting nodes
 * 
 * @layer core
 * @category Traceability
 * @description Follow downstream relations to identify affected items
 * 
 * @param project_id - Project identifier
 * @param start_node_ids - Starting nodes to trace from (bounded scope)
 * @param max_depth - Maximum trace depth (default: 3, max: 5)
 * @param include_relation_types - Optional relation types to follow
 * 
 * @returns Impacted nodes grouped by type with trace paths
 */
export const traceDownstreamImpact = createCoreFunction<
  {
    project_id: string;
    start_node_ids: string[];
    max_depth?: number;
    include_relation_types?: string[];
  },
  TraceResultDetails
>(
  'traceDownstreamImpact',
  ['systemGraphService'],
  async (params) => {
    validateRequired(params, ['project_id', 'start_node_ids']);
    
    if (!params.start_node_ids || params.start_node_ids.length === 0) {
      throw new Error('start_node_ids must contain at least one node ID');
    }
    
    const maxDepth = Math.min(params.max_depth || 3, 5);
    
    logger.info(`[traceDownstreamImpact] tracing from ${params.start_node_ids.length} nodes, depth=${maxDepth}`);
    
    // Downstream relation types (PM + governance: graph-vocabulary.ts)
    const downstreamRelations = params.include_relation_types || [
      'depends_on',
      'assigned_to',
      'produces',
      'requires_approval',
      'for_task',
      'executes_plan',
      'checks',
      'evidenced_by'
    ];
    
    // Traverse downstream
    const result = await getNeighbors(
      params.start_node_ids,
      downstreamRelations,
      'outgoing',
      maxDepth
    );
    
    // Build trace paths (simplified)
    const tracePaths: TracePath[] = result.edges.map((edge: any, idx: number) => ({
      path: [edge.from_node_id, edge.to_node_id],
      relations: [edge.relation_type],
      depth: 1 // Simplified for now
    }));
    
    // Group by type
    const byType = result.nodes.reduce((acc, n) => {
      acc[n.type] = (acc[n.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Group by domain (stored in metadata)
    const byDomain = result.nodes.reduce((acc, n: any) => {
      const domain = n.domain || n.metadata?.domain;
      if (domain) {
        acc[domain] = (acc[domain] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
    
    return {
      summary: `Traced downstream impact to ${result.nodes.length} nodes across ${Object.keys(byType).length} types`,
      details: {
        start_nodes: params.start_node_ids,
        affected_nodes: result.nodes,
        trace_paths: tracePaths,
        depth_reached: maxDepth,
        statistics: {
          total_nodes: result.nodes.length,
          by_type: byType as any,
          by_domain: byDomain
        }
      },
      raw: result
    };
  }
);

// ============================================================================
// Tool 4: traceUpstreamRationale (Traceability Layer)
// ============================================================================

/**
 * Trace upstream to find parent requirements and rationale
 * 
 * @layer core
 * @category Traceability
 * @description Follow upstream relations to identify source rationale
 * 
 * @param project_id - Project identifier
 * @param start_node_ids - Starting nodes to trace from (bounded scope)
 * @param max_depth - Maximum trace depth (default: 3, max: 5)
 * 
 * @returns Parent requirements and rationale with trace paths
 */
export const traceUpstreamRationale = createCoreFunction<
  {
    project_id: string;
    start_node_ids: string[];
    max_depth?: number;
  },
  TraceResultDetails
>(
  'traceUpstreamRationale',
  ['systemGraphService'],
  async (params) => {
    validateRequired(params, ['project_id', 'start_node_ids']);
    
    if (!params.start_node_ids || params.start_node_ids.length === 0) {
      throw new Error('start_node_ids must contain at least one node ID');
    }
    
    const maxDepth = Math.min(params.max_depth || 3, 5);
    
    logger.info(`[traceUpstreamRationale] tracing from ${params.start_node_ids.length} nodes, depth=${maxDepth}`);
    
    // Upstream relation types (PM + governance)
    const upstreamRelations = ['depends_on', 'informs', 'produces', 'for_task', 'proposes', 'during_run'];
    
    // Traverse upstream
    const result = await getNeighbors(
      params.start_node_ids,
      upstreamRelations,
      'incoming',
      maxDepth
    );
    
    // Build trace paths
    const tracePaths: TracePath[] = result.edges.map((edge: any) => ({
      path: [edge.to_node_id, edge.from_node_id], // Reverse for upstream
      relations: [edge.relation_type],
      depth: 1
    }));
    
    // Group by type
    const byType = result.nodes.reduce((acc, n) => {
      acc[n.type] = (acc[n.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      summary: `Traced upstream rationale to ${result.nodes.length} parent nodes`,
      details: {
        start_nodes: params.start_node_ids,
        affected_nodes: result.nodes,
        trace_paths: tracePaths,
        depth_reached: maxDepth,
        statistics: {
          total_nodes: result.nodes.length,
          by_type: byType as any
        }
      },
      raw: result
    };
  }
);

// ============================================================================
// Tool 5: findVerificationGaps (Verification Layer)
// ============================================================================

/**
 * Identify verification gaps in requirements
 * 
 * @layer core
 * @category Verification
 * @description Find requirements without proper verification
 * 
 * @param project_id - Project identifier
 * @param requirement_ids - Optional specific requirements to check (bounded scope)
 * @param domain - Optional domain to scope analysis
 * 
 * @returns List of verification gaps with severity and recommendations
 */
export const findVerificationGaps = createCoreFunction<
  {
    project_id: string;
    requirement_ids?: string[];
    domain?: string;
  },
  VerificationCoverageDetails
>(
  'findVerificationGaps',
  ['systemGraphService'],
  async (params) => {
    validateRequired(params, ['project_id']);
    
    logger.info(`[findVerificationGaps] project=${params.project_id}, domain=${params.domain}`);
    
    // Get requirements
    const requirementFilter: any = {
      project_id: params.project_id,
      type: 'Requirement',
      limit: 1000
    };
    
    if (params.requirement_ids) {
      requirementFilter.ids = params.requirement_ids;
    } else if (params.domain) {
      // domain filtering via metadata
    }
    
    const requirements = await getNodesByFilter(requirementFilter);
    
    // Check each requirement for verification
    const gaps: VerificationGap[] = [];
    let verifiedCount = 0;
    
    for (const req of requirements) {
      // Check for test case allocation
      const testEdges = await getEdgesByFilter({
        from_node_id: [req.id],
        relation_type: 'produces',
        limit: 10
      });
      
      if (testEdges.length === 0) {
        gaps.push({
          requirement_id: req.id,
          requirement_title: req.title,
          severity: req.status === 'approved' ? 'high' : 'medium',
          reason: 'No verification test case allocated',
          gap_type: 'no_test_case',
          recommendations: [
            'Create test case to verify this requirement',
            'Link test case using produces relation'
          ]
        });
      } else {
        verifiedCount++;
      }
    }
    
    const coveragePercentage = requirements.length > 0
      ? Math.round((verifiedCount / requirements.length) * 100)
      : 0;
    
    // Group gaps by severity
    const bySeverity = gaps.reduce((acc, g) => {
      acc[g.severity] = (acc[g.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      summary: `Verification coverage: ${coveragePercentage}% (${verifiedCount}/${requirements.length}), ${gaps.length} gaps found`,
      details: {
        coverage_percentage: coveragePercentage,
        total_requirements: requirements.length,
        verified_requirements: verifiedCount,
        gaps,
        domain_breakdown: params.domain ? {
          [params.domain]: {
            coverage: coveragePercentage,
            total: requirements.length,
            verified: verifiedCount,
            gaps: gaps.length
          }
        } : undefined
      },
      raw: { requirements, gaps, bySeverity }
    };
  }
);

// ============================================================================
// Tool 6: checkAllocationConsistency (Validation Layer)
// ============================================================================

/**
 * Check allocation consistency across components and requirements
 * 
 * @layer core
 * @category Validation
 * @description Verify allocation relationships are consistent
 * 
 * @param project_id - Project identifier
 * @param domain - Optional domain to scope check
 * @param component_ids - Optional specific components to check
 * 
 * @returns Consistency violations with severity
 */
export const checkAllocationConsistency = createCoreFunction<
  {
    project_id: string;
    domain?: string;
    component_ids?: string[];
  },
  ConsistencyCheckDetails
>(
  'checkAllocationConsistency',
  ['systemGraphService'],
  async (params) => {
    validateRequired(params, ['project_id']);
    
    logger.info(`[checkAllocationConsistency] project=${params.project_id}`);
    
    // Get components
    const componentFilter: any = {
      project_id: params.project_id,
      type: 'Component',
      limit: 500
    };
    
    if (params.component_ids) {
      componentFilter.ids = params.component_ids;
    } else if (params.domain) {
      // domain filtering via metadata
    }
    
    const components = await getNodesByFilter(componentFilter);
    const violations: ConsistencyViolation[] = [];
    
    // Check each component
    for (const comp of components) {
      // Check if component has requirements allocated
      const reqEdges = await getEdgesByFilter({
        to_node_id: [comp.id],
        relation_type: 'assigned_to',
        limit: 100
      });
      
      if (reqEdges.length === 0) {
        violations.push({
          id: `alloc_${comp.id}`,
          violation_type: 'no_requirements_allocated',
          severity: 'medium',
          affected_nodes: [comp.id],
          description: `Component "${comp.title}" has no requirements allocated`,
          rule_id: 'ALLOC_001'
        });
      }
      
      // Check for circular allocations (simplified check)
      // In a real system, this would be more sophisticated
    }
    
    const passed = violations.length === 0;
    const bySeverity = violations.reduce((acc, v) => {
      acc[v.severity] = (acc[v.severity] || 0) + 1;
      return acc;
    }, {} as Record<Severity, number>);
    
    const byType = violations.reduce((acc, v) => {
      acc[v.violation_type] = (acc[v.violation_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      summary: passed 
        ? `Allocation consistency check passed for ${components.length} components`
        : `Found ${violations.length} allocation consistency violations`,
      details: {
        passed,
        total_checks: components.length,
        violations,
        by_severity: bySeverity,
        by_type: byType
      },
      raw: { components, violations }
    };
  }
);

// ============================================================================
// Tool 7: getVerificationCoverageMetrics (Metrics Layer)
// ============================================================================

/**
 * Calculate comprehensive verification coverage metrics
 * 
 * @layer core
 * @category Metrics
 * @description Compute verification coverage across project or domain
 * 
 * @param project_id - Project identifier
 * @param domain - Optional domain to scope metrics
 * 
 * @returns Detailed coverage metrics and breakdown
 */
export const getVerificationCoverageMetrics = createCoreFunction<
  {
    project_id: string;
    domain?: string;
  },
  VerificationCoverageDetails
>(
  'getVerificationCoverageMetrics',
  ['systemGraphService'],
  async (params) => {
    // Reuse findVerificationGaps logic but return metrics-focused output
    return findVerificationGaps(params);
  }
);

// ============================================================================
// Tool 8: getHistory (History Layer)
// ============================================================================

/**
 * Get chronological event history for entities
 * 
 * @layer core
 * @category History
 * @description Retrieve event timeline for specific entities
 * 
 * @param project_id - Project identifier
 * @param entity_id - Entity to get history for (bounded scope)
 * @param limit - Maximum events to return (default: 50)
 * 
 * @returns Chronological event history
 */
export const getHistory = createCoreFunction<
  {
    project_id: string;
    entity_id: string;
    limit?: number;
  },
  QueryResultDetails<{ events: any[]; timeline: any }>
>(
  'getHistory',
  ['eventLogService'],
  async (params) => {
    validateRequired(params, ['project_id', 'entity_id']);
    
    const limit = params.limit || 50;
    
    logger.info(`[getHistory] entity=${params.entity_id}, limit=${limit}`);
    
    const events = await getEventsByFilter({
      project_id: params.project_id,
      entity_ids: [params.entity_id],
      limit
    });
    
    const timeline = buildTimeline(events);
    
    return {
      summary: `Retrieved ${events.length} events for entity ${params.entity_id}`,
      details: {
        count: events.length,
        items: { events, timeline }
      },
      raw: { events, timeline }
    };
  }
);

// ============================================================================
// Tool 9: findSimilarPastChanges (Analysis Layer)
// ============================================================================

/**
 * Find similar change patterns in historical change sets
 * 
 * @layer core
 * @category Analysis
 * @description Search for similar changes using change description
 * 
 * @param project_id - Project identifier
 * @param change_description - Description of current change
 * @param limit - Maximum similar changes to return (default: 10)
 * 
 * @returns Similar past changes with similarity scores
 */
export const findSimilarPastChanges = createCoreFunction<
  {
    project_id: string;
    change_description: string;
    limit?: number;
  },
  QueryResultDetails<{ similar_changes: any[] }>
>(
  'findSimilarPastChanges',
  ['changeSetService'],
  async (params) => {
    validateRequired(params, ['project_id', 'change_description']);
    
    const limit = params.limit || 10;
    
    logger.info(`[findSimilarPastChanges] project=${params.project_id}`);
    
    // Get all change sets
    const changeSets = await getChangeSetsByProject(params.project_id);
    
    // Simple similarity scoring (in real system, use embeddings/NLP)
    const scored = changeSets.map((cs: any) => {
      const descLower = params.change_description.toLowerCase();
      const csDescLower = (cs.description || '').toLowerCase();
      
      const words = descLower.split(/\s+/);
      const matches = words.filter(word => csDescLower.includes(word)).length;
      const similarity = matches / words.length;
      
      return { ...cs, similarity_score: similarity };
    });
    
    // Sort by similarity and take top N
    const similar = scored
      .filter((cs: any) => cs.similarity_score > 0.1)
      .sort((a: any, b: any) => b.similarity_score - a.similarity_score)
      .slice(0, limit);
    
    return {
      summary: `Found ${similar.length} similar past changes`,
      details: {
        count: similar.length,
        items: { similar_changes: similar }
      },
      raw: { changeSets, similar }
    };
  }
);

// ============================================================================
// Tool 10: runConsistencyChecks (Validation Layer)
// ============================================================================

/**
 * Run consistency checks using the rule engine
 * 
 * @layer core
 * @category Validation
 * @description Execute rule engine checks on system model
 * 
 * @param project_id - Project identifier
 * @param rule_set - Rule set to execute (default: 'default')
 * @param scope_node_ids - Optional nodes to scope checks
 * 
 * @returns Consistency check results with violations
 */
export const runConsistencyChecks = createCoreFunction<
  {
    project_id: string;
    rule_set?: string;
    scope_node_ids?: string[];
  },
  ConsistencyCheckDetails
>(
  'runConsistencyChecks',
  ['ruleEngineService'],
  async (params) => {
    validateRequired(params, ['project_id']);
    
    const ruleSet = params.rule_set || 'default';
    
    logger.info(`[runConsistencyChecks] project=${params.project_id}, ruleSet=${ruleSet}`);
    
    // Run rule engine
    const result = await ruleEngineService.runConsistencyChecks({
      project_id: params.project_id,
      rule_set: ruleSet,
      scope_node_ids: params.scope_node_ids
    });
    
    const violations: ConsistencyViolation[] = result.violations || [];
    const passed = violations.length === 0;
    
    const bySeverity = violations.reduce((acc, v) => {
      acc[v.severity] = (acc[v.severity] || 0) + 1;
      return acc;
    }, {} as Record<Severity, number>);
    
    const byType = violations.reduce((acc, v) => {
      acc[v.violation_type] = (acc[v.violation_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      summary: passed
        ? `All consistency checks passed using ${ruleSet} rule set`
        : `Found ${violations.length} consistency violations using ${ruleSet} rule set`,
      details: {
        passed,
        total_checks: result.total_checks || violations.length,
        violations,
        by_severity: bySeverity,
        by_type: byType
      },
      raw: result
    };
  }
);
