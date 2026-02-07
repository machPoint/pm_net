# CORE SE Tools Catalog

All tools refactored to follow **CORE SE Function Design Rules**.

## Summary

- **Total Tools**: 10
- **Layer**: Core (Layer 1) - Thin wrappers over system services
- **All tools follow**: Deterministic, bounded, domain-typed, structured output, traceable

---

## Tool 1: querySystemModel

**Category**: Query  
**Status**: ✅ Refactored  
**Layer**: Core

### Purpose
Query the system graph with flexible filters for nodes and edges.

### Parameters (Domain-Typed)
```typescript
{
  project_id: string;          // Required: bounded to project
  node_filter?: NodeFilter;    // Optional: type, subsystem, status, ids
  edge_filter?: EdgeFilter;    // Optional: relation_type, source/target
  limit?: number;              // Default: 100 (bounded)
  offset?: number;             // Default: 0
}
```

### Output Structure
```typescript
{
  summary: "Found 23 nodes and 45 edges in project PROJ-001",
  details: {
    count: 68,
    items: { nodes: [...], edges: [...] },
    filters_applied: {...},
    total_available: 68
  },
  raw: { nodes, edges, nodesByType },
  tool_call_id: "call_abc123",
  source_tools: ["systemGraphService"],
  timestamp: "2025-11-18T...",
  duration_ms: 45
}
```

### Design Rule Compliance
- ✅ Deterministic: Same filters always return same results
- ✅ Bounded: Limited by `limit` parameter (default 100)
- ✅ Domain-typed: Uses `project_id`, `NodeFilter`, `EdgeFilter`
- ✅ Structured output: Has summary, details, raw
- ✅ Traceable: Has tool_call_id and source_tools

---

## Tool 2: getSystemSlice

**Category**: Analysis  
**Status**: ✅ Refactored  
**Layer**: Core

### Purpose
Extract a bounded subgraph around specific nodes or within a subsystem.

### Parameters (Domain-Typed)
```typescript
{
  project_id: string;               // Required
  subsystem?: string;               // Bounded by subsystem
  start_node_ids?: string[];        // Bounded by explicit IDs
  max_depth?: number;               // Default: 2, max: 5
  include_relation_types?: string[];
}
```

### Output Structure
```typescript
{
  summary: "Extracted 142 nodes from Propulsion subsystem",
  details: {
    count: 142,
    items: {
      nodes: [...],
      edges: [...],
      metadata: {
        node_counts_by_type: {...},
        edge_counts_by_type: {...},
        subsystem: "Propulsion",
        depth_used: 2
      }
    }
  },
  raw: {...},
  tool_call_id: "call_def456",
  source_tools: ["systemGraphService"]
}
```

### Design Rule Compliance
- ✅ Deterministic: Same scope always returns same slice
- ✅ Bounded: Must specify subsystem OR start_node_ids
- ✅ Domain-typed: Uses `subsystem`, `start_node_ids`, `max_depth`
- ✅ Structured output: Summary, details, raw
- ✅ Traceable: Full audit trail

---

## Tool 3: traceDownstreamImpact

**Category**: Traceability  
**Status**: ✅ Refactored  
**Layer**: Core

### Purpose
Trace downstream impact from one or more starting nodes.

### Parameters (Domain-Typed)
```typescript
{
  project_id: string;
  start_node_ids: string[];         // Explicit bounded scope
  max_depth?: number;               // Default: 3, max: 5
  include_relation_types?: string[];
}
```

### Output Structure
```typescript
{
  summary: "Traced downstream impact to 87 nodes across 5 types",
  details: {
    start_nodes: ["REQ-001", "REQ-002"],
    affected_nodes: [...],
    trace_paths: [
      { path: ["REQ-001", "TEST-005"], relations: ["VERIFIED_BY"], depth: 1 }
    ],
    depth_reached: 3,
    statistics: {
      total_nodes: 87,
      by_type: { Requirement: 23, TestCase: 45, Component: 19 },
      by_subsystem: { Propulsion: 50, ThermalControl: 37 }
    }
  },
  raw: {...},
  tool_call_id: "call_ghi789",
  source_tools: ["systemGraphService"]
}
```

