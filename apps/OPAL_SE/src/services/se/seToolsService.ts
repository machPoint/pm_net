/**
 * SE Tools Service
 * 
 * Implements all systems engineering-specific MCP tools:
 * - querySystemModel
 * - getSystemSlice
 * - traceDownstreamImpact
 * - traceUpstreamRationale
 * - findVerificationGaps
 * - checkAllocationConsistency
 * - getVerificationCoverageMetrics
 * - getHistory
 * - findSimilarPastChanges
 */

import logger from '../../logger';
import {
  QuerySystemModelParams,
  QuerySystemModelResult,
  GetSystemSliceParams,
  GetSystemSliceResult,
  TraceDownstreamImpactParams,
  TraceDownstreamImpactResult,
  TraceUpstreamRationaleParams,
  TraceUpstreamRationaleResult,
  FindValidationGapsParams,
  FindValidationGapsResult,
  CheckAssignmentConsistencyParams,
  CheckAssignmentConsistencyResult,
  GetValidationCoverageMetricsParams,
  GetValidationCoverageMetricsResult,
  GetHistoryParams,
  GetHistoryResult,
  FindSimilarPastChangesParams,
  FindSimilarPastChangesResult,
  SystemNode,
  RelationType
} from '../../types/se';

import {
  getNodesByFilter,
  getEdgesByFilter,
  getNeighbors,
  getNodeCountsByType,
  getEdgeCountsByType
} from './systemGraphService';

import {
  buildTimeline,
  getEventsByFilter
} from './eventLogService';

import {
  getChangeSetsByProject,
  compareChangeSets
} from './changeSetService';

// ============================================================================
// Tool 1: querySystemModel
// ============================================================================

/**
 * Query the system model with filters
 */
export async function querySystemModel(
  params: QuerySystemModelParams
): Promise<QuerySystemModelResult> {
  try {
    logger.info(`Querying system model for project ${params.project_id}`);

    // Build node filters
    const nodeFilter: any = {
      project_id: params.project_id,
      limit: params.limit,
      offset: params.offset
    };

    if (params.node_filters) {
      if (params.node_filters.type) nodeFilter.type = params.node_filters.type;
      if (params.node_filters.source) nodeFilter.source = params.node_filters.source;
      if (params.node_filters.status) nodeFilter.status = params.node_filters.status;
      if (params.node_filters.ids) nodeFilter.ids = params.node_filters.ids;
    }

    // Build edge filters
    const edgeFilter: any = {
      project_id: params.project_id,
      limit: params.limit,
      offset: params.offset
    };

    if (params.edge_filters) {
      if (params.edge_filters.relation_type) {
        edgeFilter.relation_type = params.edge_filters.relation_type;
      }
    }

    // Execute queries
    const [nodes, edges] = await Promise.all([
      getNodesByFilter(nodeFilter),
      getEdgesByFilter(edgeFilter)
    ]);

    logger.info(`Query returned ${nodes.length} nodes, ${edges.length} edges`);

    return {
      nodes,
      edges,
      total_count: nodes.length + edges.length
    };
  } catch (error: any) {
    logger.error('Error in querySystemModel:', error);
    throw new Error(`Failed to query system model: ${error.message}`);
  }
}

// ============================================================================
// Tool 2: getSystemSlice
// ============================================================================

/**
 * Get a bounded slice of the system graph
 */
