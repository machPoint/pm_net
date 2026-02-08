/**
 * Canonical Graph Vocabulary — Single Source of Truth
 *
 * Derived from: docs/CHELEX_GRAPH_SCHEMA_REVISED.md (v2.0)
 *
 * Two-Layer Architecture:
 *   ┌─────────────────────────────────────────────────────┐
 *   │  GOVERNANCE LAYER (Chelex Extensions)               │
 *   │  plan, run, verification, decision_trace, precedent │
 *   └───────────────────┬─────────────────────────────────┘
 *                       │
 *   ┌───────────────────▼─────────────────────────────────┐
 *   │  BASE PM LAYER (Universal Project Concepts)         │
 *   │  task, milestone, deliverable, gate, risk,          │
 *   │  decision, resource                                 │
 *   └─────────────────────────────────────────────────────┘
 *
 * Design principles:
 *   1. Clear separation — PM = what to do, Governance = how it was done
 *   2. No forced mappings — plan is a plan, not metadata on a gate
 *   3. Agent-Navigable — agents understand node semantics without NLP
 *   4. Human-Readable — PMs recognise familiar PM concepts
 *   5. Domain-Agnostic — no aerospace/medical-specific types in core
 */

// ============================================================================
// Schema Layers
// ============================================================================

export const SCHEMA_LAYERS = {
  pm_core: 'pm_core',
  governance: 'governance',
} as const;

export type SchemaLayer = (typeof SCHEMA_LAYERS)[keyof typeof SCHEMA_LAYERS];

// ============================================================================
// Node Types — BASE PM LAYER (7 types)
// ============================================================================

export const PM_NODE_TYPES = {
  /** Atomic unit of work with clear completion criteria */
  task: 'task',
  /** Time-based checkpoint with no work content (zero duration) */
  milestone: 'milestone',
  /** Tangible output: file, report, product, feature */
  deliverable: 'deliverable',
  /** Approval checkpoint requiring human sign-off */
  gate: 'gate',
  /** Identified threat to project success */
  risk: 'risk',
  /** Key choice point with multiple options */
  decision: 'decision',
  /** Person, agent, or equipment available for work */
  resource: 'resource',
} as const;

// ============================================================================
// Node Types — GOVERNANCE LAYER (5 types)
// ============================================================================

export const GOV_NODE_TYPES = {
  /** Agent's proposed approach to a task */
  plan: 'plan',
  /** Execution instance of a plan */
  run: 'run',
  /** Check that acceptance criteria were met */
  verification: 'verification',
  /** Agent's reasoning at a decision point */
  decision_trace: 'decision_trace',
  /** Reusable pattern from past successes */
  precedent: 'precedent',
} as const;

// ============================================================================
// Combined Node Types (12 total)
// ============================================================================

export const NODE_TYPES = {
  ...PM_NODE_TYPES,
  ...GOV_NODE_TYPES,
} as const;

export type NodeType = (typeof NODE_TYPES)[keyof typeof NODE_TYPES] | string;

export const VALID_PM_NODE_TYPES = Object.values(PM_NODE_TYPES);
export const VALID_GOV_NODE_TYPES = Object.values(GOV_NODE_TYPES);
export const VALID_NODE_TYPES = Object.values(NODE_TYPES);

/** Determine which schema layer a node type belongs to */
export function getNodeLayer(nodeType: string): SchemaLayer {
  if (VALID_GOV_NODE_TYPES.includes(nodeType as any)) return 'governance';
  return 'pm_core';
}

// ============================================================================
// Edge Types — BASE PM LAYER (7 types)
// ============================================================================

export const PM_EDGE_TYPES = {
  /** task/milestone → task/milestone: "Cannot start until dependency is done" */
  depends_on: 'depends_on',
  /** task/risk → task/milestone: "Actively prevents start" */
  blocks: 'blocks',
  /** task → resource: "Resource owns this task" */
  assigned_to: 'assigned_to',
  /** task/run → deliverable: "Creates deliverable" */
  produces: 'produces',
  /** task → risk: "Task reduces risk" */
  mitigates: 'mitigates',
  /** task/plan → gate: "Cannot proceed without gate approval" */
  requires_approval: 'requires_approval',
  /** decision → task/plan: "Decision provides context" */
  informs: 'informs',
} as const;

// ============================================================================
// Edge Types — GOVERNANCE LAYER (9 types)
// ============================================================================

export const GOV_EDGE_TYPES = {
  /** plan/run/verification → task: "Governance node relates to this task" */
  for_task: 'for_task',
  /** resource (agent) → plan: "Agent created plan" */
  proposes: 'proposes',
  /** run → plan: "Run is executing this plan" */
  executes_plan: 'executes_plan',
  /** resource (agent) → run: "Agent performed run" */
  executed: 'executed',
  /** verification → task: "Verification checks task criteria" */
  checks: 'checks',
  /** verification → run/deliverable: "Verification uses this as evidence" */
  evidenced_by: 'evidenced_by',
  /** decision_trace → run: "Decision happened during run" */
  during_run: 'during_run',
  /** precedent → run: "Precedent created from run" */
  learned_from: 'learned_from',
  /** plan → precedent: "Plan uses precedent pattern" */
  based_on: 'based_on',
} as const;