### Design Rule Compliance
- ✅ Deterministic: Same start nodes + depth = same result
- ✅ Bounded: Explicit `start_node_ids` list, capped `max_depth`
- ✅ Domain-typed: Uses `start_node_ids`, `affected_nodes`, `trace_paths`
- ✅ Structured output: Rich details with statistics
- ✅ Traceable: Full lineage

---

## Tool 4: traceUpstreamRationale

**Category**: Traceability  
**Status**: ✅ Refactored  
**Layer**: Core

### Purpose
Trace upstream to find parent requirements and rationale.

### Parameters (Domain-Typed)
```typescript
{
  project_id: string;
  start_node_ids: string[];  // Explicit bounded scope
  max_depth?: number;        // Default: 3, max: 5
}
```

### Output Structure
```typescript
{
  summary: "Traced upstream rationale to 34 parent nodes",
  details: {
    start_nodes: ["REQ-042"],
    affected_nodes: [...],
    trace_paths: [...],
    depth_reached: 3,
    statistics: {
      total_nodes: 34,
      by_type: { Requirement: 30, Document: 4 }
    }
  },
  raw: {...},
  tool_call_id: "call_jkl012",
  source_tools: ["systemGraphService"]
}
```

### Design Rule Compliance
- ✅ Deterministic: Same inputs = same output
- ✅ Bounded: Explicit node list + depth limit
- ✅ Domain-typed: SE vocabulary throughout
- ✅ Structured output: Consistent format
- ✅ Traceable: Complete audit trail

---

## Tool 5: findVerificationGaps

**Category**: Verification  
**Status**: ✅ Refactored  
**Layer**: Core

### Purpose
Identify requirements without proper verification.

### Parameters (Domain-Typed)
```typescript
{
  project_id: string;
  requirement_ids?: string[];  // Optional bounded scope
  subsystem?: string;          // Optional bounded scope
}
```

### Output Structure
```typescript
{
  summary: "Verification coverage: 87% (123/142), 19 gaps found",
  details: {
    coverage_percentage: 87,
    total_requirements: 142,
    verified_requirements: 123,
    gaps: [
      {
        requirement_id: "REQ-THM-005",
        requirement_title: "Heat dissipation rate",
        severity: "high",
        reason: "No verification test case allocated",
        gap_type: "no_test_case",
        recommendations: [...]
      }
    ],
    subsystem_breakdown: {
      Propulsion: { coverage: 95, total: 50, verified: 47, gaps: 3 },
      ThermalControl: { coverage: 72, total: 92, verified: 66, gaps: 26 }
    }
  },
  raw: {...},
  tool_call_id: "call_mno345",
  source_tools: ["systemGraphService"]
}
```

### Design Rule Compliance
- ✅ Deterministic: Same requirements = same gaps
- ✅ Bounded: Scoped by requirement_ids or subsystem
- ✅ Domain-typed: Uses `requirement_ids`, `verification_gaps`, `gap_type`
- ✅ Structured output: Rich verification details
- ✅ Traceable: All gaps tracked

---

## Tool 6: checkAllocationConsistency

**Category**: Validation  
**Status**: ✅ Refactored  
**Layer**: Core

### Purpose
Check allocation consistency across components and requirements.

### Parameters (Domain-Typed)
```typescript
{
  project_id: string;
  subsystem?: string;       // Optional bounded scope
  component_ids?: string[]; // Optional bounded scope
}
```

### Output Structure
```typescript
{
  summary: "Found 5 allocation consistency violations",
  details: {
    passed: false,
    total_checks: 78,
    violations: [
      {
        id: "alloc_COMP-042",
        violation_type: "no_requirements_allocated",
        severity: "medium",
        affected_nodes: ["COMP-042"],
        description: "Component has no requirements allocated",
        rule_id: "ALLOC_001"
      }
    ],
    by_severity: { critical: 0, high: 2, medium: 3, low: 0 },
    by_type: { no_requirements_allocated: 5 }
  },
  raw: {...},
  tool_call_id: "call_pqr678",
  source_tools: ["systemGraphService"]
}
```

