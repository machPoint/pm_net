# Chelex MVP Network Graph Schema
## Node Types, Edge Types, and Weights for Network Construction Agent

**Version**: 1.0  
**Purpose**: Define the minimal graph structure for PM + AI agent navigation

---

## Design Principles

1. **Agent-Navigable** — Agents must understand node semantics without NLP
2. **Human-Readable** — PMs should recognize familiar concepts
3. **Governance-Ready** — Support Chelex approval workflows
4. **Domain-Agnostic** — No aerospace/medical-specific types in core

---

## Node Types (7 Core Types)

### 1. `task`
**Definition**: Atomic unit of work with clear completion criteria

**Attributes**:
```typescript
{
  id: UUID,
  type: "task",
  title: string,
  description: string,
  status: "backlog" | "in_progress" | "review" | "done" | "blocked",
  assignee_type: "human" | "agent" | null,
  assignee_id: string | null,
  acceptance_criteria: [{ id: string, text: string, required: boolean }],
  priority: 1-5, // 1=highest
  estimated_hours: number,
  start_date: date | null,
  end_date: date | null,
  progress_percent: 0-100
}
```

**Agent Navigation**:
- Agent looks for `status="backlog"` and `assignee_id=self`
- Agent traverses `depends_on` edges to understand prerequisites
- Agent submits plan before changing status to `in_progress`

**Examples**:
- "Update HALO pressure requirement"
- "Design homepage mockup"
- "Write Q3 financial report"

---

### 2. `milestone`
**Definition**: Time-based checkpoint with no work content (zero duration)

**Attributes**:
```typescript
{
  id: UUID,
  type: "milestone",
  title: string,
  target_date: date,
  actual_date: date | null,
  status: "upcoming" | "at_risk" | "achieved" | "missed",
  criticality: "low" | "medium" | "high" | "critical"
}
```

**Agent Navigation**:
- Agent checks if milestone is `at_risk` based on dependency completion
- Agent can propose mitigation tasks if milestone at risk
- Agent cannot "complete" a milestone (only tasks complete)

**Examples**:
- "Q3 Kickoff"
- "Design Review Complete"
- "Beta Release"

---

### 3. `deliverable`
**Definition**: Tangible output (file, report, product, feature)

**Attributes**:
```typescript
{
  id: UUID,
  type: "deliverable",
  title: string,
  description: string,
  artifact_type: "document" | "code" | "design" | "data" | "hardware",
  artifact_url: string | null,
  artifact_hash: string | null, // SHA-256 for verification
  status: "planned" | "in_progress" | "delivered" | "accepted",
  owner_id: string
}
```

**Agent Navigation**:
- Agent follows `produces` edges from tasks to deliverables
- Agent can mark deliverable as `delivered` after task completion
- Agent links deliverable to verification (evidence)

**Examples**:
- "Requirements Document v2.0"
- "Homepage Redesign (Figma)"
- "Q3 Budget Analysis Spreadsheet"

---

### 4. `gate`
**Definition**: Approval checkpoint requiring human sign-off

**Attributes**:
```typescript
{
  id: UUID,
  type: "gate",
  title: string,
  description: string,
  gate_type: "plan_approval" | "milestone_gate" | "quality_gate" | "budget_gate",
  status: "pending" | "approved" | "rejected" | "conditional",
  required_authority: "engineer" | "manager" | "director" | "executive",
  approver_id: string | null,
  approved_at: timestamp | null
}
```

**Agent Navigation**:
- Agent CANNOT pass gate without human approval
- Agent submits plan, creates `requires_approval` edge to gate
- Agent polls gate status before proceeding
- **This is the core Chelex governance primitive**

**Examples**:
- "Plan Approval: Update Requirement"
- "Design Review Gate"
- "Production Release Approval"

---

### 5. `risk`
**Definition**: Identified threat to project success

**Attributes**:
```typescript
{
  id: UUID,
  type: "risk",
  title: string,
  description: string,
  probability: "low" | "medium" | "high",
  impact: "low" | "medium" | "high",
  risk_score: 1-9, // probability * impact
  status: "open" | "mitigating" | "closed" | "realized",
  mitigation_plan: string | null,
  owner_id: string
}
```

