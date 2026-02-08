# OPAL Tools Architecture

**Version**: 0.1  
**Date**: November 20, 2025  
**Status**: Architecture Locked ✅

---

## Purpose

This document defines the **canonical structure for all OPAL MCP tools**. This prevents the Coder AI from "freelancing" and ensures consistency across the platform.

---

## 1. Where Tools Live

```
core-se-platform/
├── apps/
│   └── OPAL_SE/
│       ├── tools/              ← ✅ ALL MCP tools live here
│       ├── src/                ← OPAL core (graph, memory, etc.)
│       └── ...
├── sidecars/                   ← Separate processes, NOT tools
└── config/
```

**Key Principle**: **OPAL owns the tools layer**. Sidecars are separate processes under `/sidecars`.

---

## 2. Tools Folder Structure

```
apps/OPAL_SE/tools/
├── README.md                   ← Explains tools layer conceptually
├── registry.json               ← ✅ Canonical list of all tools
├── common/                     ← Shared utilities
│   ├── types.ts                ← Shared DTOs
│   ├── http_client.ts          ← HTTP wrapper for sidecars
│   └── errors.ts               ← Common error classes
│
├── system-model/               ← Category: System model & traceability
│   ├── get-system-slice/
│   ├── query-system-model/
│   ├── trace-downstream-impact/
│   ├── trace-upstream-rationale/
│   ├── get-verification-coverage-metrics/
│   ├── find-verification-gaps/
│   ├── check-allocation-consistency/
│   ├── run-consistency-checks/
│   ├── get-entity-history/
│   └── find-similar-past-changes/
│
├── triage-and-pulse/           ← Category: Triage & pulse
│   ├── triage-activity/
│   ├── confirm-triage-decision/
│   ├── bulk-triage/
│   └── explain-pulse-item/
│
├── calendar-and-workload/      ← Category: Calendar & early warning
│   ├── get-user-calendar/
│   ├── workload-day-summary/
│   ├── workload-range-summary/
│   └── workload-day-detail/
│
└── lessons-learned/            ← Category: Lessons learned
    ├── search-lessons/
    ├── get-lesson-detail/
    └── suggest-lessons-for-activity/
```

---

## 3. Standard Tool Folder Structure

**Every tool folder must follow this template**:

```
<category>/<tool-name>/
├── README.md              ← Purpose, type, sidecars used
├── schema.ts              ← Input/output types for this tool only
├── handler.ts             ← MCP tool implementation
├── config.json            ← Metadata for registry
└── tests/
    └── test_handler.ts    ← Unit tests
```

### 3.1 README.md (per tool)

**Required contents**:
1. One-sentence purpose
2. Type (core, proxy, or macro)
3. Which sidecars it calls (if any)
4. Where it's used in the UI

**Example**:
```markdown
# getSystemSlice

Purpose: Return a bounded subgraph around one or more entities in the system model.

Type: core

Sidecars: none (talks directly to OPAL graph)

Used by:
- Impact Analysis view
- suggestLessonsForActivity macro
```

### 3.2 schema.ts

- Defines input and output types **for this tool only**
- Imports shared primitives from `tools/common/types`
- **Never imports from other tools**

**Example**:
```typescript
import { EntityId, Graph } from '../../common/types';

export interface GetSystemSliceInput {
  entityIds: EntityId[];
  depth?: number;
  includeTypes?: string[];
}

export interface GetSystemSliceOutput {
  graph: Graph;
  centerNodes: EntityId[];
}
```

### 3.3 handler.ts

- Implements the MCP tool
- Validates input using schema
- Calls OPAL graph APIs and/or sidecars
- Returns data shaped by schema
- **Never embeds prompt text** (that belongs in SLIM)

**Example**:
```typescript
import { GetSystemSliceInput, GetSystemSliceOutput } from './schema';
import { ValidationError } from '../../common/errors';

export async function handler(input: GetSystemSliceInput): Promise<GetSystemSliceOutput> {
  // Validate
  if (!input.entityIds || input.entityIds.length === 0) {
    throw new ValidationError('entityIds is required');
  }

  // Call OPAL graph
  const graph = await getGraphSlice(input.entityIds, input.depth || 2);

  // Return
  return {
    graph,
    centerNodes: input.entityIds,
  };
}
```

