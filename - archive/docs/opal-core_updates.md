Here is a clean, narrative, high-clarity summary of **OPAL** and **CORE-SE** as a single integrated program — written in plain paragraphs, suitable for internal documents, investor decks, or engineering onboarding.

---

# OPAL + CORE-SE Program Summary

CORE-SE is a systems engineering intelligence platform built to sit above the fragmented tool stack used in modern aerospace, defense, energy, and complex hardware environments. Today, engineering data is scattered across Jama, Jira, Windchill, Outlook, shared drives, spreadsheets, and emails. These tools each work well on their own, but together they create blind spots — changes go unnoticed, trace links break silently, verification gaps appear late, and cross-discipline impacts are often discovered only during integration or testing. CORE-SE resolves this by becoming the unified reasoning layer that sees the entire engineering ecosystem at once. It does not replace existing systems of record; it transforms them into a single coherent system graph with real-time intelligence.

At the heart of CORE-SE is **OPAL**, a persistent MCP server engineered specifically to act as a system-of-systems memory and deterministic analysis engine. OPAL stores all engineering artifacts as typed nodes and relationships in a unified system graph — requirements, components, tests, interfaces, issues, ECNs, and more. It also maintains a normalized event log that records every change flowing in from Jama, Jira, Windchill, Outlook, or the Fake Data Service. This gives CORE-SE the ability to reason not just about the current state of the system but also about its history: what changed, when it changed, why it changed, and what it touched downstream.

OPAL exposes this intelligence through a set of deterministic MCP tools purpose-built for systems engineering. These tools support graph queries, impact traversal, verification gap detection, allocation consistency checks, interface validation, history analysis, and pattern matching across past change events. They give any AI system — including Sonnet/4.5 for the MVP and discipline-specific SLIMs in the future — a clean, structured data surface to work with. Instead of hallucinating, the LLM interprets OPAL’s structured outputs and behaves like a systems engineer: explaining impacts, identifying risks, summarizing yesterday’s changes, or recommending actions. OPAL provides facts; the LLM provides interpretation.

CORE-SE’s UI layers these capabilities into workflows engineers actually use: a Pulse Feed showing real-time project activity across all tools, an Impact Analysis panel that blends deterministic graph results with AI reasoning, a Trace Graph visualizing the interconnected system, Notes/Tasks tied directly to artifacts, a Canvas for architecture thinking, and a Daily Summary generator that condenses cross-tool activity into actionable insights. Engineers get a single desktop app that finally shows how their program is evolving and where risk is accumulating, without switching between six systems or relying on tribal knowledge.

Together, OPAL and CORE-SE form a new category in engineering software — a Systems Intelligence Layer. It does not compete with Jama, DOORS, Jira, or Windchill. It uses them as data sources and upgrades them by making their information visible, connected, and explainable. This architecture allows CORE-SE to deliver something no current tool does: real-time, cross-discipline situational awareness and AI-assisted systems reasoning. For complex engineering programs where integration mistakes cost millions and schedules slip for months, CORE-SE is the missing layer that brings clarity, continuity, and intelligent support to the entire engineering lifecycle.

---

## 0. Where OPAL is today (in short)

Right now OPAL is a **general MCP server** with:

* Tool serving and resource CRUD mapped to arbitrary APIs
* Prompt execution and reverse-mode summarization
* Vector-based memory + full-text search
* Admin panel, auth, metrics, audit logs, backup
* Generic tables (users, sessions, memories, tool_runs, etc.) 

That’s great for Focal / generic integrations, but CORE-SE needs OPAL to become a **system-of-systems brain**, not just a tool router.

---

## 1. Add a System Graph Layer (Domain Model for CORE-SE)

We need OPAL to own a **typed engineering graph**, not just arbitrary API responses or vector memories.

### 1.1 New Data Structures

Add internal schema / tables for:

* **Nodes (artifacts)**

  * `Requirement`, `Test`, `Component`, `Interface`, `Issue`, `ECN`, `EmailMessage`, `Note`, `Task`, `LibraryItem`
* **Edges (relationships)**

  * `TRACES_TO`, `VERIFIED_BY`, `ALLOCATED_TO`, `INTERFACES_WITH`, `BLOCKS`, `DERIVED_FROM`, `REFERS_TO`

Each node should include at minimum:

* Stable ID (internal)
* External system IDs (Jama ID, Jira key, Windchill number, Outlook message ID)
* Type, name/title, description/summary, subsystem, status, owner, timestamps
* Source system + link back (URL, deep link)

Each edge should include:

* From node, to node
* Relationship type
* Source system (who asserted it)
* Rationale / comments
* Last updated

This is **new** relative to the current generic resources/memory tables; it’s a durable, opinionated SE model that lives inside OPAL.

---

## 2. Add a First-Class Event Log & Change Sets

OPAL already logs tool runs and has audit logs, but CORE-SE needs a **true engineering event log**, not just “tool_runs.” 

### 2.1 Event Log

Create a dedicated `events` table that records:

* `event_id`
* `source_system` (Jama, Jira, Windchill, Outlook, FDS)
* `entity_type` / `entity_id` (node this applies to)
* `event_type` (created, updated, deleted, linked, unlinked, status_changed, etc.)
* `timestamp`
* `diff_payload` (what changed, normalized)

### 2.2 Change Sets

Add a higher-level grouping:

* `change_set_id`
* Anchor (ECN ID, review ID, commit ID, or time window)
* List of events belonging to that change set
* Derived stats (by type, by subsystem, etc.)

This is what drives:

* Pulse Feed
* “What changed yesterday?”
* “What changed due to ECN-045?”
* History/impact slices

---

## 3. Add CORE-SE-Specific MCP Tools

Right now OPAL exposes generic tools mapped to arbitrary APIs and summarizers. We need a **new family of tools** that directly support CORE-SE workflows.

### 3.1 System Graph & Slice Tools

* `querySystemModel(query_spec)`

  * Filter by type, subsystem, status, IDs, etc.
* `getSystemSlice(scope)`

  * Return bounded graph slices (e.g., all nodes within N hops of REQ-123, or “ARS subsystem view”).

### 3.2 Impact & Trace Tools

* `traceDownstreamImpact(start_nodes, depth, filters)`

  * Walk TRACES/VERIFIED/ALLOCATED/INTERFACES_WITH to produce affected artifacts grouped by type.
* `traceUpstreamRationale(start_nodes, depth)`

  * Walk up to higher-level requirements, hazards, objectives.

### 3.3 Verification & Consistency Tools

* `findVerificationGaps(scope)`

  * Requirements with no tests; tests with no requirements; broken chains.
* `checkAllocationConsistency(scope)`

  * Requirements with no allocations; components with orphaned/extra allocations.
* `getVerificationCoverageMetrics(scope)`

  * Coverage ratios by requirement level, safety level, subsystem.

### 3.4 History & Analogy Tools

* `getHistory(entity_ids, window)`

  * Event/history timeline for selected artifacts.
* `findSimilarPastChanges(change_signature)`

  * Uses node + edge patterns and metadata to find historically similar changes.

These tools become **first-class MCP tools**, listed alongside the existing generic tools, but backed by the new graph/event schema instead of external APIs.

---

## 4. Add Ingestion Pipelines for CORE-SE Sources

Today OPAL is mostly “on-demand API tools + reverse summarization.” CORE-SE requires **continuous or batch ingestion** into the system graph + event log.

### 4.1 Ingestion Services

Add a new service layer in OPAL (or alongside it) for:

* **Jama connector** → translate requirements + trace links → system graph nodes/edges + events
* **Jira connector** → issues, status changes, links → nodes/edges + events
* **Windchill connector** → parts, assemblies, ECNs → nodes/edges + events
* **Outlook/Graph connector** → messages, threads, tags → `EmailMessage` nodes linked to requirements/issues/ECNs
* **FDS / Scenario Generator** → synthetic versions of all of the above for demo/testing

These ingestion paths should normalize raw payloads into:

1. Graph mutations (nodes/edges create/update)
2. Event log entries

### 4.2 Source-of-Truth Rules

For CORE-SE, we should encode some simple policies:

* External tools (Jama/Jira/Windchill) are **content source of truth**
* OPAL is **relationship / history source of truth**
* Conflicts are flagged as events or consistency violations, not silently resolved

---

## 5. Add a Constraint / Rule Engine

OPAL already validates tool inputs with JSON Schema and logs tool runs, but we need a **domain rule engine** to check system consistency. 

### 5.1 Rule Definitions

Add an internal rule engine or rule evaluation layer that encodes things like:

* Every L2 requirement must trace to at least one L3 or test
* Every safety-critical requirement must have at least one verification activity
* Every interface must connect exactly two endpoints
* No dangling test without a requirement
* No requirement double-allocated to conflicting components

### 5.2 Rule Evaluation Tools

Expose this via MCP tools like:

* `runConsistencyChecks(scope)`

  * Returns all rule violations with rule IDs, severities, affected artifacts.

These results feed Impact Analysis and Daily Summary, and give the LLM concrete “ground truth” about what is broken.

---

## 6. Add Engineering-Aware Views to Admin Panel

The current admin panel is infra-centric: health, metrics, tokens, audit logs, etc. 

For CORE-SE, add a few more panels:

* **System Graph Explorer**

  * Node/edge counts, type distribution, basic visual slice browser.
* **Event Stream View**

  * Timeline of ingested changes, filters by source system, subsystem.
* **Rule/Consistency Dashboard**

  * Counts of current violations by rule; drill-down to affected artifacts.
* **Scenario / FDS Control Panel**

  * Start/stop fake scenarios, see what synthetic events are firing.

This is primarily for debugging and demo prep, but will become invaluable.

---

## 7. Tighten AI-Facing Contracts (for CORE-SE “Systems Thinking”)

OPAL already supports prompts and reverse-mode summarization, but for CORE-SE we need **structured, model-ready outputs** that the backend can pass straight to Sonnet/4.5.

Concretely:

* For each new MCP tool, define **strict JSON schemas** for:

  * Inputs (`scope`, `start_nodes`, `filters`)
  * Outputs (lists of nodes, edges, events, violations, metrics)
* Provide small “view models” inside OPAL that:

  * Pre-package context bundles (system slice + events + violations) for common workflows: impact analysis, verification review, daily summary.

You can keep the orchestration layer in the Python backend, but OPAL should return **consistently shaped objects** that make it trivial to call a big LLM and say “act like a systems engineer over this packet.”

---

## 8. Optional but Helpful: Project / Program Scoping

Today OPAL is per-user, identity-bearing. For CORE-SE, you’ll likely need **per-program or per-project partitioning** within an OPAL:

* Add `project_id` / `program_id` to nodes, edges, events, memories.
* Tools accept `scope.project_id` so multiple programs can share one OPAL instance without cross-contamination.

---

## 9. Implementation Order (High-Level)

If you want a practical order of operations without dates:

1. **System Graph + Event Log schema** (nodes/edges/events/change_sets)
2. **Core MCP tools for graph + history** (querySystemModel, getSystemSlice, getHistory)
3. **Ingestion path from FDS into graph + events**
4. **Impact/verification tools** (traceDownstreamImpact, findVerificationGaps, checkAllocationConsistency)
5. **Rule engine + consistency checks**
6. **Admin panel upgrades (graph, events, rules views)**
7. **Connect CORE-SE backend to these tools and ship the demo with a single big LLM**

Directions for AI Coder. Got it. Here’s a technical, task-oriented version you can hand straight to your AI coder. No code, just clear implementation work items.

---

# OPAL for CORE-SE — Technical Task Breakdown (For AI Coder)

## 0. Context / Constraints

* OPAL is already an MCP server with:

  * generic tools → external APIs
  * vector memory / summarization
  * users, sessions, tool_runs, etc.
* Goal now: **upgrade OPAL into a system-of-systems brain for CORE-SE**, with:

  * an engineering graph
  * event log + change sets
  * deterministic analysis tools
  * LLM-friendly outputs
  * ingestion from FDS (and later real systems)

Treat everything below as **epics → concrete tasks**.

---

## Epic 1 — System Graph Data Model

### Task 1.1 — Define Canonical Artifact Types and Relationships

**Goal**: Introduce an explicit “system graph” domain model inside OPAL.

* Define node types:

  * `Requirement`, `Test`, `Component`, `Interface`, `Issue`, `ECN`, `EmailMessage`, `Note`, `Task`, `LibraryItem`.
* Define edge types:

  * `TRACES_TO`, `VERIFIED_BY`, `ALLOCATED_TO`, `INTERFACES_WITH`, `BLOCKS`, `DERIVED_FROM`, `REFERS_TO`.
* Specify required fields for nodes:

  * `id` (internal)
  * `external_refs` (system name + external ID/URL)
  * `type`, `name`, `description`
  * `subsystem`, `status`, `owner`
  * timestamps (`created_at`, `updated_at`)
  * `project_id` (for multi-program support)