// ============================================================================
// Combined Edge Types (16 total)
// ============================================================================

export const EDGE_TYPES = {
  ...PM_EDGE_TYPES,
  ...GOV_EDGE_TYPES,
} as const;

export type EdgeType = (typeof EDGE_TYPES)[keyof typeof EDGE_TYPES] | string;

export const VALID_PM_EDGE_TYPES = Object.values(PM_EDGE_TYPES);
export const VALID_GOV_EDGE_TYPES = Object.values(GOV_EDGE_TYPES);
export const VALID_EDGE_TYPES = Object.values(EDGE_TYPES);

/** Determine which schema layer an edge type belongs to */
export function getEdgeLayer(edgeType: string): SchemaLayer {
  if (VALID_GOV_EDGE_TYPES.includes(edgeType as any)) return 'governance';
  return 'pm_core';
}

// ============================================================================
// Default Weights per Edge Type
// ============================================================================

/**
 * Weight scale: 0.0 (disabled) → 1.0 (critical path / required)
 *
 * | Weight | Meaning            | Typical use                              |
 * |--------|--------------------|------------------------------------------|
 * | 1.0    | Critical / Required| assigned_to, requires_approval, for_task |
 * | 0.9    | High urgency       | blocks, checks                          |
 * | 0.8    | Important          | produces, evidenced_by                   |
 * | 0.7    | Significant        | proposes                                 |
 * | 0.6    | Moderate           | during_run, based_on                     |
 * | 0.5    | Normal dependency  | depends_on (default), mitigates, learned |
 * | 0.2    | Weak context       | informs                                  |
 * | 0.0    | Disabled           | edge exists but ignored                  |
 */
export const DEFAULT_WEIGHTS: Record<string, number> = {
  // PM edges
  [EDGE_TYPES.depends_on]: 0.5,
  [EDGE_TYPES.blocks]: 0.9,
  [EDGE_TYPES.assigned_to]: 1.0,
  [EDGE_TYPES.produces]: 0.8,
  [EDGE_TYPES.mitigates]: 0.5, // overridden by risk_score / 10 at runtime
  [EDGE_TYPES.requires_approval]: 1.0,
  [EDGE_TYPES.informs]: 0.2,
  // Governance edges
  [EDGE_TYPES.for_task]: 1.0,
  [EDGE_TYPES.proposes]: 0.7,
  [EDGE_TYPES.executes_plan]: 1.0,
  [EDGE_TYPES.executed]: 1.0,
  [EDGE_TYPES.checks]: 0.9,
  [EDGE_TYPES.evidenced_by]: 0.8,
  [EDGE_TYPES.during_run]: 0.6,
  [EDGE_TYPES.learned_from]: 0.5,
  [EDGE_TYPES.based_on]: 0.6,
};

// ============================================================================
// Node Status Enums (per node type)
// ============================================================================

// --- PM Layer statuses ---