### 3.4 config.json

Tool metadata for registry and MCP host:

```json
{
  "toolName": "getSystemSlice",
  "folder": "system-model/get-system-slice",
  "category": "system-model",
  "type": "core",
  "description": "Return a bounded subgraph around one or more entities in the system model.",
  "sidecars": [],
  "enabled": true
}
```

### 3.5 tests/test_handler.ts

- Unit tests for handler logic
- Happy path + basic failures
- Use mocks for sidecars/graph calls

---

## 4. Common Utilities (`tools/common/`)

### types.ts
Shared DTOs used across tools:
- `EntityId`, `Node`, `Edge`, `Graph`
- `ImpactedEntity`, `VerificationCoverage`, `VerificationGap`
- `TriageResult`, `PulseItem`
- `CalendarEvent`, `WorkloadSummary`, `Task`
- `Lesson`, `LessonSearchResult`
- `EntityHistory`, `ChangeRecord`
- `ConsistencyCheck`, `AllocationConsistency`
- `ToolResponse`, `ToolError`
- `PaginationParams`, `FilterParams`

### http_client.ts
Thin HTTP wrapper to call sidecars:
- Handles base URLs from environment variables
- Standard error handling
- Timeout management (30s default)
- Methods: `get()`, `post()`, `put()`, `delete()`, `patch()`

**Usage**:
```typescript
import { createSidecarClient } from '../../common/http_client';

const client = createSidecarClient('lessons-service');
const result = await client.post('/api/lessons/search', { query: 'valve failure' });
```

### errors.ts
Common error classes:
- `ToolError` - Base error
- `ValidationError` - Input validation failed
- `SidecarError` - Sidecar call failed
- `NotFoundError` - Entity not found
- `TimeoutError` - Request timeout
- `NetworkError` - Network error
- `ConfigError` - Configuration error
- `UnauthorizedError` - Auth failed
- `ForbiddenError` - Permission denied

---

## 5. Tool Registry (`registry.json`)

**Single source of truth** for all tools.

**Location**: `apps/OPAL_SE/tools/registry.json`

**Format**:
```json
{
  "version": "0.1",
  "tools": [
    {
      "name": "toolName",
      "folder": "category/tool-folder",
      "category": "category-name",
      "type": "core|proxy|macro",
      "sidecars": ["sidecar-id"]
    }
  ]
}
```

**Rules**:
- ✅ If it's not in `registry.json`, it's not a tool
- ✅ Coder AI must add entry here before creating tool
- ✅ Tool folder must match `folder` field exactly

---

## 6. Tool Categories

### system-model (10 tools)
System model queries, traceability, verification, consistency checks.

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

### triage-and-pulse (4 tools)
Activity triage, pulse item management, routing decisions.

| Tool | Type | Sidecars |
|------|------|----------|
| triageActivity | macro | jira, outlook, ms-tasks, workload |
| confirmTriageDecision | macro | jira |
| bulkTriage | macro | jira, outlook, ms-tasks, workload |
| explainPulseItem | macro | jira, outlook, lessons, workload |

### calendar-and-workload (4 tools)
Calendar access, workload computation, early warning.

| Tool | Type | Sidecars |
|------|------|----------|
| getUserCalendar | proxy | outlook |
| workloadDaySummary | proxy | workload |
| workloadRangeSummary | proxy | workload |
| workloadDayDetail | proxy | workload, outlook |

### lessons-learned (3 tools)
Lessons learned search and retrieval.

| Tool | Type | Sidecars |
|------|------|----------|
| searchLessons | proxy | lessons |
| getLessonDetail | proxy | lessons |
| suggestLessonsForActivity | macro | lessons |

**Total**: 21 tools across 4 categories

---

## 7. Tool Types

