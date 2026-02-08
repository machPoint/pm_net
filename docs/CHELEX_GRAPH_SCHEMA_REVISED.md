# Chelex Network Graph Schema — REVISED
## Proper Separation: PM Base Layer + Governance Extension

**Version**: 2.0  
**Date**: February 8, 2026  
**Problem**: AI coder tried to map governance concepts onto PM nodes — created confusion  
**Solution**: Expand schema to explicitly include both layers

---

## Design Philosophy

### Two-Layer Architecture

```
┌─────────────────────────────────────────────────────┐
│  GOVERNANCE LAYER (Chelex Extensions)               │
│  plan, run, verification, decision_trace, precedent │
└───────────────────┬─────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────┐
│  BASE PM LAYER (Universal Project Concepts)         │
│  task, milestone, deliverable, gate, risk,          │
│  decision, resource                                 │
└─────────────────────────────────────────────────────┘
```

**Key Insight**: Don't force governance into PM. Add governance as explicit first-class nodes.

---

## Node Types (12 Total)

### BASE PM LAYER (7 types)

#### 1. `task`
**What it is**: Atomic unit of work

**Attributes**:
```typescript
{
  id: UUID,
  type: "task",
  title: string,
  description: string,
  status: "backlog" | "blocked" | "ready" | "in_progress" | "review" | "done",
  assignee_type: "human" | "agent" | null,
  assignee_id: string | null,
  priority: 1-5,
  estimated_hours: number,
  start_date: date,
  end_date: date,
  acceptance_criteria: [{ id, text, required }]
}
```

**Examples**:
- "Design homepage mockup"
- "Update HALO pressure requirement"
- "Write Q3 financial report"

---

#### 2. `milestone`
**What it is**: Time-based checkpoint (zero duration)

**Attributes**:
```typescript
{
  id: UUID,
  type: "milestone",
  title: string,
  target_date: date,
  status: "upcoming" | "at_risk" | "achieved" | "missed"
}
```

**Examples**:
- "Q3 Kickoff"
- "Design Review Complete"
- "Beta Release"

---

#### 3. `deliverable`
**What it is**: Tangible output (file, artifact, product)

**Attributes**:
```typescript
{
  id: UUID,
  type: "deliverable",
  title: string,
  artifact_type: "document" | "code" | "design" | "data" | "hardware",
  artifact_url: string | null,
  artifact_hash: string | null,
  status: "planned" | "in_progress" | "delivered" | "accepted"
}
```

**Examples**:
- "Requirements Document v2.0"
- "Homepage Redesign (Figma)"
- "Q3 Budget Spreadsheet"

---

#### 4. `gate`
**What it is**: Human approval checkpoint (governance primitive)

**Attributes**:
```typescript
{
  id: UUID,
  type: "gate",
  title: string,
  gate_type: "plan_approval" | "milestone_gate" | "quality_gate" | "budget_gate",
  status: "pending" | "approved" | "rejected" | "conditional",
  required_authority: "engineer" | "manager" | "director" | "executive",
  approver_id: string | null,
  approved_at: timestamp | null,
  rationale: string | null
}
```

**Examples**:
- "Plan Approval: Update Requirement"
- "Design Review Gate"
- "Production Release Approval"

**Note**: Gates exist in PM layer because they're universal (not just for AI agents).

---

#### 5. `risk`
**What it is**: Identified threat to project

**Attributes**:
```typescript
{
  id: UUID,
  type: "risk",
  title: string,
  description: string,
  probability: "low" | "medium" | "high",
  impact: "low" | "medium" | "high",
  risk_score: 1-9,
  status: "open" | "mitigating" | "closed" | "realized",
  mitigation_plan: string | null,
  owner_id: string
}
```

**Examples**:
- "Senior designer may leave"
- "Requirements may change mid-sprint"
- "Budget overrun likely"

---

#### 6. `decision`
**What it is**: Key choice point with options

**Attributes**:
```typescript
{
  id: UUID,
  type: "decision",
  title: string,
  description: string,
  options: [{ id, text, pros, cons }],
  selected_option: string | null,
  decided_by: string | null,
  decided_at: timestamp | null,
  rationale: string | null,
  status: "open" | "decided" | "revisited"
}
```

**Examples**:
- "Tech Stack: React vs Vue"
- "Vendor: AWS vs GCP"
- "Approach: Waterfall vs Agile"

---

