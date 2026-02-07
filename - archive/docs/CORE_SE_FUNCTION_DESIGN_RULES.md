# CORE SE Function Design Rules

## Overview
These rules ensure all CORE SE functions are deterministic, traceable, and follow systems engineering domain conventions.

---

## 1. Deterministic and Bounded

### Principles:
- **Single Responsibility**: Each function does ONE clear thing
- **Bounded Scope**: Operates on a specific scope (single node, slice, or explicit ID list)
- **No Hidden Side Effects**: Except where clearly marked as "action"

### Examples:
✅ **Good**: `getRequirementById(requirement_id: string)`
❌ **Bad**: `getRequirement()` (unbounded, unclear scope)

✅ **Good**: `traceDownstreamImpact(start_node_ids: string[], max_depth: number)`
❌ **Bad**: `analyzeSystem()` (unbounded, unclear what it does)

### Action Functions:
Functions that modify state must be clearly marked:
- Prefix with `create`, `update`, `delete`, `apply`, `execute`
- Example: `applyChangeSet(change_set_id: string)`

---

## 2. Domain Typed, Not Generic

### Principles:
- **Use SE Vocabulary**: Parameters and return types use systems engineering domain terms
- **No Raw SQL at Function Layer**: Unless wrapped in a safe query DSL
- **Avoid Generic Params**: Use specific, typed parameters

### Domain Terms to Use:
```typescript
// Good domain typing
entity_id: string
requirement_ids: string[]
verification_ids: string[]
component_ids: string[]
test_case_ids: string[]
change_set_id: string
project_id: string
subsystem: string
slice_filter: SliceFilter
relation_type: RelationType
node_type: NodeType
```

### Bad Examples:
❌ `getData(filters: any)` - too generic
❌ `query(sql: string)` - raw SQL exposed
❌ `items: object[]` - not domain typed

### Good Examples:
✅ `getRequirementsBySubsystem(project_id: string, subsystem: string)`
✅ `findVerificationGaps(requirement_ids: string[])`
✅ `traceUpstreamRationale(component_id: string, max_depth: number)`

---

## 3. Two Layers of Tools

### Core Tools (Layer 1)
**Thin wrappers over OPAL MCP tools and sidecars**

- **Purpose**: Stable, versioned access to OPAL capabilities
- **Naming**: Direct mapping to underlying tools
- **Examples**:
  - `core_querySystemModel(params)`
  - `core_getSystemSlice(params)`
  - `core_traceDownstreamImpact(params)`

**Characteristics**:
- Minimal logic, mostly parameter mapping
- 1:1 or close to 1:1 with MCP tools
- Stable API contract
- Version tagged

### Macro Tools (Layer 2)
**Orchestrations of core tools for common workflows**

- **Purpose**: Combine multiple core tools to accomplish complex tasks
- **Naming**: Action/intent based, SE domain specific
- **Examples**:
  - `assessChangeImpact(change_description, affected_requirements)`
  - `validateDesignConsistency(subsystem)`
  - `generateVerificationMatrix(requirement_ids)`

**Characteristics**:
- Calls multiple core tools
- Implements business logic
- LLM can call as single function instead of planning 5 steps
- Higher level abstractions

### Example:
```typescript
// CORE TOOL (Layer 1)
async function core_traceDownstreamImpact(params: {
  project_id: string;
  start_node_ids: string[];
  max_depth: number;
}) {
  return await mcpClient.call('traceDownstreamImpact', params);
}

// MACRO TOOL (Layer 2)
async function assessChangeImpact(params: {
  change_description: string;
  affected_requirement_ids: string[];
}) {
  // Orchestrate multiple core tools
  const impactTrace = await core_traceDownstreamImpact({
    project_id: params.project_id,
    start_node_ids: params.affected_requirement_ids,
    max_depth: 3
  });
  
  const verificationGaps = await core_findVerificationGaps({
    project_id: params.project_id,
    scope_node_ids: impactTrace.affected_nodes
  });
  
  const consistencyIssues = await core_runConsistencyChecks({
    project_id: params.project_id,
    scope_node_ids: impactTrace.affected_nodes
  });
  
  return {
    summary: `Change affects ${impactTrace.affected_nodes.length} items with ${verificationGaps.gaps.length} verification gaps`,
    details: {
      impacted_requirements: impactTrace.affected_nodes,
      verification_gaps: verificationGaps.gaps,
      consistency_issues: consistencyIssues.violations
    },
    raw: { impactTrace, verificationGaps, consistencyIssues },
    tool_call_id: generateId(),
    source_tools: ['traceDownstreamImpact', 'findVerificationGaps', 'runConsistencyChecks']
  };
}
```

