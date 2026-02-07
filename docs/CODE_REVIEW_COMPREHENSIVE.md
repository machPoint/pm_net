# Comprehensive Code Review: DELTA_REQ Platform
## Agent/Network/Graph Integration Analysis

**Date:** February 6, 2026
**Reviewer:** Claude (Sonnet 4.5)
**Scope:** Full platform integration review focusing on agent governance (Chelex), network graph layer, and cohesion across 4 platform components

---

## Executive Summary

The DELTA_REQ platform consists of **four major subsystems** that have been integrated together:

1. **OPAL_SE** - MCP server with tools, system graph, and SE domain logic
2. **CORE_UI** - Next.js frontend with API gateway
3. **Sidecars** - Microservices for connectors, domain services, and compute
4. **Chelex** - NEW agent governance layer with weighted network graph (recently added by Gemini)

**Current State:** The integration shows signs of being "held together with duct tape and hope" as you mentioned. While the individual components are well-architected in isolation, the integration points reveal architectural inconsistencies, duplicated concerns, and potential data flow issues.

**Key Findings:**
- ✅ Good separation of concerns at the macro level
- ⚠️ Network graph implementation is incomplete and disconnected
- ⚠️ Chelex agent layer lacks proper integration with system graph
- ❌ Multiple graph data models without clear boundaries
- ❌ Inconsistent data flow patterns between components
- ❌ Missing weighted edge support for agent traversal

---

## 1. System Architecture Overview

### 1.1 Component Topology

```
┌─────────────────────────────────────────────────────────────┐
│                        CORE_UI (Frontend)                    │
│  Next.js App + React Flow + UI Components                   │
│  - Trace/Impact Graphs                                       │
│  - Network Section (uses ImpactGraph - NOT network-specific) │
│  - Chelex Governance UI (AgentActivityGraph)                 │
└────────────┬────────────────────────────────────────────────┘
             │ HTTP/WS
             ▼
┌─────────────────────────────────────────────────────────────┐
│                    OPAL_SE (MCP Server)                      │
│  - MCP Protocol Handler                                      │
│  - System Graph Service (nodes + edges)                      │
│  - SE Tools (21 tools registered)                            │
│  - Chelex Service (8 MCP tools for agents)                   │
│  - Event Log + Rule Engine                                   │
└────────┬─────────────────────────────────┬──────────────────┘
         │                                 │
         ▼                                 ▼
┌────────────────────┐          ┌─────────────────────────────┐
│   Sidecars/        │          │  Database (SQLite/Postgres) │
│   Connectors       │          │  - system_nodes             │
│  - Jira            │          │  - system_edges             │
│  - Jama            │          │  - chelex_* (7 tables)      │
│  - Outlook         │          │  - event_log                │
│  - Lessons         │          └─────────────────────────────┘
└────────────────────┘
```

### 1.2 Architectural Issues Identified

#### Issue #1: Graph Model Fragmentation
**Severity:** HIGH

There are **multiple graph models** without clear integration:

1. **System Graph** (`system_nodes` + `system_edges`)
   - NodeTypes: Requirement, Test, Component, Interface, Issue, ECN, etc.
   - RelationTypes: TRACES_TO, VERIFIED_BY, ALLOCATED_TO, INTERFACES_WITH, etc.
   - **No weight support on edges**

2. **Chelex Graph** (implied by `planned_traversal` and `actual_traversal`)
   - Stored as JSON in `chelex_plans` and `chelex_runs` tables
   - **Not integrated with system_edges**
   - No clear node type extension

3. **Network Graph** (mentioned in specs but **NOT IMPLEMENTED**)
   - NETWORK_LAYER_MASTER_SPEC.md describes NetworkDevice, NetworkInterface, etc.
   - **These node types are NOT in the NodeType enum** (see `apps/OPAL_SE/src/types/se.ts:15-25`)
   - No evidence of network-specific edges

4. **UI Graph Models** (React Flow)
   - ImpactGraph (used for both impact analysis AND network visualization)
   - TraceGraph (for trace analysis)
   - AgentActivityGraph (Chelex workflow visualization)

**Problem:** The network layer spec says "extend the existing node typing" but this has **not been done**. The NetworkSection component just reuses ImpactGraph with mock data.

---

## 2. Detailed Component Analysis

### 2.1 OPAL_SE (Backend/MCP Server)

#### Strengths ✅
- Clean MCP protocol implementation
- Well-organized service layer (`services/se/`)
- Comprehensive system graph CRUD operations
- Strong type definitions
- Good logging and error handling
- Rule engine for consistency checks

#### Issues ⚠️❌

**2.1.1 Missing Network Node Types**
```typescript
// apps/OPAL_SE/src/types/se.ts
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
  | 'LibraryItem';
// ❌ NO NetworkDevice, NetworkInterface, Subnet, etc.
```

**Expected (per spec):**
```typescript
export type NodeType =
  // ... existing types ...
  | 'NetworkDevice'
  | 'NetworkInterface'
  | 'Subnet'
  | 'VLAN'
  | 'NetworkService';
```

**2.1.2 Missing Edge Weights**
```typescript
// apps/OPAL_SE/src/types/se.ts
export interface SystemEdge {
  id: string;
  project_id: string;
  from_node_id: string;
  to_node_id: string;
  relation_type: RelationType;
  source_system: string;
  rationale?: string;
  metadata?: Record<string, any>; // ⚠️ Weight could be in metadata, but not formalized
  created_at: Date;
  updated_at: Date;
  // ❌ NO weight field
  // ❌ NO directionality field
  // ❌ NO traversal_cost field for agents
}
```

For autonomous agent traversal, you need:
```typescript
export interface SystemEdge {
  // ... existing fields ...
  weight?: number;           // For weighted graph algorithms
  bidirectional?: boolean;   // Can agents traverse both ways?
  traversal_cost?: number;   // Computational cost for agent movement
  bandwidth?: number;        // For network edges
  confidence?: number;       // Probabilistic edges
}
```

**2.1.3 Chelex Integration Gaps**

The Chelex service (`chelexService.ts`) implements 8 MCP tools for agents:
- checkAssignedTasks
- getTaskContext
- submitPlan
- checkPlanStatus
- startRun
- logDecision
- completeTask
- queryPrecedents

**Problem:** These tools interact with the system graph (via `getSystemSlice`), but:
1. No formalized "agent node" concept in the graph
2. `planned_traversal` and `actual_traversal` are opaque JSON blobs
3. No graph-based path planning utilities
4. No integration with a pathfinding algorithm (Dijkstra, A*, etc.)

**2.1.4 Database Schema Analysis**

**System Graph Tables** (from migration `20250117000001_add_system_graph.js`):
```sql
system_nodes (id, project_id, type, name, description,
              external_refs, subsystem, status, owner, metadata,
              created_at, updated_at)

system_edges (id, project_id, from_node_id, to_node_id,
              relation_type, source_system, rationale, metadata,
              created_at, updated_at)
```
- ✅ Good normalization
- ❌ No edge weight column
- ❌ No agent-specific fields