export const TASK_STATUSES = ['backlog', 'blocked', 'ready', 'in_progress', 'review', 'done'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const MILESTONE_STATUSES = ['upcoming', 'at_risk', 'achieved', 'missed'] as const;
export type MilestoneStatus = (typeof MILESTONE_STATUSES)[number];

export const DELIVERABLE_STATUSES = ['planned', 'in_progress', 'delivered', 'accepted'] as const;
export type DeliverableStatus = (typeof DELIVERABLE_STATUSES)[number];

export const GATE_STATUSES = ['pending', 'approved', 'rejected', 'conditional'] as const;
export type GateStatus = (typeof GATE_STATUSES)[number];

export const RISK_STATUSES = ['open', 'mitigating', 'closed', 'realized'] as const;
export type RiskStatus = (typeof RISK_STATUSES)[number];

export const DECISION_STATUSES = ['open', 'decided', 'revisited'] as const;
export type DecisionStatus = (typeof DECISION_STATUSES)[number];

export const RESOURCE_STATUSES = ['available', 'busy', 'offline'] as const;
export type ResourceStatus = (typeof RESOURCE_STATUSES)[number];

// --- Governance Layer statuses ---

export const PLAN_STATUSES = ['pending', 'approved', 'rejected', 'superseded'] as const;
export type PlanStatus = (typeof PLAN_STATUSES)[number];

export const RUN_STATUSES = ['running', 'completed', 'failed', 'cancelled'] as const;
export type RunStatus = (typeof RUN_STATUSES)[number];

export const VERIFICATION_STATUSES = ['pending', 'passed', 'failed', 'needs_review'] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const DECISION_TRACE_STATUSES = ['recorded'] as const;
export type DecisionTraceStatus = (typeof DECISION_TRACE_STATUSES)[number];

export const PRECEDENT_STATUSES = ['active', 'deprecated'] as const;
export type PrecedentStatus = (typeof PRECEDENT_STATUSES)[number];

/** Map node type → allowed statuses */
export const STATUS_BY_NODE_TYPE: Record<string, readonly string[]> = {
  // PM layer
  [NODE_TYPES.task]: TASK_STATUSES,
  [NODE_TYPES.milestone]: MILESTONE_STATUSES,
  [NODE_TYPES.deliverable]: DELIVERABLE_STATUSES,
  [NODE_TYPES.gate]: GATE_STATUSES,
  [NODE_TYPES.risk]: RISK_STATUSES,
  [NODE_TYPES.decision]: DECISION_STATUSES,
  [NODE_TYPES.resource]: RESOURCE_STATUSES,
  // Governance layer
  [NODE_TYPES.plan]: PLAN_STATUSES,
  [NODE_TYPES.run]: RUN_STATUSES,
  [NODE_TYPES.verification]: VERIFICATION_STATUSES,
  [NODE_TYPES.decision_trace]: DECISION_TRACE_STATUSES,
  [NODE_TYPES.precedent]: PRECEDENT_STATUSES,
};

// ============================================================================
// Edge Constraint Rules
// ============================================================================

/**
 * Valid source → target node type pairs for each edge type.
 * null means "any node type is allowed on that side".
 */
export const EDGE_CONSTRAINTS: Record<string, { from: string[] | null; to: string[] | null }> = {
  // PM edges
  [EDGE_TYPES.depends_on]: { from: ['task', 'milestone'], to: ['task', 'milestone'] },
  [EDGE_TYPES.blocks]: { from: ['task', 'risk'], to: ['task', 'milestone'] },
  [EDGE_TYPES.assigned_to]: { from: ['task'], to: ['resource'] },
  [EDGE_TYPES.produces]: { from: ['task', 'run'], to: ['deliverable'] },
  [EDGE_TYPES.mitigates]: { from: ['task'], to: ['risk'] },
  [EDGE_TYPES.requires_approval]: { from: ['task', 'plan'], to: ['gate'] },
  [EDGE_TYPES.informs]: { from: ['decision'], to: ['task', 'plan'] },
  // Governance edges
  [EDGE_TYPES.for_task]: { from: ['plan', 'run', 'verification'], to: ['task'] },
  [EDGE_TYPES.proposes]: { from: ['resource'], to: ['plan'] },
  [EDGE_TYPES.executes_plan]: { from: ['run'], to: ['plan'] },
  [EDGE_TYPES.executed]: { from: ['resource'], to: ['run'] },
  [EDGE_TYPES.checks]: { from: ['verification'], to: ['task'] },
  [EDGE_TYPES.evidenced_by]: { from: ['verification'], to: ['run', 'deliverable'] },
  [EDGE_TYPES.during_run]: { from: ['decision_trace'], to: ['run'] },
  [EDGE_TYPES.learned_from]: { from: ['precedent'], to: ['run'] },
  [EDGE_TYPES.based_on]: { from: ['plan'], to: ['precedent'] },
};

// ============================================================================
// Validation Helpers
// ============================================================================

export function isValidNodeType(type: string): boolean {
  return VALID_NODE_TYPES.includes(type as any);
}

export function isValidEdgeType(type: string): boolean {
  return VALID_EDGE_TYPES.includes(type as any);
}

export function isPMNodeType(type: string): boolean {
  return VALID_PM_NODE_TYPES.includes(type as any);
}

export function isGovernanceNodeType(type: string): boolean {
  return VALID_GOV_NODE_TYPES.includes(type as any);
}

export function isPMEdgeType(type: string): boolean {
  return VALID_PM_EDGE_TYPES.includes(type as any);
}

export function isGovernanceEdgeType(type: string): boolean {
  return VALID_GOV_EDGE_TYPES.includes(type as any);
}

export function isValidStatusForType(nodeType: string, status: string): boolean {
  const allowed = STATUS_BY_NODE_TYPE[nodeType];
  if (!allowed) return true; // unknown node type — accept any status
  return allowed.includes(status);
}

export function getDefaultWeight(edgeType: string): number {
  return DEFAULT_WEIGHTS[edgeType] ?? 0.5;
}

/**
 * Validate that an edge's source/target node types are allowed.
 * Returns null if valid, or an error message string.
 */
export function validateEdgeConstraint(
  edgeType: string,
  fromNodeType: string,
  toNodeType: string
): string | null {
  const constraint = EDGE_CONSTRAINTS[edgeType];
  if (!constraint) return null; // unknown edge type — no constraint

  if (constraint.from && !constraint.from.includes(fromNodeType)) {
    return `Edge type '${edgeType}' requires source node type in [${constraint.from.join(', ')}], got '${fromNodeType}'`;
  }
  if (constraint.to && !constraint.to.includes(toNodeType)) {
    return `Edge type '${edgeType}' requires target node type in [${constraint.to.join(', ')}], got '${toNodeType}'`;
  }
  return null;
}