export async function getSystemSlice(
  params: GetSystemSliceParams
): Promise<GetSystemSliceResult> {
  try {
    logger.info(`Getting system slice for project ${params.project_id}`);

    let nodes: SystemNode[] = [];
    let edges: any[] = [];

    if (params.domain) {
      // Domain-based slice
      nodes = await getNodesByFilter({
        project_id: params.project_id
      });

      const nodeIds = nodes.map(n => n.id);
      edges = await getEdgesByFilter({
        project_id: params.project_id,
        from_node_id: nodeIds
      });

    } else if (params.start_node_ids && params.start_node_ids.length > 0) {
      // Traversal-based slice
      const depth = params.max_depth || 2;
      const result = await getNeighbors(
        params.start_node_ids,
        [], // All relation types
        'both',
        depth
      );
      nodes = result.nodes;
      edges = result.edges;

      // Add starting nodes
      const startNodes = await getNodesByFilter({
        ids: params.start_node_ids
      });
      nodes = [...startNodes, ...nodes];

    } else {
      // Full project slice (limited)
      nodes = await getNodesByFilter({
        project_id: params.project_id,
        limit: 100
      });

      const nodeIds = nodes.map(n => n.id);
      edges = await getEdgesByFilter({
        project_id: params.project_id,
        from_node_id: nodeIds,
        limit: 200
      });
    }

    // Compute metadata
    const nodeCounts = await getNodeCountsByType(params.project_id);
    const edgeCounts = await getEdgeCountsByType(params.project_id);

    logger.info(`System slice returned ${nodes.length} nodes, ${edges.length} edges`);

    return {
      nodes,
      edges,
      metadata: {
        node_counts_by_type: nodeCounts,
        edge_counts_by_type: edgeCounts
      }
    };
  } catch (error: any) {
    logger.error('Error in getSystemSlice:', error);
    throw new Error(`Failed to get system slice: ${error.message}`);
  }
}

// ============================================================================
// Tool 3: traceDownstreamImpact
// ============================================================================

/**
 * Trace downstream impact of changes
 */
export async function traceDownstreamImpact(
  params: TraceDownstreamImpactParams
): Promise<TraceDownstreamImpactResult> {
  try {
    logger.info(`Tracing downstream impact for ${params.start_nodes.length} nodes`);

    // Define downstream relation types (canonical: graph-vocabulary.ts)
    const downstreamRelations: RelationType[] = [
      'depends_on',
      'assigned_to',
      'produces',
      'requires_approval'
    ];

    // Traverse downstream
    const result = await getNeighbors(
      params.start_nodes,
      downstreamRelations,
      'outgoing',
      params.depth
    );

    // Filter nodes if specified
    let filteredNodes = result.nodes;
    if (params.filters) {
      if (params.filters.types) {
        filteredNodes = filteredNodes.filter(n => params.filters!.types!.includes(n.type));
      }
      if (params.filters.statuses) {
        filteredNodes = filteredNodes.filter(n =>
          n.status && params.filters!.statuses!.includes(n.status)
        );
      }
    }

    // Group by type (domain-neutral)
    const byType: Record<string, SystemNode[]> = {};
    for (const node of filteredNodes) {
      const t = node.type;
      if (!byType[t]) byType[t] = [];
      byType[t].push(node);
    }

    const impacted: TraceDownstreamImpactResult['impacted'] = {
      by_type: byType,
      total: filteredNodes.length
    };

    const totalImpacted = filteredNodes.length;
    logger.info(`Impact analysis found ${totalImpacted} impacted nodes`);

    return {
      impacted,
      traces: result.edges
    };
  } catch (error: any) {
    logger.error('Error in traceDownstreamImpact:', error);
    throw new Error(`Failed to trace downstream impact: ${error.message}`);
  }
}

// ============================================================================
// Tool 4: traceUpstreamRationale
// ============================================================================

/**
 * Trace upstream to find rationale and parent requirements
 */
