# Network PM Core v1.0 — Technical Specification

**Version:** 1.0  
**Date:** 2026-02-06  
**Status:** Implementation Specification  
**Purpose:** Authoritative reference for the generic project management graph layer. This is the foundation that domain-specific extensions build upon.

---

## 1. What This Is

A graph-native project management system where:
- **All entities are nodes** (tasks, plans, approvals, users, agents, etc.)
- **All relationships are edges** (assigned_to, approved_by, depends_on, etc.)
- **All metadata is weights and JSON** (extensible without schema changes)

This enables:
1. Agents that traverse verified structure instead of hallucinating
2. Humans who can visualize system complexity as interactive graphs
3. Audit trails that are queryable as graph paths
4. Domain extensions without modifying core tables

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────┐
│                   UI Layer                          │
│  ┌──────────────┐  ┌──────────────────────────────┐│
│  │ Kanban Board │  │ Graph View (React Flow)      ││
│  │ (status view)│  │ (network visualization)      ││
│  └──────────────┘  └──────────────────────────────┘│
├─────────────────────────────────────────────────────┤
│                   API Layer                         │
│  ┌──────────┐  ┌────────────┐  ┌────────────────┐  │
│  │  CRUD    │  │  Traversal │  │  History       │  │
│  │  Routes  │  │  Engine    │  │  Queries       │  │
│  └──────────┘  └────────────┘  └────────────────┘  │
├─────────────────────────────────────────────────────┤
│                 Storage Layer                       │
│  ┌──────────────────────────────────────────────┐  │
│  │  SQLite (v1.0) → Postgres/Graph DB (future)  │  │
│  │  Tables: nodes, edges, node_history,         │  │
│  │          edge_history, schema_registry       │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

---

## 3. Data Model

### 3.1 Nodes Table

Every entity in the system is a node.

```sql
CREATE TABLE nodes (
  id                TEXT PRIMARY KEY,  -- UUIDv4
  node_type         TEXT NOT NULL,     -- "task", "plan", "approval", etc.
  schema_layer      TEXT NOT NULL DEFAULT 'pm_core',
  title             TEXT NOT NULL,
  description       TEXT,
  status            TEXT NOT NULL,     -- valid values per node_type
  metadata          TEXT,              -- JSON, extensible properties
  created_by        TEXT NOT NULL REFERENCES nodes(id),
  created_at        TEXT NOT NULL,     -- ISO 8601 UTC
  updated_at        TEXT NOT NULL,
  deleted_at        TEXT,              -- soft delete only
  version           INTEGER NOT NULL DEFAULT 1
);

-- Indexes
CREATE INDEX idx_nodes_type ON nodes(node_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_nodes_type_status ON nodes(node_type, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_nodes_created_by ON nodes(created_by) WHERE deleted_at IS NULL;
```

**Rules:**
- IDs are UUIDv4, never auto-increment
- All timestamps are UTC ISO 8601
- Soft delete only — `deleted_at IS NULL` means active
- Every mutation increments `version` and creates history record
- `metadata` JSON stores domain-specific fields without schema changes

### 3.2 Edges Table

All relationships between nodes are explicit, typed, weighted edges.

```sql
CREATE TABLE edges (
  id                TEXT PRIMARY KEY,  -- UUIDv4
  edge_type         TEXT NOT NULL,     -- "assigned_to", "depends_on", etc.
  source_node_id    TEXT NOT NULL REFERENCES nodes(id),
  target_node_id    TEXT NOT NULL REFERENCES nodes(id),
  schema_layer      TEXT NOT NULL DEFAULT 'pm_core',
  weight            REAL NOT NULL DEFAULT 1.0,  -- 0.0 to 1.0
  weight_metadata   TEXT,              -- JSON, weight calculation breakdown
  directionality    TEXT NOT NULL DEFAULT 'directed',  -- "directed" | "bidirectional"
  metadata          TEXT,              -- JSON, edge-specific properties
  created_by        TEXT NOT NULL REFERENCES nodes(id),
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL,
  deleted_at        TEXT,
  version           INTEGER NOT NULL DEFAULT 1,
  
  -- No duplicate active edges of same type between same nodes
  UNIQUE(source_node_id, target_node_id, edge_type) 
    WHERE deleted_at IS NULL
);

-- Indexes
CREATE INDEX idx_edges_source ON edges(source_node_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_edges_target ON edges(target_node_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_edges_type ON edges(edge_type) WHERE deleted_at IS NULL;

-- Prevent self-referencing edges
CHECK (source_node_id != target_node_id)
```