**Agent Navigation**:
- Agent can identify risks during graph traversal
- Agent can propose mitigation tasks (linked via `mitigates` edge)
- Agent cannot close risks (requires human judgment)

**Examples**:
- "Senior designer may leave team"
- "Requirements may change mid-sprint"
- "Budget overrun likely"

---

### 6. `decision`
**Definition**: Key choice point with multiple options

**Attributes**:
```typescript
{
  id: UUID,
  type: "decision",
  title: string,
  description: string,
  options: [{ id: string, text: string, pros: string[], cons: string[] }],
  selected_option: string | null,
  decided_by: string | null,
  decided_at: timestamp | null,
  rationale: string | null,
  status: "open" | "decided" | "revisited"
}
```

**Agent Navigation**:
- Agent can propose decision options
- Agent CANNOT make decision (requires human)
- Agent logs when traversal reached a decision point
- **Decision nodes are anchors for agent reasoning traces**

**Examples**:
- "Tech Stack Choice: React vs Vue"
- "Vendor Selection: AWS vs GCP"
- "Approach: Waterfall vs Agile"

---

### 7. `resource`
**Definition**: Person, agent, or equipment available for work

**Attributes**:
```typescript
{
  id: UUID,
  type: "resource",
  name: string,
  resource_type: "human" | "agent" | "equipment",
  email: string | null,
  availability_percent: 0-100,
  skills: string[], // ["python", "design", "requirements"]
  hourly_rate: number | null,
  status: "available" | "busy" | "offline"
}
```

**Agent Navigation**:
- Agent queries available resources before proposing plan
- Agent can "self-assign" if resource.id == agent.id
- Agent checks resource skills match task requirements

**Examples**:
- "Sarah Chen (Systems Engineer)"
- "MoltBot (AI Agent)"
- "Test Lab Equipment A"

---

## Edge Types (7 Core Types)

### 1. `depends_on`
**Semantics**: Task A cannot start until Task B is done

**Direction**: A → B means "A depends on B" (B must finish first)

**Weight**: `0.5` (default), `1.0` (critical path)

**Agent Logic**:
```python
def can_start_task(task_id):
    dependencies = graph.incoming_edges(task_id, type="depends_on")
    return all(dep.source.status == "done" for dep in dependencies)
```

**Example**:
```
"Implement Homepage" depends_on "Design Homepage"
```

---

### 2. `blocks`
**Semantics**: Task A prevents Task B from starting (active blocker)

