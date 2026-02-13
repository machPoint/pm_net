# PM_NET Architecture Summary
## Mission-Centric Hierarchical Project Management

**Version**: 2.0 — February 2026  
**System**: Chelex PM_NET (codename OPAL)

---

## Overview

PM_NET is an AI-augmented project management system built around a **6-level mission hierarchy**. The architecture places strategic intent (Missions) at the top and autonomous AI execution (Work Packages) at the bottom, with human approval gates at every critical transition.

The system was originally task-centric — a flat list of tasks executed by AI agents. We preserved that proven execution engine and added four strategic layers above it, creating a structure that mirrors how real organizations plan and deliver work.

---

## The Hierarchy

```
Mission          (Strategic Intent, 1–3 year horizon)
└── Program      (Major Initiative, 3–12 months)
    └── Project  (Bounded Deliverable, 1–4 months)
        └── Phase    (Stage with Gate Review, 2–6 weeks)
            └── Work Package  (Executable unit of work, hours–days)
                ├── Plan          (AI-generated execution steps)
                ├── Gate          (Human approval checkpoint)
                ├── Run           (Execution instance with logs)
                └── Task Steps    (Individual agent actions, mostly hidden)
```

### Level Definitions

| Level | Node Type | WBS Example | Description | Typical Duration |
|-------|-----------|-------------|-------------|------------------|
| 0 | `mission` | `1.0` | Strategic goal or organizational objective | 1–3 years |
| 1 | `program` | `1.1` | Major initiative that advances a mission | 3–12 months |
| 2 | `project` | `1.1.1` | Bounded deliverable with defined scope | 1–4 months |
| 3 | `phase` | `1.1.1.1` | Stage within a project, ends with a gate review | 2–6 weeks |
| 4 | `task` (UI: "Work Package") | `1.1.1.1.1` | Atomic unit of work assigned to an AI agent or human | Hours–days |
| 5 | `decision_trace` (UI: hidden) | — | Individual agent tool calls and reasoning steps | Seconds |

### WBS Numbering

Every node gets an auto-generated **Work Breakdown Structure** number stored in `metadata.wbs_number`. The numbering is hierarchical:

- Missions: `1.0`, `2.0`, `3.0`
- Programs under Mission 1: `1.1`, `1.2`
- Projects under Program 1.1: `1.1.1`, `1.1.2`
- Phases under Project 1.1.1: `1.1.1.1`, `1.1.1.2`
- Work Packages under Phase 1.1.1.1: `1.1.1.1.1`, `1.1.1.1.2`

---

## Two-Layer Graph Architecture

All data lives in a single graph database with two conceptual layers:

### Base PM Layer (11 node types)
Universal project management concepts that any PM would recognize:

`mission` · `program` · `project` · `phase` · `task` · `milestone` · `deliverable` · `gate` · `risk` · `decision` · `resource`

### Governance Layer (5 node types)
Chelex-specific execution and audit trail:

`plan` · `run` · `verification` · `decision_trace` · `precedent`

### Relationships
- **`contains`** — hierarchical parent→child (mission→program→project→phase→task)
- **`depends_on`** — task dependencies
- **`requires_approval`** — phase→gate connections
- **`produces`** — task→deliverable
- **`mitigates`** — task→risk
- **`informs`** — decision→task

---

## How Work Gets Done

### Project Intake Flow

The **Project Intake** is an 8-stage guided workflow for creating and executing work:

```
1. Define Work     — Choose what to create (Mission/Program/Project/Phase/Work Package)
2. Find Precedents — Search for similar past workflows to reuse
3. Clarify Details  — AI asks follow-up questions to refine scope
4. Generate Plan    — AI creates a step-by-step execution plan
5. Approval Gate    — Human reviews and explicitly approves (checkbox confirmation required)
6. Execute          — AI agent runs each step autonomously (OpenClaw agent dispatch)
7. Verify           — Review execution output against acceptance criteria
8. Learn            — Save workflow as a precedent for future reuse
```

**Key design principle**: Higher-level items (Mission, Program, Project, Phase) are created directly from the intake form. Only Work Packages go through the full 8-step flow with AI planning and execution.

### The Approval Gate

