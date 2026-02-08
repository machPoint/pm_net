/**
 * SE MCP Tools Registration
 * 
 * Registers all Systems Engineering MCP tools with the OPAL server.
 */

import logger from '../../logger';
const { createTool } = require('../../utils/toolCreator');
import {
  querySystemModel,
  getSystemSlice,
  traceDownstreamImpact,
  traceUpstreamRationale,
  findVerificationGaps,
  checkAllocationConsistency,
  getVerificationCoverageMetrics,
  getHistory,


  findSimilarPastChanges
} from './seToolsService';
import {
  checkAssignedTasks,
  getTaskContext,
  submitPlan,
  checkPlanStatus,
  startRun,
  logDecision,
  completeTask,
  queryPrecedents
} from '../chelexService';
import { runConsistencyChecks } from './ruleEngineService';
import {
  findOptimalPath,
  getTraversableEdges,
  evaluatePathPlan,
  getNodeContext,
  findNodesByType
} from './agentGraphTools';

/**
 * Register all SE MCP tools
 */
export async function registerSETools(configs: any, wss: any): Promise<void> {
  logger.info('Registering OPAL_SE MCP tools...');

  try {
    // 1. querySystemModel
    await createTool(configs, wss, {
      name: 'querySystemModel',
      description: 'Query the system graph with flexible filters for nodes and edges',
      inputSchema: {
        type: 'object',
        properties: {
          project_id: {
            type: 'string',
            description: 'Project identifier (required)'
          },
          node_filters: {
            type: 'object',
            description: 'Filters for nodes (type, source, status, ids)'
          },
          edge_filters: {
            type: 'object',
            description: 'Filters for edges (relation_type)'
          },
          limit: {
            type: 'integer',
            description: 'Maximum number of nodes to return',
            default: 100
          },
          offset: {
            type: 'integer',
            description: 'Pagination offset',
            default: 0
          }
        },
        required: ['project_id']
      },
      _internal: {
        method: 'POST',
        path: '/se/query-system-model',
        processor: async (params: any) => await querySystemModel(params)
      }
    });

    // 2. getSystemSlice
    await createTool(configs, wss, {
      name: 'getSystemSlice',
      description: 'Extract a bounded subgraph around specific nodes or within a domain',
      inputSchema: {
        type: 'object',
        properties: {
          project_id: {
            type: 'string',
            description: 'Project identifier (required)'
          },
          domain: {
            type: 'string',
            description: 'Extract all nodes in this domain'
          },
          start_node_ids: {
            type: 'array',
            items: { type: 'string' },
            description: 'Starting nodes for graph expansion'
          },
          max_depth: {
            type: 'integer',
            description: 'Maximum traversal depth from start nodes',
            default: 2
          },
          include_metadata: {
            type: 'boolean',
            description: 'Include statistics and metadata',
            default: true
          }
        },
        required: ['project_id']
      },
      _internal: {
        method: 'POST',
        path: '/se/get-system-slice',
        processor: async (params: any) => await getSystemSlice(params)
      }
    });

    // 3. traceDownstreamImpact
    await createTool(configs, wss, {
      name: 'traceDownstreamImpact',
      description: 'Trace downstream impact from one or more starting nodes',
      inputSchema: {
        type: 'object',
        properties: {
          project_id: { type: 'string' },
          start_node_ids: {
            type: 'array',
            items: { type: 'string' },
            description: 'Starting nodes for impact analysis'
          },
          max_depth: {
            type: 'integer',
            description: 'Maximum trace depth',
            default: 3
          },
          include_relation_types: {
            type: 'array',
            items: { type: 'string' },
            description: 'Which edge types to follow'
          }
        },
        required: ['project_id', 'start_node_ids']
      },
      _internal: {
        method: 'POST',
        path: '/se/trace-downstream-impact',
        processor: async (params: any) => await traceDownstreamImpact(params)
      }
    });

    // 4. traceUpstreamRationale
    await createTool(configs, wss, {
      name: 'traceUpstreamRationale',
      description: 'Trace upstream dependencies and rationale',
      inputSchema: {
        type: 'object',
        properties: {
          project_id: { type: 'string' },
          start_node_ids: {
            type: 'array',
            items: { type: 'string' }
          },
          max_depth: {
            type: 'integer',
            default: 3
          }
        },
        required: ['project_id', 'start_node_ids']
      },
      _internal: {
        method: 'POST',
        path: '/se/trace-upstream-rationale',
        processor: async (params: any) => await traceUpstreamRationale(params)
      }
    });

    // 5. findVerificationGaps
    await createTool(configs, wss, {
      name: 'findVerificationGaps',
      description: 'Identify verification gaps in the system model',
      inputSchema: {
        type: 'object',
        properties: {
          project_id: { type: 'string' },
          domain: { type: 'string' },
          requirement_type: { type: 'string' }
        },
        required: ['project_id']
      },
      _internal: {
        method: 'POST',
        path: '/se/find-verification-gaps',
        processor: async (params: any) => await findVerificationGaps(params)
      }
    });

    // 6. checkAllocationConsistency
    await createTool(configs, wss, {
      name: 'checkAllocationConsistency',
      description: 'Check allocation consistency across components and requirements',
      inputSchema: {
        type: 'object',
        properties: {
          project_id: { type: 'string' },
          domain: { type: 'string' }
        },
        required: ['project_id']
      },
      _internal: {
        method: 'POST',
        path: '/se/check-allocation-consistency',
        processor: async (params: any) => await checkAllocationConsistency(params)
      }
    });

    // 7. getVerificationCoverageMetrics
    await createTool(configs, wss, {
      name: 'getVerificationCoverageMetrics',
      description: 'Calculate verification coverage metrics',
      inputSchema: {
        type: 'object',
        properties: {
          project_id: { type: 'string' },
          domain: { type: 'string' }
        },
        required: ['project_id']
      },
      _internal: {
        method: 'POST',
        path: '/se/get-verification-coverage-metrics',
        processor: async (params: any) => await getVerificationCoverageMetrics(params)
      }
    });

    // 8. getHistory
    await createTool(configs, wss, {
      name: 'getHistory',
      description: 'Get chronological event history for entities',
      inputSchema: {
        type: 'object',
        properties: {
          project_id: { type: 'string' },
          entity_ids: {
            type: 'array',
            items: { type: 'string' },
            description: 'Entity IDs to fetch history for'
          },
          days: {
            type: 'integer',
            description: 'Number of days to look back',
            default: 30
          }
        },
        required: ['project_id', 'entity_ids']
      },
      _internal: {
        method: 'POST',
        path: '/se/get-history',
        processor: async (params: any) => await getHistory(params)
      }
    });

    // 9. findSimilarPastChanges
    await createTool(configs, wss, {
      name: 'findSimilarPastChanges',
      description: 'Find similar change patterns in historical change sets',
      inputSchema: {
        type: 'object',
        properties: {
          project_id: { type: 'string' },
          reference_change_set_id: {
            type: 'string',
            description: 'Find changes similar to this change set'
          },
          min_similarity: {
            type: 'number',
            description: 'Minimum similarity threshold',
            default: 0.5
          },
          limit: {
            type: 'integer',
            default: 10
          }
        },
        required: ['project_id']
      },
      _internal: {
        method: 'POST',
        path: '/se/find-similar-past-changes',
        processor: async (params: any) => await findSimilarPastChanges(params)
      }
    });

    // 10. runConsistencyChecks
    await createTool(configs, wss, {
      name: 'runConsistencyChecks',
      description: 'Run consistency checks using the rule engine',
      inputSchema: {
        type: 'object',
        properties: {
          project_id: { type: 'string' },
          domain: { type: 'string' },
          rule_ids: {
            type: 'array',
            items: { type: 'string' },
            description: 'Specific rules to run (omit for all rules)'
          }
        },
        required: ['project_id']
      },
      _internal: {
        method: 'POST',
        path: '/se/run-consistency-checks',
        processor: async (params: any) => await runConsistencyChecks(params)
      }
    });



    // ============================================================================
    // Chelex Governance Tools
    // ============================================================================

    // 11. checkAssignedTasks
    await createTool(configs, wss, {
      ...checkAssignedTasks,
      _internal: {
        method: 'POST',
        path: '/chelex/check-assigned-tasks',
        processor: async (params: any, context: any) => await checkAssignedTasks.handler(params, context)
      }
    });

    // 12. getTaskContext
    await createTool(configs, wss, {
      ...getTaskContext,
      _internal: {
        method: 'POST',
        path: '/chelex/get-task-context',
        processor: async (params: any) => await getTaskContext.handler(params)
      }
    });

    // 13. submitPlan
    await createTool(configs, wss, {
      ...submitPlan,
      _internal: {
        method: 'POST',
        path: '/chelex/submit-plan',
        processor: async (params: any, context: any) => await submitPlan.handler(params, context)
      }
    });

    // 14. checkPlanStatus
    await createTool(configs, wss, {
      ...checkPlanStatus,
      _internal: {
        method: 'POST',
        path: '/chelex/check-plan-status',
        processor: async (params: any) => await checkPlanStatus.handler(params)
      }
    });

    // 15. startRun
    await createTool(configs, wss, {
      ...startRun,
      _internal: {
        method: 'POST',
        path: '/chelex/start-run',
        processor: async (params: any, context: any) => await startRun.handler(params, context)
      }
    });

    // 16. logDecision
    await createTool(configs, wss, {
      ...logDecision,
      _internal: {
        method: 'POST',
        path: '/chelex/log-decision',
        processor: async (params: any) => await logDecision.handler(params)
      }
    });

    // 17. completeTask
    await createTool(configs, wss, {
      ...completeTask,
      _internal: {
        method: 'POST',
        path: '/chelex/complete-task',
        processor: async (params: any) => await completeTask.handler(params)
      }
    });

    // 18. queryPrecedents
    await createTool(configs, wss, {
      ...queryPrecedents,
      _internal: {
        method: 'POST',
        path: '/chelex/query-precedents',
        processor: async (params: any) => await queryPrecedents.handler(params)
      }
    });

    // ============================================================================
    // Agent Graph Navigation Tools
    // ============================================================================

    // 19. findOptimalPath
    await createTool(configs, wss, {
      ...findOptimalPath,
      _internal: {
        method: 'POST',
        path: '/graph/find-optimal-path',
        processor: async (params: any) => await findOptimalPath.handler(params)
      }
    });

    // 20. getTraversableEdges
    await createTool(configs, wss, {
      ...getTraversableEdges,
      _internal: {
        method: 'POST',
        path: '/graph/get-traversable-edges',
        processor: async (params: any) => await getTraversableEdges.handler(params)
      }
    });

    // 21. evaluatePathPlan
    await createTool(configs, wss, {
      ...evaluatePathPlan,
      _internal: {
        method: 'POST',
        path: '/graph/evaluate-path-plan',
        processor: async (params: any) => await evaluatePathPlan.handler(params)
      }
    });

    // 22. getNodeContext
    await createTool(configs, wss, {
      ...getNodeContext,
      _internal: {
        method: 'POST',
        path: '/graph/get-node-context',
        processor: async (params: any) => await getNodeContext.handler(params)
      }
    });

    // 23. findNodesByType
    await createTool(configs, wss, {
      ...findNodesByType,
      _internal: {
        method: 'POST',
        path: '/graph/find-nodes-by-type',
        processor: async (params: any) => await findNodesByType.handler(params)
      }
    });

    logger.info('Successfully registered 23 OPAL_SE MCP tools (incl. Chelex + Graph Navigation)');
  } catch (error: any) {
    logger.error('Error registering SE tools:', error);
    throw error;
  }
}