**Chelex Tables** (from migration `20260206140000_create_chelex_schema.js`):
```sql
chelex_tasks (context_node_id -> system_nodes)
chelex_plans (planned_traversal TEXT)
chelex_runs (actual_traversal TEXT)
```
- ✅ Links to system_nodes via context_node_id
- ⚠️ Graph traversal stored as opaque JSON
- ❌ No traversal history table
- ❌ No edge usage analytics

---

### 2.2 CORE_UI (Frontend)

#### Strengths ✅
- Modern Next.js architecture
- React Flow for graph visualization
- Clean component structure
- Responsive UI with Tailwind

#### Issues ⚠️❌

**2.2.1 Network Section Confusion**
```tsx
// apps/CORE_UI/frontend/src/components/NetworkSection.tsx
export default function NetworkSection() {
  return (
    <ImpactGraph
      impactNodes={mockImpactNodes}  // ❌ Uses impact graph nodes
      selectedNode={selectedNode}
      onNodeClick={handleNodeClick}
    />
  );
}
```

**Problem:** The "Network Graph" section doesn't actually display network topology. It's using the **ImpactGraph** component with mock data that represents requirement impacts, not network devices.

**What it SHOULD be doing:**
- Fetching network nodes from OPAL_SE (NetworkDevice, NetworkInterface, etc.)
- Displaying network topology with links/interfaces
- Showing network-specific metadata (IP, hostname, bandwidth, etc.)

**2.2.2 Missing Network Integration**

No API calls to fetch real network data:
```tsx
// Expected but missing:
const { data: networkTopology } = useSWR('/api/network/topology');
```

The mock data in NetworkSection.tsx has nodes like:
- "REQ-FCS-001 Flight Control Update" (a requirement)
- "Actuator Control Module" (a component)

These are **NOT network devices**. This is a copy-paste from impact analysis.

**2.2.3 Chelex UI Integration**

The governance page (`apps/CORE_UI/frontend/src/app/governance/page.tsx`) is better integrated:
- ✅ Uses mock data with proper Chelex structure
- ✅ Visualizes task → plan → run flow
- ⚠️ No real API integration (comments say "fetch from /api/chelex/activity")
- ❌ Graph traversal path not visualized

**2.2.4 Graph Component Reuse Issues**

Three separate graph components:
1. **ImpactGraph** - Requirements impact analysis (React Flow)
2. **TraceGraph** - Trace analysis (React Flow)
3. **AgentActivityGraph** - Chelex workflow (React Flow)

**Problem:** All three use React Flow but have incompatible node/edge schemas. No shared graph utilities or layouts.

**Recommendation:** Create a unified graph component:
```tsx
// Proposed: UnifiedGraphVisualization.tsx
interface GraphNode {
  id: string;
  type: NodeType; // From OPAL_SE types
  data: any;
  position?: { x: number; y: number };
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: RelationType;
  weight?: number;
  metadata?: any;
}

export function UnifiedGraph({
  nodes,
  edges,
  renderMode: 'network' | 'impact' | 'trace' | 'agent-activity',
  onNodeClick,
  layout: 'force-directed' | 'hierarchical' | 'manual'
}) { ... }
```

---

### 2.3 Sidecars & Connectors

#### Strengths ✅
- Clean separation from core platform
- Well-documented in `config/sidecars.json`
- RESTful APIs
- Clear ownership boundaries

#### Issues ⚠️❌

**2.3.1 No Network Data Sidecar**

From NETWORK_LAYER_MASTER_SPEC.md:
> "Add a connector sidecar (or extend an existing one) for network sources, e.g.:
> - CMDB
> - network controller APIs
> - asset inventory tools"

**Finding:** This sidecar **does not exist**. The `config/sidecars.json` lists 9 sidecars:
- outlook-connector
- jira-connector
- jama-connector
- windchill-connector
- ms-tasks-connector
- ims-connector
- lessons-service
- workload-service
- stem-python-sidecar

**Missing:** `network-connector` or `cmdb-connector`

**2.3.2 FDS (Fake Data Server) Network Support**

The FDS is meant to provide mock data for development. There's no evidence of network topology mock data being served by FDS.

**Expected:** `FDS/routes/network-topology.js` or similar endpoint

---

### 2.4 Chelex Agent Governance Layer

#### Strengths ✅
- Well-designed task/plan/run/verification workflow
- MCP tools for agent autonomy
- Human-in-the-loop approval mechanism
- Decision trace logging
- Precedent learning

#### Critical Gaps ❌

**2.4.1 No Graph Traversal Algorithm**

Agents need to traverse the weighted graph, but there's no implementation of:
- Dijkstra's algorithm
- A* pathfinding
- Breadth-first search with weights
- Graph path cost calculation

**Current State:**
```typescript
// apps/OPAL_SE/src/services/chelexService.ts
export const submitPlan = {
  handler: async (args: any, context: MCPContext) => {
    await db('chelex_plans').insert({
      planned_traversal: args.planned_traversal
        ? JSON.stringify(args.planned_traversal)
        : null,  // ❌ Just storing opaque JSON
    });
  }
};
```

**What's Missing:** A graph service function like:
```typescript
async function planGraphTraversal(
  startNodeId: string,
  goalNodeId: string,
  constraints: {
    allowedNodeTypes?: NodeType[];
    allowedRelationTypes?: RelationType[];
    maxWeight?: number;
    maxDepth?: number;
  }
): Promise<{
  path: string[];           // Node IDs
  edges: string[];          // Edge IDs
  totalWeight: number;
  estimatedCost: number;
}> {
  // Dijkstra or A* implementation here
}
```

**2.4.2 Agent Identity in Graph**

Agents (like "OpenClaw") are referenced in Chelex tables but have no node representation:
- No `Agent` node type
- No edges like `ASSIGNED_TO` or `EXECUTED_BY`
- No agent capability metadata

**Proposed Addition:**
```typescript
export type NodeType =
  // ... existing types ...
  | 'Agent'
  | 'AgentCapability';

// Example agent node
{
  id: 'agent-openclaw-1',
  type: 'Agent',
  name: 'OpenClaw',
  metadata: {
    capabilities: ['code-analysis', 'refactoring', 'testing'],
    version: '1.0',
    status: 'active'
  }
}
```

**2.4.3 Weighted Graph Construction**

For agents to make intelligent traversal decisions, edges need weights. Current issues:

1. **No weight field** in `system_edges` table
2. **No weight calculation** based on:
   - Relationship strength (confidence)
   - Traversal cost (computational expense)
   - Domain-specific costs (e.g., crossing subsystem boundaries)

**Example: Adding weights**
```typescript
interface WeightedEdge extends SystemEdge {
  weight: number;  // Base weight
  dynamicWeight?: (context: AgentContext) => number;  // Context-sensitive
}

// Weight calculation strategy
function calculateEdgeWeight(edge: SystemEdge): number {
  let weight = 1.0; // Default

  // Increase weight for cross-subsystem edges
  if (edge.metadata?.crossesSubsystem) weight *= 2.0;

  // Decrease weight for high-confidence relationships
  if (edge.metadata?.confidence > 0.8) weight *= 0.5;

  // Increase weight for "BLOCKS" relationships (avoid if possible)
  if (edge.relation_type === 'BLOCKS') weight *= 10.0;

  return weight;
}
```