The approval gate is a hard stop — the system will not proceed to execution without explicit human authorization:

1. The AI generates a plan with numbered steps, tools, and expected outcomes
2. The human can edit, reorder, add, or remove steps
3. A confirmation checkbox must be checked: *"I have reviewed the plan and approve autonomous execution"*
4. Only then does the Approve button become active
5. Once approved, the AI agent executes all steps autonomously

This ensures humans remain in control of what the AI does, while still enabling fully autonomous execution once trust is established.

### Phase Gate Reviews

At the Phase level, gate reviews provide strategic checkpoints:

- When all Work Packages in a Phase are complete, the Phase moves to `at_gate` status
- A human reviewer can: **Proceed** (advance to next phase), **Hold**, **Revise**, or **Cancel**
- Proceeding automatically starts the next Phase in the Project
- If no more Phases remain, the Project is marked complete

---

## Agent Integration

### OpenClaw Execution

Work Package execution is dispatched to **OpenClaw** AI agents:

1. Each plan step is sent to the agent via `openclaw agent --agent main --message '<prompt>' --json`
2. The agent can use tools: `web_search`, `code_generation`, `text_generation`, `data_analysis`, `file_write`, `obsidian_note`
3. Each step's output, tool calls, duration, and model info are recorded as `decision_trace` nodes in the graph
4. If OpenClaw is unavailable, the system falls back to a direct LLM call

### MCP Tool: `getWorkContext`

Agents can query their own hierarchy context via the `getWorkContext` MCP tool:

```json
{
  "hierarchy": {
    "mission": { "id": "...", "title": "Launch SaaS Platform", "wbs": "1.0", "status": "active" },
    "program": { "id": "...", "title": "MVP Development", "wbs": "1.1", "status": "active" },
    "project": { "id": "...", "title": "Auth System", "wbs": "1.1.1", "status": "active" },
    "phase":   { "id": "...", "title": "Implementation", "wbs": "1.1.1.1", "status": "in_progress" }
  },
  "work_package": { "id": "...", "title": "Build OAuth Flow", "wbs": "1.1.1.1.1", "status": "in_progress" },
  "sibling_work_packages": [...]
}
```

This lets agents understand *why* they're doing something, not just *what*.

---

## System Architecture

### Backend (OPAL_SE)

| Component | File | Purpose |
|-----------|------|---------|
| Graph Vocabulary | `types/graph-vocabulary.ts` | Canonical node/edge type definitions |
| Hierarchy Service | `services/hierarchyService.ts` | CRUD, WBS generation, gate reviews, tree queries, breadcrumb context |
| Hierarchy Routes | `routes/hierarchy.ts` | REST API at `/api/hierarchy/*` |
| Task Intake Service | `services/taskIntakeService.ts` | 8-stage intake workflow, plan generation, agent execution dispatch |
| Task Intake Routes | `routes/task-intake.ts` | REST API at `/api/task-intake/*` |
| Graph Service | `services/graphService.ts` | Low-level graph CRUD (nodes, edges, queries) |
| Event Bus | `services/eventBus.ts` | SSE event stream for real-time UI updates |
| MCP Tools | `services/se/seToolsRegistration.ts` | 24 registered tools for agent interaction |

### Frontend (CORE_UI)

| Component | File | Purpose |
|-----------|------|---------|
| Project Intake | `components/ProjectIntakeSection.tsx` | 8-stage guided workflow UI |
| Missions | `components/MissionsSection.tsx` | Drill-down hierarchy browser with breadcrumbs |
| Dashboard | `components/DashboardSection.tsx` | KPIs: Active Missions, Work Packages, Gate Reviews, Open Risks |
| Work Library | `components/WorkLibrarySection.tsx` | Reusable workflow templates |
| Intake Hook | `hooks/useTaskIntake.ts` | State management for the intake flow |
| Left Nav | `components/LeftNav.tsx` | Navigation with collapsible Admin group |

### API Endpoints