* Specify required fields for edges:

  * `id`
  * `from_node_id`, `to_node_id`
  * `relation_type`
  * `source_system`
  * `rationale` (optional)
  * timestamps, `project_id`

**Deliverable**: A schema spec (e.g. markdown / JSON schema) describing node and edge types and fields.

---

### Task 1.2 — Implement Persistent Storage for System Graph

**Goal**: Implement actual persistence for nodes + edges in OPAL’s DB.

* Add tables/collections for:

  * `system_nodes`
  * `system_edges`
* Ensure indexes for:

  * `type`, `project_id`, `external_refs`, `subsystem`
  * `from_node_id`, `to_node_id`, `relation_type`
* Implement basic CRUD operations (internal service layer):

  * `create_node`, `update_node`, `get_node`, `delete_node`
  * `create_edge`, `update_edge`, `get_edge`, `delete_edge`
* Enforce referential integrity:

  * no edge to non-existent node
  * cascade or deny deletes (decide behavior and document it)

**Deliverable**: Working graph persistence layer with unit tests for CRUD + basic queries.

---

### Task 1.3 — Implement Graph Query Helpers

**Goal**: Provide reusable internal functions for graph traversal.

* Implement helpers:

  * `get_nodes_by_filter(filters)`
  * `get_edges_by_filter(filters)`
  * `get_neighbors(node_ids, relation_types, direction, depth)`
* Filters must support:

  * `type`, `subsystem`, `status`, `project_id`, `external_refs`
* These helpers will be used by MCP tools later (trace, impact, etc.).

**Deliverable**: Internal API in OPAL that can retrieve and traverse the graph efficiently.

---

## Epic 2 — Event Log & Change Sets

### Task 2.1 — Define Event and Change Set Schema

**Goal**: First-class event log for engineering changes.

* Design `events` structure:

  * `event_id`
  * `project_id`
  * `source_system` (e.g. `jama`, `jira`, `windchill`, `outlook`, `fds`)
  * `entity_type` (node type)
  * `entity_id` (node ID)
  * `event_type` (created / updated / deleted / linked / unlinked / status_changed / etc.)
  * `timestamp`
  * `diff_payload` (normalized patch / serialized JSON)
* Design `change_sets`:

  * `change_set_id`
  * `project_id`
  * `anchor` (e.g. ECN ID, review ID, or “time window”)
  * `label` (optional human-readable label)
  * linkage table: change_set ↔ events
  * derived stats: counts by `entity_type`, `subsystem`, `event_type`

**Deliverable**: Schema + migrations for `events` and `change_sets`.

---

### Task 2.2 — Implement Event Recording API

**Goal**: Centralized API to log events whenever the graph changes.

* When a node or edge is:

  * created
  * updated
  * deleted
  * linked/unlinked,
    create an `event` entry with:
  * normalized before/after diff
  * source_system attribution (e.g. `core_se_backend`, `fds`, `jama`).
* Provide internal function:

  * `record_event(source_system, entity_type, entity_id, event_type, diff_payload, project_id)`
* Make sure all ingestion logic (Epic 4) uses this.

**Deliverable**: Event logging integrated with graph updates; tested with fake calls.

---

### Task 2.3 — Implement Change Set Construction

**Goal**: Group events into change sets for higher-level reasoning.

* Support two modes:

  1. **Time window** (e.g. “yesterday” or “last 24 hours”)
  2. **Anchor-based** (e.g. all events tagged with `ECN-045`)
* Implement helper:

  * `build_changeset_for_window(project_id, start_time, end_time)`
  * `attach_event_to_changeset(change_set_id, event_id)`
* Optionally: allow external systems (CORE-SE backend) to explicitly create change sets and attach events.

**Deliverable**: Ability to query “change sets” for Pulse and Daily Summary.

---

## Epic 3 — CORE-SE MCP Tools

### Task 3.1 — `querySystemModel` Tool

**Goal**: General graph query MCP tool for CORE-SE.

* Define MCP tool: `querySystemModel(query_spec)`
* `query_spec` may include:

  * `project_id`
  * `node_filters` (type, subsystem, status, ids, external_refs)
  * `edge_filters` (relation_type)
  * optional `limit` / `offset`
* Output:

  * `nodes`: list of node objects
  * `edges`: list of edge objects