**Rules:**
- Edges connect exactly two nodes
- Weight semantics: 0.0 = weak/optional, 1.0 = strong/required
- Self-referencing edges prohibited

### 3.3 History Tables

Every mutation creates an immutable history record. Non-negotiable for audit compliance.

```sql
CREATE TABLE node_history (
  id                TEXT PRIMARY KEY,
  node_id           TEXT NOT NULL,     -- which node changed
  version           INTEGER NOT NULL,  -- version after this change
  operation         TEXT NOT NULL,     -- "create" | "update" | "delete"
  changed_by        TEXT NOT NULL,     -- user or agent who made change
  changed_at        TEXT NOT NULL,
  change_reason     TEXT,              -- optional explanation
  before_state      TEXT,              -- full JSON snapshot before (null for create)
  after_state       TEXT NOT NULL      -- full JSON snapshot after
);

CREATE TABLE edge_history (
  id                TEXT PRIMARY KEY,
  edge_id           TEXT NOT NULL,
  version           INTEGER NOT NULL,
  operation         TEXT NOT NULL,
  changed_by        TEXT NOT NULL,
  changed_at        TEXT NOT NULL,
  change_reason     TEXT,
  before_state      TEXT,
  after_state       TEXT NOT NULL
);

CREATE INDEX idx_node_history_node ON node_history(node_id);
CREATE INDEX idx_edge_history_edge ON edge_history(edge_id);
```

**Rules:**
- History records are append-only — no updates, no deletes
- `changed_by` is always populated (no anonymous mutations)
- Complete before/after state captured as JSON

---

## 4. Node Types (PM Core Layer)

### 4.1 Task

The fundamental unit of work.

```
node_type: "task"

status values:
  - backlog
  - in_progress  
  - review
  - done
  - blocked
  - cancelled

metadata schema:
{
  "priority": "low" | "medium" | "high" | "critical",
  "acceptance_criteria": [string],
  "due_date": "ISO 8601 date" | null,
  "estimated_hours": number | null,
  "tags": [string]
}
```

### 4.2 Plan

An agent's proposed approach to completing a task. Requires human approval.

```
node_type: "plan"

status values:
  - pending_approval
  - approved
  - rejected
  - superseded
  - expired

metadata schema:
{
  "steps": [
    {
      "order": number,
      "action": string,
      "expected_outcome": string
    }
  ],
  "rationale": string,
  "estimated_duration": string | null,
  "risks": [string] | null
}
```

### 4.3 Approval

A human decision on a plan or other reviewable entity.

```
node_type: "approval"

status values:
  - approved
  - rejected
  - changes_requested

metadata schema:
{
  "decision": "approved" | "rejected" | "changes_requested",
  "rationale": string,
  "authority_level": string,
  "conditions": [string] | null
}
```

### 4.4 Run

An execution of an approved plan. Contains logs and artifacts.

```
node_type: "run"

status values:
  - pending
  - running
  - completed
  - failed
  - cancelled

metadata schema:
{
  "started_at": "ISO 8601" | null,
  "completed_at": "ISO 8601" | null,
  "logs": [
    {
      "timestamp": "ISO 8601",
      "level": "info" | "warn" | "error",
      "message": string,
      "data": object | null
    }
  ],
  "exit_code": number | null,
  "error_message": string | null
}
```

### 4.5 Verification

Evidence that acceptance criteria were met.

```
node_type: "verification"

status values:
  - pending
  - verified
  - failed
  - waived

metadata schema:
{
  "criterion": string,
  "evidence_type": "artifact" | "run_output" | "manual_check" | "external",
  "evidence_reference": string,
  "notes": string | null
}
```