**Hierarchy** (`/api/hierarchy/`):
- `GET /missions` · `POST /missions`
- `GET /missions/:id/programs` · `POST /missions/:id/programs`
- `GET /programs/:id/projects` · `POST /programs/:id/projects`
- `GET /projects/:id/phases` · `POST /projects/:id/phases`
- `GET /phases/:id/work-packages` · `POST /phases/:id/work-packages`
- `POST /phases/:id/gate-review`
- `GET /gate-reviews/pending`
- `GET /work-packages/:id/context`
- `GET /tree/:id`
- `POST /ensure-defaults`

**Intake** (`/api/task-intake/`):
- `POST /sessions` · `GET /sessions/:id`
- `POST /sessions/:id/start` · `POST /sessions/:id/precedents`
- `POST /sessions/:id/clarify` · `POST /sessions/:id/plan`
- `POST /sessions/:id/approve` · `POST /sessions/:id/execute`
- `POST /sessions/:id/execute-step` · `POST /sessions/:id/finalize-execution`
- `GET /sessions/:id/execution-results`
- `POST /sessions/:id/verify` · `POST /sessions/:id/learn`

---

## Design Principles

1. **Add layers, don't replace** — The original task execution system was preserved intact. New hierarchy levels were added above it.

2. **Human approval at every gate** — No AI execution happens without explicit human sign-off. Phase gates and work package approval gates are hard stops.

3. **Graph-native** — Everything is a node or edge. No separate databases. The graph is the single source of truth.

4. **Agent-navigable** — Node types have clear semantics so AI agents can traverse the graph and understand context without NLP.

5. **WBS as display label, UUIDs as identity** — WBS numbers are human-friendly labels for navigation and display. All APIs, runs, edges, and precedent references use immutable UUIDs. WBS can be renumbered without breaking anything.

6. **Precedent learning** — Completed workflows are saved as structured, parameterized templates. Future similar work auto-suggests proven approaches.

7. **Real-time visibility** — SSE event stream pushes execution progress, tool calls, and status changes to the UI in real time.

8. **Tamper-evident audit trail** — Governance layer records (`run`, `decision_trace`) are append-only and hash-chained. Never edited, only superseded.

9. **Explicit versioning** — Every plan approval freezes the plan version, policy snapshot, and tooling snapshot so audits can reconstruct exactly what was authorized.

10. **Degraded mode is a governance event** — If the primary agent runtime is unavailable, fallback requires explicit approval and writes the same trace format with the same tool restrictions.

---

## Governance Hardening

The following sections define how the governance layer achieves auditability, immutability, and regulatory credibility.

### 1. Tamper-Evident Audit Trail

`run` and `decision_trace` nodes use **append-only, immutable semantics**:

- Records are never edited. Corrections create a new record with a `supersedes` edge to the original.
- Each trace event carries a **hash chain** (`prev_hash` → `this_hash`) so tampering is detectable.
- Human annotations (comments, notes) are stored as separate `annotation` metadata entries linked to the trace, never mixed into the trace body itself.

### 2. Plan and Policy Versioning

Every plan approval freezes three snapshots:

| Snapshot | What it captures |
|----------|-----------------|
| **Plan version** | `version` (monotonic int), `hash` (SHA-256 of steps + rationale), `approved_at`, `approved_by` |
| **Policy snapshot** | What rules/constraints were in effect at approval time (tool allowlist, prompt constraints, model restrictions) |
| **Tooling snapshot** | Agent runtime version, model ID, temperature, tool registry version, MCP server version |

A future audit can answer: *"It did X because plan v3 was approved by user Y under policy snapshot Z using model W."*

### 3. WBS Numbering Strategy

WBS is a **display label only**. It is never used as a stable key in APIs, edges, runs, or precedent references.

- All internal references use immutable UUIDs.
- WBS is stored in `metadata.wbs_number` and can be regenerated at any time.
- A `renumber` operation updates WBS labels for an entire subtree without breaking any references.
- Existing runs, traces, and precedents continue to resolve correctly after renumbering.

### 4. Fallback Governance

If OpenClaw is unavailable and the system falls back to a direct LLM call:

- Fallback requires an explicit **degraded-mode approval** (a gate node with `gate_type: 'degraded_mode'`).
- The fallback path enforces the same tool allowlist and prompt constraints as the primary agent.
- Trace records written during fallback carry `execution_mode: 'degraded'` in metadata.
- The UI surfaces degraded mode prominently (banner + badge on affected runs).
- Audit exports flag degraded-mode runs for reviewer attention.

