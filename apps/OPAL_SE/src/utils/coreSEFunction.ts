/**
 * CORE SE Function Utilities
 * Utilities for creating traceable, structured CORE SE functions
 */

import logger from '../logger';
import * as auditService from '../services/auditService';
import {
  CoreSEOutput,
  FunctionLayer,
  FunctionMetadata,
  AuditLogEntry,
  generateToolCallId
} from '../types/core-se';

// ============================================================================
// Tracked Function Wrapper
// ============================================================================

/**
 * Wrap a function call with traceability and audit logging
 * 
 * @param metadata - Function metadata (name, layer, source_tools)
 * @param operation - The async operation to execute
 * @returns Promise with tracked result including tool_call_id and source_tools
 * 
 * @example
 * async function getRequirements(params) {
 *   return trackedFunctionCall(
 *     { name: 'getRequirements', layer: 'core', source_tools: ['querySystemModel'] },
 *     async () => {
 *       const result = await mcpClient.call('querySystemModel', params);
 *       return {
 *         summary: `Found ${result.nodes.length} requirements`,
 *         details: { count: result.nodes.length, requirements: result.nodes }
 *       };
 *     }
 *   );
 * }
 */
export async function trackedFunctionCall<T extends Partial<CoreSEOutput>>(
  metadata: FunctionMetadata,
  operation: () => Promise<T>,
  params?: any
): Promise<T & Pick<CoreSEOutput, 'tool_call_id' | 'source_tools' | 'duration_ms' | 'timestamp'>> {
  const tool_call_id = generateToolCallId();
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  
  logger.info(`[${metadata.layer}] Starting ${metadata.name}`, {
    tool_call_id,
    source_tools: metadata.source_tools
  });
  
  try {
    // Execute the operation
    const result = await operation();
    const duration_ms = Date.now() - startTime;
    
    // Log success to audit service
    const auditEntry: AuditLogEntry = {
      tool_call_id,
      function_name: metadata.name,
      layer: metadata.layer,
      source_tools: metadata.source_tools,
      params,
      duration_ms,
      status: 'success',
      timestamp
    };
    
    await auditService.logEvent({
      type: 'function_call',
      action: metadata.name,
      details: auditEntry,
      timestamp
    }).catch(err => logger.warn('Failed to log audit entry:', err));
    
    logger.info(`[${metadata.layer}] Completed ${metadata.name}`, {
      tool_call_id,
      duration_ms,
      status: 'success'
    });
    
    // Return result with traceability fields
    return {
      ...result,
      tool_call_id,
      source_tools: metadata.source_tools,
      duration_ms,
      timestamp
    };
    
  } catch (error: any) {
    const duration_ms = Date.now() - startTime;
    
    // Log error to audit service
    const auditEntry: AuditLogEntry = {
      tool_call_id,
      function_name: metadata.name,
      layer: metadata.layer,
      source_tools: metadata.source_tools,
      params,
      duration_ms,
      status: 'error',
      error: error.message,
      timestamp
    };
    
    await auditService.logEvent({
      type: 'function_error',
      action: metadata.name,
      details: auditEntry,
      timestamp
    }).catch(err => logger.warn('Failed to log audit entry:', err));
    
    logger.error(`[${metadata.layer}] Failed ${metadata.name}`, {
      tool_call_id,
      duration_ms,
      error: error.message,
      stack: error.stack
    });
    
    // Re-throw with enhanced error info
    error.tool_call_id = tool_call_id;
    error.function_name = metadata.name;
    throw error;
  }
}

// ============================================================================
// Function Decorators
// ============================================================================

/**
 * Decorator for core layer functions (thin wrappers)
 */
export function CoreFunction(name: string, source_tools: string[]) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      return trackedFunctionCall(
        { name, layer: 'core', source_tools },
        () => originalMethod.apply(this, args),
        args[0]
      );
    };
    
    return descriptor;
  };
}

/**
 * Decorator for macro layer functions (orchestrations)
 */
export function MacroFunction(name: string, source_tools: string[]) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      return trackedFunctionCall(
        { name, layer: 'macro', source_tools },
        () => originalMethod.apply(this, args),
        args[0]
      );
    };
    
    return descriptor;
  };
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate required parameters
 */