### 4.6 Artifact

A file, document, or output produced by work.

```
node_type: "artifact"

status values:
  - draft
  - final
  - archived

metadata schema:
{
  "file_path": string | null,
  "url": string | null,
  "mime_type": string | null,
  "size_bytes": number | null,
  "checksum": string | null
}
```

### 4.7 User

A human actor in the system.

```
node_type: "user"

status values:
  - active
  - inactive
  - suspended

metadata schema:
{
  "email": string,
  "role": string,
  "authority_levels": [string],
  "preferences": object | null
}
```

### 4.8 Agent

An AI actor in the system.

```
node_type: "agent"

status values:
  - active
  - inactive
  - error

metadata schema:
{
  "agent_type": string,
  "capabilities": [string],
  "webhook_url": string | null,
  "config": object | null,
  "last_seen": "ISO 8601" | null
}
```

### 4.9 DecisionTrace

Record of a significant decision for audit and precedent.

```
node_type: "decision_trace"

status values:
  - recorded
  - referenced
  - superseded

metadata schema:
{
  "decision_type": string,
  "alternatives_considered": [
    {
      "option": string,
      "pros": [string],
      "cons": [string],
      "rejected_reason": string | null
    }
  ],
  "chosen_option": string,
  "rationale": string,
  "outcome": string | null,
  "lessons_learned": string | null
}
```

### 4.10 Precedent

A reusable decision pattern that agents can reference.

```
node_type: "precedent"

status values:
  - active
  - deprecated
  - superseded

metadata schema:
{
  "pattern": string,
  "context": string,
  "guidance": string,
  "exceptions": [string] | null,
  "source_decisions": [string]  -- IDs of decision_trace nodes
}
```

---

## 5. Edge Types (PM Core Layer)

### 5.1 Work Relationships

| Edge Type | Source → Target | Description |
|-----------|-----------------|-------------|
| `parent_of` | Task → Task | Parent task contains subtask |
| `depends_on` | Task → Task | Source blocked until target complete |
| `blocks` | Task → Task | Source blocks target (inverse of depends_on) |
| `related_to` | Task → Task | Informational relationship |

### 5.2 Assignment & Ownership

| Edge Type | Source → Target | Description |
|-----------|-----------------|-------------|
| `assigned_to` | Task → User/Agent | Who is responsible for this task |
| `created_by` | Any → User/Agent | Who created this entity |
| `owned_by` | Any → User | Ultimate owner/approver |

### 5.3 Plan & Approval Flow

| Edge Type | Source → Target | Description |
|-----------|-----------------|-------------|
| `has_plan` | Task → Plan | Task has proposed plan |
| `proposed_by` | Plan → Agent | Agent that created the plan |
| `approval_of` | Approval → Plan | Approval decision for plan |
| `approved_by` | Approval → User | User who made approval decision |
| `supersedes` | Plan → Plan | New plan replaces old plan |

### 5.4 Execution & Evidence

| Edge Type | Source → Target | Description |
|-----------|-----------------|-------------|
| `has_run` | Task → Run | Task has execution run |
| `executed_plan` | Run → Plan | Which plan the run executed |
| `executed_by` | Run → Agent | Agent that performed the run |
| `produced` | Run → Artifact | Artifact created by run |
| `has_verification` | Task → Verification | Task has verification record |
| `evidenced_by` | Verification → Run/Artifact | What proves the verification |
| `verified_by` | Verification → User/Agent | Who verified |

### 5.5 Decision & Precedent

| Edge Type | Source → Target | Description |
|-----------|-----------------|-------------|
| `has_decision` | Any → DecisionTrace | Entity has recorded decision |
| `references_precedent` | DecisionTrace → Precedent | Decision used this precedent |
| `derived_from` | Precedent → DecisionTrace | Precedent extracted from decision |

---

## 6. API Endpoints

### 6.1 Node CRUD

