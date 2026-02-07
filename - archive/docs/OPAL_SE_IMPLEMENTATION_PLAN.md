# OPAL_SE Implementation Plan

**Project**: Upgrade OPAL Server to Systems Engineering Intelligence Layer  
**Date**: November 2024  
**Status**: Planning Phase  

---

## Executive Summary

This document outlines the comprehensive plan to upgrade the current OPAL MCP server from a **generic tool/memory server** into a **Systems Engineering Intelligence Layer** (OPAL_SE) that serves as the brain for the CORE-SE product.

### Current State

**OPAL** is currently a fully functional MCP-compliant server with:
- ✅ Generic MCP protocol implementation (tools, resources, prompts, elicitation)
- ✅ Vector memory service with OpenAI embeddings
- ✅ User authentication and API token management
- ✅ Audit logging and metrics
- ✅ Admin panel for management
- ✅ OPAL Core Toolbox (system, secrets, http, transform, search, document, safety)
- ✅ Sidecar MCP Connector framework (registry, capabilities, invocation)
- ✅ Database: SQLite (dev) / PostgreSQL (prod) with Knex migrations

**Database Schema (Current):**
- `users` - User accounts
- `sessions` - Active sessions
- `memories` - Vector embeddings and content
- `api_tokens` - API authentication
- `tool_runs` - Audit log of tool executions

**Services (Current):**
- `toolsService.ts` - Generic tool management
- `memoryService.ts` - Vector memory operations
- `resourcesService.ts` - In-memory resource storage
- `promptsService.ts` - Prompt management
- `authService.ts` - Authentication
- `auditService.ts` - Audit logging
- `metricsService.ts` - Metrics collection
- `backupService.ts` - Database backup/restore

**Infrastructure (Current):**
- `/src/core/toolbox/` - Core tool categories (7 implemented)
- `/src/sidecar/` - Sidecar connector framework
- `/admin` - Admin panel UI
- `/migrations` - Knex migration files

### Target State

**OPAL_SE** will add systems engineering-specific capabilities:

1. **System Graph Layer** - Typed engineering entities and relationships
2. **Event Log & Change Sets** - Engineering change history
3. **SE-Specific MCP Tools** - Domain-specific analysis tools
4. **Rule Engine** - Consistency and verification checks
5. **FDS Integration** - Fake data ingestion pipeline
6. **Project Scoping** - Multi-project isolation
7. **Enhanced Admin Panel** - SE-specific views
8. **Context Bundles** - Prepackaged LLM contexts

---

## Architecture Overview

### Data Model

```
┌─────────────────────────────────────────────────────────────┐
│                    OPAL_SE Data Layers                      │
├─────────────────────────────────────────────────────────────┤
│  Existing (Generic)          │  New (SE-Specific)           │
├──────────────────────────────┼──────────────────────────────┤
│  • users                     │  • system_nodes              │
│  • sessions                  │  • system_edges              │
│  • memories (vector)         │  • events                    │
│  • api_tokens                │  • change_sets               │
│  • tool_runs                 │  • change_set_events         │
│  • resources (in-memory)     │  • rules (in-memory/config)  │
│  • prompts (in-memory)       │  • violations (computed)     │
└──────────────────────────────┴──────────────────────────────┘
```

### System Graph Schema

**Node Types:**
- `Requirement` - System requirements (from Jama)
- `Test` - Test cases and verification activities
- `Component` - System components and assemblies
- `Interface` - Component interfaces and connections
- `Issue` - Defects, tasks, and issues (from Jira)
- `ECN` - Engineering Change Notices
- `EmailMessage` - Email communications (from Outlook)
- `Note` - User-created notes in CORE-SE
- `Task` - User tasks and work items
- `LibraryItem` - Reusable library components

**Edge Types:**
- `TRACES_TO` - Traceability relationships
- `VERIFIED_BY` - Requirement → Test verification
- `ALLOCATED_TO` - Requirement → Component allocation
- `INTERFACES_WITH` - Component connections
- `BLOCKS` - Issue blocking relationships
- `DERIVED_FROM` - Requirement derivation
- `REFERS_TO` - General references

### Service Architecture