---

## 4. Structured Outputs

### Required Output Structure
**Every function MUST return an object with these fields:**

```typescript
interface CoreSEOutput<T = any> {
  // Required fields
  summary: string;           // Short human-readable text (1-2 sentences)
  details: T;                // Domain-structured payload (typed)
  
  // Optional fields
  raw?: any;                 // Direct pass-through of underlying responses
  tool_call_id: string;      // Unique identifier for this call
  source_tools: string[];    // List of MCP tools/sidecars used
  timestamp?: string;        // ISO timestamp of execution
  metadata?: Record<string, any>; // Additional context
}
```

### Examples:

```typescript
// Simple query result
{
  summary: "Found 23 requirements in Propulsion subsystem",
  details: {
    count: 23,
    requirements: [
      { id: "REQ-001", title: "...", status: "approved" },
      // ...
    ],
    subsystem: "Propulsion"
  },
  raw: { /* OPAL response */ },
  tool_call_id: "call_abc123",
  source_tools: ["querySystemModel"],
  timestamp: "2025-11-18T06:08:53.161Z"
}

// Complex analysis result
{
  summary: "Verification coverage is 87% with 5 critical gaps in thermal control",
  details: {
    coverage_percentage: 87,
    total_requirements: 142,
    verified_requirements: 123,
    gaps: [
      {
        requirement_id: "REQ-THM-005",
        severity: "critical",
        reason: "No test case allocated"
      },
      // ...
    ],
    subsystem_breakdown: {
      "Propulsion": { coverage: 95, gaps: 2 },
      "ThermalControl": { coverage: 72, gaps: 5 }
    }
  },
  raw: { /* underlying tool responses */ },
  tool_call_id: "call_xyz789",
  source_tools: ["getVerificationCoverageMetrics", "findVerificationGaps"],
  timestamp: "2025-11-18T06:09:15.442Z"
}
```

### Details Type Safety
The `details` field should be strongly typed for each function:

```typescript
interface RequirementQueryDetails {
  count: number;
  requirements: Requirement[];
  subsystem?: string;
  filters_applied?: Record<string, any>;
}

interface VerificationCoverageDetails {
  coverage_percentage: number;
  total_requirements: number;
  verified_requirements: number;
  gaps: VerificationGap[];
  subsystem_breakdown?: Record<string, SubsystemCoverage>;
}
```

---

## 5. Traceable

### Principles:
- **Audit Trail**: Every function call is traceable
- **Source Transparency**: Know exactly which tools were used
- **Debugging**: Easy to diagnose issues and replay calls

### Required Traceability Fields:

```typescript
interface Traceability {
  tool_call_id: string;      // Unique ID for this function call
  source_tools: string[];    // Array of MCP tools/sidecars used
  timestamp?: string;        // When the call was executed
  duration_ms?: number;      // Execution time
  user_id?: string;          // Who made the call (if applicable)
  session_id?: string;       // Session context
}
```

### Implementation:

```typescript
import { v4 as uuidv4 } from 'uuid';

function generateToolCallId(): string {
  return `call_${uuidv4()}`;
}

async function trackedFunctionCall<T>(
  functionName: string,
  sourceTools: string[],
  operation: () => Promise<T>
): Promise<T & { tool_call_id: string; source_tools: string[]; duration_ms: number }> {
  const tool_call_id = generateToolCallId();
  const startTime = Date.now();
  
  try {
    const result = await operation();
    const duration_ms = Date.now() - startTime;
    
    // Log to audit service
    await auditService.log({
      tool_call_id,
      function_name: functionName,
      source_tools: sourceTools,
      duration_ms,
      status: 'success'
    });
    
    return {
      ...result,
      tool_call_id,
      source_tools: sourceTools,
      duration_ms
    };
  } catch (error) {
    const duration_ms = Date.now() - startTime;
    
    // Log error to audit service
    await auditService.log({
      tool_call_id,
      function_name: functionName,
      source_tools: sourceTools,
      duration_ms,
      status: 'error',
      error: error.message
    });
    
    throw error;
  }
}
```