---

## 3. Integration Issues & Data Flow Problems

### 3.1 Frontend → Backend Communication

**Current Patterns:**

1. **REST API** (via CORE_UI backend to OPAL_SE)
   - `/api/requirements/*` (CORE_UI backend proxy)
   - Direct calls to OPAL_SE REST endpoints

2. **MCP over WebSocket**
   - Tools called from frontend via MCP protocol
   - Chelex tools for agents

**Issue:** Inconsistent patterns. Some features use REST, some use MCP, no clear decision criteria.

**Example:**
```typescript
// apps/CORE_UI/frontend/src/app/api/requirements/route.ts
// This is a Next.js API route that proxies to OPAL_SE
export async function GET(request: Request) {
  const response = await fetch('http://localhost:3001/api/se/nodes');
  // ...
}
```

But Chelex governance page wants to:
```typescript
// Expected in governance/page.tsx
const { data } = useSWR('/api/chelex/activity');
```

Yet the actual endpoint is:
```typescript
// apps/OPAL_SE/src/routes/chelex-admin.ts
router.get('/activity', async (req, res) => { ... });
```

**Problem:** Frontend needs to call `http://localhost:3001/api/chelex/activity` directly, or have a Next.js proxy route.

### 3.2 Graph Data Synchronization

**Issue:** No mechanism to keep UI graph state synchronized with backend graph changes.

When an agent:
1. Executes a plan
2. Modifies the graph (creates nodes/edges)
3. Completes verification

The UI doesn't know about these changes unless:
- User manually refreshes
- WebSocket notifications are sent (not implemented)

**Recommendation:** Implement graph change events
```typescript
// OPAL_SE should broadcast:
{
  type: 'graph.node.created',
  payload: { nodeId: '...', nodeType: 'Component', ... }
}

{
  type: 'graph.edge.created',
  payload: { edgeId: '...', from: '...', to: '...', weight: 0.8 }
}

// Frontend subscribes and updates local state
```

### 3.3 Chelex ↔ System Graph Integration

**Current:** Loose coupling via `context_node_id` in `chelex_tasks`

```typescript
// apps/OPAL_SE/src/services/chelexService.ts
const task = await db('chelex_tasks')
  .where({ id: args.task_id })
  .first();

if (task.context_node_id) {
  const slice = await seToolsService.getSystemSlice({
    project_id: task.project_id,
    start_node_ids: [task.context_node_id],
    max_depth: 2
  });
}
```

**Problem:** Agents get a "system slice" but then what?
1. No utilities to identify traversable edges
2. No scoring function for path selection
3. No validation that planned path is valid
4. No update to graph during traversal

---

## 4. Network Graph Implementation Status

### 4.1 Specification vs Reality

**From docs/NETWORK_LAYER_MASTER_SPEC.md:**

> "The Network Layer is a typed subgraph inside OPAL_SE's system graph that models:
> - network devices and logical constructs (subnets, VLANs, links)
> - relationships between devices (interfaces, routes, dependencies)
> - optional coupling edges to SE artifacts"

**Reality Check:**

| Specification Item | Status | Location |
|-------------------|--------|----------|
| NetworkDevice node type | ❌ Missing | Should be in `types/se.ts` |
| NetworkInterface node type | ❌ Missing | Should be in `types/se.ts` |
| Subnet/VLAN node type | ❌ Missing | Should be in `types/se.ts` |
| NetworkService node type | ❌ Missing | Should be in `types/se.ts` |
| Network-specific edges | ❌ Missing | No CONNECTED_TO relation type |
| Network ingestion | ❌ Missing | No sidecar or FDS endpoint |
| Network tools | ❌ Missing | No getNetworkTopology tool |
| UI Network visualization | ⚠️ Broken | NetworkSection uses wrong component |

### 4.2 What Gemini Actually Added

Based on file inspection, Gemini's contribution appears to be:
1. ✅ Chelex governance database schema (7 tables)
2. ✅ Chelex MCP tools (8 tools in `chelexService.ts`)
3. ✅ Chelex admin REST API (`routes/chelex-admin.ts`)
4. ✅ Chelex UI (governance page + components)
5. ⚠️ NetworkSection component (but using wrong graph type)
6. ❌ Actual weighted network graph layer (incomplete)

### 4.3 What's Missing for Network Layer

To complete the network graph implementation:

**Backend (OPAL_SE):**
1. Extend `NodeType` enum with network types
2. Add network-specific `RelationType` values (CONNECTED_TO, ROUTES_TO)
3. Add edge weight field to `system_edges` table
4. Implement network ingestion endpoint
5. Create network-specific MCP tools:
   - `getNetworkTopology`
   - `traceNetworkPath`
   - `simulateOutageImpact`

**Frontend (CORE_UI):**
1. Create proper NetworkGraph component
2. Implement network data fetching
3. Add network-specific node rendering (routers, switches, etc.)
4. Show bandwidth, latency, health status

**Infrastructure:**
1. Create network data sidecar or FDS endpoint
2. Provide sample network topology data
3. Document network node metadata schema

---

## 5. Agent Traversal Architecture Issues

### 5.1 Missing Pathfinding Layer

**What Agents Need:**
```
Agent Request: "Navigate from Requirement REQ-001 to affected Tests"
                     ↓
            Graph Pathfinding Service
                     ↓
      [Calculate weighted paths using Dijkstra/A*]
                     ↓
            Return traversal plan
                     ↓
          Agent executes plan
                     ↓
         Log actual traversal
                     ↓
      Update precedents / learn
```

**What's Implemented:**
```
Agent Request: "Navigate from REQ-001 to Tests"
                     ↓
           getSystemSlice(REQ-001, depth=2)
                     ↓
      Returns all nodes within 2 hops
                     ↓
      Agent gets JSON dump with no path guidance
                     ↓
              ¯\_(ツ)_/¯
```

### 5.2 Proposed Pathfinding Service