```
┌────────────────────────────────────────────────────────────┐
│                     MCP Protocol Layer                      │
│  (tools/list, tools/call, resources/*, prompts/*)          │
└─────────────────────┬──────────────────────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        │                           │
┌───────▼────────┐        ┌────────▼─────────┐
│  Generic MCP   │        │   SE-Specific    │
│    Services    │        │     Services     │
├────────────────┤        ├──────────────────┤
│ • toolsService │        │ • systemGraph    │
│ • memoryService│        │ • eventLog       │
│ • resources    │        │ • changeSet      │
│ • prompts      │        │ • ruleEngine     │
│ • auth         │        │ • seTools        │
│ • audit        │        │ • fdsIngestion   │
└────────────────┘        └──────────────────┘
        │                           │
        └─────────────┬─────────────┘
                      │
              ┌───────▼────────┐
              │   Database     │
              │  (SQLite/PG)   │
              └────────────────┘
```

---

## Implementation Roadmap

### Phase 1: Foundation (Epics 1-2)
**Goal:** Establish the system graph and event log infrastructure

#### Epic 1: System Graph Layer

**1.1 Define System Graph Schema** ⏱️ 1 day
- Create TypeScript types for all node types
- Create TypeScript types for all edge types
- Define required fields: `id`, `external_refs`, `project_id`, `type`, `name`, `description`, `subsystem`, `status`, `owner`, `timestamps`
- Document schema in `/docs/SYSTEM_GRAPH_SCHEMA.md`

**1.2 Create Database Migrations** ⏱️ 1 day
```javascript
// Migration: 20250117000001_add_system_graph.js
exports.up = async function(knex) {
  // system_nodes table
  await knex.schema.createTable('system_nodes', table => {
    table.string('id', 36).primary();
    table.string('project_id', 36).notNullable().index();
    table.string('type').notNullable().index(); // Requirement, Test, etc.
    table.string('name').notNullable();
    table.text('description');
    table.text('external_refs'); // JSON: {jama_id, jira_key, etc.}
    table.string('subsystem').index();
    table.string('status');
    table.string('owner');
    table.text('metadata'); // JSON for flexible fields
    table.timestamps(true, true);
    
    table.index(['project_id', 'type']);
    table.index(['project_id', 'subsystem']);
  });

  // system_edges table
  await knex.schema.createTable('system_edges', table => {
    table.string('id', 36).primary();
    table.string('project_id', 36).notNullable().index();
    table.string('from_node_id', 36).references('id').inTable('system_nodes').onDelete('CASCADE');
    table.string('to_node_id', 36).references('id').inTable('system_nodes').onDelete('CASCADE');
    table.string('relation_type').notNullable(); // TRACES_TO, VERIFIED_BY, etc.
    table.string('source_system'); // jama, jira, core_se, etc.
    table.text('rationale');
    table.timestamps(true, true);
    
    table.index(['from_node_id', 'relation_type']);
    table.index(['to_node_id', 'relation_type']);
    table.index(['project_id', 'relation_type']);
  });
};
```

**1.3 Implement System Graph Service** ⏱️ 2 days
```typescript
// /src/services/se/systemGraphService.ts

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

export interface SystemEdge {
  id: string;
  project_id: string;
  from_node_id: string;
  to_node_id: string;
  relation_type: RelationType;
  source_system: string;
  rationale?: string;
  created_at: Date;
  updated_at: Date;
}

// Core CRUD operations
export async function createNode(node: Partial<SystemNode>): Promise<SystemNode>
export async function updateNode(id: string, updates: Partial<SystemNode>): Promise<SystemNode>
export async function getNode(id: string): Promise<SystemNode | null>
export async function deleteNode(id: string): Promise<boolean>

export async function createEdge(edge: Partial<SystemEdge>): Promise<SystemEdge>
export async function updateEdge(id: string, updates: Partial<SystemEdge>): Promise<SystemEdge>
export async function getEdge(id: string): Promise<SystemEdge | null>
export async function deleteEdge(id: string): Promise<boolean>

// Graph query helpers
export async function getNodesByFilter(filters: NodeFilter): Promise<SystemNode[]>
export async function getEdgesByFilter(filters: EdgeFilter): Promise<SystemEdge[]>
export async function getNeighbors(
  nodeIds: string[], 
  relationTypes: RelationType[], 
  direction: 'outgoing' | 'incoming' | 'both', 
  depth: number
): Promise<{ nodes: SystemNode[], edges: SystemEdge[] }>
```

#### Epic 2: Event Log & Change Sets