### Usage Example:

```typescript
async function getRequirementsBySubsystem(
  project_id: string,
  subsystem: string
): Promise<CoreSEOutput<RequirementQueryDetails>> {
  return trackedFunctionCall(
    'getRequirementsBySubsystem',
    ['querySystemModel'],
    async () => {
      const result = await core_querySystemModel({
        project_id,
        node_filters: { subsystem, type: 'requirement' }
      });
      
      return {
        summary: `Found ${result.nodes.length} requirements in ${subsystem} subsystem`,
        details: {
          count: result.nodes.length,
          requirements: result.nodes.map(mapToRequirement),
          subsystem
        },
        raw: result
      };
    }
  );
}
```

---

## Implementation Checklist

When creating a new CORE SE function, verify:

- [ ] **Deterministic**: Same inputs always produce same outputs
- [ ] **Bounded**: Clear scope defined by parameters
- [ ] **Domain Typed**: Uses SE vocabulary in params and types
- [ ] **Layer Identified**: Core (wrapper) or Macro (orchestration)
- [ ] **Structured Output**: Returns {summary, details, raw}
- [ ] **Traceable**: Includes tool_call_id and source_tools
- [ ] **Type Safe**: TypeScript interfaces for all params and outputs
- [ ] **Documented**: JSDoc comments with examples
- [ ] **Error Handling**: Graceful failures with meaningful messages
- [ ] **Tested**: Unit tests verify expected behavior

---

## Anti-Patterns to Avoid

❌ **Generic Functions**
```typescript
// BAD
function getData(filters: any): any
```

❌ **Hidden Side Effects**
```typescript
// BAD - modifies state without clear indication
function getRequirement(id: string) {
  updateAccessLog(id); // Hidden side effect
  return db.query(...);
}
```

❌ **Unbounded Queries**
```typescript
// BAD - no limits, can return entire database
function getAllRequirements(): Requirement[]
```

❌ **Unstructured Returns**
```typescript
// BAD
function analyzeSystem(): any
```

❌ **No Traceability**
```typescript
// BAD - can't trace what tools were used
function complexAnalysis() {
  // calls 5 different tools
  return result; // no source_tools
}
```

---

## Template for New Functions

```typescript
/**
 * [Function Name]
 * 
 * @description [Clear description of what this function does]
 * @layer [core|macro]
 * 
 * @param {string} project_id - Project identifier
 * @param {string[]} requirement_ids - List of requirement IDs to analyze
 * 
 * @returns {CoreSEOutput<[DetailsType]>} Structured result with summary and details
 * 
 * @example
 * const result = await functionName({
 *   project_id: "PROJ-001",
 *   requirement_ids: ["REQ-001", "REQ-002"]
 * });
 * 
 * console.log(result.summary);
 * // "Analysis complete for 2 requirements"
 */
async function functionName(params: {
  project_id: string;
  requirement_ids: string[];
}): Promise<CoreSEOutput<DetailsType>> {
  return trackedFunctionCall(
    'functionName',
    ['sourceTool1', 'sourceTool2'],
    async () => {
      // Implementation
      const result = await coreTool(...);
      
      return {
        summary: "...",
        details: {
          // Typed structure
        },
        raw: result,
        timestamp: new Date().toISOString()
      };
    }
  );
}
```

---

## Summary

These design rules ensure:
1. **Predictability**: Functions are deterministic and bounded
2. **Clarity**: Domain-specific typing makes intent clear
3. **Composability**: Two-layer design enables reuse
4. **Consistency**: All outputs follow same structure
5. **Auditability**: Every call is traceable

Following these rules will create a robust, maintainable, and LLM-friendly function library for CORE SE.
