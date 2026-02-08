/**
 * CORE SE Type Definitions
 * Type system for CORE SE functions following design rules
 */

import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// Core Output Structure
// ============================================================================

/**
 * Standard output structure for all CORE SE functions
 * Following design rule #4: Structured Outputs
 */
export interface CoreSEOutput<T = any> {
  /** Short human-readable summary (1-2 sentences) */
  summary: string;
  
  /** Domain-structured payload (strongly typed) */
  details: T;
  
  /** Optional raw response from underlying tools for debugging */
  raw?: any;
  
  /** Unique identifier for this function call */
  tool_call_id: string;
  
  /** List of MCP tools/sidecars used */
  source_tools: string[];
  
  /** ISO timestamp of execution */
  timestamp?: string;
  
  /** Execution time in milliseconds */
  duration_ms?: number;
  
  /** Additional metadata */
  metadata?: Record<string, any>;
}

// ============================================================================
// Domain Types - Systems Engineering Vocabulary
// ============================================================================

/**
 * Node types in the system graph
 */
export type NodeType = 
  | 'requirement'
  | 'test_case'
  | 'component'
  | 'interface'
  | 'verification'
  | 'issue'
  | 'part'
  | 'document'
  | 'email'
  | 'meeting';

/**
 * Relationship types between nodes
 */
export type RelationType =
  | 'satisfies'
  | 'verifies'
  | 'derives_from'
  | 'allocated_to'
  | 'depends_on'
  | 'implements'
  | 'traces_to'
  | 'refines'
  | 'constrains'
  | 'relates_to';

/**
 * Status values for requirements and other entities
 */
export type Status =
  | 'draft'
  | 'proposed'
  | 'approved'
  | 'implemented'
  | 'verified'
  | 'deprecated'
  | 'rejected';

/**
 * Verification status
 */
export type VerificationStatus =
  | 'not_verified'
  | 'partial'
  | 'verified'
  | 'failed';

/**
 * Severity levels for issues and gaps
 */
export type Severity =
  | 'critical'
  | 'high'
  | 'medium'
  | 'low'
  | 'info';

// ============================================================================
// Domain Entities
// ============================================================================

/**
 * Requirement entity
 */
export interface Requirement {
  id: string;
  external_id?: string;
  title: string;
  description: string;
  status: Status;
  subsystem?: string;
  type?: string;
  verification_status?: VerificationStatus;
  allocated_to?: string[];
  metadata?: Record<string, any>;
}

/**
 * Test case entity
 */
export interface TestCase {
  id: string;
  external_id?: string;
  title: string;
  description: string;
  status: Status;
  verifies_requirements?: string[];
  test_type?: string;
  metadata?: Record<string, any>;
}

/**
 * Component entity
 */
export interface Component {
  id: string;
  external_id?: string;
  name: string;
  type: string;
  subsystem?: string;
  implements_requirements?: string[];
  interfaces?: string[];
  metadata?: Record<string, any>;
}

/**
 * System node (generic)
 */
export interface SystemNode {
  id: string;
  external_id?: string;
  node_type: NodeType;
  name: string;
  description?: string;
  status?: Status;
  subsystem?: string;
  metadata?: Record<string, any>;
}

/**
 * Relationship edge
 */
export interface SystemEdge {
  id: string;
  source_id: string;
  target_id: string;
  relation_type: RelationType;
  metadata?: Record<string, any>;
}

/**
 * Verification gap
 */
export interface VerificationGap {
  requirement_id: string;
  requirement_title?: string;
  severity: Severity;
  reason: string;
  gap_type: 'no_test_case' | 'no_allocation' | 'incomplete_trace' | 'inconsistent_status';
  recommendations?: string[];
}

/**
 * Consistency violation
 */
export interface ConsistencyViolation {
  id: string;
  violation_type: string;
  severity: Severity;
  affected_nodes: string[];
  description: string;
  rule_id?: string;
}

// ============================================================================
// Query Filters
// ============================================================================

/**
 * Filter for querying nodes
 */
export interface NodeFilter {
  node_type?: NodeType | NodeType[];
  subsystem?: string | string[];
  status?: Status | Status[];
  ids?: string[];
  external_refs?: string[];
  metadata?: Record<string, any>;
}

/**
 * Filter for querying edges
 */
export interface EdgeFilter {
  relation_type?: RelationType | RelationType[];
  source_ids?: string[];
  target_ids?: string[];
}