### Design Rule Compliance
- ✅ Deterministic: Same components = same violations
- ✅ Bounded: Scoped by subsystem or component_ids
- ✅ Domain-typed: Uses `component_ids`, `ConsistencyViolation`, `Severity`
- ✅ Structured output: Detailed violation info
- ✅ Traceable: Each violation has ID

---

## Tool 7: getVerificationCoverageMetrics

**Category**: Metrics  
**Status**: ✅ Refactored  
**Layer**: Core

### Purpose
Calculate comprehensive verification coverage metrics.

### Parameters (Domain-Typed)
```typescript
{
  project_id: string;
  subsystem?: string;  // Optional bounded scope
}
```

### Output Structure
```typescript
{
  summary: "Verification coverage: 87% across 3 subsystems",
  details: {
    coverage_percentage: 87,
    total_requirements: 142,
    verified_requirements: 123,
    gaps: [...],
    subsystem_breakdown: {...}
  },
  raw: {...},
  tool_call_id: "call_stu901",
  source_tools: ["systemGraphService"]
}
```

### Design Rule Compliance
- ✅ Deterministic: Metrics computed consistently
- ✅ Bounded: Scoped by project or subsystem
- ✅ Domain-typed: Uses `verification_coverage`, `coverage_percentage`
- ✅ Structured output: Comprehensive metrics
- ✅ Traceable: Metrics sourced from specific tools

---

## Tool 8: getHistory

**Category**: History  
**Status**: ✅ Refactored  
**Layer**: Core

### Purpose
Get chronological event history for specific entities.

### Parameters (Domain-Typed)
```typescript
{
  project_id: string;
  entity_id: string;  // Single entity (bounded)
  limit?: number;     // Default: 50
}
```

### Output Structure
```typescript
{
  summary: "Retrieved 47 events for entity REQ-001",
  details: {
    count: 47,
    items: {
      events: [
        { event_id, timestamp, event_type, entity_id, data }
      ],
      timeline: [...]
    }
  },
  raw: {...},
  tool_call_id: "call_vwx234",
  source_tools: ["eventLogService"]
}
```

### Design Rule Compliance
- ✅ Deterministic: Same entity = same history
- ✅ Bounded: Single `entity_id` + limit
- ✅ Domain-typed: Uses `entity_id`, `event_type`
- ✅ Structured output: Events + timeline
- ✅ Traceable: All events have IDs

---

## Tool 9: findSimilarPastChanges

**Category**: Analysis  
**Status**: ✅ Refactored  
**Layer**: Core

### Purpose
Find similar change patterns in historical change sets.

### Parameters (Domain-Typed)
```typescript
{
  project_id: string;
  change_description: string;
  limit?: number;  // Default: 10
}
```

### Output Structure
```typescript
{
  summary: "Found 7 similar past changes",
  details: {
    count: 7,
    items: {
      similar_changes: [
        {
          change_set_id,
          description,
          similarity_score: 0.85,
          timestamp,
          affected_nodes: [...]
        }
      ]
    }
  },
  raw: {...},
  tool_call_id: "call_yz567",
  source_tools: ["changeSetService"]
}
```

### Design Rule Compliance
- ✅ Deterministic: Same description = same results (with scoring)
- ✅ Bounded: Limited by `limit` parameter
- ✅ Domain-typed: Uses `change_description`, `change_set_id`
- ✅ Structured output: With similarity scores
- ✅ Traceable: Change sets tracked

---

## Tool 10: runConsistencyChecks

**Category**: Validation  
**Status**: ✅ Refactored  
**Layer**: Core

### Purpose
Run consistency checks using the rule engine.