### Core Tools (`type: "core"`)
- Talk directly to OPAL's graph database and internal services
- No sidecar dependencies (or minimal)
- Examples: `getSystemSlice`, `traceDownstreamImpact`

### Proxy Tools (`type: "proxy"`)
- Thin wrappers around a single sidecar API call
- Minimal logic, just validation and forwarding
- Examples: `searchLessons`, `getUserCalendar`

### Macro Tools (`type: "macro"`)
- Orchestrate multiple tools and/or sidecars
- Contain workflow logic
- Examples: `triageActivity`, `suggestLessonsForActivity`

---

## 8. Adding a New Tool

**Process**:

1. **Add entry to `registry.json`**:
   ```json
   {
     "name": "newTool",
     "folder": "category/new-tool",
     "category": "category",
     "type": "core|proxy|macro",
     "sidecars": ["sidecar-id"]
   }
   ```

2. **Create folder**: `tools/<category>/<new-tool>/`

3. **Create standard files**:
   - `README.md` - Purpose, type, sidecars
   - `schema.ts` - Input/output types
   - `handler.ts` - Implementation
   - `config.json` - Metadata
   - `tests/test_handler.ts` - Tests

4. **Import shared types** from `tools/common/types`

5. **Never import from other tools** - keeps tools decoupled

---

## 9. Rules for Coder AI

### ✅ DO:
- Add all tools to `registry.json` first
- Follow standard folder structure exactly
- Use shared types from `common/`
- Write unit tests
- Document purpose and usage in README
- Keep tools decoupled (no cross-imports)

### ❌ DON'T:
- Create tools outside `apps/opal-server/tools/`
- Put MCP tool code in sidecars
- Import from other tool folders
- Embed prompt text in handlers
- Create tools not in `registry.json`
- Mix tool logic with sidecar logic

---

## 10. Tool vs. Sidecar

| Aspect | Tool | Sidecar |
|--------|------|---------|
| **Location** | `apps/OPAL_SE/tools/` | `sidecars/` |
| **Protocol** | MCP | REST HTTP |
| **Called by** | SLIMs | OPAL tools |
| **Owns** | Orchestration logic | Domain data & APIs |
| **Registry** | `tools/registry.json` | `config/sidecars.json` |
| **Examples** | `triageActivity`, `searchLessons` | `lessons-service`, `jira-connector` |

---

## 11. Environment Variables

Tools use environment variables to locate sidecars:

| Sidecar | Environment Variable |
|---------|---------------------|
| lessons-service | `LESSONS_SERVICE_URL` |
| workload-service | `WORKLOAD_SERVICE_URL` |
| outlook-connector | `OUTLOOK_CONNECTOR_URL` |
| jira-connector | `JIRA_CONNECTOR_URL` |
| jama-connector | `JAMA_CONNECTOR_URL` |
| windchill-connector | `WINDCHILL_CONNECTOR_URL` |
| ms-tasks-connector | `MSTASKS_CONNECTOR_URL` |
| ims-connector | `IMS_CONNECTOR_URL` |
| stem-python-sidecar | `STEM_PYTHON_URL` |

**Example `.env`**:
```bash
LESSONS_SERVICE_URL=http://localhost:7070
WORKLOAD_SERVICE_URL=http://localhost:7080
JIRA_CONNECTOR_URL=http://localhost:7020
```

---

## 12. References

- **Tool Registry**: `apps/OPAL_SE/tools/registry.json`
- **Sidecar Registry**: `config/sidecars.json`
- **Platform Architecture**: `PLATFORM_ARCHITECTURE.md`
- **Tools README**: `apps/OPAL_SE/tools/README.md`

---

## Summary

✅ **Architecture Locked**

- 21 tools across 4 categories
- Standard folder structure for all tools
- `registry.json` is single source of truth
- Tools in `apps/OPAL_SE/tools/`, sidecars in `sidecars/`
- Shared utilities in `tools/common/`
- Clear separation: tools orchestrate, sidecars own data

**This prevents the Coder AI from freelancing and ensures consistency!** 🎉