export async function traceUpstreamRationale(
  params: TraceUpstreamRationaleParams
): Promise<TraceUpstreamRationaleResult> {
  try {
    logger.info(`Tracing upstream rationale for ${params.start_nodes.length} nodes`);

    // Define upstream relation types (canonical: graph-vocabulary.ts)
    const upstreamRelations: RelationType[] = [
      'depends_on',
      'informs'
    ];

    // Traverse upstream
    const result = await getNeighbors(
      params.start_nodes,
      upstreamRelations,
      'incoming',
      params.depth
    );

    // Build paths (simplified - just direct connections)
    const paths: TraceUpstreamRationaleResult['paths'] = [];
    for (const edge of result.edges) {
      if (params.start_nodes.includes(edge.to_node_id)) {
        paths.push({
          from: edge.from_node_id,
          to: edge.to_node_id,
          path: [edge.from_node_id, edge.to_node_id]
        });
      }
    }

    logger.info(`Upstream trace found ${result.nodes.length} upstream nodes`);

    return {
      upstream_nodes: result.nodes,
      paths
    };
  } catch (error: any) {
    logger.error('Error in traceUpstreamRationale:', error);
    throw new Error(`Failed to trace upstream rationale: ${error.message}`);
  }
}

// ============================================================================
// Tool 5: findVerificationGaps
// ============================================================================

/**
 * Find verification gaps in the system
 */
export async function findVerificationGaps(
  params: FindValidationGapsParams
): Promise<FindValidationGapsResult> {
  try {
    logger.info(`Finding verification gaps for project ${params.project_id}`);

    // Get all requirements
    const requirementFilter: any = {
      project_id: params.project_id,
      type: 'Requirement'
    };

    if (params.domain) {
      // domain filtering via metadata
    }

    const requirements = await getNodesByFilter(requirementFilter);

    // Get all validations
    const tests = await getNodesByFilter({
      project_id: params.project_id,
      type: 'Test'
    });

    // Get verification edges (task → deliverable via 'produces')
    const verificationEdges = await getEdgesByFilter({
      project_id: params.project_id,
      relation_type: 'produces'
    });

    // Build verification map
    const requirementsWithTests = new Set<string>();
    const testsWithRequirements = new Set<string>();

    for (const edge of verificationEdges) {
      requirementsWithTests.add(edge.from_node_id);
      testsWithRequirements.add(edge.to_node_id);
    }

    // Find gaps
    const requirements_missing_tests = requirements.filter(req => {
      // Filter by levels if specified
      if (params.priority_levels) {
        const level = req.metadata?.priority;
        if (level && !params.priority_levels.includes(level)) {
          return false;
        }
      }

      return !requirementsWithTests.has(req.id);
    });

    const tests_without_requirements = tests.filter(test =>
      !testsWithRequirements.has(test.id)
    );

    // Find broken chains (requirements that trace to other requirements but have no tests)
    const broken_chains: FindValidationGapsResult['broken_chains'] = [];
    for (const req of requirements) {
      if (requirementsWithTests.has(req.id)) continue;

      // Check if it has downstream traces
      const downstreamEdges = await getEdgesByFilter({
        from_node_id: req.id,
        relation_type: 'depends_on'
      });

      if (downstreamEdges.length > 0) {
        broken_chains.push({
          task: req,
          gap_type: 'missing_verification',
          description: `Task traces to ${downstreamEdges.length} other items but has no validation`
        });
      }
    }

    logger.info(`Found ${requirements_missing_tests.length} requirements without tests, ${tests_without_requirements.length} tests without requirements`);

    return {
      tasks_missing_validations: requirements_missing_tests,
      validations_without_tasks: tests_without_requirements,
      broken_chains
    };
  } catch (error: any) {
    logger.error('Error in findVerificationGaps:', error);
    throw new Error(`Failed to find verification gaps: ${error.message}`);
  }
}

// ============================================================================
// Tool 6: checkAllocationConsistency
// ============================================================================

/**
 * Check allocation consistency
 */
