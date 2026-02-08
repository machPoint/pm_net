# getSystemSlice Tool

## Purpose
Returns a slice of the system block model (nodes + edges) from the OPAL graph.

## Category
`system-model`

## Type
`core` - Direct interaction with OPAL's internal graph

## Sidecars
None - operates directly on OPAL graph

## Input Schema

```typescript
{
  entityIds: string[];      // Required, non-empty array of entity IDs to start from
  radius?: number;          // Optional, default 1, minimum 0 - how many hops to traverse
  includeTypes?: string[];  // Optional - filter nodes by type (e.g., ["system", "subsystem"])
}
```

## Output Schema

```typescript
{
  slice: {
    nodes: Array<{
      id: string;
      label: string;
      type: string;      // "system" | "subsystem" | "component" | "requirement"
      metadata?: object;
    }>;
    edges: Array<{
      id: string;
      from: string;
      to: string;
      relation: string;  // "CONTAINS" | "SATISFIES" | "INTERFACES"
      metadata?: object;
    }>;
  };
  summary: string;  // Human-readable summary
}
```

## Examples

### Get system root with immediate children
```json
{
  "entityIds": ["SYS-1"],
  "radius": 1
}
```

Returns the system node plus all subsystems it contains.

### Get subsystem with its components
```json
{
  "entityIds": ["SS-avionics"],
  "radius": 1,
  "includeTypes": ["subsystem", "component"]
}
```

Returns the avionics subsystem and its components, excluding requirements.

### Get multiple starting points
```json
{
  "entityIds": ["SS-flight-control", "SS-propulsion"],
  "radius": 2
}
```

Returns both subsystems and everything within 2 hops of either.

## Error Handling

- Returns error if `entityIds` is empty
- Returns empty slice if no nodes found
- Validates `radius` is non-negative

## Implementation Notes

- Uses OPAL graph layer to traverse relationships
- Respects radius parameter for depth-limited search
- Filters by includeTypes if provided
- Returns consistent node/edge format for UI consumption