**2.1 Define Event Log Schema** ⏱️ 0.5 days
```javascript
// Add to migration: 20250117000001_add_system_graph.js
await knex.schema.createTable('events', table => {
  table.string('id', 36).primary();
  table.string('project_id', 36).notNullable().index();
  table.string('source_system').notNullable().index(); // fds, jama, jira, core_se
  table.string('entity_type').notNullable(); // Requirement, Test, etc.
  table.string('entity_id', 36).notNullable().index();
  table.string('event_type').notNullable(); // created, updated, deleted, linked, unlinked
  table.timestamp('timestamp').notNullable().index();
  table.text('diff_payload'); // JSON with before/after
  table.timestamps(true, true);
  
  table.index(['project_id', 'timestamp']);
  table.index(['entity_id', 'timestamp']);
});

await knex.schema.createTable('change_sets', table => {
  table.string('id', 36).primary();
  table.string('project_id', 36).notNullable().index();
  table.string('anchor'); // ECN-045, time_window_2024-11-15, etc.
  table.string('label');
  table.text('stats'); // JSON: {counts_by_type, counts_by_subsystem, etc.}
  table.timestamps(true, true);
});

await knex.schema.createTable('change_set_events', table => {
  table.string('change_set_id', 36).references('id').inTable('change_sets').onDelete('CASCADE');
  table.string('event_id', 36).references('id').inTable('events').onDelete('CASCADE');
  table.primary(['change_set_id', 'event_id']);
});
```

**2.2 Implement Event Recording** ⏱️ 1 day
```typescript
// /src/services/se/eventLogService.ts

export interface Event {
  id: string;
  project_id: string;
  source_system: string;
  entity_type: string;
  entity_id: string;
  event_type: 'created' | 'updated' | 'deleted' | 'linked' | 'unlinked' | 'status_changed';
  timestamp: Date;
  diff_payload: DiffPayload;
}

export async function recordEvent(
  source_system: string,
  entity_type: string,
  entity_id: string,
  event_type: string,
  diff_payload: DiffPayload,
  project_id: string
): Promise<Event>

// Integrate into systemGraphService.ts
// Every createNode/updateNode/deleteNode should call recordEvent
```

**2.3 Implement Change Set Construction** ⏱️ 1 day
```typescript
// /src/services/se/changeSetService.ts

export interface ChangeSet {
  id: string;
  project_id: string;
  anchor: string;
  label: string;
  stats: ChangeSetStats;
  created_at: Date;
}

export async function buildChangeSetForWindow(
  project_id: string,
  start_time: Date,
  end_time: Date
): Promise<ChangeSet>

export async function buildChangeSetForAnchor(
  project_id: string,
  anchor: string,
  label?: string
): Promise<ChangeSet>

export async function attachEventToChangeSet(
  change_set_id: string,
  event_id: string
): Promise<void>

export async function getChangeSetEvents(change_set_id: string): Promise<Event[]>
```

**Phase 1 Deliverable:** ✅ System graph database schema, services, and event logging infrastructure operational

---

### Phase 2: SE MCP Tools (Epics 3)
**Goal:** Implement the core SE analysis tools

#### Epic 3: SE-Specific MCP Tools

**3.1 querySystemModel Tool** ⏱️ 0.5 days
```typescript
// /src/services/se/seToolsService.ts

export async function querySystemModel(params: {
  project_id: string;
  node_filters?: {
    type?: NodeType[];
    subsystem?: string[];
    status?: string[];
    ids?: string[];
    external_refs?: Record<string, string>;
  };
  edge_filters?: {
    relation_type?: RelationType[];
  };
  limit?: number;
  offset?: number;
}): Promise<{
  nodes: SystemNode[];
  edges: SystemEdge[];
  total_count: number;
}>
```

**3.2 getSystemSlice Tool** ⏱️ 1 day
```typescript
export async function getSystemSlice(params: {
  project_id: string;
  subsystem?: string;
  start_node_ids?: string[];
  max_depth?: number;
}): Promise<{
  nodes: SystemNode[];
  edges: SystemEdge[];
  metadata: {
    node_counts_by_type: Record<NodeType, number>;
    edge_counts_by_type: Record<RelationType, number>;
  };
}>
```