/**
 * Slice filter for extracting subgraphs
 */
export interface SliceFilter {
  subsystem?: string;
  start_node_ids?: string[];
  max_depth?: number;
  include_relation_types?: RelationType[];
  exclude_relation_types?: RelationType[];
}

// ============================================================================
// Common Details Types
// ============================================================================

/**
 * Query result details
 */
export interface QueryResultDetails<T = SystemNode> {
  count: number;
  items: T[];
  filters_applied?: NodeFilter | EdgeFilter;
  total_available?: number;
}

/**
 * Trace result details
 */
export interface TraceResultDetails {
  start_nodes: string[];
  affected_nodes: SystemNode[];
  trace_paths: TracePath[];
  depth_reached: number;
  statistics: {
    total_nodes: number;
    by_type: Record<NodeType, number>;
    by_subsystem?: Record<string, number>;
  };
}

/**
 * Single trace path
 */
export interface TracePath {
  path: string[];
  relations: RelationType[];
  depth: number;
}

/**
 * Verification coverage details
 */
export interface VerificationCoverageDetails {
  coverage_percentage: number;
  total_requirements: number;
  verified_requirements: number;
  gaps: VerificationGap[];
  subsystem_breakdown?: Record<string, SubsystemCoverage>;
}

/**
 * Subsystem coverage
 */
export interface SubsystemCoverage {
  coverage: number;
  total: number;
  verified: number;
  gaps: number;
}

/**
 * Consistency check details
 */
export interface ConsistencyCheckDetails {
  passed: boolean;
  total_checks: number;
  violations: ConsistencyViolation[];
  by_severity: Record<Severity, number>;
  by_type: Record<string, number>;
}

/**
 * Change impact details
 */
export interface ChangeImpactDetails {
  impacted_requirements: Requirement[];
  impacted_components: Component[];
  impacted_test_cases: TestCase[];
  verification_gaps: VerificationGap[];
  consistency_issues: ConsistencyViolation[];
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
}

// ============================================================================
// Function Parameters
// ============================================================================

/**
 * Common base parameters
 */
export interface BaseFunctionParams {
  project_id: string;
}

/**
 * Query parameters
 */
export interface QueryParams extends BaseFunctionParams {
  node_filter?: NodeFilter;
  edge_filter?: EdgeFilter;
  limit?: number;
  offset?: number;
}

/**
 * Slice extraction parameters
 */
export interface SliceParams extends BaseFunctionParams {
  slice_filter: SliceFilter;
  include_metadata?: boolean;
}

/**
 * Trace parameters
 */
export interface TraceParams extends BaseFunctionParams {
  start_node_ids: string[];
  max_depth?: number;
  include_relation_types?: RelationType[];
}

/**
 * Verification parameters
 */
export interface VerificationParams extends BaseFunctionParams {
  requirement_ids?: string[];
  subsystem?: string;
  include_recommendations?: boolean;
}

/**
 * Change impact parameters
 */
export interface ChangeImpactParams extends BaseFunctionParams {
  change_description: string;
  affected_requirement_ids: string[];
  include_recommendations?: boolean;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Function layer type
 */
export type FunctionLayer = 'core' | 'macro';

/**
 * Function metadata
 */
export interface FunctionMetadata {
  name: string;
  layer: FunctionLayer;
  source_tools: string[];
  version?: string;
}

/**
 * Audit log entry
 */
export interface AuditLogEntry {
  tool_call_id: string;
  function_name: string;
  layer: FunctionLayer;
  source_tools: string[];
  params?: any;
  duration_ms: number;
  status: 'success' | 'error';
  error?: string;
  timestamp: string;
  user_id?: string;
  session_id?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate unique tool call ID
 */
export function generateToolCallId(): string {
  return `call_${uuidv4()}`;
}

/**
 * Create base output structure
 */
export function createCoreOutput<T>(
  summary: string,
  details: T,
  source_tools: string[],
  raw?: any
): CoreSEOutput<T> {
  return {
    summary,
    details,
    raw,
    tool_call_id: generateToolCallId(),
    source_tools,
    timestamp: new Date().toISOString()
  };
}

/**
 * Type guard for CoreSEOutput
 */
export function isCoreOutput(value: any): value is CoreSEOutput {
  return (
    value &&
    typeof value === 'object' &&
    typeof value.summary === 'string' &&
    value.details !== undefined &&
    typeof value.tool_call_id === 'string' &&
    Array.isArray(value.source_tools)
  );
}
