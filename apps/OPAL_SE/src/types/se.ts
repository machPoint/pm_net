/**
 * Systems Engineering Type Definitions for OPAL_SE
 * 
 * This module defines the core types for the system graph, including
 * node types (artifacts), edge types (relationships), events, and change sets.
 */

// ============================================================================
// Node Types (Engineering Artifacts)
// ============================================================================

/**
 * All supported node types in the system graph
 */
export type NodeType =
  | 'Requirement'
  | 'Test'
  | 'Component'
  | 'Interface'
  | 'Issue'
  | 'ECN'
  | 'EmailMessage'
  | 'Note'
  | 'Task'
  | 'LibraryItem'
  // Network node types for infrastructure modeling
  | 'NetworkDevice'
  | 'NetworkInterface'
  | 'Subnet'
  | 'VLAN'
  | 'NetworkService';

/**
 * External system references for traceability
 */
export interface ExternalRefs {
  jama_id?: string;
  jira_key?: string;
  windchill_number?: string;
  outlook_id?: string;
  confluence_id?: string;
  [key: string]: string | undefined;
}

/**
 * System Graph Node - represents an engineering artifact
 */
export interface SystemNode {
  id: string;
  project_id: string;
  type: NodeType;
  name: string;
  description: string;
  external_refs: ExternalRefs;
  subsystem?: string;
  status?: string;
  owner?: string;
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

/**
 * Filter criteria for querying nodes
 */
export interface NodeFilter {
  project_id?: string;
  type?: NodeType | NodeType[];
  subsystem?: string | string[];
  status?: string | string[];
  ids?: string[];
  external_refs?: Partial<ExternalRefs>;
  owner?: string;
  limit?: number;
  offset?: number;
}

// ============================================================================
// Edge Types (Relationships)
// ============================================================================

/**
 * All supported relationship types in the system graph
 */
export type RelationType =
  | 'TRACES_TO'
  | 'VERIFIED_BY'
  | 'ALLOCATED_TO'
  | 'INTERFACES_WITH'
  | 'BLOCKS'
  | 'DERIVED_FROM'
  | 'REFERS_TO'
  // Network-specific relationships
  | 'CONNECTED_TO'
  | 'ROUTES_TO'
  | 'DEPENDS_ON';

/**
 * System Graph Edge - represents a relationship between artifacts
 */
export interface SystemEdge {
  id: string;
  project_id: string;
  from_node_id: string;
  to_node_id: string;
  relation_type: RelationType;
  source_system: string;
  rationale?: string;
  weight: number; // For weighted graph traversal (default: 1.0)
  bidirectional?: boolean; // Can agents traverse both ways? (default: false)
  weight_metadata?: Record<string, any>; // Factors used in weight calculation
  metadata?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

/**
 * Filter criteria for querying edges
 */
export interface EdgeFilter {
  project_id?: string;
  from_node_id?: string | string[];
  to_node_id?: string | string[];
  relation_type?: RelationType | RelationType[];
  source_system?: string | string[];
  limit?: number;
  offset?: number;
}

/**
 * Direction for graph traversal
 */
export type TraversalDirection = 'outgoing' | 'incoming' | 'both';

/**
 * Graph traversal result
 */
export interface GraphTraversal {
  nodes: SystemNode[];
  edges: SystemEdge[];
}

// ============================================================================
// Event Log Types
// ============================================================================

/**
 * Event types for the event log
 */
export type EventType =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'linked'
  | 'unlinked'
  | 'status_changed';

/**
 * Source systems that can generate events
 */
export type SourceSystem =
  | 'fds'
  | 'jama'
  | 'jira'
  | 'windchill'
  | 'outlook'
  | 'confluence'
  | 'core_se'
  | 'opal_se';

/**
 * Diff payload for tracking changes
 */
export interface DiffPayload {
  before?: Partial<SystemNode | SystemEdge>;
  after?: Partial<SystemNode | SystemEdge>;
  fields_changed?: string[];
  details?: Record<string, any>;
}

/**
 * Event - represents a change to the system graph
 */
export interface Event {
  id: string;
  project_id: string;
  source_system: SourceSystem;
  entity_type: string;
  entity_id: string;
  event_type: EventType;
  timestamp: Date;
  diff_payload: DiffPayload;
  created_at: Date;
  updated_at: Date;
}

/**
 * Filter criteria for querying events
 */
export interface EventFilter {
  project_id?: string;
  source_system?: SourceSystem | SourceSystem[];
  entity_type?: string | string[];
  entity_id?: string | string[];
  event_type?: EventType | EventType[];
  start_time?: Date;
  end_time?: Date;
  limit?: number;
  offset?: number;
}

// ============================================================================
// Change Set Types
// ============================================================================

/**
 * Statistics for a change set
 */
export interface ChangeSetStats {
  total_events: number;
  counts_by_type: Record<string, number>;
  counts_by_subsystem: Record<string, number>;
  counts_by_event_type: Record<EventType, number>;
  affected_nodes: number;
  affected_edges: number;
}

/**
 * Change Set - groups related events
 */
export interface ChangeSet {
  id: string;
  project_id: string;
  anchor: string;
  label: string;
  stats: ChangeSetStats;
  created_at: Date;
  updated_at: Date;
}

/**
 * Timeline entry for history views
 */
export interface TimelineEntry {
  timestamp: Date;
  entity_id: string;
  entity_type: string;
  event_type: EventType;
  summary: string;
  details?: Record<string, any>;
}

// ============================================================================
// Rule Engine Types
// ============================================================================

/**
 * Rule severity levels
 */
export type RuleSeverity = 'error' | 'warning' | 'info';

/**
 * Rule context for evaluation
 */
export interface RuleContext {
  project_id: string;
  subsystem?: string;
  [key: string]: any;
}

/**
 * Rule violation
 */
export interface Violation {
  rule_id: string;
  severity: RuleSeverity;
  message: string;
  affected_nodes: string[];
  affected_edges?: string[];
  details: Record<string, any>;
}

/**
 * Rule definition
 */
export interface Rule {
  id: string;
  name: string;
  description: string;
  severity: RuleSeverity;
  check: (context: RuleContext) => Promise<Violation[]>;
}

/**
 * Rule summary statistics
 */
export interface RuleSummary {
  total_violations: number;
  by_severity: Record<RuleSeverity, number>;
  by_rule: Record<string, number>;
}

// ============================================================================
// MCP Tool Parameter Types
// ============================================================================

/**
 * Parameters for querySystemModel tool
 */
export interface QuerySystemModelParams {
  project_id: string;
  node_filters?: {
    type?: NodeType[];
    subsystem?: string[];
    status?: string[];
    ids?: string[];
    external_refs?: Partial<ExternalRefs>;
  };
  edge_filters?: {
    relation_type?: RelationType[];
  };
  limit?: number;
  offset?: number;
}

/**
 * Result for querySystemModel tool
 */
export interface QuerySystemModelResult {
  nodes: SystemNode[];
  edges: SystemEdge[];
  total_count: number;
}

/**
 * Parameters for getSystemSlice tool
 */
export interface GetSystemSliceParams {
  project_id: string;
  subsystem?: string;
  start_node_ids?: string[];
  max_depth?: number;
}

/**
 * Result for getSystemSlice tool
 */
export interface GetSystemSliceResult {
  nodes: SystemNode[];
  edges: SystemEdge[];
  metadata: {
    node_counts_by_type: Record<NodeType, number>;
    edge_counts_by_type: Record<RelationType, number>;
  };
}

/**
 * Parameters for traceDownstreamImpact tool
 */
export interface TraceDownstreamImpactParams {
  start_nodes: string[];
  depth: number;
  filters?: {
    types?: NodeType[];
    subsystems?: string[];
    statuses?: string[];
  };
}

/**
 * Result for traceDownstreamImpact tool
 */
export interface TraceDownstreamImpactResult {
  impacted: {
    requirements: SystemNode[];
    tests: SystemNode[];
    components: SystemNode[];
    interfaces: SystemNode[];
    issues: SystemNode[];
    ecns: SystemNode[];
    other: SystemNode[];
  };
  traces: SystemEdge[];
}

/**
 * Parameters for traceUpstreamRationale tool
 */
export interface TraceUpstreamRationaleParams {
  start_nodes: string[];
  depth: number;
}

/**
 * Result for traceUpstreamRationale tool
 */
export interface TraceUpstreamRationaleResult {
  upstream_nodes: SystemNode[];
  paths: Array<{
    from: string;
    to: string;
    path: string[];
  }>;
}

/**
 * Parameters for findVerificationGaps tool
 */
export interface FindVerificationGapsParams {
  project_id: string;
  subsystem?: string;
  requirement_levels?: string[];
  safety_levels?: string[];
}

/**
 * Result for findVerificationGaps tool
 */
export interface FindVerificationGapsResult {
  requirements_missing_tests: SystemNode[];
  tests_without_requirements: SystemNode[];
  broken_chains: Array<{
    requirement: SystemNode;
    gap_type: string;
    description: string;
  }>;
}

/**
 * Parameters for checkAllocationConsistency tool
 */
export interface CheckAllocationConsistencyParams {
  project_id: string;
  subsystem?: string;
}

/**
 * Result for checkAllocationConsistency tool
 */
export interface CheckAllocationConsistencyResult {
  unallocated_requirements: SystemNode[];
  orphan_components: SystemNode[];
  conflicting_allocations: Array<{
    requirement: SystemNode;
    components: SystemNode[];
    conflict_reason: string;
  }>;
}

/**
 * Parameters for getVerificationCoverageMetrics tool
 */
export interface GetVerificationCoverageMetricsParams {
  project_id: string;
  subsystem?: string;
}

/**
 * Result for getVerificationCoverageMetrics tool
 */
export interface GetVerificationCoverageMetricsResult {
  total_requirements: number;
  verified_requirements: number;
  coverage_percentage: number;
  by_type: Record<string, { total: number; verified: number }>;
  by_level: Record<string, { total: number; verified: number }>;
}

/**
 * Parameters for getHistory tool
 */
export interface GetHistoryParams {
  entity_ids: string[];
  window?: { start: Date; end: Date };
  limit?: number;
}

/**
 * Result for getHistory tool
 */
export interface GetHistoryResult {
  events: Event[];
  timeline: TimelineEntry[];
}

/**
 * Parameters for findSimilarPastChanges tool
 */
export interface FindSimilarPastChangesParams {
  change_signature: {
    node_types: NodeType[];
    subsystems: string[];
    tags?: string[];
  };
  limit?: number;
}

/**
 * Result for findSimilarPastChanges tool
 */
export interface FindSimilarPastChangesResult {
  similar_change_sets: Array<{
    change_set: ChangeSet;
    similarity_score: number;
    matching_patterns: string[];
  }>;
}

/**
 * Parameters for runConsistencyChecks tool
 */
export interface RunConsistencyChecksParams {
  project_id: string;
  subsystem?: string;
  rule_ids?: string[];
}

/**
 * Result for runConsistencyChecks tool
 */
export interface RunConsistencyChecksResult {
  violations: Violation[];
  summary: RuleSummary;
}

// ============================================================================
// FDS Integration Types
// ============================================================================

/**
 * FDS Event (from /mock/pulse endpoint)
 */
export interface FDSEvent {
  id: string;
  artifact_ref: {
    id: string;
    type: string;
    source: string;
    title: string;
    status?: string;
    url?: string;
  };
  change_type: string;
  change_summary: string;
  timestamp: string | Date;
  author?: string;
  metadata?: Record<string, any>;
  // Alternative fields for direct source system events
  source_system?: string;
  entity_type?: string;
  event_type?: string;
  payload?: any;
}

/**
 * Normalized ingestion result
 */
export interface IngestionResult {
  node?: SystemNode;
  edges?: SystemEdge[];
  event?: Event;
  errors?: string[];
}

/**
 * FDS Jama Item (from FDS)
 */
export interface FDSJamaItem {
  id: string;
  global_id: string;
  document_key: string;
  item_type: 'requirement' | 'test_case';
  name: string;
  description: string;
  status: string;
  created_date: string;
  modified_date: string;
  created_by: string;
  modified_by: string;
  fields: Record<string, any>;
}

/**
 * FDS Jira Issue (from FDS)
 */
export interface FDSJiraIssue {
  id: string;
  key: string;
  summary: string;
  description: string;
  issue_type: string;
  status: string;
  priority: string;
  assignee: string;
  reporter: string;
  created: string;
  updated: string;
  labels: string[];
}

/**
 * FDS Windchill Part (from FDS)
 */
export interface FDSWindchillPart {
  id: string;
  number: string;
  name: string;
  description: string;
  version: string;
  state: string;
  created_by: string;
  created_date: string;
  modified_date: string;
  classification: string;
}

/**
 * FDS Outlook Message (from FDS)
 */
export interface FDSOutlookMessage {
  id: string;
  global_id: string;
  subject: string;
  body: string;
  from: string;
  to: string[];
  sent_date: string;
  linked_artifacts?: string[];
}

/**
 * FDS Confluence Page (from FDS)
 */
export interface FDSConfluencePage {
  id: string;
  global_id: string;
  title: string;
  space_key: string;
  space_name: string;
  content: string;
  version: number;
  status: string;
  created_date: string;
  modified_date: string;
  created_by: string;
  modified_by: string;
  labels: string[];
  linked_artifacts?: string[];
}

// ============================================================================
// Context Bundle Types
// ============================================================================

/**
 * Impact Analysis Context Bundle
 */
export interface ImpactAnalysisContext {
  impact: TraceDownstreamImpactResult;
  violations: RunConsistencyChecksResult;
  history: GetHistoryResult;
}

/**
 * Daily Summary Context Bundle
 */
export interface DailySummaryContext {
  change_set: ChangeSet;
  events: Event[];
  violations: Violation[];
  metrics: {
    total_changes: number;
    by_subsystem: Record<string, number>;
    by_type: Record<string, number>;
  };
}

/**
 * Verification Review Context Bundle
 */
export interface VerificationReviewContext {
  gaps: FindVerificationGapsResult;
  consistency: CheckAllocationConsistencyResult;
  coverage: GetVerificationCoverageMetricsResult;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Partial deep - makes all properties optional recursively
 */
export type PartialDeep<T> = {
  [P in keyof T]?: T[P] extends object ? PartialDeep<T[P]> : T[P];
};

/**
 * Database record types (with snake_case for DB compatibility)
 */
export interface SystemNodeRecord {
  id: string;
  project_id: string;
  type: NodeType;
  name: string;
  description: string;
  external_refs: string; // JSON string
  subsystem?: string;
  status?: string;
  owner?: string;
  metadata: string; // JSON string
  created_at: Date;
  updated_at: Date;
}

export interface SystemEdgeRecord {
  id: string;
  project_id: string;
  from_node_id: string;
  to_node_id: string;
  relation_type: RelationType;
  source_system: string;
  rationale?: string;
  weight: number;
  bidirectional?: boolean;
  weight_metadata?: string; // JSON string
  metadata?: string; // JSON string
  created_at: Date;
  updated_at: Date;
}

export interface EventRecord {
  id: string;
  project_id: string;
  source_system: SourceSystem;
  entity_type: string;
  entity_id: string;
  event_type: EventType;
  timestamp: Date;
  diff_payload: string; // JSON string
  created_at: Date;
  updated_at: Date;
}

export interface ChangeSetRecord {
  id: string;
  project_id: string;
  anchor: string;
  label: string;
  stats: string; // JSON string
  created_at: Date;
  updated_at: Date;
}