**3.3 traceDownstreamImpact Tool** ⏱️ 1.5 days
```typescript
export async function traceDownstreamImpact(params: {
  start_nodes: string[];
  depth: number;
  filters?: {
    types?: NodeType[];
    subsystems?: string[];
    statuses?: string[];
  };
}): Promise<{
  impacted: {
    requirements: SystemNode[];
    tests: SystemNode[];
    components: SystemNode[];
    interfaces: SystemNode[];
    issues: SystemNode[];
    ecns: SystemNode[];
  };
  traces: SystemEdge[];
}>
```

**3.4 traceUpstreamRationale Tool** ⏱️ 1 day
```typescript
export async function traceUpstreamRationale(params: {
  start_nodes: string[];
  depth: number;
}): Promise<{
  upstream_nodes: SystemNode[];
  paths: Array<{
    from: string;
    to: string;
    path: string[];
  }>;
}>
```

**3.5 Verification Tools** ⏱️ 2 days
```typescript
export async function findVerificationGaps(params: {
  project_id: string;
  subsystem?: string;
  requirement_levels?: string[];
  safety_levels?: string[];
}): Promise<{
  requirements_missing_tests: SystemNode[];
  tests_without_requirements: SystemNode[];
  broken_chains: Array<{
    requirement: SystemNode;
    gap_type: string;
    description: string;
  }>;
}>

export async function checkAllocationConsistency(params: {
  project_id: string;
  subsystem?: string;
}): Promise<{
  unallocated_requirements: SystemNode[];
  orphan_components: SystemNode[];
  conflicting_allocations: Array<{
    requirement: SystemNode;
    components: SystemNode[];
    conflict_reason: string;
  }>;
}>

export async function getVerificationCoverageMetrics(params: {
  project_id: string;
  subsystem?: string;
}): Promise<{
  total_requirements: number;
  verified_requirements: number;
  coverage_percentage: number;
  by_type: Record<string, { total: number; verified: number }>;
  by_level: Record<string, { total: number; verified: number }>;
}>
```

**3.6 History & Analogy Tools** ⏱️ 1.5 days
```typescript
export async function getHistory(params: {
  entity_ids: string[];
  window?: { start: Date; end: Date };
  limit?: number;
}): Promise<{
  events: Event[];
  timeline: Array<{
    timestamp: Date;
    entity_id: string;
    event_type: string;
    summary: string;
  }>;
}>

export async function findSimilarPastChanges(params: {
  change_signature: {
    node_types: NodeType[];
    subsystems: string[];
    tags?: string[];
  };
  limit?: number;
}): Promise<{
  similar_change_sets: Array<{
    change_set: ChangeSet;
    similarity_score: number;
    matching_patterns: string[];
  }>;
}>
```

**Phase 2 Deliverable:** ✅ All 9 SE-specific MCP tools implemented and tested

---

### Phase 3: FDS Integration & Rule Engine (Epics 4-5)
**Goal:** Connect FDS data pipeline and implement consistency rules

#### Epic 4: FDS Ingestion

**4.1 FDS Ingestion Endpoints** ⏱️ 1 day
```typescript
// /src/routes/se/ingestion.ts

router.post('/ingest/jama', async (req, res) => {
  // Map FDS Jama items to system_nodes
  // Extract relationships to system_edges
  // Record events
});

router.post('/ingest/jira', async (req, res) => {
  // Map FDS Jira issues to system_nodes
  // Extract links to system_edges
});

router.post('/ingest/windchill', async (req, res) => {
  // Map parts/ECNs to system_nodes
  // Extract BOM relationships
});

router.post('/ingest/outlook', async (req, res) => {
  // Map messages/events to system_nodes
});

router.post('/ingest/confluence', async (req, res) => {
  // Map pages to system_nodes
  // Extract linked_artifacts
});
```

**4.2 FDS Event Normalization** ⏱️ 1.5 days
```typescript
// /src/services/se/fdsAdapter.ts

export interface FDSJamaItem {
  id: string;
  global_id: string;
  item_type: 'requirement' | 'test_case';
  name: string;
  description: string;
  status: string;
  fields: Record<string, any>;
  // ... full FDS schema
}

export function normalizeJamaItem(item: FDSJamaItem): {
  node: Partial<SystemNode>;
  edges: Partial<SystemEdge>[];
  event: Partial<Event>;
}

export function normalizeJiraIssue(issue: FDSJiraIssue): { ... }
export function normalizeWindchillPart(part: FDSWindchillPart): { ... }
export function normalizeOutlookMessage(message: FDSOutlookMessage): { ... }
export function normalizeConfluencePage(page: FDSConfluencePage): { ... }
```

