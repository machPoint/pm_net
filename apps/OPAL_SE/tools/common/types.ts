/**
 * Shared types used across all OPAL tools
 * 
 * Tools should import from here, not from each other.
 */

// ============================================================================
// Entity & Graph Types
// ============================================================================

export type EntityId = string;

export type EntityType = 
  | 'requirement'
  | 'component'
  | 'test'
  | 'interface'
  | 'document'
  | 'risk'
  | 'change'
  | 'issue';

export interface Node {
  id: EntityId;
  type: EntityType;
  name: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface Edge {
  source: EntityId;
  target: EntityId;
  type: string;
  metadata?: Record<string, any>;
}

export interface Graph {
  nodes: Node[];
  edges: Edge[];
}

export interface ImpactedEntity {
  entity: Node;
  impactType: 'direct' | 'indirect';
  distance: number;
  path?: EntityId[];
  reason?: string;
}

// ============================================================================
// Verification & Coverage Types
// ============================================================================

export interface VerificationCoverage {
  entityId: EntityId;
  entityType: EntityType;
  testCount: number;
  coveragePercent: number;
  gaps: string[];
}

export interface VerificationGap {
  entityId: EntityId;
  entityType: EntityType;
  gapType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  recommendation?: string;
}

// ============================================================================
// Triage & Pulse Types
// ============================================================================

export type TriageDecision = 
  | 'accept'
  | 'defer'
  | 'reject'
  | 'escalate'
  | 'needs_info';

export interface TriageResult {
  activityId: string;
  decision: TriageDecision;
  confidence: number;
  reasoning: string;
  suggestedActions?: string[];
  risks?: string[];
}

export interface PulseItem {
  id: string;
  type: 'change' | 'issue' | 'risk' | 'deadline' | 'meeting';
  title: string;
  description: string;
  source: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  dueDate?: string;
  assignee?: string;
  metadata?: Record<string, any>;
}

// ============================================================================
// Calendar & Workload Types
// ============================================================================

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  isAllDay: boolean;
  attendees?: string[];
  location?: string;
  description?: string;
}

export interface WorkloadSummary {
  date: string;
  totalHours: number;
  meetingHours: number;
  taskHours: number;
  availableHours: number;
  loadPercent: number;
  status: 'light' | 'normal' | 'heavy' | 'overloaded';
}

export interface WorkloadDetail extends WorkloadSummary {
  meetings: CalendarEvent[];
  tasks: Task[];
  commitments: Commitment[];
}

export interface Task {
  id: string;
  title: string;
  source: string;
  dueDate?: string;
  estimatedHours?: number;
  priority: 'low' | 'medium' | 'high';
  status: 'todo' | 'in_progress' | 'done';
}

export interface Commitment {
  id: string;
  title: string;
  type: 'milestone' | 'deliverable' | 'review';
  dueDate: string;
  source: string;
}

// ============================================================================
// Lessons Learned Types
// ============================================================================

export interface Lesson {
  id: string;
  title: string;
  summary: string;
  fullText?: string;
  sourceSystem: string;
  sourceLink?: string;
  author: string;
  team: string;
  disciplines: string[];
  subsystems: string[];
  entityIds?: string[];
  failureModes?: string[];
  rootCauses?: string[];
  phase?: string[];
  severity: 'low' | 'medium' | 'high' | 'catastrophic';
  tags?: string[];
  isCanonical: boolean;
  createdDate: string;
  updatedDate: string;
}

export interface LessonSearchResult {
  lesson: Lesson;
  matchReasons: string[];
  relevanceScore?: number;
}

// ============================================================================
// History & Change Types
// ============================================================================

export interface EntityHistory {
  entityId: EntityId;
  changes: ChangeRecord[];
}

export interface ChangeRecord {
  id: string;
  entityId: EntityId;
  timestamp: string;
  author: string;
  changeType: 'created' | 'modified' | 'deleted' | 'linked' | 'unlinked';
  field?: string;
  oldValue?: any;
  newValue?: any;
  reason?: string;
}

export interface SimilarChange {
  change: ChangeRecord;
  similarity: number;
  matchReasons: string[];
}

// ============================================================================
// Consistency & Validation Types
// ============================================================================

export interface ConsistencyCheck {
  checkType: string;
  entityId?: EntityId;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
}

export interface AllocationConsistency {
  entityId: EntityId;
  allocations: Allocation[];
  isConsistent: boolean;
  issues?: string[];
}

export interface Allocation {
  from: EntityId;
  to: EntityId;
  allocationType: string;
  value?: any;
}

// ============================================================================
// Common Response Types
// ============================================================================

export interface ToolResponse<T> {
  success: boolean;
  data?: T;
  error?: ToolError;
  metadata?: {
    timestamp: string;
    executionTimeMs: number;
    [key: string]: any;
  };
}

export interface ToolError {
  code: string;
  message: string;
  details?: any;
}

// ============================================================================
// Pagination & Filtering
// ============================================================================

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  offset?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page?: number;
  pageSize?: number;
  hasMore: boolean;
}

export interface FilterParams {
  entityTypes?: EntityType[];
  disciplines?: string[];
  subsystems?: string[];
  severity?: string[];
  dateFrom?: string;
  dateTo?: string;
  [key: string]: any;
}
