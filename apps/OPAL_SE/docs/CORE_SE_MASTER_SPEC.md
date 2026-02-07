# CORE-SE / OPAL-SE Master Spec (Consolidated)

This document consolidates everything specific to CORE-SE (Systems Engineering Intelligence) that extends OPAL from a generic MCP substrate into an SE-native system graph and analysis engine.

## 1. CORE-SE goals (what this extension is for)

CORE-SE needs OPAL to do three things reliably:
1. Maintain a **typed engineering system graph** (artifacts + relationships).
2. Maintain a first-class **event log + change sets** (history that can be sliced and replayed).
3. Expose **deterministic SE tools** (impact, traceability, verification, consistency) with strict schemas.

LLMs do not get to “make up” engineering facts. They interpret OPAL’s deterministic outputs.

## 2. Domain data model inside OPAL

### 2.1 Nodes (artifacts)
Minimum canonical node types:
- Requirement
- TestCase
- Component
- Interface
- Issue
- ECN
- EmailMessage
- Note
- Task
- LibraryItem

Minimum fields (baseline):
- internal id
- project_id
- type
- name/title + description/summary
- external_refs (system + external id + deep link)
- subsystem, status, owner
- timestamps (created_at, updated_at)
- metadata (extensible)

### 2.2 Edges (relationships)
Canonical relationship types:
- TRACES_TO
- VERIFIED_BY
- ALLOCATED_TO
- INTERFACES_WITH
- BLOCKS
- DERIVED_FROM
- REFERS_TO

Minimum fields:
- id, project_id
- from_node_id, to_node_id
- relation_type
- source_system (who asserted it)
- rationale (optional)
- timestamps + metadata

### 2.3 Source-of-truth rules
- External tools (Jama/Jira/Windchill/etc.) are the source-of-truth for **content**.
- OPAL is the source-of-truth for **normalized history, cross-tool linkage, and derived consistency state**.
- Conflicts are surfaced as events/violations, not silently merged.

## 3. Event log and change sets

### 3.1 Events
An event is the normalized record of a change to a node or edge:
- source_system
- entity_type/entity_id
- event_type (created/updated/deleted/linked/unlinked/status_changed/etc.)
- timestamp
- diff_payload (before/after or patch)

### 3.2 Change sets
A change set groups events by:
- time window (“yesterday”, “last 24h”)
- anchor (ECN id, review id, release tag)

Change sets drive:
- Pulse feed
- “What changed?” summaries
- impact slices and review packets

## 4. SE MCP tools (canonical)

The canonical tool list for CORE-SE is:

### Graph query tools
- querySystemModel
- getSystemSlice

### Traceability tools
- traceDownstreamImpact
- traceUpstreamRationale

### Verification tools
- findVerificationGaps
- checkAllocationConsistency
- getVerificationCoverageMetrics

### History & analytics tools
- getHistory
- findSimilarPastChanges

### Rule engine tools
- runConsistencyChecks

**Canon**: the strict JSON schemas for these tools are the source-of-truth. Any wrapper/tool catalog must conform to them.

## 5. CORE-SE function design rules (how you expose tools to the app/LLM)

CORE-SE functions must be:
- deterministic and bounded
- domain typed (no “any”, no raw SQL exposed)
- split into two layers:
  - Layer 1 core wrappers (thin, stable, versioned)
  - Layer 2 macro tools (orchestrations for common workflows)
- return structured outputs: { summary, details, raw?, tool_call_id, source_tools, timestamp? }

## 6. Ingestion pipelines

CORE-SE requires ingestion into the system graph and event log, via:
- Fake Data Service (first integration for demos and testing)
- Later: Jama/Jira/Windchill/Outlook connectors via sidecars or adapters

Ingestion must produce:
1) graph mutations, and
2) event records

No ingestion path gets to “update the graph” without creating events.

## 7. Rule engine

A minimal rule engine should exist for:
- verification coverage expectations
- allocation consistency
- interface sanity rules
- orphan/dangling artifacts
- safety-critical requirements policy checks (as defined by your program)

Expose rule evaluation through runConsistencyChecks.

## 8. Lessons Learned sidecar (optional but high-leverage)

A lessons-learned sidecar is useful if you want:
- semantic search over “what went wrong before”
- context suggestions during impact analysis and ARS triage

If enabled, keep it as a sidecar with:
- search endpoint (filters + semantic ranking)
- get detail endpoint
- OPAL tool registration that proxies to the sidecar

## 9. Implementation order (recommended)

1) System graph persistence
2) Event log + change sets
3) Core SE MCP tools (graph + history first)
4) Ingestion from Fake Data Service
5) Impact/verification tools
6) Rule engine + runConsistencyChecks
7) Admin/debug views (graph stats, event stream, violations)

## Appendix A: What was redundant and removed in this consolidation

- “Tool catalog” docs that restate schemas are treated as **non-canonical**. Keep schemas canonical.
- Long narrative summaries are collapsed into this master spec plus a short product one-pager (if you need it).
- AI architecture code snippets are removed here; keep only the principle: *centralize LLM calls behind a gateway*.