**4.3 Connect FDS as Sidecar** ⏱️ 1 day
```typescript
// Register FDS on startup
await sidecarManager.registerSidecar({
  name: 'fds',
  url: 'http://localhost:4000',
  transport: 'http',
  auth: { type: 'none' }
});

// Polling service
export class FDSPollingService {
  async pollPulseEndpoint() {
    const response = await fetch('http://localhost:4000/mock/pulse?since=' + lastPoll);
    const events = response.data;
    
    for (const event of events) {
      await ingestFDSEvent(event);
    }
  }
}

// Webhook handler
router.post('/webhooks/fds', async (req, res) => {
  const event = req.body;
  await ingestFDSEvent(event);
  res.json({ ok: true });
});
```

#### Epic 5: Rule Engine

**5.1 Rule Engine Framework** ⏱️ 1 day
```typescript
// /src/services/se/ruleEngineService.ts

export interface Rule {
  id: string;
  name: string;
  description: string;
  severity: 'error' | 'warning' | 'info';
  check: (context: RuleContext) => Promise<Violation[]>;
}

export interface Violation {
  rule_id: string;
  severity: string;
  message: string;
  affected_nodes: string[];
  affected_edges?: string[];
  details: Record<string, any>;
}

export async function runRules(
  project_id: string,
  scope?: { subsystem?: string; rule_ids?: string[] }
): Promise<Violation[]>
```

**5.2 Define Initial Rule Set** ⏱️ 1 day
```typescript
// /src/services/se/rules/
// - R001_requirement_traceability.ts
// - R002_safety_critical_verification.ts
// - R003_interface_endpoints.ts

export const R001: Rule = {
  id: 'R001',
  name: 'Requirement Traceability',
  description: 'Every L2 requirement must trace to at least one test or L3 requirement',
  severity: 'error',
  check: async (context) => {
    const l2Requirements = await getNodesByFilter({
      project_id: context.project_id,
      type: 'Requirement',
      'metadata.level': 'L2'
    });
    
    const violations: Violation[] = [];
    
    for (const req of l2Requirements) {
      const downstreamEdges = await getEdgesByFilter({
        from_node_id: req.id,
        relation_type: ['TRACES_TO', 'VERIFIED_BY']
      });
      
      if (downstreamEdges.length === 0) {
        violations.push({
          rule_id: 'R001',
          severity: 'error',
          message: `Requirement ${req.name} has no downstream traceability`,
          affected_nodes: [req.id],
          details: { requirement_id: req.id, requirement_name: req.name }
        });
      }
    }
    
    return violations;
  }
};
```

**5.3 runConsistencyChecks Tool** ⏱️ 0.5 days
```typescript
export async function runConsistencyChecks(params: {
  project_id: string;
  subsystem?: string;
  rule_ids?: string[];
}): Promise<{
  violations: Violation[];
  summary: {
    total_violations: number;
    by_severity: Record<string, number>;
    by_rule: Record<string, number>;
  };
}>
```

**Phase 3 Deliverable:** ✅ FDS integration pipeline operational, rule engine running

---

### Phase 4: Admin Panel & Documentation (Epics 6-7-8)
**Goal:** Enhance admin panel and create developer documentation

#### Epic 6: Admin Panel Extensions

**6.1 System Graph Admin Panel** ⏱️ 1 day
- Add `/admin/system-graph` route
- Display node/edge counts by type and project
- Add simple visual graph browser

**6.2 Event Stream Viewer** ⏱️ 1 day
- Add `/admin/events` route
- List recent events with filters
- Drill-down to inspect diff payloads

**6.3 Rule Dashboard** ⏱️ 1 day
- Add `/admin/rules` route
- Display current violation counts
- Show rule health by project

#### Epic 7: Context Bundles & Schemas

**7.1 Define JSON Schemas** ⏱️ 1 day
- Document all MCP tool input/output schemas
- Create OpenAPI/JSON Schema docs