```typescript
// apps/OPAL_SE/src/services/se/pathfindingService.ts

export interface PathfindingOptions {
  algorithm: 'dijkstra' | 'astar' | 'bfs';
  allowedRelationTypes?: RelationType[];
  avoidNodeTypes?: NodeType[];
  maxWeight?: number;
  maxDepth?: number;
  heuristic?: (from: SystemNode, to: SystemNode) => number;
}

export interface GraphPath {
  nodes: SystemNode[];
  edges: SystemEdge[];
  totalWeight: number;
  steps: Array<{
    nodeId: string;
    edgeId: string;
    cumulativeWeight: number;
  }>;
}

export async function findShortestPath(
  startNodeId: string,
  targetNodeId: string,
  projectId: string,
  options: PathfindingOptions
): Promise<GraphPath | null> {
  // 1. Build adjacency list with weights
  const adjacencyList = await buildWeightedAdjacencyList(projectId, options);

  // 2. Run Dijkstra's algorithm
  const { path, distances } = dijkstra(adjacencyList, startNodeId, targetNodeId);

  // 3. Reconstruct full path with nodes and edges
  if (!path) return null;

  return reconstructGraphPath(path, distances);
}

export async function findAllPaths(
  startNodeId: string,
  targetNodeId: string,
  projectId: string,
  maxPaths: number = 5
): Promise<GraphPath[]> {
  // K-shortest paths algorithm
}

export async function scoreTraversalPlan(
  plan: { path: string[] },
  context: AgentContext
): Promise<{
  feasible: boolean;
  estimatedCost: number;
  risks: string[];
  alternatives?: GraphPath[];
}> {
  // Evaluate if a proposed plan is valid and optimal
}
```

### 5.3 Weighted Edge Strategy

**Decision Point:** Where do edge weights come from?

**Option 1: Static Weights** (database column)
```sql
ALTER TABLE system_edges ADD COLUMN weight REAL DEFAULT 1.0;
```

**Option 2: Computed Weights** (metadata-based)
```typescript
function getEdgeWeight(edge: SystemEdge): number {
  // Base weight from metadata
  const baseWeight = edge.metadata?.weight || 1.0;

  // Adjust based on relationship type
  const typeMultiplier = {
    'TRACES_TO': 1.0,
    'VERIFIED_BY': 1.2,
    'BLOCKS': 5.0,
    'INTERFACES_WITH': 1.5
  }[edge.relation_type] || 1.0;

  return baseWeight * typeMultiplier;
}
```

**Option 3: Hybrid** (static + dynamic)
```typescript
interface EdgeWeight {
  static: number;           // From database
  dynamic: number;          // Computed at query time
  contextual: (agent: Agent) => number;  // Agent-specific
}
```

**Recommendation:** Start with Option 2 (metadata-based) for flexibility, add database column later for performance.

---

## 6. Database Schema Recommendations

### 6.1 System Graph Enhancements

**Current:**
```sql
CREATE TABLE system_nodes (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  type TEXT NOT NULL,  -- ❌ Limited to existing types
  -- ...
);

CREATE TABLE system_edges (
  id TEXT PRIMARY KEY,
  from_node_id TEXT NOT NULL,
  to_node_id TEXT NOT NULL,
  relation_type TEXT NOT NULL,
  metadata TEXT,  -- ⚠️ Weights buried in JSON
  -- ...
);
```

**Proposed:**
```sql
-- 1. Add network node types
-- (Handled by application-level enum extension)

-- 2. Add weight column
ALTER TABLE system_edges
ADD COLUMN weight REAL DEFAULT 1.0;

-- 3. Add bidirectionality flag
ALTER TABLE system_edges
ADD COLUMN bidirectional BOOLEAN DEFAULT FALSE;

-- 4. Add traversal analytics
CREATE TABLE graph_traversal_log (
  id TEXT PRIMARY KEY,
  agent_id TEXT,
  run_id TEXT,
  edge_id TEXT NOT NULL,
  traversed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  traversal_cost REAL,
  FOREIGN KEY(edge_id) REFERENCES system_edges(id),
  FOREIGN KEY(run_id) REFERENCES chelex_runs(id)
);

-- 5. Create indexed views for performance
CREATE INDEX idx_edges_from_node ON system_edges(from_node_id);
CREATE INDEX idx_edges_to_node ON system_edges(to_node_id);
CREATE INDEX idx_edges_weight ON system_edges(weight);
```

### 6.2 Chelex Schema Enhancements

**Current:**
```sql
CREATE TABLE chelex_plans (
  planned_traversal TEXT  -- ❌ Opaque JSON
);

CREATE TABLE chelex_runs (
  actual_traversal TEXT  -- ❌ Opaque JSON
);
```

**Proposed:**
```sql
-- Structured traversal tracking
CREATE TABLE chelex_plan_steps (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL,
  step_number INTEGER NOT NULL,
  start_node_id TEXT NOT NULL,
  end_node_id TEXT NOT NULL,
  edge_id TEXT,
  estimated_weight REAL,
  tool_name TEXT,
  FOREIGN KEY(plan_id) REFERENCES chelex_plans(id) ON DELETE CASCADE,
  FOREIGN KEY(start_node_id) REFERENCES system_nodes(id),
  FOREIGN KEY(end_node_id) REFERENCES system_nodes(id),
  FOREIGN KEY(edge_id) REFERENCES system_edges(id)
);

CREATE TABLE chelex_execution_steps (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  step_number INTEGER NOT NULL,
  node_visited TEXT NOT NULL,
  edge_traversed TEXT,
  actual_weight REAL,
  tool_executed TEXT,
  result TEXT,  -- JSON
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(run_id) REFERENCES chelex_runs(id) ON DELETE CASCADE,
  FOREIGN KEY(node_visited) REFERENCES system_nodes(id),
  FOREIGN KEY(edge_traversed) REFERENCES system_edges(id)
);
```

**Benefits:**
- Query-able traversal history
- Edge usage analytics
- Path comparison (planned vs actual)
- Learning from execution patterns

---

## 7. Critical Recommendations (Prioritized)

### Priority 1: CRITICAL - Foundation Fixes

#### 1.1 Complete Network Node Type Integration
**Effort:** Medium | **Impact:** Critical

**Action Items:**
1. Update `apps/OPAL_SE/src/types/se.ts`:
   ```typescript
   export type NodeType =
     | 'Requirement' | 'Test' | 'Component' | 'Interface'
     | 'Issue' | 'ECN' | 'EmailMessage' | 'Note' | 'Task' | 'LibraryItem'
     // ADD:
     | 'NetworkDevice' | 'NetworkInterface' | 'Subnet'
     | 'VLAN' | 'NetworkService';

   export type RelationType =
     | 'TRACES_TO' | 'VERIFIED_BY' | 'ALLOCATED_TO'
     | 'INTERFACES_WITH' | 'BLOCKS' | 'DERIVED_FROM' | 'REFERS_TO'
     // ADD:
     | 'CONNECTED_TO' | 'ROUTES_TO' | 'DEPENDS_ON';
   ```

2. Update database validation to accept new types
3. Create migration for existing data (if needed)

#### 1.2 Add Edge Weight Support
**Effort:** Low | **Impact:** Critical

**Action Items:**
1. Migration:
   ```sql
   ALTER TABLE system_edges ADD COLUMN weight REAL DEFAULT 1.0;
   ALTER TABLE system_edges ADD COLUMN bidirectional BOOLEAN DEFAULT FALSE;
   ```

2. Update TypeScript interface:
   ```typescript
   export interface SystemEdge {
     // ... existing fields ...
     weight: number;
     bidirectional?: boolean;
   }
   ```

3. Update `systemGraphService.ts` CRUD operations