#### 7. `resource`
**What it is**: Person, agent, or equipment

**Attributes**:
```typescript
{
  id: UUID,
  type: "resource",
  name: string,
  resource_type: "human" | "agent" | "equipment",
  email: string | null,
  availability_percent: 0-100,
  skills: string[],
  hourly_rate: number | null,
  status: "available" | "busy" | "offline"
}
```

**Examples**:
- "Sarah Chen (Systems Engineer)"
- "MoltBot (AI Agent)"
- "Test Lab Equipment A"

---

### GOVERNANCE LAYER (5 types) — Chelex Extensions

#### 8. `plan`
**What it is**: Agent's proposed approach to a task

**Attributes**:
```typescript
{
  id: UUID,
  type: "plan",
  task_id: UUID, // Which task this plans to solve
  proposed_by: string, // agent_id
  steps: [{ step_number, action, tool, args, expected_output }],
  rationale: string,
  status: "pending" | "approved" | "rejected" | "superseded",
  planned_traversal: { start_node, visited_nodes[], edge_weights },
  created_at: timestamp,
  approved_at: timestamp | null
}
```

**Examples**:
- "Plan to Update HALO Requirement"
- "Plan to Implement Homepage"

**Edges**:
- `plan --for_task--> task` (which task this plans to solve)
- `plan --requires_approval--> gate` (needs human sign-off)
- `resource --proposes--> plan` (agent creates plan)

---

#### 9. `run`
**What it is**: Execution instance of a plan

**Attributes**:
```typescript
{
  id: UUID,
  type: "run",
  task_id: UUID,
  plan_id: UUID,
  executed_by: string, // agent_id
  started_at: timestamp,
  completed_at: timestamp | null,
  status: "running" | "completed" | "failed" | "cancelled",
  tool_run_ids: UUID[], // References to OPAL tool_runs
  actual_traversal: { nodes_visited[], edges_followed[], deviations },
  artifacts: [{ type, name, url, hash }],
  error_message: string | null
}
```

**Examples**:
- "Run #42: Update HALO Requirement"
- "Run #43: Implement Homepage"

**Edges**:
- `run --executes_plan--> plan` (which plan was executed)
- `run --for_task--> task` (which task was worked on)
- `resource --executed--> run` (agent performed run)
- `run --produces--> deliverable` (run created artifacts)

---

#### 10. `verification`
**What it is**: Check that acceptance criteria were met

**Attributes**:
```typescript
{
  id: UUID,
  type: "verification",
  task_id: UUID,
  run_id: UUID,
  criterion_id: string, // From task.acceptance_criteria[].id
  criterion_text: string,
  evidence_type: "artifact" | "graph_state" | "tool_output",
  evidence_ref: object, // Reference to run artifact or tool output
  verified_by: "auto" | string, // user_id
  verified_at: timestamp,
  status: "pending" | "passed" | "failed" | "needs_review",
  notes: string | null
}
```

**Examples**:
- "Verification: Requirement text updated"
- "Verification: Homepage deployed"