### 5. Precedent Template Artifact

A `precedent` is not prose — it is a structured, parameterized template:

```typescript
{
  // Identity
  id: UUID,
  type: "precedent",
  status: "active" | "deprecated",

  // Template
  task_pattern: string,              // e.g., "Update requirement downstream impact"
  plan_template: {                   // Frozen, parameterized plan
    steps: [{ action, tool, args_schema, expected_output }],
    parameters: [{ name, type, description, required }],  // Variables to fill
  },
  input_schema: JSONSchema,          // What variables the template expects
  expected_outputs: [{ name, type, acceptance_criteria_template }],
  required_gates: string[],          // Gate types that must be passed
  risk_tags: string[],               // Known risk categories

  // Performance stats (updated after each use)
  success_count: number,
  failure_count: number,
  median_runtime_seconds: number,
  p95_runtime_seconds: number,
  avg_step_count: number,
  last_failure_reason: string | null,

  // Provenance
  created_from_run_id: UUID | null,
  applicable_node_types: string[],
  required_tools: string[],
  created_at: timestamp,
  last_used_at: timestamp | null,
}
```

### 6. Concurrency, Idempotency, and Retries

Once agents execute step-by-step, partial failures and retries are inevitable:

- Every plan step gets a stable `step_id` (UUID) and `idempotency_key` (deterministic hash of plan_id + step_number + attempt).
- `execute-step` is safe to retry — the endpoint checks the idempotency key and returns the existing result if already completed.
- Each step records **attempts**: `[{ attempt: 1, status, started_at, completed_at, output, error }]`.
- A step is only marked failed after exhausting the retry policy (default: 3 attempts with exponential backoff).

### 7. Gate State Machine

Gate semantics are formalized as explicit allowed transitions:

```
                  ┌──────────┐
                  │ pending  │
                  └────┬─────┘
                       │
            ┌──────────┼──────────┐
            ▼          ▼          ▼
       ┌─────────┐ ┌─────────┐ ┌────────────┐
       │approved │ │rejected │ │conditional │
       └─────────┘ └────┬────┘ └─────┬──────┘
                        │            │
                        ▼            ▼
                   ┌─────────┐  ┌─────────┐
                   │pending  │  │approved │
                   │(re-review)│ │(after fix)│
                   └─────────┘  └─────────┘
```

**Allowed transitions**:

| From | To | Who | Evidence Required |
|------|----|-----|-------------------|
| `pending` | `approved` | approver, admin | All deliverables present, risks acknowledged |
| `pending` | `rejected` | approver, admin | Rationale required |
| `pending` | `conditional` | approver, admin | Conditions list required |
| `rejected` | `pending` | author | Revised plan attached |
| `conditional` | `approved` | approver, admin | Conditions met (verification attached) |
| `conditional` | `rejected` | approver, admin | Conditions not met |

**Phase gate transitions**:

| From | To | Who | Evidence Required |
|------|----|-----|-------------------|
| `not_started` | `in_progress` | system, admin | Parent project active |
| `in_progress` | `at_gate` | system | All work packages complete |
| `at_gate` | `complete` | approver | Gate criteria met, deliverables verified |
| `at_gate` | `in_progress` | approver | Revision feedback provided |
| `at_gate` | `cancelled` | admin | Rationale required |
| Any | `cancelled` | admin | Rationale required |

### 8. Security and Tenancy

Even in MVP, these boundaries are defined:

**Isolation model**: Single graph per tenant. `project_id` on every node acts as the tenant boundary. All queries are scoped by `project_id`.

**RBAC roles**:

| Role | Can do |
|------|--------|
| `admin` | Everything, including system config, agent management, tenant setup |
| `approver` | Approve/reject gates, review phase gates, approve plans |
| `operator` | Create work, run intake, view execution, annotate traces |
| `viewer` | Read-only access to all data |
| `agent` | Execute approved plans, write traces, produce deliverables |

**Secret storage**: API keys stored in environment variables or a secrets manager, never in the graph. Agent credentials are scoped per-tenant.