#### 1.3 Fix NetworkSection Component
**Effort:** Low | **Impact:** High

**Current Code (WRONG):**
```tsx
// apps/CORE_UI/frontend/src/components/NetworkSection.tsx
<ImpactGraph impactNodes={mockImpactNodes} />
```

**Fixed Code:**
```tsx
'use client';
import { useState, useEffect } from 'react';
import useSWR from 'swr';
import NetworkTopologyGraph from './NetworkTopologyGraph'; // NEW

export default function NetworkSection() {
  const { data, error } = useSWR('/api/network/topology');

  if (error) return <div>Failed to load network</div>;
  if (!data) return <div>Loading...</div>;

  const networkNodes = data.nodes.map(node => ({
    id: node.id,
    type: node.type, // NetworkDevice, NetworkInterface, etc.
    label: node.name,
    metadata: node.metadata,
    position: node.metadata?.position || undefined
  }));

  const networkEdges = data.edges.map(edge => ({
    source: edge.from_node_id,
    target: edge.to_node_id,
    type: edge.relation_type,
    weight: edge.weight,
    bandwidth: edge.metadata?.bandwidth,
    status: edge.metadata?.status
  }));

  return (
    <div className="h-full flex flex-col p-6 space-y-6">
      <div className="flex flex-col space-y-2">
        <h2 className="text-2xl font-bold">Network Topology</h2>
        <p className="text-muted-foreground">
          Visualize network infrastructure and dependencies
        </p>
      </div>

      <div className="flex-1 border rounded-lg overflow-hidden">
        <NetworkTopologyGraph
          nodes={networkNodes}
          edges={networkEdges}
          onNodeClick={handleNodeClick}
        />
      </div>
    </div>
  );
}
```

### Priority 2: HIGH - Agent Intelligence

#### 2.1 Implement Graph Pathfinding
**Effort:** High | **Impact:** Critical

**Create:** `apps/OPAL_SE/src/services/se/pathfindingService.ts`

**Implementation:** Dijkstra's algorithm for weighted graphs
```typescript
import db from '../../config/database';
import { SystemNode, SystemEdge } from '../../types/se';

interface WeightedGraph {
  [nodeId: string]: Array<{
    nodeId: string;
    edgeId: string;
    weight: number;
  }>;
}

async function buildAdjacencyList(
  projectId: string,
  allowedRelations?: string[]
): Promise<WeightedGraph> {
  let query = db('system_edges')
    .where({ project_id: projectId });

  if (allowedRelations) {
    query = query.whereIn('relation_type', allowedRelations);
  }

  const edges = await query;
  const graph: WeightedGraph = {};

  for (const edge of edges) {
    const weight = edge.weight || 1.0;

    if (!graph[edge.from_node_id]) graph[edge.from_node_id] = [];
    graph[edge.from_node_id].push({
      nodeId: edge.to_node_id,
      edgeId: edge.id,
      weight
    });

    if (edge.bidirectional) {
      if (!graph[edge.to_node_id]) graph[edge.to_node_id] = [];
      graph[edge.to_node_id].push({
        nodeId: edge.from_node_id,
        edgeId: edge.id,
        weight
      });
    }
  }

  return graph;
}

export async function findShortestPath(
  startId: string,
  targetId: string,
  projectId: string
): Promise<{
  path: string[];
  totalWeight: number;
  edges: string[];
} | null> {
  const graph = await buildAdjacencyList(projectId);

  // Dijkstra's algorithm
  const distances: { [key: string]: number } = {};
  const previous: { [key: string]: { nodeId: string; edgeId: string } | null } = {};
  const unvisited = new Set<string>();

  // Initialize
  Object.keys(graph).forEach(nodeId => {
    distances[nodeId] = Infinity;
    previous[nodeId] = null;
    unvisited.add(nodeId);
  });
  distances[startId] = 0;

  while (unvisited.size > 0) {
    // Find node with minimum distance
    let currentNode: string | null = null;
    let minDistance = Infinity;
    for (const nodeId of unvisited) {
      if (distances[nodeId] < minDistance) {
        minDistance = distances[nodeId];
        currentNode = nodeId;
      }
    }

    if (currentNode === null || currentNode === targetId) break;
    if (distances[currentNode] === Infinity) break;

    unvisited.delete(currentNode);

    // Update neighbors
    const neighbors = graph[currentNode] || [];
    for (const { nodeId: neighborId, edgeId, weight } of neighbors) {
      const altDistance = distances[currentNode] + weight;
      if (altDistance < distances[neighborId]) {
        distances[neighborId] = altDistance;
        previous[neighborId] = { nodeId: currentNode, edgeId };
      }
    }
  }

  // Reconstruct path
  if (distances[targetId] === Infinity) return null;

  const path: string[] = [];
  const edges: string[] = [];
  let current: string | null = targetId;

  while (current !== null) {
    path.unshift(current);
    const prev = previous[current];
    if (prev) {
      edges.unshift(prev.edgeId);
      current = prev.nodeId;
    } else {
      current = null;
    }
  }

  return {
    path,
    totalWeight: distances[targetId],
    edges
  };
}
```

#### 2.2 Integrate Pathfinding with Chelex
**Effort:** Medium | **Impact:** High

**Update:** `apps/OPAL_SE/src/services/chelexService.ts`

```typescript
import { findShortestPath } from './se/pathfindingService';

export const submitPlan = {
  name: 'submitPlan',
  handler: async (args: any, context: MCPContext) => {
    const { task_id, goal_node_id } = args;

    // Get task context
    const task = await db('chelex_tasks').where({ id: task_id }).first();
    if (!task.context_node_id) {
      throw new Error('Task has no context node');
    }

    // Plan optimal path using graph algorithms
    const pathPlan = await findShortestPath(
      task.context_node_id,
      goal_node_id,
      task.project_id
    );

    if (!pathPlan) {
      throw new Error('No path found between context and goal');
    }

    // Generate step-by-step plan
    const steps = pathPlan.path.map((nodeId, idx) => ({
      step_number: idx + 1,
      action: `Navigate to node ${nodeId}`,
      tool: 'traverseGraphEdge',
      args: {
        from: pathPlan.path[idx - 1] || task.context_node_id,
        to: nodeId,
        edge: pathPlan.edges[idx - 1]
      },
      expected_output: `Reached node ${nodeId}`
    }));

    const planId = uuid();
    await db('chelex_plans').insert({
      id: planId,
      task_id,
      proposed_by: context.agentId,
      steps: JSON.stringify(steps),
      rationale: `Computed optimal path with total weight ${pathPlan.totalWeight}`,
      planned_traversal: JSON.stringify(pathPlan),
      status: 'pending'
    });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          plan_id: planId,
          path: pathPlan.path,
          total_weight: pathPlan.totalWeight
        })
      }]
    };
  }
};
```

### Priority 3: MEDIUM - Data & Tooling

#### 3.1 Create Network Data Pipeline
**Effort:** High | **Impact:** Medium

**Options:**
1. **FDS Mock Data** (quick, for demo)
2. **Real CMDB Connector** (production-ready)