**Direction**: A → B means "A blocks B" (B can't start while A exists)

**Weight**: `0.9` (high urgency to resolve)

**Agent Logic**:
```python
def find_blockers(task_id):
    return graph.incoming_edges(task_id, type="blocks")
```

**Example**:
```
"Fix Critical Bug" blocks "Deploy to Production"
```

**Note**: Different from `depends_on` — blocking is adversarial, dependency is sequential.

---

### 3. `assigned_to`
**Semantics**: Task is assigned to a Resource

**Direction**: Task → Resource

**Weight**: `1.0` (always)

**Agent Logic**:
```python
def get_my_tasks(agent_id):
    return graph.outgoing_edges(agent_id, type="assigned_to", reverse=True)
```

**Example**:
```
"Write Blog Post" assigned_to "MoltBot"
```

---

### 4. `produces`
**Semantics**: Task produces a Deliverable

**Direction**: Task → Deliverable

**Weight**: `0.8` (important for verification)

**Agent Logic**:
```python
def complete_task(task_id):
    deliverables = graph.outgoing_edges(task_id, type="produces")
    for d in deliverables:
        verify_artifact(d.target.id)
```

**Example**:
```
"Design Homepage" produces "Homepage Mockup (Figma)"
```

---

### 5. `mitigates`
**Semantics**: Task reduces or eliminates a Risk

**Direction**: Task → Risk

**Weight**: Risk.risk_score / 10 (higher score = higher weight)

**Agent Logic**:
```python
def prioritize_tasks():
    risk_mitigation_tasks = graph.edges(type="mitigates")
    return sorted(risk_mitigation_tasks, key=lambda e: e.target.risk_score, reverse=True)
```

**Example**:
```
"Cross-train Junior Engineer" mitigates "Senior Designer May Leave"
```

---

### 6. `requires_approval`
**Semantics**: Task cannot proceed without Gate approval

**Direction**: Task → Gate

**Weight**: `1.0` (absolute requirement)

**Agent Logic**:
```python
def can_execute_plan(task_id, plan_id):
    gates = graph.outgoing_edges(task_id, type="requires_approval")
    return all(gate.target.status == "approved" for gate in gates)
```

**Example**:
```
"Deploy to Production" requires_approval "Release Gate"
```

**This is the core Chelex governance mechanism.**

---

### 7. `informs`
**Semantics**: Decision provides context for Task (weak link)

**Direction**: Decision → Task

**Weight**: `0.2` (informational only)

**Agent Logic**:
```python
def get_context(task_id):
    context = graph.incoming_edges(task_id, type="informs")
    return [edge.source for edge in context]
```

**Example**:
```
"Tech Stack Choice: React" informs "Implement Homepage"
```

**Use Case**: Agent reads decision rationale to understand task context.

---

## Edge Weights (Interpretation)

### Weight Scale: 0.0 - 1.0

| Weight | Meaning | Use Case |
|--------|---------|----------|
| **1.0** | Critical path / Required | `depends_on` (critical), `requires_approval`, `assigned_to` |
| **0.9** | High urgency | `blocks` |
| **0.8** | Important | `produces` |
| **0.5** | Normal dependency | `depends_on` (default) |
| **0.3** | Nice to have | Informational links |
| **0.2** | Weak context | `informs` |
| **0.1** | Exploratory | "Consider this node" |
| **0.0** | Disabled | Edge exists but ignored |

### Weight Calculation Examples

**Risk Mitigation Weight**:
```python
edge_weight = risk.risk_score / 10
# Risk score 9 (high prob, high impact) → weight 0.9
# Risk score 3 (low prob, medium impact) → weight 0.3
```

**Critical Path Weight**:
```python
if task.on_critical_path:
    edge_weight = 1.0
else:
    edge_weight = 0.5
```

**Time-Based Weight** (optional, for scheduling):
```python
days_until_due = (task.end_date - today).days
edge_weight = 1.0 if days_until_due < 7 else 0.5
```

---

## Agent Navigation Algorithms

### Algorithm 1: Find Eligible Tasks
```python
def find_eligible_tasks(agent_id):
    """Find tasks agent can work on now"""
    assigned_tasks = graph.query(
        node_type="task",
        filters={"assignee_id": agent_id, "status": ["backlog", "in_progress"]}
    )
    
    eligible = []
    for task in assigned_tasks:
        # Check dependencies
        deps = graph.incoming_edges(task.id, type="depends_on")
        if all(dep.source.status == "done" for dep in deps):
            # Check blockers
            blockers = graph.incoming_edges(task.id, type="blocks")
            if len(blockers) == 0:
                eligible.append(task)
    
    # Sort by priority, then weight
    return sorted(eligible, key=lambda t: (t.priority, get_path_weight(t)))
```

### Algorithm 2: Check Approval Required
```python
def can_execute(task_id, plan_id):
    """Check if plan is approved"""
    gates = graph.outgoing_edges(task_id, type="requires_approval")
    
    for gate_edge in gates:
        gate = gate_edge.target
        if gate.status != "approved":
            return False, f"Waiting for {gate.title}"
    
    return True, "Approved"
```

### Algorithm 3: Compute Impact Radius
```python
def compute_impact_radius(task_id, max_depth=3):
    """Find all nodes affected by this task"""
    visited = set()
    queue = [(task_id, 0)]
    
    while queue:
        node_id, depth = queue.pop(0)
        if depth > max_depth or node_id in visited:
            continue
        
        visited.add(node_id)
        
        # Follow outgoing edges
        outgoing = graph.outgoing_edges(node_id)
        for edge in outgoing:
            if edge.weight >= 0.5:  # Only follow significant edges
                queue.append((edge.target.id, depth + 1))
    
    return visited
```

### Algorithm 4: Critical Path Detection
```python
def find_critical_path(start_node, end_node):
    """Find longest path (critical path)"""
    paths = []
    
    def dfs(node, path, weight):
        if node == end_node:
            paths.append((path, weight))
            return
        
        for edge in graph.outgoing_edges(node, type="depends_on"):
            if edge.target not in path:
                dfs(edge.target, path + [edge.target], weight + edge.weight)
    
    dfs(start_node, [start_node], 0)
    
    # Return path with highest total weight
    return max(paths, key=lambda p: p[1])
```

---

## Network Refiner Agent Responsibilities

The **Network Refiner Agent** (from the 5-layer architecture) is responsible for:

### 1. Missing Node Detection
```python
def find_missing_nodes():
    """Identify implied but not explicit nodes"""
    
    # Example: Task produces deliverable, but deliverable node doesn't exist
    tasks_with_produce_edges = graph.edges(type="produces")
    for edge in tasks_with_produce_edges:
        if not graph.node_exists(edge.target.id):
            suggest_node(type="deliverable", inferred_from=edge)
    
    # Example: Task depends on another, but dependency not in graph
    # (Requires NLP on task descriptions - MVP can skip)
```

### 2. Missing Edge Detection
```python
def find_missing_edges():
    """Identify logical but missing relationships"""
    
    # Example: Task A produces deliverable, Task B uses deliverable → add depends_on
    deliverables = graph.nodes(type="deliverable")
    for d in deliverables:
        producers = graph.incoming_edges(d.id, type="produces")
        consumers = graph.outgoing_edges(d.id, type="consumes")  # if we add this edge type
        
        for producer in producers:
            for consumer in consumers:
                if not graph.edge_exists(consumer.id, producer.id, type="depends_on"):
                    suggest_edge(
                        from_id=consumer.id,
                        to_id=producer.id,
                        type="depends_on",
                        rationale=f"Consumer needs producer's deliverable"
                    )
```

### 3. Weight Adjustment
```python
def adjust_weights():
    """Recalculate edge weights based on project state"""
    
    # Increase weight for tasks near deadline
    tasks = graph.nodes(type="task")
    for task in tasks:
        days_until_due = (task.end_date - today()).days
        if days_until_due < 7:
            for edge in graph.incoming_edges(task.id, type="depends_on"):
                edge.weight = min(1.0, edge.weight * 1.5)
    
    # Increase weight for risk mitigation if risk score increases
    risks = graph.nodes(type="risk")
    for risk in risks:
        if risk.risk_score > risk.previous_score:
            for edge in graph.incoming_edges(risk.id, type="mitigates"):
                edge.weight = risk.risk_score / 10
```

---

## Database Schema

### Node Table
```sql
CREATE TABLE pm_nodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL,
  
  -- Core attributes
  type TEXT NOT NULL, -- 'task' | 'milestone' | 'deliverable' | 'gate' | 'risk' | 'decision' | 'resource'
  title TEXT NOT NULL,
  description TEXT,
  status TEXT,
  
  -- Assignment (for tasks)
  assignee_type TEXT, -- 'human' | 'agent'
  assignee_id TEXT,
  
  -- Scheduling (for tasks, milestones)
  start_date DATE,
  end_date DATE,
  estimated_hours DECIMAL(10,2),
  progress_percent INTEGER DEFAULT 0,
  
  -- Metadata
  created_by TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Type-specific data (JSONB for flexibility)
  type_data JSONB,
  -- Example for task: { "acceptance_criteria": [...], "priority": 3 }
  -- Example for gate: { "required_authority": "manager", "approved_by": "user_123" }
  -- Example for risk: { "probability": "high", "impact": "medium", "risk_score": 6 }
  
  -- Domain-specific extensions (Phase 4)
  domain_data JSONB
);

CREATE INDEX idx_pm_nodes_type ON pm_nodes(type);
CREATE INDEX idx_pm_nodes_assignee ON pm_nodes(assignee_type, assignee_id);
CREATE INDEX idx_pm_nodes_status ON pm_nodes(status);
CREATE INDEX idx_pm_nodes_project ON pm_nodes(project_id);
```

### Edge Table
```sql
CREATE TABLE pm_edges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL,
  
  -- Relationship
  from_node_id UUID NOT NULL REFERENCES pm_nodes(id) ON DELETE CASCADE,
  to_node_id UUID NOT NULL REFERENCES pm_nodes(id) ON DELETE CASCADE,
  
  type TEXT NOT NULL, -- 'depends_on' | 'blocks' | 'assigned_to' | 'produces' | 'mitigates' | 'requires_approval' | 'informs'
  
  -- Weight
  weight DECIMAL(3,2) DEFAULT 0.5, -- 0.0 to 1.0
  
  -- Metadata
  created_by TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Edge-specific data (optional)
  edge_data JSONB
);

CREATE INDEX idx_pm_edges_from ON pm_edges(from_node_id);
CREATE INDEX idx_pm_edges_to ON pm_edges(to_node_id);
CREATE INDEX idx_pm_edges_type ON pm_edges(type);
CREATE INDEX idx_pm_edges_weight ON pm_edges(weight);

-- Prevent duplicate edges
CREATE UNIQUE INDEX idx_pm_edges_unique ON pm_edges(from_node_id, to_node_id, type);
```

---

## Example Graph: Website Redesign Project

### Nodes
```javascript
nodes = [
  { id: "n1", type: "task", title: "Design Homepage Mockup", status: "done", assignee_type: "human", assignee_id: "sarah" },
  { id: "n2", type: "task", title: "Implement Homepage", status: "in_progress", assignee_type: "agent", assignee_id: "moltbot" },
  { id: "n3", type: "deliverable", title: "Homepage Mockup (Figma)", status: "delivered" },
  { id: "n4", type: "gate", title: "Design Approval Gate", status: "approved" },
  { id: "n5", type: "milestone", title: "Homepage Launch", target_date: "2026-03-01" },
  { id: "n6", type: "risk", title: "Design Changes Requested", risk_score: 6, status: "open" },
  { id: "n7", type: "decision", title: "CSS Framework: Tailwind vs Bootstrap", selected_option: "Tailwind" }
]
```

### Edges
```javascript
edges = [
  { from: "n2", to: "n1", type: "depends_on", weight: 1.0 },  // Implement depends on Design
  { from: "n1", to: "n3", type: "produces", weight: 0.8 },    // Design produces Mockup
  { from: "n2", to: "n4", type: "requires_approval", weight: 1.0 },  // Implement requires gate
  { from: "n2", to: "n5", type: "depends_on", weight: 0.5 },  // Milestone depends on Implement
  { from: "n1", to: "n6", type: "mitigates", weight: 0.6 },   // Design mitigates risk
  { from: "n7", to: "n2", type: "informs", weight: 0.2 }      // Decision informs implementation
]
```

### Agent Reasoning
```
Agent MoltBot checks for assigned tasks:
1. Finds task n2 (assignee_id=moltbot, status=in_progress)
2. Checks dependencies: n2 depends_on n1
3. Verifies n1.status == "done" ✓
4. Checks approvals: n2 requires_approval n4
5. Verifies n4.status == "approved" ✓
6. Checks context: n7 informs n2
7. Reads decision: "Use Tailwind CSS"
8. Proceeds with implementation using Tailwind
```

---

## Testing Checklist

### Node Type Coverage
- [ ] Can create all 7 node types via API
- [ ] Each node type validates required fields
- [ ] Each node type displays correctly in UI

### Edge Type Coverage
- [ ] Can create all 7 edge types via API
- [ ] Edge weights validate (0.0 - 1.0 range)
- [ ] Duplicate edges prevented

### Agent Navigation
- [ ] Agent can find eligible tasks (depends_on satisfied)
- [ ] Agent blocked by missing gate approval
- [ ] Agent reads decision context via informs edge
- [ ] Agent computes impact radius correctly

### Network Refiner
- [ ] Detects missing deliverable nodes
- [ ] Suggests missing depends_on edges
- [ ] Adjusts weights based on deadlines

---

## Summary

**MVP Graph Schema**:
- **7 Node Types**: Task, Milestone, Deliverable, Gate, Risk, Decision, Resource
- **7 Edge Types**: depends_on, blocks, assigned_to, produces, mitigates, requires_approval, informs
- **Weight Range**: 0.0 (disabled) to 1.0 (critical)

**Key for Chelex**:
- `gate` nodes + `requires_approval` edges = human-in-the-loop governance
- `decision` nodes = anchor points for agent reasoning traces
- Edge weights = agent prioritization (high weight = navigate first)

**Next Steps**:
1. Add node_type, edge_type columns to existing se_nodes/se_edges
2. Implement MCP tool: `queryNetworkGraph(filters)`
3. Build Network Refiner Agent (find missing nodes/edges)
4. Test with Website Redesign example

This schema is **complete, minimal, and extensible**. Ready to implement?