export async function checkAllocationConsistency(
  params: CheckAssignmentConsistencyParams
): Promise<CheckAssignmentConsistencyResult> {
  try {
    logger.info(`Checking allocation consistency for project ${params.project_id}`);

    // Get all requirements and components
    const [requirements, components] = await Promise.all([
      getNodesByFilter({
        project_id: params.project_id,
        type: 'Requirement'
      }),
      getNodesByFilter({
        project_id: params.project_id,
        type: 'Component'
      })
    ]);

    // Get allocation edges
    const allocationEdges = await getEdgesByFilter({
      project_id: params.project_id,
      relation_type: 'assigned_to'
    });

    // Build allocation maps
    const requirementsAllocated = new Set<string>();
    const componentsAllocated = new Set<string>();
    const requirementAllocations = new Map<string, string[]>();

    for (const edge of allocationEdges) {
      requirementsAllocated.add(edge.from_node_id);
      componentsAllocated.add(edge.to_node_id);

      if (!requirementAllocations.has(edge.from_node_id)) {
        requirementAllocations.set(edge.from_node_id, []);
      }
      requirementAllocations.get(edge.from_node_id)!.push(edge.to_node_id);
    }

    // Find unallocated requirements
    const unallocated_requirements = requirements.filter(req =>
      !requirementsAllocated.has(req.id)
    );

    // Find orphan components (no allocations)
    const orphan_components = components.filter(comp =>
      !componentsAllocated.has(comp.id)
    );

    // Find conflicting allocations (requirement allocated to multiple conflicting components)
    const conflicting_assignments: CheckAssignmentConsistencyResult['conflicting_assignments'] = [];
    for (const [reqId, compIds] of requirementAllocations.entries()) {
      if (compIds.length > 1) {
        // Check if agents are in different domains (potential conflict)
        const agents = await getNodesByFilter({ ids: compIds });
        const domains = new Set(agents.map((c: any) => c.metadata?.domain).filter(Boolean));

        if (domains.size > 1) {
          const req = requirements.find(r => r.id === reqId);
          if (req) {
            conflicting_assignments.push({
              task: req,
              agents,
              conflict_reason: `Assigned to agents in different domains: ${Array.from(domains).join(', ')}`
            });
          }
        }
      }
    }

    logger.info(`Found ${unallocated_requirements.length} unallocated requirements, ${orphan_components.length} orphan components`);

    return {
      unassigned_tasks: unallocated_requirements,
      orphan_agents: orphan_components,
      conflicting_assignments
    };
  } catch (error: any) {
    logger.error('Error in checkAllocationConsistency:', error);
    throw new Error(`Failed to check allocation consistency: ${error.message}`);
  }
}

// ============================================================================
// Tool 7: getVerificationCoverageMetrics
// ============================================================================

/**
 * Get verification coverage metrics
 */
export async function getVerificationCoverageMetrics(
  params: GetValidationCoverageMetricsParams
): Promise<GetValidationCoverageMetricsResult> {
  try {
    logger.info(`Getting verification coverage metrics for project ${params.project_id}`);

    // Get all requirements
    const requirements = await getNodesByFilter({
      project_id: params.project_id,
      type: 'Requirement',
    });

    // Get verification edges (task → deliverable via 'produces')
    const verificationEdges = await getEdgesByFilter({
      project_id: params.project_id,
      relation_type: 'produces'
    });

    const verifiedRequirements = new Set(verificationEdges.map(e => e.from_node_id));

    // Overall metrics
    const total_tasks = requirements.length;
    const validated_tasks = requirements.filter(r => verifiedRequirements.has(r.id)).length;
    const coverage_percentage = total_tasks > 0
      ? (validated_tasks / total_tasks) * 100
      : 0;

    // By type (from metadata)
    const by_type: Record<string, { total: number; validated: number }> = {};
    for (const req of requirements) {
      const type = req.metadata?.requirement_type || 'unknown';
      if (!by_type[type]) {
        by_type[type] = { total: 0, validated: 0 };
      }
      by_type[type].total++;
      if (verifiedRequirements.has(req.id)) {
        by_type[type].validated++;
      }
    }

    // By priority
    const by_priority: Record<string, { total: number; validated: number }> = {};
    for (const req of requirements) {
      const priority = req.metadata?.priority || 'unknown';
      if (!by_priority[priority]) {
        by_priority[priority] = { total: 0, validated: 0 };
      }
      by_priority[priority].total++;
      if (verifiedRequirements.has(req.id)) {
        by_priority[priority].validated++;
      }
    }

    logger.info(`Validation coverage: ${coverage_percentage.toFixed(1)}% (${validated_tasks}/${total_tasks})`);

    return {
      total_tasks,
      validated_tasks,
      coverage_percentage,
      by_type,
      by_priority
    };
  } catch (error: any) {
    logger.error('Error in getVerificationCoverageMetrics:', error);
    throw new Error(`Failed to get verification coverage metrics: ${error.message}`);
  }
}