**Deliverable**: MCP tool wired to graph helper functions; schema documented.

---

### Task 3.2 — `getSystemSlice` Tool

**Goal**: Provide bounded slices for UI and LLM.

* Define MCP tool: `getSystemSlice(scope)`
* Scope can be:

  * `project_id` + `subsystem`
  * or `start_node_ids` + `max_depth`
* Output:

  * `nodes`, `edges` forming a connected subgraph
  * optional metadata (e.g. node counts by type)

**Deliverable**: Tool that returns compact graph slices for Trace Graph and AI prompts.

---

### Task 3.3 — `traceDownstreamImpact` Tool

**Goal**: Primary impact analysis primitive.

* Define MCP tool: `traceDownstreamImpact(start_nodes, depth, filters)`
* Behavior:

  * Starting from given `start_nodes` (IDs), walk through:

    * `TRACES_TO`
    * `VERIFIED_BY`
    * `ALLOCATED_TO`
    * `INTERFACES_WITH`
    * optionally others (configurable)
  * Up to `depth` hops
  * Apply filters on types, subsystems, statuses
* Output:

  * `impacted`: grouped by node type (requirements, tests, components, interfaces, issues, ECNs)
  * `traces`: the edges forming paths from start nodes to impacted nodes

**Deliverable**: Tested impact traversal tool; used by Impact Analysis backend playbook.

---

### Task 3.4 — `traceUpstreamRationale` Tool

**Goal**: Support “why does this requirement exist / what parent does it belong to?”

* Define MCP tool: `traceUpstreamRationale(start_nodes, depth)`
* Behavior:

  * Walk “upward” relations:

    * `DERIVED_FROM`, high-level `TRACES_TO` parents, etc.
* Output:

  * list of upstream requirements, hazards, or objectives
  * path info

**Deliverable**: Tool returning rationale chains for LLM context and UI.

---

### Task 3.5 — Verification & Consistency Tools

**Goal**: Deterministic checks that feed LLM reasoning.

Implement MCP tools:

1. `findVerificationGaps(scope)`

   * Inputs:

     * `project_id`
     * optional `subsystem`, `requirement_levels`, `safety_levels`
   * Output:

     * `requirements_missing_tests`
     * `tests_without_requirements`
     * `broken_chains` (disconnected segments)

2. `checkAllocationConsistency(scope)`

   * Inputs:

     * `project_id`, optional `subsystem`
   * Output:

     * `unallocated_requirements`
     * `orphan_components`
     * `conflicting_allocations`

3. `getVerificationCoverageMetrics(scope)`

   * Inputs:

     * `project_id`, optional `subsystem`
   * Output:

     * aggregate metrics (coverage ratios by type / level)

**Deliverable**: Deterministic tools implementing basic SE rules over the graph.

---

### Task 3.6 — History & Analogy Tools

**Goal**: Power history views and “similar past change” patterns.

1. `getHistory(entity_ids, window)`

   * Inputs:

     * list of node IDs
     * time window or event limit
   * Output:

     * chronological list of `events` by entity

2. `findSimilarPastChanges(change_signature)`

   * Inputs:

     * `change_signature` (e.g. types, subsystems, tags)
   * Implementation:

     * match against past change sets based on:

       * involved node types
       * subsystems
       * relation patterns
   * Output:

     * candidate change_sets + short descriptors

**Deliverable**: Two tools with simple, deterministic matching (can be naive at first).

---

## Epic 4 — Ingestion Pipelines (CORE-SE Sources)

### Task 4.1 — FDS (Fake Data Service) Ingestion

**Goal**: Use FDS as the first real integration, end-to-end.

* Implement ingestion endpoint(s) in OPAL that:

  * accept normalized FDS events
  * map them to:

    * node/edge mutations
    * `events` records
* Ensure:

  * creation updates `system_nodes` / `system_edges`
  * every change calls `record_event(…, source_system="fds")`
* Support at least:

  * requirements
  * tests
  * components
  * ECNs
  * issues
  * trace links

**Deliverable**: When FDS scenario runs, OPAL graph and event log are populated and visible in tools.

---

### Task 4.2 — External Connector Contracts (Jama/Jira/Windchill/Outlook)

**Goal**: Define but not fully implement real connectors.

* For each external system, define:

  * expected payload format → how it maps to node/edge fields
  * how to generate `event_type` + `diff_payload`