**Audit export**: Tenant-scoped. Exports include all nodes, edges, traces, and annotations for a given `project_id` time range. Hash chain integrity is verified on export.

### 9. Graph Performance and Indexing

Decision traces can explode in volume. The indexing strategy:

**Partitioning**:
- `decision_trace` nodes partitioned by `run_id` and `created_at` (time-based)
- Trace bodies (large `context_snapshot`, `options_considered`) stored in `metadata` JSONB, with option to move to cold storage and keep pointers

**Required indexes** (on `pm_nodes` table):
- `(type, status)` — "all pending gates", "all active missions"
- `(type, project_id, status)` — tenant-scoped queries
- `(metadata->>'run_id', created_at)` — trace lookup by run
- `(metadata->>'wbs_number')` — WBS display lookups
- `(type, updated_at)` — "runs in last 7 days"

**Required indexes** (on `pm_edges` table):
- `(source_node_id, edge_type)` — "children of this node"
- `(target_node_id, edge_type)` — "parents of this node"
- `(edge_type, source_node_id)` — "all contains edges from X"

**Cold storage strategy**: After 90 days, trace bodies are compressed and moved to object storage. The graph retains a pointer node with summary metadata (step count, duration, outcome, hash).

### 10. Trust Screens

Two UI screens that differentiate Chelex:

#### Run Replay

A timeline view of a completed run showing:

- Each step side-by-side: **what was approved** (plan step) vs **what actually happened** (trace)
- Tool calls with inputs, outputs, and diffs
- Token usage and timing per step
- Deviations highlighted (tool substitution, extra steps, retries)
- Hash chain verification status (green checkmark or tamper warning)
- Operator annotations overlaid on the timeline

#### Policy View

For any step in a run, shows:

- **Why this step was allowed**: which policy rule matched
- **What tool restrictions were in effect**: allowlist at approval time
- **What would have blocked it**: rules that nearly triggered
- **Model and parameters**: exact model version, temperature, system prompt hash
- **Degraded mode flag**: if this step ran in fallback mode

---

## Governance Node Schemas — Proposed Field Additions

Below are the **minimum additional fields** needed on each governance node type to support immutability, versioning, and audit exports without ballooning the MVP. New fields are marked with `// NEW`.

### `plan` (current + additions)

```typescript
{
  id: UUID,
  type: "plan",
  task_id: UUID,
  proposed_by: string,
  steps: [{
    step_id: UUID,                    // NEW — stable identity for idempotency
    step_number: number,
    action: string,
    tool: string,
    args: object,
    expected_output: string,
    idempotency_key: string,          // NEW — hash(plan_id + step_number + version)
  }],
  rationale: string,
  status: "pending" | "approved" | "rejected" | "superseded",
  planned_traversal: { start_node, visited_nodes[], edge_weights },
  created_at: timestamp,

  // NEW — versioning
  version: number,                    // Monotonic, starts at 1
  hash: string,                       // SHA-256 of (steps + rationale + version)
  approved_at: timestamp | null,
  approved_by: string | null,         // user_id of approver

  // NEW — snapshots frozen at approval time
  policy_snapshot: {                  // Rules in effect when approved
    tool_allowlist: string[],
    prompt_constraints: string[],
    model_restrictions: string[],
    max_steps: number,
    max_tokens: number,
  } | null,
  tooling_snapshot: {                 // Runtime environment at approval
    agent_version: string,
    model_id: string,
    model_temperature: number,
    tool_registry_version: string,
    mcp_server_version: string,
  } | null,
}
```

### `run` (current + additions)

```typescript
{
  id: UUID,
  type: "run",
  task_id: UUID,
  plan_id: UUID,
  plan_version: number,               // NEW — which version of the plan was executed
  executed_by: string,
  started_at: timestamp,
  completed_at: timestamp | null,
  status: "running" | "completed" | "failed" | "cancelled",
  tool_run_ids: UUID[],
  actual_traversal: { nodes_visited[], edges_followed[], deviations },
  artifacts: [{ type, name, url, hash }],
  error_message: string | null,

  // NEW — immutability
  execution_mode: "normal" | "degraded",  // Was this a fallback run?
  hash_chain_head: string,                // Hash of the last decision_trace in this run
  step_attempts: [{                       // NEW — retry tracking per step
    step_id: UUID,
    attempts: [{
      attempt: number,
      status: "success" | "failed" | "skipped",
      started_at: timestamp,
      completed_at: timestamp,
      output_summary: string,
      error: string | null,
      idempotency_key: string,
    }],
  }],

  // NEW — annotations (separate from trace)
  annotations: [{
    id: UUID,
    author_id: string,
    created_at: timestamp,
    text: string,
    step_id: UUID | null,              // Optional: annotation on a specific step
  }],
}
```

