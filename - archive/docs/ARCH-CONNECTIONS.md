# CORE-SE / OPAL Connection Guide

**Version**: 1.0  
**Date**: November 20, 2025  
**Status**: Architecture Frozen ✅

This document defines **how all components connect at runtime**. This is the canonical wiring diagram for the entire platform.

---

## 0. Big Picture

At runtime we have **four kinds of processes**:

1. **CORE_UI** – Tauri/React desktop app + backend API
2. **OPAL_SE** – MCP / tools host, owns tools & system model
3. **sidecars/** – Independent services that talk to external systems or do heavy compute
4. **FDS** – Dev/demo mock data server (NOT a sidecar)

**Key Rule**: External systems (Jira, Jama, Outlook, etc.) are **only touched by sidecars**, never directly by OPAL or the UI.

---

## 1. Repo Layout

```
core-se-platform/
├── config/
│   └── sidecars.json               ← Canonical list of sidecars
├── sidecars/                        ← All sidecar services
│   ├── outlook-connector/           (Port 7010)
│   ├── jira-connector/              (Port 7020)
│   ├── jama-connector/              (Port 7030)
│   ├── windchill-connector/         (Port 7040)
│   ├── ms-tasks-connector/          (Port 7050)
│   ├── ims-connector/               (Port 7060)
│   ├── lessons-service/             (Port 7070) ✅ Implemented
│   ├── workload-service/            (Port 7080)
│   └── stem-python-sidecar/         (Port 7090)
├── apps/
│   ├── OPAL_SE/                     ← opal-server (Port 7788)
│   │   ├── tools/                   ← MCP tools
│   │   │   ├── registry.json        ← 21 tools defined
│   │   │   ├── common/
│   │   │   │   ├── types.ts
│   │   │   │   ├── http_client.ts
│   │   │   │   └── errors.ts
│   │   │   ├── system-model/        (10 tools)
│   │   │   ├── triage-and-pulse/    (4 tools)
│   │   │   ├── calendar-and-workload/ (4 tools)
│   │   │   └── lessons-learned/     (3 tools)
│   │   ├── src/                     ← Core OPAL (graph, auth, etc.)
│   │   └── .env                     ← All sidecar URLs configured
│   └── CORE_UI/                     ← Frontend + Backend
│       ├── frontend/                (Port 3000)
│       └── backend/                 (Port 8000)
└── FDS/                             ← Dev/demo mock (Port 4000)
```

---

## 2. Runtime Connections

### 2.1 UI → Backend → OPAL

```
CORE_UI/frontend → CORE_UI/backend
```
- **Protocol**: HTTP / WebSocket
- **Port**: 3000 → 8000
- **Examples**:
  - `GET /pulse`
  - `GET /calendar/day-summary`
  - `POST /ai/chat`

```
CORE_UI/backend → OPAL_SE
```
- **Protocol**: MCP / HTTP
- **Port**: 8000 → 7788
- **Examples**:
  - Call MCP tool `explainPulseItem`
  - Call MCP tool `workloadDaySummary`
  - Call MCP tool `searchLessons`

### 2.2 OPAL → Sidecars

`OPAL_SE` uses tools under `apps/OPAL_SE/tools/`

**Connection Flow**:
1. Tool handler in `tools/<category>/<tool-name>/handler.ts`
2. Uses `tools/common/http_client.ts` to call sidecar
3. HTTP client reads env var (e.g., `LESSONS_SERVICE_URL`)
4. Makes HTTP request to sidecar

**Example**: Tool `searchLessons`
- **Location**: `apps/OPAL_SE/tools/lessons-learned/search-lessons/`
- **Reads**: `LESSONS_SERVICE_URL=http://localhost:7070`
- **Calls**: `POST http://localhost:7070/api/lessons/search`

### 2.3 Sidecars → External Systems

Each sidecar owns its own outbound connections:

| Sidecar | Port | External System | Status |
|---------|------|----------------|--------|
| outlook-connector | 7010 | Microsoft Graph | 📋 Planned |
| jira-connector | 7020 | Jira REST API | 📋 Planned |
| jama-connector | 7030 | Jama REST API | 📋 Planned |
| windchill-connector | 7040 | Windchill REST/WS | 📋 Planned |
| ms-tasks-connector | 7050 | Planner / To Do | 📋 Planned |
| ims-connector | 7060 | IMS / MS Project | 📋 Planned |
| lessons-service | 7070 | SQLite DB | ✅ Implemented |
| workload-service | 7080 | Aggregates from connectors | 📋 Planned |
| stem-python-sidecar | 7090 | Python compute | 📋 Planned |

**Core Rule**: No other process calls external systems directly. **Only the relevant connector sidecar does.**

---

## 3. Configuration Files

### 3.1 Sidecar Registry: `config/sidecars.json`

**Single source of truth** for which sidecars exist.

**Contents**:
- 9 sidecars defined
- Each has: id, folder_name, port, env_vars, mcp_tools_proxied

**Coder AI Rules**:
- ✅ For each entry, ensure folder exists at `sidecars/<folder_name>/`
- ❌ Do not create sidecars not listed here
- ❌ Dev mocks go under `FDS/`, not `sidecars/`

### 3.2 Tool Registry: `apps/OPAL_SE/tools/registry.json`

**Single source of truth** for which tools exist.

**Contents**:
- 21 tools defined across 4 categories
- Each has: name, folder, category, type, sidecars

**Coder AI Rules**:
- ✅ If not in registry.json, it doesn't exist
- ✅ When adding tool: add to registry first, then create folder
- ❌ Do not create tools not in registry

### 3.3 Environment Variables: `apps/OPAL_SE/.env`

**All sidecar URLs configured**:

```bash
# Server
MCP_PORT=7788

# Sidecar Services - Connectors
OUTLOOK_CONNECTOR_URL=http://localhost:7010
JIRA_CONNECTOR_URL=http://localhost:7020
JAMA_CONNECTOR_URL=http://localhost:7030
WINDCHILL_CONNECTOR_URL=http://localhost:7040
MSTASKS_CONNECTOR_URL=http://localhost:7050
IMS_CONNECTOR_URL=http://localhost:7060

# Sidecar Services - Services
LESSONS_SERVICE_URL=http://localhost:7070
WORKLOAD_SERVICE_URL=http://localhost:7080

# Sidecar Services - Compute
STEM_PYTHON_URL=http://localhost:7090

# OpenAI
OPENAI_API_KEY=sk-proj-...
```

### 3.4 HTTP Client Mapping: `apps/OPAL_SE/tools/common/http_client.ts`

**Maps sidecar IDs to env vars**:

```typescript
const envVarMap: Record<string, string> = {
  'lessons-service': 'LESSONS_SERVICE_URL',
  'workload-service': 'WORKLOAD_SERVICE_URL',
  'outlook-connector': 'OUTLOOK_CONNECTOR_URL',
  'jira-connector': 'JIRA_CONNECTOR_URL',
  'jama-connector': 'JAMA_CONNECTOR_URL',
  'windchill-connector': 'WINDCHILL_CONNECTOR_URL',
  'ms-tasks-connector': 'MSTASKS_CONNECTOR_URL',
  'ims-connector': 'IMS_CONNECTOR_URL',
  'stem-python-sidecar': 'STEM_PYTHON_URL',
};
```

---

## 4. Tool Categories & Sidecar Dependencies

### 4.1 system-model (10 tools)

| Tool | Type | Sidecars |
|------|------|----------|
| getSystemSlice | core | none |
| querySystemModel | core | none |
| traceDownstreamImpact | core | none |
| traceUpstreamRationale | core | none |
| getVerificationCoverageMetrics | core | none |
| findVerificationGaps | core | none |
| checkAllocationConsistency | core | none |
| runConsistencyChecks | core | stem-python-sidecar |
| getEntityHistory | core | none |
| findSimilarPastChanges | core | none |

### 4.2 triage-and-pulse (4 tools)

| Tool | Type | Sidecars |
|------|------|----------|
| triageActivity | macro | jira, outlook, ms-tasks, workload |
| confirmTriageDecision | macro | jira |
| bulkTriage | macro | jira, outlook, ms-tasks, workload |
| explainPulseItem | macro | jira, outlook, lessons, workload |

### 4.3 calendar-and-workload (4 tools)

| Tool | Type | Sidecars |
|------|------|----------|
| getUserCalendar | proxy | outlook |
| workloadDaySummary | proxy | workload |
| workloadRangeSummary | proxy | workload |
| workloadDayDetail | proxy | workload, outlook |

### 4.4 lessons-learned (3 tools)

| Tool | Type | Sidecars |
|------|------|----------|
| searchLessons | proxy | lessons |
| getLessonDetail | proxy | lessons |
| suggestLessonsForActivity | macro | lessons |

---

## 5. Example End-to-End Flows

### 5.1 Lessons Learned in Impact Analysis

1. User opens Impact Analysis on REQ-123 in CORE_UI
2. **UI → Backend**: `GET /impact/REQ-123`
3. **Backend → OPAL**: 
   - Call tool `getSystemSlice(entity_id=REQ-123)`
   - Call tool `suggestLessonsForActivity(entity_id=REQ-123)`
4. **`suggestLessonsForActivity` handler**:
   - Uses OPAL graph to get discipline/subsystem
   - Calls tool `searchLessons(subsystems=["ECLSS"])`
5. **`searchLessons` handler**:
   - Uses `http_client.createSidecarClient('lessons-service')`
   - Reads `LESSONS_SERVICE_URL=http://localhost:7070`
   - Calls `POST http://localhost:7070/api/lessons/search`
6. **lessons-service**:
   - Queries SQLite DB
   - Computes embeddings similarity
   - Returns matching lessons
7. **OPAL → Backend → UI**: Display lessons in Impact panel

**Key**: Only `lessons-service` touches the lessons DB.

### 5.2 Early Warning Calendar

1. User opens Calendar page in CORE_UI
2. **UI → Backend**: `GET /workload/summary?start=2025-11-20&end=2025-11-27`
3. **Backend → OPAL**: Call tool `workloadRangeSummary(start, end)`
4. **`workloadRangeSummary` handler**:
   - Uses `http_client.createSidecarClient('workload-service')`
   - Calls `GET http://localhost:7080/api/workload/range`
5. **workload-service**:
   - Calls `outlook-connector` for meetings
   - Calls `jira-connector` for issues
   - Calls `ms-tasks-connector` for tasks
   - Calls `ims-connector` for milestones
   - Aggregates and computes load per day
   - Returns workload summary
6. **OPAL → Backend → UI**: Display calendar with load indicators

**Key**: No direct UI → Jira/Outlook calls; all aggregated via sidecars.

### 5.3 ARS Triage

1. New Jira item appears in Pulse (via `jira-connector` polling)
2. User clicks "Let AI triage" on card
3. **UI → Backend → OPAL**: Call tool `triageActivity(activity_id)`
4. **`triageActivity` handler**:
   - Fetches activity context from OPAL graph
   - Calls `workload-service` for current load
   - Calls LLM (OpenAI/Ollama) with features
   - Returns triage decision (category, importance)
5. User clicks "Send to ARS"
6. **UI → Backend → OPAL**: Call tool `confirmTriageDecision(activity_id, decision)`
7. **`confirmTriageDecision` handler**:
   - Updates OPAL state
   - Calls `jira-connector` to update labels/status in Jira
8. **OPAL → Backend → UI**: Confirm triage complete

**Key**: Only `jira-connector` talks to Jira API.

---

## 6. Dev vs Prod Connections

### Production
- Sidecars point to **real external systems** via env vars
- `FDS/` is unused

**Example**:
```bash
JIRA_BASE_URL=https://company.atlassian.net
OUTLOOK_BASE_URL=https://graph.microsoft.com
```

### Development / Demo
- Same sidecars, same tools
- Only **env vars change** to point to mock server

**Example**:
```bash
JIRA_BASE_URL=http://localhost:4000/jira-mock
OUTLOOK_BASE_URL=http://localhost:4000/outlook-mock
```

**FDS (Fake Data Server)**:
- Location: `FDS/` (Port 4000)
- Purpose: Pretends to be Jira/Outlook/etc. for demos
- **NOT a sidecar** - just a dev mock
- No tool or sidecar imports from FDS

---

## 7. Verification Checklist

### ✅ Sidecars
- [x] `config/sidecars.json` defines 9 sidecars
- [x] Each sidecar has port allocation (7010-7090)
- [x] `lessons-service` implemented at port 7070
- [ ] Other 8 sidecars to be implemented

### ✅ Tools
- [x] `apps/OPAL_SE/tools/registry.json` defines 21 tools
- [x] Tools organized in 4 categories
- [x] Common utilities in `tools/common/`
- [ ] Tool implementations to be created per registry

### ✅ Environment
- [x] `apps/OPAL_SE/.env` has all 9 sidecar URLs
- [x] `http_client.ts` maps all 9 sidecar IDs to env vars
- [x] Port 7788 for OPAL_SE
- [x] Port 7070 for lessons-service

### ✅ Documentation
- [x] `PLATFORM_ARCHITECTURE.md` - Platform structure
- [x] `TOOLS_ARCHITECTURE.md` - Tools structure
- [x] `ARCH-CONNECTIONS.md` - This file
- [x] `config/sidecars.json` - Sidecar registry
- [x] `apps/OPAL_SE/tools/registry.json` - Tool registry

---

## 8. Port Allocation Summary

| Port | Service | Type | Status |
|------|---------|------|--------|
| 3000 | CORE_UI Frontend | App | ✅ |
| 4000 | FDS Mock Server | Dev Mock | ✅ |
| 7788 | OPAL_SE | App | ✅ |
| 8000 | CORE_UI Backend | App | ✅ |
| 7010 | outlook-connector | Sidecar | 📋 |
| 7020 | jira-connector | Sidecar | 📋 |
| 7030 | jama-connector | Sidecar | 📋 |
| 7040 | windchill-connector | Sidecar | 📋 |
| 7050 | ms-tasks-connector | Sidecar | 📋 |
| 7060 | ims-connector | Sidecar | 📋 |
| 7070 | lessons-service | Sidecar | ✅ |
| 7080 | workload-service | Sidecar | 📋 |
| 7090 | stem-python-sidecar | Sidecar | 📋 |

---

## 9. Key Rules for Coder AI

### ✅ DO:
- Read `config/sidecars.json` for sidecar definitions
- Read `apps/OPAL_SE/tools/registry.json` for tool definitions
- Use `tools/common/http_client` to call sidecars
- Add env vars to `apps/OPAL_SE/.env` for new sidecars
- Follow standard folder structures

### ❌ DON'T:
- Create sidecars not in `config/sidecars.json`
- Create tools not in `tools/registry.json`
- Put sidecars under `FDS/` (that's for mocks)
- Have UI or OPAL call external systems directly
- Import from other tools (keep decoupled)

---

## Summary

✅ **All Connections Verified**

- 9 sidecars defined, 1 implemented (lessons-service)
- 21 tools defined across 4 categories
- All sidecar URLs configured in OPAL .env
- HTTP client maps all sidecar IDs
- Clear separation: UI → Backend → OPAL → Tools → Sidecars → External Systems
- Dev mocks separate from production sidecars

**Architecture is frozen and ready for implementation!** 🎉