**7.2 Context Bundle Helpers** ⏱️ 1 day
```typescript
// /src/services/se/contextBundles.ts

export async function buildImpactAnalysisContext(params: {
  project_id: string;
  start_nodes: string[];
}): Promise<{
  impact: ReturnType<typeof traceDownstreamImpact>;
  violations: ReturnType<typeof runConsistencyChecks>;
  history: ReturnType<typeof getHistory>;
}>

export async function buildDailySummaryContext(params: {
  project_id: string;
  date: Date;
}): Promise<{
  change_set: ChangeSet;
  events: Event[];
  violations: Violation[];
  metrics: any;
}>

export async function buildVerificationReviewContext(params: {
  project_id: string;
  subsystem?: string;
}): Promise<{
  gaps: ReturnType<typeof findVerificationGaps>;
  consistency: ReturnType<typeof checkAllocationConsistency>;
  coverage: ReturnType<typeof getVerificationCoverageMetrics>;
}>
```

#### Epic 8: Project Scoping

**8.1 Add project_id Throughout** ⏱️ 1 day
- Update all queries to filter by project_id
- Add project management endpoints
- Ensure multi-tenant isolation

**Phase 4 Deliverable:** ✅ Admin panel complete, documentation ready

---

### Phase 5: Testing & Documentation (Final)

**Testing** ⏱️ 3 days
1. Create seed script to populate FDS data into OPAL graph
2. Write integration tests for all SE tools
3. Test rule engine with intentional gaps
4. Verify multi-project isolation
5. Test event log and change set construction
6. Performance testing (300+ artifacts)

**Documentation** ⏱️ 2 days
1. OPAL_SE Architecture diagram
2. System Graph Schema reference
3. MCP Tool API reference with examples
4. FDS Integration guide
5. Admin panel user guide
6. Migration guide from current OPAL

---

## Implementation Timeline

### Recommended Sequence

| Phase | Focus | Duration | Priority |
|-------|-------|----------|----------|
| **Phase 1** | Foundation | 6 days | 🔴 Critical |
| **Phase 2** | SE Tools | 8 days | 🔴 Critical |
| **Phase 3** | FDS & Rules | 6 days | 🟡 High |
| **Phase 4** | Admin & Context | 5 days | 🟢 Medium |
| **Phase 5** | Testing & Docs | 5 days | 🔴 Critical |
| **Total** | | **30 days** | |

### Parallelization Opportunities

Some epics can be worked on in parallel:
- Epic 2.1-2.3 can start alongside Epic 1.3
- Epic 3 tools can be implemented in parallel by multiple developers
- Epic 6 admin panels can be developed while Epic 4-5 are in progress

**Realistic Timeline:**
- **Single Developer**: 6-7 weeks
- **Two Developers**: 4-5 weeks
- **Three Developers**: 3-4 weeks

---

## Technical Considerations

### Database Performance

**Indexes Required:**
- `system_nodes`: `(project_id, type)`, `(project_id, subsystem)`, `(external_refs)` (JSONB index for PostgreSQL)
- `system_edges`: `(from_node_id, relation_type)`, `(to_node_id, relation_type)`, `(project_id, relation_type)`
- `events`: `(project_id, timestamp)`, `(entity_id, timestamp)`, `(source_system)`

**Expected Data Volumes (per project):**
- Nodes: 200-500
- Edges: 500-1,500
- Events: 2,000-10,000
- Change Sets: 50-200

### Migration Strategy

**For Existing OPAL Deployments:**

1. **Schema Migration**: Run new migrations to add SE tables
2. **Backward Compatibility**: Existing tools/resources/prompts continue to work
3. **Gradual Adoption**: SE features are additive, not replacement
4. **Data Migration**: No existing data needs migration (SE features start fresh)

### Configuration

**New Environment Variables:**
```env
# SE Configuration
OPAL_SE_ENABLED=true
OPAL_SE_DEFAULT_PROJECT_ID=core-se-demo

# FDS Integration
FDS_BASE_URL=http://localhost:4000
FDS_POLL_INTERVAL=900000  # 15 minutes
FDS_WEBHOOK_SECRET=your-webhook-secret

# Rule Engine
RULE_ENGINE_ENABLED=true
RULE_ENGINE_AUTO_RUN=false
```

---

## Success Criteria

### Phase 1 Success
- ✅ System graph tables created and populated with test data
- ✅ Event log capturing all graph mutations
- ✅ Change sets can be constructed for time windows

### Phase 2 Success
- ✅ All 9 SE MCP tools respond correctly
- ✅ Tools return properly structured JSON
- ✅ Graph traversal performs well (<500ms for typical queries)

### Phase 3 Success
- ✅ FDS data flows into OPAL graph
- ✅ ~300 artifacts from FDS successfully ingested
- ✅ Rule engine identifies intentional gaps (~15%)
- ✅ Violations are actionable and accurate