**Edges**:
- `verification --checks--> task` (which task's criteria)
- `verification --evidenced_by--> run` (which run provided evidence)
- `verification --references--> deliverable` (optional: which artifact)

---

#### 11. `decision_trace`
**What it is**: Agent's reasoning at a decision point

**Attributes**:
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
  model_used: string // e.g., "claude-sonnet-4-5"
}
```

**Examples**:
- "Decision Trace: Chose DEPENDS_ON over INTERFACES_WITH"
- "Decision Trace: Selected Tailwind CSS framework"

**Edges**:
- `decision_trace --during_run--> run` (when this decision happened)
- `decision_trace --at_node--> decision` (optional: if referencing a decision node)

---

#### 12. `precedent`
**What it is**: Reusable pattern from past successes

**Attributes**:
```typescript
{
  id: UUID,
  type: "precedent",
  task_pattern: string, // e.g., "Update requirement downstream impact"
  plan_template: object, // Reusable plan structure
  success_count: integer,
  failure_count: integer,
  avg_completion_time: interval,
  applicable_node_types: string[],
  required_tools: string[],
  created_from_run_id: UUID | null,
  created_at: timestamp,
  last_used_at: timestamp | null,
  refinements: object // History of how pattern evolved
}
```

**Examples**:
- "Precedent: Update Requirement via Direct Node Modification"
- "Precedent: Homepage Implementation Using Component Library"

**Edges**:
- `precedent --learned_from--> run` (which run created this precedent)
- `plan --based_on--> precedent` (plan uses this pattern)

---

## Edge Types (15 Total)

### BASE PM EDGES (7 types)

#### 1. `depends_on`
**From**: task/milestone → **To**: task/milestone  
**Weight**: 0.5 (default), 1.0 (critical path)  
**Semantics**: "Cannot start until dependency is done"

---

#### 2. `blocks`
**From**: task/risk → **To**: task/milestone  
**Weight**: 0.9 (high urgency)  
**Semantics**: "Actively prevents start"

---

#### 3. `assigned_to`
**From**: task → **To**: resource  
**Weight**: 1.0  
**Semantics**: "Resource owns this task"

---

#### 4. `produces`
**From**: task/run → **To**: deliverable  
**Weight**: 0.8  
**Semantics**: "Task creates deliverable"

---

#### 5. `mitigates`
**From**: task → **To**: risk  
**Weight**: risk.risk_score / 10  
**Semantics**: "Task reduces risk"

---

#### 6. `requires_approval`
**From**: task/plan → **To**: gate  
**Weight**: 1.0 (absolute requirement)  
**Semantics**: "Cannot proceed without gate approval"

---

#### 7. `informs`
**From**: decision → **To**: task/plan  
**Weight**: 0.2 (weak context)  
**Semantics**: "Decision provides context"

---

### GOVERNANCE EDGES (8 types)

#### 8. `for_task`
**From**: plan/run/verification → **To**: task  
**Weight**: 1.0  
**Semantics**: "Governance node relates to this task"

---

#### 9. `proposes`
**From**: resource (agent) → **To**: plan  
**Weight**: 0.7  
**Semantics**: "Agent created plan"

---

#### 10. `executes_plan`
**From**: run → **To**: plan  
**Weight**: 1.0  
**Semantics**: "Run is executing this plan"

---

#### 11. `executed`
**From**: resource (agent) → **To**: run  
**Weight**: 1.0  
**Semantics**: "Agent performed run"

---

#### 12. `checks`
**From**: verification → **To**: task  
**Weight**: 0.9  
**Semantics**: "Verification checks task criteria"

---

#### 13. `evidenced_by`
**From**: verification → **To**: run/deliverable  
**Weight**: 0.8  
**Semantics**: "Verification uses this as evidence"

---

#### 14. `during_run`
**From**: decision_trace → **To**: run  
**Weight**: 0.6  
**Semantics**: "Decision happened during run"

---

#### 15. `learned_from`
**From**: precedent → **To**: run  
**Weight**: 0.5  
**Semantics**: "Precedent created from run"

---

#### 16. `based_on`
**From**: plan → **To**: precedent  
**Weight**: 0.6  
**Semantics**: "Plan uses precedent pattern"

---

## Database Schema

### Single Node Table (All Types)

```sql
CREATE TABLE pm_nodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL,
  
  -- Core attributes (universal)
  type TEXT NOT NULL, 
    -- PM Layer: 'task' | 'milestone' | 'deliverable' | 'gate' | 'risk' | 'decision' | 'resource'
    -- Governance Layer: 'plan' | 'run' | 'verification' | 'decision_trace' | 'precedent'
  title TEXT NOT NULL,
  description TEXT,
  status TEXT,
  
  -- Type-specific data (JSONB for flexibility)
  type_data JSONB NOT NULL DEFAULT '{}',
  
  -- Metadata
  created_by TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Domain extensions (Phase 4 - aerospace, medical, etc.)
  domain_data JSONB
);

CREATE INDEX idx_pm_nodes_type ON pm_nodes(type);
CREATE INDEX idx_pm_nodes_project ON pm_nodes(project_id);
CREATE INDEX idx_pm_nodes_status ON pm_nodes(status);

-- Index for governance queries
CREATE INDEX idx_pm_nodes_governance ON pm_nodes(type) 
  WHERE type IN ('plan', 'run', 'verification', 'decision_trace', 'precedent');