export function validateRequired(params: any, required: string[]): void {
  const missing = required.filter(key => !params[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required parameters: ${missing.join(', ')}`);
  }
}

/**
 * Validate parameter types
 */
export function validateTypes(
  params: any,
  schema: Record<string, 'string' | 'number' | 'boolean' | 'array' | 'object'>
): void {
  const errors: string[] = [];
  
  Object.entries(schema).forEach(([key, expectedType]) => {
    const value = params[key];
    if (value === undefined) return;
    
    const actualType = Array.isArray(value) ? 'array' : typeof value;
    if (actualType !== expectedType) {
      errors.push(`${key} must be ${expectedType}, got ${actualType}`);
    }
  });
  
  if (errors.length > 0) {
    throw new Error(`Parameter type errors: ${errors.join('; ')}`);
  }
}

/**
 * Validate bounded scope (prevent unbounded queries)
 */
export function validateBounded(params: any): void {
  const hasLimit = params.limit !== undefined;
  const hasIds = params.ids && Array.isArray(params.ids) && params.ids.length > 0;
  const hasScope = params.domain || params.start_node_ids;
  
  if (!hasLimit && !hasIds && !hasScope) {
    throw new Error('Function must have bounded scope: provide limit, IDs, or scope filter');
  }
}

// ============================================================================
// Output Helpers
// ============================================================================

/**
 * Create standardized error output
 */
export function createErrorOutput(
  error: Error,
  source_tools: string[]
): CoreSEOutput<{ error: string; stack?: string }> {
  return {
    summary: `Error: ${error.message}`,
    details: {
      error: error.message,
      stack: error.stack
    },
    tool_call_id: generateToolCallId(),
    source_tools,
    timestamp: new Date().toISOString()
  };
}

/**
 * Create empty result output
 */
export function createEmptyOutput<T>(
  message: string,
  source_tools: string[],
  emptyDetails: T
): CoreSEOutput<T> {
  return {
    summary: message,
    details: emptyDetails,
    tool_call_id: generateToolCallId(),
    source_tools,
    timestamp: new Date().toISOString()
  };
}

// ============================================================================
// Function Templates
// ============================================================================

/**
 * Template for creating a core function
 * 
 * @example
 * export const getRequirementById = createCoreFunction(
 *   'getRequirementById',
 *   ['querySystemModel'],
 *   async (params: { project_id: string; requirement_id: string }) => {
 *     validateRequired(params, ['project_id', 'requirement_id']);
 *     
 *     const result = await mcpClient.call('querySystemModel', {
 *       project_id: params.project_id,
 *       node_filters: { ids: [params.requirement_id] }
 *     });
 *     
 *     if (result.nodes.length === 0) {
 *       return createEmptyOutput(
 *         'Requirement not found',
 *         ['querySystemModel'],
 *         { requirement: null }
 *       );
 *     }
 *     
 *     return {
 *       summary: `Found requirement: ${result.nodes[0].name}`,
 *       details: { requirement: result.nodes[0] },
 *       raw: result
 *     };
 *   }
 * );
 */
export function createCoreFunction<P, D>(
  name: string,
  source_tools: string[],
  implementation: (params: P) => Promise<Partial<CoreSEOutput<D>>>
): (params: P) => Promise<CoreSEOutput<D>> {
  return async (params: P) => {
    return trackedFunctionCall<Partial<CoreSEOutput<D>>>(
      { name, layer: 'core', source_tools },
      () => implementation(params),
      params
    ) as Promise<CoreSEOutput<D>>;
  };
}

/**
 * Template for creating a macro function
 * 
 * @example
 * export const assessChangeImpact = createMacroFunction(
 *   'assessChangeImpact',
 *   ['traceDownstreamImpact', 'findVerificationGaps', 'runConsistencyChecks'],
 *   async (params: ChangeImpactParams) => {
 *     // Orchestrate multiple core functions
 *     const impact = await core_traceDownstreamImpact(...);
 *     const gaps = await core_findVerificationGaps(...);
 *     const issues = await core_runConsistencyChecks(...);
 *     
 *     return {
 *       summary: `Change impacts ${impact.nodes.length} items`,
 *       details: { impacted_nodes: impact.nodes, gaps, issues }
 *     };
 *   }
 * );
 */
export function createMacroFunction<P, D>(
  name: string,
  source_tools: string[],
  implementation: (params: P) => Promise<Partial<CoreSEOutput<D>>>
): (params: P) => Promise<CoreSEOutput<D>> {
  return async (params: P) => {
    return trackedFunctionCall<Partial<CoreSEOutput<D>>>(
      { name, layer: 'macro', source_tools },
      () => implementation(params),
      params
    ) as Promise<CoreSEOutput<D>>;
  };
}