// ============================================================================
// Tool 8: getHistory
// ============================================================================

/**
 * Get history timeline for entities
 */
export async function getHistory(
  params: GetHistoryParams
): Promise<GetHistoryResult> {
  try {
    logger.info(`Getting history for ${params.entity_ids.length} entities`);

    const timeline = await buildTimeline(
      params.entity_ids,
      params.window?.start,
      params.window?.end,
      params.limit
    );

    const events = await getEventsByFilter({
      entity_id: params.entity_ids,
      start_time: params.window?.start,
      end_time: params.window?.end,
      limit: params.limit
    });

    logger.info(`Retrieved ${events.length} events for history`);

    return {
      events,
      timeline
    };
  } catch (error: any) {
    logger.error('Error in getHistory:', error);
    throw new Error(`Failed to get history: ${error.message}`);
  }
}

// ============================================================================
// Tool 9: findSimilarPastChanges
// ============================================================================

/**
 * Find similar past changes based on signature
 */
export async function findSimilarPastChanges(
  params: FindSimilarPastChangesParams
): Promise<FindSimilarPastChangesResult> {
  try {
    logger.info(`Finding similar past changes matching signature`);

    // Get all change sets
    const allChangeSets = await getChangeSetsByProject(
      params.change_signature.node_types[0], // Use first node type to get project_id
      params.limit || 10
    );

    // Score each change set for similarity
    const scored: Array<{
      change_set: any;
      similarity_score: number;
      matching_patterns: string[];
    }> = [];

    for (const changeSet of allChangeSets) {
      let score = 0;
      const patterns: string[] = [];

      // Check node type overlap
      const csTypes = Object.keys(changeSet.stats.counts_by_type);
      const signatureTypes = params.change_signature.node_types;
      const typeOverlap = csTypes.filter(t => signatureTypes.includes(t as any));

      if (typeOverlap.length > 0) {
        score += (typeOverlap.length / signatureTypes.length) * 50;
        patterns.push(`Affects same types: ${typeOverlap.join(', ')}`);
      }

      // Check domain overlap
      const csDomains = Object.keys(changeSet.stats.counts_by_domain || {});
      const signatureDomains = params.change_signature.domains || [];
      const domainOverlap = csDomains.filter(s => signatureDomains.includes(s));

      if (domainOverlap.length > 0 && signatureDomains.length > 0) {
        score += (domainOverlap.length / signatureDomains.length) * 30;
        patterns.push(`Same domains: ${domainOverlap.join(', ')}`);
      }

      // Check event type patterns
      if (changeSet.stats.counts_by_event_type) {
        const eventTypes = Object.keys(changeSet.stats.counts_by_event_type);
        if (eventTypes.includes('created') && eventTypes.includes('linked')) {
          score += 20;
          patterns.push('Similar event pattern: created + linked');
        }
      }

      if (score > 0) {
        scored.push({
          change_set: changeSet,
          similarity_score: score,
          matching_patterns: patterns
        });
      }
    }

    // Sort by score and return top matches
    scored.sort((a, b) => b.similarity_score - a.similarity_score);
    const topMatches = scored.slice(0, params.limit || 5);

    logger.info(`Found ${topMatches.length} similar change sets`);

    return {
      similar_change_sets: topMatches
    };
  } catch (error: any) {
    logger.error('Error in findSimilarPastChanges:', error);
    throw new Error(`Failed to find similar past changes: ${error.message}`);
  }
}