* Implement “adapter” functions that accept generic payloads and:

  * update graph
  * log events
* These can initially be called via test harnesses / mocks (real integration later).

**Deliverable**: Documented mapping + stubbed ingestion paths that can be exercised with fake payloads.

---

## Epic 5 — Rule Engine & Consistency Checks

### Task 5.1 — Implement Rule Evaluation Engine

**Goal**: Domain-specific rule framework for SE constraints.

* Implement internal rule engine where each rule:

  * has an ID
  * has a severity (info/warn/error)
  * has a query function over nodes/edges
* Example rules:

  * `R001`: “Every L2 requirement must trace to at least one test or L3”
  * `R002`: “Every safety-critical requirement must have test(s)”
  * `R003`: “Every interface must connect exactly two distinct components”
* Rule engine API:

  * `run_rules(project_id, optional_scope) → list of violations`

**Deliverable**: Rule engine with a minimal rule set and tests.

---

### Task 5.2 — `runConsistencyChecks` MCP Tool

**Goal**: Expose rule engine as a single MCP tool.

* Define MCP tool: `runConsistencyChecks(scope)`
* Inputs:

  * `project_id`
  * optional `subsystem`
  * optional `rule_ids`
* Output:

  * `violations`: list with:

    * `rule_id`, `severity`, `message`
    * affected `node_ids`/`edge_ids`

**Deliverable**: Tool that returns all current rule violations for CORE-SE to display and feed to LLM.

---

## Epic 6 — Admin Panel Extensions

### Task 6.1 — System Graph Overview Panel

**Goal**: Allow admins to inspect graph state.

* Add UI view:

  * counts of nodes by type
  * counts of edges by relation_type
  * per-project breakdown
* Optional:

  * simple visual slice (small graph preview for a project)

**Deliverable**: Admin page showing at least tabular graph stats.

---

### Task 6.2 — Event Stream Viewer

**Goal**: Debugging tool for ingestion and scenario runs.

* Admin view listing recent events:

  * filter by `source_system`, `project_id`, `entity_type`, `event_type`
* Provide pagination and ability to inspect `diff_payload`.

**Deliverable**: Working event log viewer.

---

### Task 6.3 — Rule / Consistency Dashboard

**Goal**: Quick view of current model health.

* Admin view showing:

  * counts of violations per rule
  * ability to drill down into `runConsistencyChecks(project_id)` results

**Deliverable**: UI for rule health, helpful during demos and debugging.

---

## Epic 7 — AI-Facing Contracts (LLM Integration)

### Task 7.1 — Define JSON Schemas for MCP Tool I/O

**Goal**: Make OPAL outputs directly LLM-friendly.

* For each new MCP tool:

  * define exact JSON structures (keys, types) for:

    * request parameters
    * response payload
* Ensure:

  * stable naming
  * minimal, clear fields
  * no raw DB/ORM artifacts
* Produce a consolidated document:

  * “OPAL for CORE-SE — Tool API v0.1”

**Deliverable**: Document + validation layer (optional) enforcing schemas.

---

### Task 7.2 — Prepackaged Context Bundles for Common Workflows

**Goal**: Make it easy for CORE-SE backend to call one internal function and get all necessary context to send to an LLM.

Implement internal helpers, not MCP tools, for:

1. **Impact Analysis Context**

   * Given `project_id` and `start_nodes`:

     * call: `traceDownstreamImpact`, `runConsistencyChecks` (scoped), maybe `getHistory`
     * return a consolidated context object.

2. **Daily Summary Context**

   * Given `project_id` and a time window:

     * build change sets
     * compute counts/metrics
     * fetch relevant rule violations.

3. **Verification Review Context**

   * Given `project_id` (and optional `subsystem`):

     * call `findVerificationGaps`, `getVerificationCoverageMetrics`.

**Deliverable**: Internal API that returns compact, consistent context structures for the Python backend to send to Sonnet/4.5.

---

## Epic 8 — Project / Program Scoping

### Task 8.1 — Add `project_id` Everywhere

**Goal**: Allow one OPAL instance to host multiple CORE-SE programs.

* Add `project_id` to:

  * `system_nodes`, `system_edges`
  * `events`, `change_sets`
  * rule evaluation scope
* Ensure all MCP tools accept `project_id` (or include it in `scope`).

**Deliverable**: Multi-project-safe OPAL where data does not cross programs unless explicitly requested.



