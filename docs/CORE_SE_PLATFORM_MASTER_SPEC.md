# CORE-SE Platform Master Spec (Consolidated)

This is the canonical, current reference for the **CORE-SE / SE-network / agent platform** stack. It consolidates wiring, repo structure, tool/sidecar rules, and the agent-facing tool surface. It is intended to replace overlapping architecture notes and eliminate drift.

---

## 0. Platform in one paragraph

CORE-SE is a desktop/web UI for systems engineering workflows (pulse, trace/impact, verification, workload/triage) backed by an **OPAL_SE** server that hosts **MCP tools** and a persistent system graph. External systems are accessed only via **sidecar connectors**. A Fake Data Server (**FDS**) exists strictly for demo/dev and can emulate upstream tools and/or feed ingestion.

---

## 1. Runtime topology (canonical)

Four process classes:

1) **CORE_UI**: UI (frontend) + API gateway (backend)
2) **OPAL_SE**: MCP server + tool host + SE graph + policy/audit
3) **sidecars/**: connector/services/compute processes (REST APIs)
4) **FDS**: dev/demo mock data server (NOT a sidecar)

**Core rule**: external systems (Jira/Jama/Windchill/Outlook/etc.) are only touched by their connector sidecars. OPAL and UI never talk to external systems directly.

---

## 2. Repo layout and single sources of truth

### 2.1 Repo layout (expected)

```
core-se-platform/
├── config/
│   └── sidecars.json               ← Canonical sidecar registry
├── sidecars/                       ← All sidecar services (REST)
├── apps/
│   ├── OPAL_SE/                    ← MCP server + tools + SE graph
│   └── CORE_UI/                    ← Frontend + API gateway
└── FDS/                            ← Dev/demo mock upstreams
```

### 2.2 Single sources of truth

- **Sidecars**: `config/sidecars.json`
  - id, ports, env vars, what tools proxy them
- **Tools**: `apps/OPAL_SE/tools/registry.json`
  - if not in registry, it does not exist

No other “catalog” doc is canonical.

---

## 3. Connection paths and protocols

### 3.1 CORE_UI frontend → CORE_UI backend
- HTTP (and optionally WebSocket later)

### 3.2 CORE_UI backend → OPAL_SE
- MCP over HTTP/WebSocket via the `/mcp` endpoint for tool calls
- REST endpoints for basic CRUD/ingestion where appropriate

### 3.3 OPAL_SE → sidecars
- OPAL tools call sidecars via `tools/common/http_client.ts`
- Sidecar base URLs come from OPAL env vars (e.g., `LESSONS_SERVICE_URL`)

### 3.4 sidecars → external systems
- Each connector sidecar owns its outbound clients and auth.

### 3.5 FDS positioning
- FDS is a demo/dev upstream emulator.
- In dev, OPAL_SE can ingest from FDS (one-shot ingest and optional polling).
- In prod, FDS is unused.

---

## 4. Tool layer rules (non-negotiable)

### 4.1 Where tools live
All MCP tools live under:
`apps/OPAL_SE/tools/`

Sidecars contain **no** MCP tool logic.

### 4.2 Tool folder template
Every tool folder must contain:
- README.md (purpose, type, sidecars, UI usage)
- schema.ts (input/output DTOs for the tool)
- handler.ts (implementation)
- config.json (metadata)
- tests/

### 4.3 Tool types
- **core**: reads/writes OPAL graph/db directly
- **proxy**: thin wrapper around one sidecar endpoint
- **macro**: orchestration across multiple tools/sidecars

### 4.4 Decoupling rule
Tools never import from other tools. Shared primitives only come from `tools/common/*`.

---

## 5. SE domain model inside OPAL_SE

### 5.1 System graph
OPAL_SE maintains a typed system graph:
- nodes (artifacts)
- edges (relationships)

This graph is the source-of-truth for normalized cross-tool linkage and derived analysis state.

### 5.2 Event log (platform direction)
A normalized event log stream is expected for “pulse”, history, and change sets.

Ingestion paths must not mutate graph state without producing corresponding events.

---

## 6. Canonical tool surface (current “21 tools” shape)

Tools are organized into four categories:

### 6.1 system-model (core analysis)
Examples: graph query, slices, trace/impact, verification coverage, allocation consistency, history, similarity.

### 6.2 triage-and-pulse (agent workflows)
Macro tools that triage and explain pulse items by pulling context and coordinating connector/service calls.

### 6.3 calendar-and-workload (early warning)
Proxy tools to pull calendar and compute workload summaries.

### 6.4 lessons-learned
Proxy tools plus macro suggestion logic.

**Important**: the schema contract is the product. The UI and “agents” must treat tool output as authoritative and structured.

---

## 7. API/function mapping (UI integration layer)

The frontend typically uses:
- MCP tool calls for complex graph/analysis functions
- REST for ingestion and basic CRUD

Key examples:
- `querySystemModel`, `getSystemSlice`, `traceDownstreamImpact` via MCP
- `ingestFromFDS` via REST

---

## 8. Sidecar taxonomy (deployment mental model)

Sidecars fall into three kinds:
- **connectors**: talk to external systems (Jira/Jama/Outlook/Windchill/etc.)
- **services**: own internal domain data (lessons, workload aggregation)
- **compute**: heavy compute (STEM python)

---

## 9. Dev vs prod

### Dev/demo
- FDS is used to emulate upstreams and seed data.
- Sidecar URLs can point to FDS-backed mocks.

### Production
- FDS is not used.
- Connectors point to real base URLs.
- OPAL_SE remains the durable graph + tool host.

---

## 10. What to delete / stop maintaining (to reduce drift)

- Any doc that tries to be a “second registry” of tools or sidecars.
- Any doc that duplicates tool schemas in prose.
- Any doc that claims UI or OPAL call external systems directly (that violates the architecture rule).

---

## 11. What’s explicitly “not platform-critical”
- DeltaReq adaptation notes are a separate product direction. They should not be mixed into the platform master spec unless you decide DeltaReq is the main product.