**Quick Win: FDS Endpoint**

Create `FDS/routes/network-topology.js`:
```javascript
// Generate mock network topology
router.get('/network/topology', (req, res) => {
  const topology = {
    nodes: [
      {
        id: 'net-router-1',
        type: 'NetworkDevice',
        name: 'Core Router 1',
        metadata: {
          ip: '10.0.1.1',
          hostname: 'rtr-core-01',
          vendor: 'Cisco',
          model: 'ASR9000',
          status: 'active',
          position: { x: 400, y: 200 }
        }
      },
      {
        id: 'net-switch-1',
        type: 'NetworkDevice',
        name: 'Access Switch 1',
        metadata: {
          ip: '10.0.2.10',
          hostname: 'sw-access-01',
          vendor: 'Arista',
          model: '7050',
          status: 'active',
          position: { x: 200, y: 350 }
        }
      },
      {
        id: 'net-fw-1',
        type: 'NetworkDevice',
        name: 'Firewall 1',
        metadata: {
          ip: '10.0.0.1',
          hostname: 'fw-perimeter-01',
          vendor: 'Palo Alto',
          status: 'active',
          position: { x: 600, y: 200 }
        }
      }
    ],
    edges: [
      {
        id: 'edge-1',
        from_node_id: 'net-router-1',
        to_node_id: 'net-switch-1',
        relation_type: 'CONNECTED_TO',
        weight: 1.0,
        metadata: {
          bandwidth: '10Gbps',
          latency: '0.5ms',
          status: 'up'
        }
      },
      {
        id: 'edge-2',
        from_node_id: 'net-router-1',
        to_node_id: 'net-fw-1',
        relation_type: 'ROUTES_TO',
        weight: 1.2,
        metadata: {
          bandwidth: '40Gbps',
          latency: '0.2ms',
          status: 'up'
        }
      }
    ]
  };

  res.json(topology);
});
```

Then update OPAL_SE ingestion to pull this data.

#### 3.2 Add Network MCP Tools
**Effort:** Medium | **Impact:** Medium

**Create:** `apps/OPAL_SE/src/services/se/networkTools.ts`

```typescript
export const getNetworkTopology = {
  name: 'getNetworkTopology',
  description: 'Get network topology nodes and edges',
  inputSchema: {
    type: 'object',
    properties: {
      project_id: { type: 'string' },
      device_types: {
        type: 'array',
        items: { enum: ['NetworkDevice', 'NetworkInterface', 'Subnet'] }
      }
    },
    required: ['project_id']
  },
  handler: async (args: any) => {
    const nodes = await db('system_nodes')
      .where({ project_id: args.project_id })
      .whereIn('type', args.device_types || [
        'NetworkDevice', 'NetworkInterface', 'Subnet', 'VLAN'
      ]);

    const nodeIds = nodes.map(n => n.id);
    const edges = await db('system_edges')
      .where({ project_id: args.project_id })
      .where(function() {
        this.whereIn('from_node_id', nodeIds)
          .orWhereIn('to_node_id', nodeIds);
      });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ nodes, edges }, null, 2)
      }]
    };
  }
};

export const traceNetworkPath = {
  name: 'traceNetworkPath',
  description: 'Find network path between two devices',
  inputSchema: {
    type: 'object',
    properties: {
      project_id: { type: 'string' },
      source_device_id: { type: 'string' },
      target_device_id: { type: 'string' }
    },
    required: ['project_id', 'source_device_id', 'target_device_id']
  },
  handler: async (args: any) => {
    const path = await findShortestPath(
      args.source_device_id,
      args.target_device_id,
      args.project_id
    );

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(path, null, 2)
      }]
    };
  }
};
```

Register in `seToolsRegistration.ts`:
```typescript
import { getNetworkTopology, traceNetworkPath } from './networkTools';

export async function registerSETools(configs, wss) {
  // ... existing tools ...

  // Network tools
  toolsService.updateTool(configs, wss, 'getNetworkTopology', getNetworkTopology);
  toolsService.updateTool(configs, wss, 'traceNetworkPath', traceNetworkPath);
}
```

### Priority 4: LOW - Polish & Observability

#### 4.1 Graph Traversal Analytics Dashboard
**Effort:** Medium | **Impact:** Low

Create admin dashboard showing:
- Most traversed edges
- Agent path efficiency (planned vs actual)
- Graph hotspots (frequently accessed nodes)
- Bottleneck identification

#### 4.2 Precedent Learning Improvements
**Effort:** Medium | **Impact:** Medium

Enhance `chelex_precedents` to automatically learn from successful runs:
```typescript
export async function recordPrecedent(runId: string) {
  const run = await db('chelex_runs').where({ id: runId }).first();
  const plan = await db('chelex_plans').where({ id: run.plan_id }).first();
  const task = await db('chelex_tasks').where({ id: run.task_id }).first();

  // Extract pattern
  const pattern = extractTaskPattern(task);

  // Check if precedent exists
  const existing = await db('chelex_precedents')
    .where({ task_pattern: pattern })
    .first();

  if (existing) {
    // Update success count
    await db('chelex_precedents')
      .where({ id: existing.id })
      .increment('success_count', 1)
      .update({
        avg_completion_time: (existing.avg_completion_time * existing.success_count + run.completion_time) / (existing.success_count + 1),
        last_used_at: new Date()
      });
  } else {
    // Create new precedent
    await db('chelex_precedents').insert({
      id: uuid(),
      task_pattern: pattern,
      plan_template: plan.steps,
      success_count: 1,
      avg_completion_time: run.completion_time,
      created_from_run_id: runId
    });
  }
}
```

---

## 8. Architectural Recommendations

### 8.1 Unified Graph Service

**Problem:** Graph operations scattered across:
- `systemGraphService.ts` (CRUD)
- `seToolsService.ts` (SE-specific queries)
- `chelexService.ts` (agent context)
- Individual tool handlers

**Recommendation:** Create a unified graph service layer:

```
apps/OPAL_SE/src/services/graph/
├── core/
│   ├── nodes.ts           # Node CRUD
│   ├── edges.ts           # Edge CRUD
│   └── types.ts           # Shared types
├── algorithms/
│   ├── pathfinding.ts     # Dijkstra, A*, BFS
│   ├── traversal.ts       # DFS, BFS, topological sort
│   ├── centrality.ts      # PageRank, betweenness
│   └── clustering.ts      # Community detection
├── queries/
│   ├── slice.ts           # Get subgraph slices
│   ├── trace.ts           # Impact/trace analysis
│   └── search.ts          # Graph search utilities
└── index.ts               # Public API
```

**Benefits:**
- Centralized graph logic
- Reusable algorithms
- Easier testing
- Performance optimization in one place

### 8.2 Event-Driven Architecture

**Current:** Polling and manual refreshes

**Proposed:** Event-driven updates