### `decision_trace` (current + additions)

```typescript
{
  id: UUID,
  type: "decision_trace",
  run_id: UUID,
  decision_type: "path_selection" | "tool_choice" | "parameter_selection" | "termination",
  timestamp: timestamp,
  context_snapshot: { current_node, available_edges, graph_state },
  options_considered: [{ option, reasoning, score }],
  selected_option: string,
  reasoning: string,
  confidence: 0.0-1.0,
  model_used: string,

  // NEW — hash chain for tamper evidence
  sequence_number: number,            // Monotonic within run (0, 1, 2, ...)
  prev_hash: string | null,           // Hash of previous trace in this run (null for first)
  this_hash: string,                  // SHA-256 of (prev_hash + sequence_number + all fields above)

  // NEW — execution context
  step_id: UUID,                      // Which plan step this trace belongs to
  attempt_number: number,             // Which attempt of that step
  execution_mode: "normal" | "degraded",
  tokens_used: { input: number, output: number },
  duration_ms: number,
}
```

### `precedent` (current + additions)

```typescript
{
  id: UUID,
  type: "precedent",
  task_pattern: string,
  status: "active" | "deprecated",

  // ENHANCED — structured template instead of opaque object
  plan_template: {
    steps: [{ action, tool, args_schema, expected_output }],
    parameters: [{ name, type, description, required }],
  },
  input_schema: object,               // NEW — JSONSchema for template variables
  expected_outputs: [{                 // NEW — what success looks like
    name: string,
    type: string,
    acceptance_criteria_template: string,
  }],
  required_gates: string[],           // NEW — gate types that must be passed
  risk_tags: string[],                // NEW — known risk categories

  // ENHANCED — richer performance stats
  success_count: number,
  failure_count: number,
  median_runtime_seconds: number,     // NEW (replaces avg_completion_time)
  p95_runtime_seconds: number,        // NEW
  avg_step_count: number,             // NEW
  last_failure_reason: string | null, // NEW

  applicable_node_types: string[],
  required_tools: string[],
  created_from_run_id: UUID | null,
  created_at: timestamp,
  last_used_at: timestamp | null,
  refinements: object,
}
```

### New Edge Type: `supersedes`

For immutable records that need correction:

```typescript
// Added to GOV_EDGE_TYPES
supersedes: 'supersedes',
// From: plan, run, decision_trace → To: plan, run, decision_trace
// Semantics: "This record replaces the target (which is now frozen/invalid)"
// Weight: 1.0
```

---

## Implementation Priority

| Priority | Item | Effort | Impact |
|----------|------|--------|--------|
| **P0** | Hash chain on `decision_trace` | Small | Tamper evidence for every run |
| **P0** | Plan versioning (`version`, `hash`, `approved_by`) | Small | Audit trail for approvals |
| **P0** | `step_id` + `idempotency_key` on plan steps | Small | Retry safety |
| **P1** | Gate state machine with transition rules | Medium | Governance credibility |
| **P1** | Policy + tooling snapshots on plan approval | Medium | Full audit reconstruction |
| **P1** | Degraded-mode gate for LLM fallback | Medium | Close governance hole |
| **P1** | Precedent template formalization | Medium | Reusable, not just prose |
| **P2** | Run Replay UI | Large | Trust differentiator |
| **P2** | Policy View UI | Large | Trust differentiator |
| **P2** | `supersedes` edge + annotation separation | Small | Immutability correctness |
| **P3** | RBAC enforcement | Large | Required for multi-tenant |
| **P3** | Cold storage for old traces | Medium | Scale |
| **P3** | Graph index tuning | Medium | Performance at volume |