```
POST   /api/nodes                 Create node
GET    /api/nodes/:id             Get node by ID
GET    /api/nodes                 List nodes (with filters)
PATCH  /api/nodes/:id             Update node
DELETE /api/nodes/:id             Soft delete node

Query parameters for GET /api/nodes:
  - node_type: filter by type
  - status: filter by status
  - created_by: filter by creator
  - limit: pagination limit (default 50, max 200)
  - offset: pagination offset
  - include_deleted: boolean (default false)
```

### 6.2 Edge CRUD

```
POST   /api/edges                 Create edge
GET    /api/edges/:id             Get edge by ID
GET    /api/edges                 List edges (with filters)
PATCH  /api/edges/:id             Update edge
DELETE /api/edges/:id             Soft delete edge

Query parameters for GET /api/edges:
  - edge_type: filter by type
  - source_node_id: filter by source
  - target_node_id: filter by target
  - min_weight: minimum weight threshold
  - limit, offset, include_deleted: as above
```

### 6.3 Traversal

```
POST /api/traverse
Body:
{
  "start_node_id": "uuid",
  "direction": "outgoing" | "incoming" | "both",
  "edge_types": ["assigned_to", "depends_on"] | null,  // null = all types
  "node_types": ["task", "plan"] | null,               // filter result nodes
  "max_depth": 3,
  "min_weight": 0.5 | null,
  "include_paths": boolean  // return full paths or just nodes
}

Response:
{
  "nodes": [...],
  "edges": [...],
  "paths": [...] | null
}
```

### 6.4 History

```
GET /api/nodes/:id/history        Get node change history
GET /api/edges/:id/history        Get edge change history

Query parameters:
  - from: ISO 8601 start date
  - to: ISO 8601 end date
  - operation: filter by operation type
  - changed_by: filter by actor
```

### 6.5 Specialized Queries

```
POST /api/query/impact
  Given a node, find all downstream affected nodes
  Body: { "node_id": "uuid", "max_depth": 5 }

POST /api/query/path
  Find path(s) between two nodes
  Body: { "from_id": "uuid", "to_id": "uuid", "max_paths": 3 }

POST /api/query/subgraph
  Extract local subgraph around seed nodes
  Body: { "seed_ids": ["uuid"], "depth": 2 }
```

---

## 7. Workflows

### 7.1 Standard Task Lifecycle

```
1. Task Created (status: backlog)
   → Node created by user
   → Edge: created_by (Task → User)

2. Task Assigned (status: backlog → in_progress)
   → Edge: assigned_to (Task → Agent)
   
3. Agent Proposes Plan
   → Plan node created (status: pending_approval)
   → Edge: has_plan (Task → Plan)
   → Edge: proposed_by (Plan → Agent)

4. Human Reviews Plan
   → Approval node created
   → Edge: approval_of (Approval → Plan)
   → Edge: approved_by (Approval → User)
   → Plan status → approved | rejected | changes_requested

5. Agent Executes (if approved)
   → Run node created (status: running)
   → Edge: has_run (Task → Run)
   → Edge: executed_plan (Run → Plan)
   → Edge: executed_by (Run → Agent)
   → Logs stream into run metadata
   → Run status → completed | failed

6. Evidence Captured
   → Artifact nodes for outputs
   → Edge: produced (Run → Artifact)

7. Verification
   → Verification node per acceptance criterion
   → Edge: has_verification (Task → Verification)
   → Edge: evidenced_by (Verification → Run/Artifact)

8. Task Complete (status: review → done)
   → All verifications pass
   → Human final sign-off
```

### 7.2 Agent Permission Model

| Action | Allowed | Notes |
|--------|---------|-------|
| Read any node/edge | ✅ Yes | Full graph traversal |
| Create Plan | ✅ Yes | Status = pending_approval |
| Update Plan | ✅ Yes | Only own plans, only while pending |
| Create Run | ✅ Yes | Only for approved plans |
| Update Run | ✅ Yes | Only own runs (logging) |
| Create Artifact | ✅ Yes | During run execution |
| Create/Update Task | ❌ No | Requires human |
| Create Approval | ❌ No | Requires human |
| Delete anything | ❌ No | Requires human |

---

## 8. UI Requirements

### 8.1 Kanban Board View

Standard board showing tasks by status column.