```

### Single Edge Table (All Types)

```sql
CREATE TABLE pm_edges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL,
  
  -- Relationship
  from_node_id UUID NOT NULL REFERENCES pm_nodes(id) ON DELETE CASCADE,
  to_node_id UUID NOT NULL REFERENCES pm_nodes(id) ON DELETE CASCADE,
  
  type TEXT NOT NULL,
    -- PM Layer: 'depends_on' | 'blocks' | 'assigned_to' | 'produces' | 'mitigates' | 'requires_approval' | 'informs'
    -- Governance Layer: 'for_task' | 'proposes' | 'executes_plan' | 'executed' | 'checks' | 'evidenced_by' | 'during_run' | 'learned_from' | 'based_on'
  
  -- Weight
  weight DECIMAL(3,2) DEFAULT 0.5,
  
  -- Edge-specific data (optional)
  edge_data JSONB,
  
  -- Metadata
  created_by TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_pm_edges_from ON pm_edges(from_node_id);
CREATE INDEX idx_pm_edges_to ON pm_edges(to_node_id);
CREATE INDEX idx_pm_edges_type ON pm_edges(type);
CREATE INDEX idx_pm_edges_weight ON pm_edges(weight);

-- Prevent duplicate edges
CREATE UNIQUE INDEX idx_pm_edges_unique ON pm_edges(from_node_id, to_node_id, type);
```

---

## Example Graph: Agent Task Execution Flow

### Nodes

```javascript
nodes = [
  // PM Layer
  { id: "t1", type: "task", title: "Update HALO Requirement", status: "ready" },
  { id: "g1", type: "gate", title: "Plan Approval Gate", status: "pending" },
  { id: "r1", type: "resource", name: "MoltBot", resource_type: "agent" },
  { id: "d1", type: "deliverable", title: "Updated Requirement Document" },
  { id: "dec1", type: "decision", title: "Update Method: Direct vs Traceability-First", selected_option: "Direct" },
  
  // Governance Layer
  { id: "p1", type: "plan", task_id: "t1", proposed_by: "moltbot", status: "pending", 
    steps: [
      { step: 1, action: "Query system graph", tool: "querySystemModel" },
      { step: 2, action: "Update node text", tool: "updateNode" }
    ]
  },
  { id: "run1", type: "run", task_id: "t1", plan_id: "p1", status: "completed", executed_by: "moltbot" },
  { id: "v1", type: "verification", task_id: "t1", run_id: "run1", criterion_id: "c1", 
    criterion_text: "Requirement text updated", status: "passed"
  },
  { id: "dt1", type: "decision_trace", run_id: "run1", 
    decision_type: "tool_choice", 
    reasoning: "updateNode is faster than traceability-first approach"
  },
  { id: "prec1", type: "precedent", task_pattern: "Update requirement direct", 
    created_from_run_id: "run1", success_count: 1
  }
]
```

### Edges

```javascript
edges = [
  // PM Layer edges
  { from: "t1", to: "r1", type: "assigned_to", weight: 1.0 },
  { from: "t1", to: "g1", type: "requires_approval", weight: 1.0 },
  { from: "dec1", to: "t1", type: "informs", weight: 0.2 },
  
  // Governance edges
  { from: "p1", to: "t1", type: "for_task", weight: 1.0 },
  { from: "r1", to: "p1", type: "proposes", weight: 0.7 },
  { from: "p1", to: "g1", type: "requires_approval", weight: 1.0 },
  { from: "run1", to: "p1", type: "executes_plan", weight: 1.0 },
  { from: "run1", to: "t1", type: "for_task", weight: 1.0 },
  { from: "r1", to: "run1", type: "executed", weight: 1.0 },
  { from: "run1", to: "d1", type: "produces", weight: 0.8 },
  { from: "v1", to: "t1", type: "checks", weight: 0.9 },
  { from: "v1", to: "run1", type: "evidenced_by", weight: 0.8 },
  { from: "dt1", to: "run1", type: "during_run", weight: 0.6 },
  { from: "prec1", to: "run1", type: "learned_from", weight: 0.5 }
]
```

### Agent Flow

```
1. Agent MoltBot finds task t1 (assigned_to edge)
2. Agent reads decision dec1 (informs edge) → "Use direct method"
3. Agent creates plan p1 (proposes edge)
4. Plan p1 needs gate g1 approval (requires_approval edge)
5. Human approves gate g1 (status: pending → approved)
6. Agent creates run run1 (executes_plan edge)
7. Run produces deliverable d1 (produces edge)
8. Agent logs decision trace dt1 (during_run edge)
9. Verification v1 checks evidence (evidenced_by edge) → passed
10. System creates precedent prec1 (learned_from edge)
```

---

## Visualization Examples

### Network Diagram View (PM Layer)

```
        ┌─────────┐
        │  Task   │ ───────┐
        │  t1     │        │ requires_approval
        └────┬────┘        │
             │ assigned_to │
             ▼             ▼
        ┌─────────┐   ┌────────┐
        │Resource │   │  Gate  │
        │MoltBot  │   │  g1    │
        └─────────┘   └────────┘