### Phase 4 Success
- ✅ Admin panel shows SE-specific views
- ✅ Context bundles return complete data for LLM prompts
- ✅ Multi-project isolation verified

### Phase 5 Success
- ✅ Integration tests pass
- ✅ Documentation complete and clear
- ✅ CORE-SE backend can consume OPAL_SE tools

---

## Risk Management

| Risk | Impact | Mitigation |
|------|--------|------------|
| Graph traversal performance | High | Add proper indexes, implement pagination, cache hot paths |
| FDS schema changes | Medium | Use adapter pattern, version FDS schema |
| Rule complexity | Medium | Start with simple rules, iterate based on feedback |
| Multi-project isolation | High | Test thoroughly, use row-level security in PostgreSQL |
| Event log size | Medium | Implement event log archival/cleanup after 90 days |

---

## Next Steps

1. ✅ Review this implementation plan with the team
2. ⏳ Set up development branch: `feature/opal-se-upgrade`
3. ⏳ Begin Phase 1, Epic 1.1: Define System Graph Schema
4. ⏳ Set up CI/CD pipeline for OPAL_SE testing
5. ⏳ Create project in issue tracker with all epics/tasks

---

## Appendix A: File Structure

```
OPAL_SE/
├── src/
│   ├── services/
│   │   ├── se/                          # NEW: SE-specific services
│   │   │   ├── systemGraphService.ts
│   │   │   ├── eventLogService.ts
│   │   │   ├── changeSetService.ts
│   │   │   ├── seToolsService.ts
│   │   │   ├── ruleEngineService.ts
│   │   │   ├── fdsAdapter.ts
│   │   │   ├── contextBundles.ts
│   │   │   └── rules/
│   │   │       ├── R001_requirement_traceability.ts
│   │   │       ├── R002_safety_critical_verification.ts
│   │   │       └── R003_interface_endpoints.ts
│   │   ├── toolsService.ts             # EXISTING
│   │   ├── memoryService.ts            # EXISTING
│   │   └── ...
│   ├── routes/
│   │   ├── se/                          # NEW: SE-specific routes
│   │   │   ├── ingestion.ts
│   │   │   └── projects.ts
│   │   └── ...
│   ├── types/
│   │   ├── se.ts                        # NEW: SE type definitions
│   │   ├── mcp.ts                       # EXISTING
│   │   └── database.ts                  # EXISTING
│   └── ...
├── migrations/
│   ├── 20250116000001_initial_schema.js        # EXISTING
│   └── 20250117000001_add_system_graph.js      # NEW
├── admin/
│   ├── pages/
│   │   ├── system-graph.html            # NEW
│   │   ├── events.html                  # NEW
│   │   └── rules.html                   # NEW
│   └── ...
├── docs/
│   ├── OPAL_SE_IMPLEMENTATION_PLAN.md   # THIS FILE
│   ├── SYSTEM_GRAPH_SCHEMA.md           # NEW
│   ├── MCP_TOOL_API_REFERENCE.md        # NEW
│   ├── FDS_INTEGRATION_GUIDE.md         # NEW
│   └── ...
└── ...
```

---

## Appendix B: Key Decisions

### Decision 1: SQLite vs PostgreSQL
**Decision:** Support both, with SQLite for development and PostgreSQL for production.  
**Rationale:** Maintain current architecture, add PostgreSQL-specific optimizations (JSONB, better indexing) later.

### Decision 2: In-Memory vs Persisted Rules
**Decision:** Start with in-memory/config-based rules, migrate to database later if needed.  
**Rationale:** Simpler to implement, easier to version control, sufficient for MVP.

### Decision 3: Real-time vs Polling for FDS
**Decision:** Support both webhook (real-time) and polling (fallback).  
**Rationale:** Webhooks are better but polling is more resilient in development environments.

### Decision 4: Event Log Retention
**Decision:** Keep all events indefinitely in MVP, add archival in production.  
**Rationale:** Focus on core functionality first, optimize storage later.

### Decision 5: Graph Storage
**Decision:** Use relational tables (nodes + edges) rather than graph database.  
**Rationale:** Keep current database infrastructure, avoid adding new dependencies. PostgreSQL with proper indexes is sufficient for expected scale.

---

**Document Version:** 1.0  
**Last Updated:** November 2024  
**Author:** AI Architect  
**Status:** Ready for Review
