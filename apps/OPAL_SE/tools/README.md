# OPAL Tools Layer

This directory contains all MCP tools that OPAL exposes to SLIMs (Specialized Language Interaction Models).

## Architecture Principles

1. **Tools live in OPAL**, not in sidecars
2. **Sidecars expose REST APIs**, tools call them
3. **Tools are categorized** by domain (system-model, triage-and-pulse, etc.)
4. **registry.json is the single source of truth** for all tools

## Tool Types

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

## Directory Structure

```
tools/
├── README.md                    ← This file
├── registry.json                ← Canonical tool list
├── common/                      ← Shared utilities
│   ├── types.ts
│   ├── http_client.ts
│   └── errors.ts
├── system-model/                ← Category: System model & traceability
│   ├── get-system-slice/
│   ├── trace-downstream-impact/
│   └── ...
├── triage-and-pulse/            ← Category: Triage & pulse
│   ├── triage-activity/
│   ├── bulk-triage/
│   └── ...
├── calendar-and-workload/       ← Category: Calendar & early warning
│   ├── get-user-calendar/
│   ├── workload-day-summary/
│   └── ...
└── lessons-learned/             ← Category: Lessons learned
    ├── search-lessons/
    ├── get-lesson-detail/
    └── suggest-lessons-for-activity/
```

## Standard Tool Folder Structure

Every tool folder follows this template:

```
<category>/<tool-name>/
├── README.md              ← Purpose, type, sidecars used
├── schema.ts              ← Input/output types
├── handler.ts             ← MCP tool implementation
├── config.json            ← Metadata for registry
└── tests/
    └── test_handler.ts    ← Unit tests
```

### README.md (per tool)
Must include:
- One-sentence purpose
- Type (core, proxy, or macro)
- Which sidecars it calls (if any)
- Where it's used in the UI

Example:
```markdown
# getSystemSlice

Purpose: Return a bounded subgraph around one or more entities in the system model.

Type: core

Sidecars: none (talks directly to OPAL graph)

Used by:
- Impact Analysis view
- suggestLessonsForActivity macro
```

### schema.ts
- Defines input and output types for this tool only
- Imports shared primitives from `tools/common/types`
- Never imports from other tools

### handler.ts
- Implements the MCP tool
- Validates input using schema
- Calls OPAL graph APIs and/or sidecars
- Returns data shaped by schema
- **Never embeds prompt text** (that belongs in SLIM)

### config.json
Tool metadata for registry and MCP host:
```json
{
  "toolName": "getSystemSlice",
  "folder": "system-model/get-system-slice",
  "category": "system-model",
  "type": "core",
  "description": "Return a bounded subgraph around one or more entities.",
  "sidecars": [],
  "enabled": true
}
```

### tests/test_handler.ts
- Unit tests for handler logic
- Happy path + basic failures
- Use mocks for sidecars/graph calls

## Tool Categories

### system-model (10 tools)
System model queries, traceability, verification, consistency checks.

**Tools**:
- `getSystemSlice` - Get bounded subgraph
- `querySystemModel` - Query system model
- `traceDownstreamImpact` - Trace downstream dependencies
- `traceUpstreamRationale` - Trace upstream rationale
- `getVerificationCoverageMetrics` - Get V&V coverage metrics
- `findVerificationGaps` - Find V&V gaps
- `checkAllocationConsistency` - Check allocation consistency
- `runConsistencyChecks` - Run consistency checks (uses STEM sidecar)
- `getEntityHistory` - Get entity change history
- `findSimilarPastChanges` - Find similar past changes

### triage-and-pulse (4 tools)
Activity triage, pulse item management, routing decisions.

**Tools**:
- `triageActivity` - Triage a single activity (macro)
- `confirmTriageDecision` - Confirm triage decision
- `bulkTriage` - Triage multiple activities (macro)
- `explainPulseItem` - Explain why item is in pulse (macro)

### calendar-and-workload (4 tools)
Calendar access, workload computation, early warning.

**Tools**:
- `getUserCalendar` - Get user's calendar events (proxy)
- `workloadDaySummary` - Get day-level workload summary (proxy)
- `workloadRangeSummary` - Get date range workload summary (proxy)
- `workloadDayDetail` - Get detailed day breakdown (proxy)

### lessons-learned (3 tools)
Lessons learned search and retrieval.

**Tools**:
- `searchLessons` - Search lessons with filters (proxy)
- `getLessonDetail` - Get full lesson detail (proxy)
- `suggestLessonsForActivity` - Suggest relevant lessons (macro)

## Common Utilities

### tools/common/types.ts
Shared DTOs used across tools:
- `EntityId` - Entity identifier
- `Node` - Graph node
- `Edge` - Graph edge
- `ImpactedEntity` - Entity with impact metadata
- `Lesson` - Lesson learned object
- etc.

### tools/common/http_client.ts
Thin HTTP wrapper to call sidecars:
- Handles base URLs from config
- Standard error handling
- Timeout management

### tools/common/errors.ts
Common error classes:
- `ToolError` - Base error
- `ValidationError` - Input validation failed
- `SidecarError` - Sidecar call failed
- `NotFoundError` - Entity not found

## Adding a New Tool

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

## Rules

✅ **DO**:
- Add all tools to `registry.json`
- Follow standard folder structure
- Use shared types from `common/`
- Write unit tests
- Document purpose and usage

❌ **DON'T**:
- Create tools outside this directory
- Put MCP tool code in sidecars
- Import from other tool folders
- Embed prompt text in handlers
- Create tools not in `registry.json`

## Tool vs. Sidecar

| Aspect | Tool | Sidecar |
|--------|------|---------|
| **Location** | `apps/opal-server/tools/` | `sidecars/` |
| **Protocol** | MCP | REST HTTP |
| **Called by** | SLIMs | OPAL tools |
| **Owns** | Orchestration logic | Domain data & APIs |
| **Examples** | `triageActivity`, `searchLessons` | `lessons-service`, `jira-connector` |

## References

- **Tool Registry**: `registry.json`
- **Sidecar Registry**: `../../config/sidecars.json`
- **Platform Architecture**: `../../PLATFORM_ARCHITECTURE.md`