```

### Governance Trace View (Governance Layer)

```
    ┌──────┐  for_task  ┌──────┐
    │ Plan ├───────────>│ Task │
    │  p1  │            │  t1  │
    └───┬──┘            └──────┘
        │ executes_plan
        ▼
    ┌──────┐  produces  ┌────────────┐
    │ Run  ├───────────>│Deliverable │
    │ run1 │            │    d1      │
    └───┬──┘            └────────────┘
        │ during_run
        ▼
    ┌──────────────┐
    │Decision Trace│
    │     dt1      │
    └──────────────┘
```

---

## Benefits of This Design

### 1. Clear Separation
- **PM layer** = What to do (tasks, milestones, risks)
- **Governance layer** = How it was done (plans, runs, verifications)

### 2. No Forced Mappings
- Plan is a plan, not "metadata on a gate"
- Run is a run, not "a task with special status"
- Verification is verification, not "a deliverable"

### 3. Flexible Query Patterns

**PM queries** (for humans):
```sql
SELECT * FROM pm_nodes WHERE type IN ('task', 'milestone', 'risk');
```

**Governance queries** (for agents):
```sql
SELECT * FROM pm_nodes WHERE type IN ('plan', 'run', 'verification');
```

**Combined queries** (for audit):
```sql
-- Find all governance nodes for a task
SELECT g.* FROM pm_nodes g
JOIN pm_edges e ON e.from_node_id = g.id
WHERE e.type = 'for_task' AND e.to_node_id = 'task_123';
```

### 4. Agent Navigation is Natural

```python
# Find tasks to work on (PM layer)
tasks = graph.query(type="task", status="ready", assignee_id=agent.id)

# Check if plan needs approval (governance layer)
plans = graph.query(type="plan", task_id=task.id)
gate = graph.follow_edge(plans[0].id, edge_type="requires_approval")

# Execute after approval
if gate.status == "approved":
    run = create_run(plan_id=plans[0].id)
```

---

## Migration from AI Coder's Schema

### Step 1: Expand Node Types
```sql
-- AI coder only had PM types
-- Add governance types explicitly
INSERT INTO pm_nodes (type, title, type_data)
SELECT 
  'plan' as type,
  'Plan for ' || t.title as title,
  jsonb_build_object(
    'task_id', t.id,
    'steps', t.metadata->'plan_steps',
    'proposed_by', t.assignee_id
  ) as type_data
FROM pm_nodes t
WHERE t.type = 'task' AND t.metadata ? 'plan_steps';
```

### Step 2: Create Proper Edges
```sql
-- Replace confused mappings with clean edges
INSERT INTO pm_edges (from_node_id, to_node_id, type, weight)
SELECT 
  p.id as from_node_id,
  p.type_data->>'task_id' as to_node_id,
  'for_task' as type,
  1.0 as weight
FROM pm_nodes p
WHERE p.type = 'plan';
```

---

## Testing Checklist

### PM Layer Tests
- [ ] Can create all 7 PM node types
- [ ] Can create all 7 PM edge types
- [ ] Network diagram shows tasks, milestones, gates
- [ ] Risk register shows risks with mitigation tasks
- [ ] Resource view shows assignments

### Governance Layer Tests
- [ ] Agent can create plan node
- [ ] Plan requires gate approval (edge exists)
- [ ] Run node logs execution
- [ ] Verification checks acceptance criteria
- [ ] Decision trace captures reasoning
- [ ] Precedent learns from successful run

### Integration Tests
- [ ] Task → Plan → Gate → Run → Verification flow works
- [ ] Agent cannot bypass gate (governance enforced)
- [ ] Decision traces reference decision nodes correctly
- [ ] Precedents can be queried and reused

---

## Summary

**Don't force-fit governance into PM nodes.**

**Instead**:
- **12 node types** = 7 PM + 5 Governance
- **15 edge types** = 7 PM + 8 Governance
- **Clear layers** = Base PM (universal) + Governance (Chelex)
- **Flexible** = Can query PM layer alone, governance alone, or combined

**This is cleaner, more maintainable, and accurately represents the domain.**

Ready to implement this version?