### Parameters (Domain-Typed)
```typescript
{
  project_id: string;
  rule_set?: string;         // Default: 'default'
  scope_node_ids?: string[]; // Optional bounded scope
}
```

### Output Structure
```typescript
{
  summary: "Found 12 consistency violations using default rule set",
  details: {
    passed: false,
    total_checks: 156,
    violations: [
      {
        id: "viol_001",
        violation_type: "missing_trace_link",
        severity: "high",
        affected_nodes: ["REQ-001", "COMP-005"],
        description: "Requirement lacks trace to component",
        rule_id: "TRACE_001"
      }
    ],
    by_severity: { critical: 2, high: 5, medium: 5, low: 0 },
    by_type: { missing_trace_link: 8, circular_dependency: 4 }
  },
  raw: {...},
  tool_call_id: "call_abc890",
  source_tools: ["ruleEngineService"]
}
```

### Design Rule Compliance
- ✅ Deterministic: Same rules + scope = same violations
- ✅ Bounded: Scoped by `scope_node_ids` or `rule_set`
- ✅ Domain-typed: Uses `rule_set`, `violation_type`, `ConsistencyViolation`
- ✅ Structured output: Rich violation details
- ✅ Traceable: Each violation has rule_id

---

## Cross-Tool Patterns

### All Tools Share:

1. **Bounded Scope**
   - Every tool requires `project_id`
   - Additional bounds via: `ids`, `subsystem`, `limit`, `max_depth`

2. **Domain Vocabulary**
   - `requirement_ids`, `component_ids`, `verification_ids`
   - `subsystem`, `trace_paths`, `verification_gaps`
   - `consistency_violations`, `change_set_id`

3. **Structured Output**
   ```typescript
   {
     summary: string,          // Human-readable 1-2 sentences
     details: {...},           // Domain-structured, typed
     raw: {...},               // Debug info
     tool_call_id: string,     // Unique ID
     source_tools: string[],   // Audit trail
     timestamp: string,        // ISO timestamp
     duration_ms: number       // Execution time
   }
   ```

4. **Error Handling**
   - Validation of required parameters
   - Type checking
   - Bounded scope enforcement
   - Meaningful error messages

5. **Traceability**
   - Every call logged to audit service
   - tool_call_id for correlation
   - source_tools for transparency

---

## Next: Macro Tools (Layer 2)

These 10 core tools can now be composed into macro tools:

### Example Macro Tools

1. **assessChangeImpact**
   - Combines: `traceDownstreamImpact` + `findVerificationGaps` + `runConsistencyChecks`
   - Returns: Comprehensive impact assessment with risk level

2. **validateDesignConsistency**
   - Combines: `getSystemSlice` + `checkAllocationConsistency` + `runConsistencyChecks`
   - Returns: Full design validation report

3. **generateVerificationMatrix**
   - Combines: `querySystemModel` + `findVerificationGaps` + `getVerificationCoverageMetrics`
   - Returns: Complete verification matrix with coverage

4. **analyzeRequirementLineage**
   - Combines: `traceUpstreamRationale` + `traceDownstreamImpact` + `getHistory`
   - Returns: Full lineage tree with historical context

---

## Implementation Status

- ✅ Design rules documented
- ✅ Type system created (`core-se.ts`)
- ✅ Utility functions created (`coreSEFunction.ts`)
- ✅ All 10 core tools refactored to new patterns
- ⏳ TypeScript compilation issues to resolve
- ⏳ Integration with diagnostics endpoint
- ⏳ Macro tools layer to implement

---

## Benefits Achieved

1. **Predictability**: All functions deterministic and bounded
2. **Type Safety**: Strong typing throughout
3. **Consistency**: All outputs follow same structure
4. **Auditability**: Every call fully traceable
5. **Composability**: Core tools ready for macro layer
6. **LLM-Friendly**: Clear contracts, structured outputs
7. **Debugging**: Raw output + tool_call_id for diagnosis
8. **Testing**: Deterministic functions easy to test