```
┌─────────────┬─────────────┬─────────────┬─────────────┐
│   Backlog   │ In Progress │   Review    │    Done     │
├─────────────┼─────────────┼─────────────┼─────────────┤
│ ┌─────────┐ │ ┌─────────┐ │ ┌─────────┐ │ ┌─────────┐ │
│ │ Task 1  │ │ │ Task 3  │ │ │ Task 5  │ │ │ Task 7  │ │
│ │ @agent  │ │ │ @agent  │ │ │ @user   │ │ │ ✓ done  │ │
│ └─────────┘ │ │ 🔄 plan │ │ └─────────┘ │ └─────────┘ │
│ ┌─────────┐ │ └─────────┘ │             │             │
│ │ Task 2  │ │ ┌─────────┐ │             │             │
│ │ @user   │ │ │ Task 4  │ │             │             │
│ └─────────┘ │ │ ⏳ run  │ │             │             │
│             │ └─────────┘ │             │             │
└─────────────┴─────────────┴─────────────┴─────────────┘
```

**Features:**
- Drag-drop to change status (human tasks only)
- Visual indicators: assignee (user vs agent), pending plan, active run
- Click to open detail panel
- Filter by assignee, priority, tags
- Create task button

### 8.2 Graph View

Interactive network visualization using React Flow.

**Features:**
- Force-directed layout with manual adjustment
- Node types have distinct shapes/colors:
  - Task: rectangle
  - Plan: rounded rectangle
  - Approval: diamond
  - Run: hexagon
  - User: circle
  - Agent: circle with robot icon
- Edge types have distinct colors/styles
- Click node to select, show detail panel
- Double-click to focus (center + zoom)
- Filter controls: node types, edge types, status
- Minimap for navigation

### 8.3 Detail Panel

Slide-out panel showing selected node details.

**Sections:**
- Header: type icon, title, status badge
- Description
- Metadata (rendered based on node_type)
- Relationships: connected nodes grouped by edge type
- History: timeline of changes
- Actions: buttons based on node type and user permissions

---

## 9. Bootstrap Data

On first run, create:

```sql
-- System user (for system-initiated changes)
INSERT INTO nodes (id, node_type, schema_layer, title, status, metadata, created_by, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'user',
  'pm_core',
  'System',
  'active',
  '{"email": "system@local", "role": "system", "authority_levels": ["system"]}',
  '00000000-0000-0000-0000-000000000001',
  datetime('now'),
  datetime('now')
);
```

---

## 10. Implementation Checklist

### Data Model
- [ ] `nodes` table with all fields per spec
- [ ] `edges` table with all fields per spec
- [ ] `node_history` table, append-only
- [ ] `edge_history` table, append-only
- [ ] UUIDs for all IDs
- [ ] UTC ISO 8601 timestamps
- [ ] Soft delete only (deleted_at field)
- [ ] Version increment on every mutation
- [ ] All indexes created

### API
- [ ] Node CRUD endpoints
- [ ] Edge CRUD endpoints
- [ ] Traversal endpoint
- [ ] History endpoints
- [ ] All mutations create history records
- [ ] All mutations require `changed_by`

### UI
- [ ] Kanban board with 4 status columns
- [ ] Task cards with assignee, status indicators
- [ ] Task detail panel
- [ ] Create task form
- [ ] Graph view with React Flow
- [ ] Node selection and detail display
- [ ] Filter controls

### Governance
- [ ] Agent plans require human approval
- [ ] Approvals are recorded as nodes
- [ ] All actions attributed to user or agent
- [ ] No hard deletes anywhere

---

## 11. What v1.0 Does NOT Include

Explicit scope boundaries:

- **No graph database** — SQLite with relational tables
- **No real-time sync** — polling or manual refresh
- **No multi-tenant** — single deployment
- **No domain extensions** — only pm_core layer
- **No temporal playback UI** — history is captured but no timeline scrubber
- **No computed weights** — weights are manually set
- **No cluster detection** — basic traversal only
- **No file storage backend** — artifacts reference paths/URLs only

---

*Built for governance. Ready for agents.* 🦞