```typescript
// OPAL_SE broadcasts events
eventBus.emit('graph.node.created', { nodeId, nodeType, projectId });
eventBus.emit('graph.edge.created', { edgeId, from, to, weight });
eventBus.emit('agent.run.started', { runId, agentId, taskId });
eventBus.emit('agent.run.completed', { runId, status, artifacts });

// WebSocket server forwards to connected clients
wss.broadcast({
  type: 'graph.changed',
  payload: { ... }
});

// Frontend subscribes and updates UI
socket.on('graph.changed', (data) => {
  mutate('/api/graph/nodes'); // Trigger SWR revalidation
});
```

### 8.3 Graph Versioning & History

For audit and rollback:

```sql
CREATE TABLE graph_snapshots (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT,
  description TEXT,
  node_count INTEGER,
  edge_count INTEGER
);

CREATE TABLE graph_snapshot_nodes (
  snapshot_id TEXT NOT NULL,
  node_id TEXT NOT NULL,
  node_data TEXT NOT NULL, -- JSON
  PRIMARY KEY(snapshot_id, node_id),
  FOREIGN KEY(snapshot_id) REFERENCES graph_snapshots(id)
);

-- Similar for edges
```

---

## 9. Testing Recommendations

### 9.1 Graph Algorithm Tests

**Critical:** Pathfinding must be tested exhaustively

```typescript
// apps/OPAL_SE/tests/pathfinding.test.ts
describe('Graph Pathfinding', () => {
  it('should find shortest path in simple graph', async () => {
    // Setup: Create nodes A -> B -> C
    const result = await findShortestPath('A', 'C', projectId);
    expect(result.path).toEqual(['A', 'B', 'C']);
    expect(result.totalWeight).toBe(2.0);
  });

  it('should handle weighted edges correctly', async () => {
    // Setup: Create A -> B (weight 5) and A -> C -> B (weight 2 + 2)
    const result = await findShortestPath('A', 'B', projectId);
    expect(result.path).toEqual(['A', 'C', 'B']); // Takes longer path with lower weight
  });

  it('should return null for disconnected nodes', async () => {
    const result = await findShortestPath('isolated-1', 'isolated-2', projectId);
    expect(result).toBeNull();
  });

  it('should respect bidirectional flag', async () => {
    // Test that bidirectional=false edges only traverse one way
  });
});
```

### 9.2 Chelex Integration Tests

```typescript
describe('Chelex Agent Workflow', () => {
  it('should complete full task lifecycle', async () => {
    // 1. Create task
    const task = await createTask({ ... });

    // 2. Agent checks assigned tasks
    const tasks = await checkAssignedTasks({ agentId: 'test-agent' });
    expect(tasks).toContainEqual(task);

    // 3. Agent gets context
    const context = await getTaskContext({ task_id: task.id });
    expect(context.graph_context).toBeDefined();

    // 4. Agent submits plan
    const plan = await submitPlan({ task_id: task.id, steps: [...] });

    // 5. Human approves
    await approvePlan({ plan_id: plan.id, approved_by: 'human' });

    // 6. Agent starts run
    const run = await startRun({ task_id: task.id, plan_id: plan.id });

    // 7. Agent completes
    await completeTask({ task_id: task.id, run_id: run.id, artifacts: [...] });

    // Verify final state
    const finalTask = await db('chelex_tasks').where({ id: task.id }).first();
    expect(finalTask.status).toBe('done');
  });
});
```

### 9.3 Network Graph Tests

```typescript
describe('Network Graph Integration', () => {
  it('should ingest network topology from FDS', async () => {
    // Mock FDS response
    nock('http://localhost:8000')
      .get('/network/topology')
      .reply(200, mockNetworkTopology);

    // Trigger ingestion
    await ingestNetworkTopology(projectId);

    // Verify nodes created
    const devices = await db('system_nodes')
      .where({ project_id: projectId, type: 'NetworkDevice' });
    expect(devices).toHaveLength(3);
  });

  it('should calculate network path with weighted edges', async () => {
    // Setup network topology
    await createNetworkTopology();

    // Find path from router to server
    const path = await traceNetworkPath({
      source_device_id: 'router-1',
      target_device_id: 'server-1'
    });

    expect(path).toBeDefined();
    expect(path.totalWeight).toBeGreaterThan(0);
  });
});
```

---

## 10. Documentation Gaps

### 10.1 Missing Documentation

1. **Agent Development Guide**
   - How to create a new autonomous agent
   - Using Chelex MCP tools
   - Graph traversal best practices
   - Precedent learning

2. **Graph Schema Documentation**
   - Complete list of NodeTypes with examples
   - Complete list of RelationTypes with usage
   - Edge weight semantics
   - Metadata conventions

3. **Network Integration Guide**
   - How to add network devices
   - Network topology ingestion
   - CMDB connector development

4. **API Reference**
   - All MCP tools with examples
   - REST endpoints
   - WebSocket events

### 10.2 Outdated Documentation

**NETWORK_LAYER_MASTER_SPEC.md** says:
> "The Network Layer is a typed subgraph inside OPAL_SE's system graph"

But this is **not true**. The network node types haven't been added.

**Recommendation:** Update or remove this doc until implementation matches spec.

---

## 11. Performance Considerations

### 11.1 Graph Query Optimization

**Potential Issues:**
- Large graphs (10k+ nodes) may cause slow traversals
- Pathfinding without indexed edges will be O(n²)

**Optimizations:**
1. **Database Indexes** (add if not present):
   ```sql
   CREATE INDEX idx_edges_from_weight ON system_edges(from_node_id, weight);
   CREATE INDEX idx_edges_to_weight ON system_edges(to_node_id, weight);
   CREATE INDEX idx_edges_type_weight ON system_edges(relation_type, weight);
   ```

2. **Caching Layer:**
   ```typescript
   import NodeCache from 'node-cache';
   const graphCache = new NodeCache({ stdTTL: 300 }); // 5 min cache

   async function getSystemSlice(args) {
     const cacheKey = `slice:${args.project_id}:${args.start_node_ids.join(',')}`;
     const cached = graphCache.get(cacheKey);
     if (cached) return cached;

     const result = await computeSystemSlice(args);
     graphCache.set(cacheKey, result);
     return result;
   }
   ```

3. **Graph Materialized Views:**
   ```sql
   -- Pre-compute commonly accessed slices
   CREATE TABLE graph_materialized_slices (
     id TEXT PRIMARY KEY,
     project_id TEXT,
     root_node_id TEXT,
     depth INTEGER,
     nodes TEXT, -- JSON
     edges TEXT, -- JSON
     computed_at TIMESTAMP
   );
   ```

### 11.2 Agent Concurrency

**Issue:** Multiple agents executing plans simultaneously

**Risks:**
- Database deadlocks
- Race conditions on graph updates
- Conflicting traversals

**Solutions:**
1. **Optimistic Locking:**
   ```typescript
   await db('system_nodes')
     .where({ id: nodeId, version: currentVersion })
     .update({ data: newData, version: currentVersion + 1 });
   ```

2. **Task Queue:**
   ```typescript
   import Bull from 'bull';
   const agentQueue = new Bull('agent-tasks');

   agentQueue.process(async (job) => {
     const { taskId, planId } = job.data;
     await executeAgentPlan(taskId, planId);
   });
   ```

3. **Read-Only Traversal:**
   - Most graph reads don't modify data
   - Use read replicas for agent queries
   - Reserve writes for plan execution

---

## 12. Security Considerations

### 12.1 Agent Authorization

**Current:** Basic agent identification via `context.agentId`

**Risks:**
- Agents could impersonate each other
- No capability-based access control
- Agents can access all graph nodes

**Recommendations:**

1. **Agent Authentication:**
   ```typescript
   interface AgentToken {
     agentId: string;
     capabilities: string[];
     maxDepth: number;
     allowedNodeTypes: NodeType[];
     expiresAt: Date;
   }

   function verifyAgentToken(token: string): AgentToken {
     // JWT verification
   }
   ```

2. **Graph Access Control:**
   ```sql
   CREATE TABLE agent_permissions (
     agent_id TEXT,
     project_id TEXT,
     allowed_node_types TEXT, -- JSON array
     allowed_relation_types TEXT,
     max_traversal_depth INTEGER DEFAULT 5,
     PRIMARY KEY(agent_id, project_id)
   );
   ```

3. **Audit Logging:**
   ```typescript
   await db('agent_audit_log').insert({
     agent_id: agentId,
     action: 'graph.node.read',
     node_id: nodeId,
     timestamp: new Date(),
     ip_address: req.ip
   });
   ```

### 12.2 Plan Validation

**Current:** Plans are submitted with arbitrary steps

**Risks:**
- Malicious agents could execute destructive operations
- No validation of tool invocations
- SQL injection via metadata

**Recommendations:**

1. **Whitelist allowed tools per agent**
2. **Validate step parameters against schemas**
3. **Sandbox tool execution**
4. **Rate limit plan submissions**

---

## 13. Migration Path (Step-by-Step)

### Phase 1: Foundation (Week 1)
1. ✅ Add network node types to `types/se.ts`
2. ✅ Add edge weight column to database
3. ✅ Update systemGraphService CRUD operations
4. ✅ Write unit tests for new fields

### Phase 2: Pathfinding (Week 2)
1. ✅ Implement Dijkstra's algorithm
2. ✅ Create pathfindingService
3. ✅ Integrate with Chelex submitPlan
4. ✅ Write comprehensive tests

### Phase 3: Network Data (Week 3)
1. ✅ Create FDS network topology endpoint
2. ✅ Implement network ingestion in OPAL_SE
3. ✅ Add network MCP tools (getNetworkTopology, etc.)
4. ✅ Test end-to-end network data flow

### Phase 4: UI Integration (Week 4)
1. ✅ Create NetworkTopologyGraph component
2. ✅ Fix NetworkSection to use real data
3. ✅ Add network-specific node renderers
4. ✅ Implement network path visualization

### Phase 5: Agent Intelligence (Week 5-6)
1. ✅ Structured plan step storage (chelex_plan_steps table)
2. ✅ Execution step logging (chelex_execution_steps table)
3. ✅ Precedent learning automation
4. ✅ Agent performance analytics

### Phase 6: Polish (Week 7)
1. ✅ Performance optimization
2. ✅ Security hardening
3. ✅ Documentation update
4. ✅ Integration tests

---

## 14. Conclusion

### Summary of Findings

**The Good:**
- ✅ Clean separation of concerns at macro level
- ✅ MCP protocol well-implemented
- ✅ Database schema is extensible
- ✅ Chelex governance workflow is thoughtful
- ✅ UI components are well-structured

**The Bad:**
- ❌ Network graph layer is **incomplete** (node types not added)
- ❌ NetworkSection component is **broken** (uses wrong graph)
- ❌ No pathfinding algorithms for agent traversal
- ❌ Edge weights are **missing** from schema
- ❌ Graph traversal is **opaque JSON** instead of structured

**The Ugly:**
- ❌ Four graph data models without clear integration
- ❌ Specs don't match implementation (NETWORK_LAYER_MASTER_SPEC.md)
- ❌ Frontend → Backend communication is inconsistent
- ❌ No real network data source (sidecar or FDS)

### Critical Path to Fix

**Must-Have (Blocking):**
1. Add network node types to type system
2. Add edge weights to database schema
3. Implement pathfinding service (Dijkstra minimum)
4. Fix NetworkSection component
5. Create network data endpoint (FDS at minimum)

**Should-Have (Important):**
6. Structured traversal logging
7. Agent authorization/security
8. Performance optimization (indexes, caching)
9. Integration tests

**Nice-to-Have (Polish):**
10. Analytics dashboard
11. Advanced pathfinding (A*, multi-path)
12. Graph versioning
13. Documentation overhaul

### Final Assessment

**Integration Quality: 4/10**

The platform has **good bones** but the integration of the new network/agent layer is **incomplete and inconsistent**. It appears that Gemini added the Chelex governance layer successfully, but the weighted network graph component was only partially implemented.

**Specific Issues:**
- Specs written ✅
- Database tables created ✅ (for Chelex)
- MCP tools created ✅ (for agents)
- Node types extended ❌ (critical gap)
- Edge weights added ❌ (critical gap)
- Pathfinding implemented ❌ (critical gap)
- UI components wired ⚠️ (partially, but broken)

**Recommendation:** Follow the migration path above to complete the integration. Prioritize Phase 1-2 (foundation + pathfinding) as these are **blocking** for real agent autonomy.

---

## Appendix A: Quick Reference

### Current Node Types
```
Requirement, Test, Component, Interface, Issue, ECN,
EmailMessage, Note, Task, LibraryItem
```

### Missing Node Types (Per Spec)
```
NetworkDevice, NetworkInterface, Subnet, VLAN, NetworkService
```

### Current Relation Types
```
TRACES_TO, VERIFIED_BY, ALLOCATED_TO, INTERFACES_WITH,
BLOCKS, DERIVED_FROM, REFERS_TO
```

### Missing Relation Types (Per Spec)
```
CONNECTED_TO, ROUTES_TO, DEPENDS_ON (exists in spec but not in types)
```

### Chelex Tables
```
chelex_tasks, chelex_plans, chelex_approvals, chelex_runs,
chelex_verifications, chelex_decision_traces, chelex_precedents
```

### Key Files to Modify
```
apps/OPAL_SE/src/types/se.ts                    # Add node/edge types
apps/OPAL_SE/migrations/20260207_add_weights.js # Add weight column
apps/OPAL_SE/src/services/se/pathfindingService.ts # NEW FILE
apps/OPAL_SE/src/services/se/networkTools.ts    # NEW FILE
apps/CORE_UI/frontend/src/components/NetworkSection.tsx # FIX
apps/CORE_UI/frontend/src/components/NetworkTopologyGraph.tsx # NEW
```

---

**End of Report**

*Generated on February 6, 2026*
*For questions or clarifications, review this document with your team and prioritize the critical path items.*
