# Graph Contract v1.0

> **Status**: LOCKED — All agent tools, UI components, and API routes MUST conform to this contract.  
> **Last updated**: 2026-02-08

This document defines the stable, domain-neutral graph schema that underpins PM_NET.  
Any change to this contract requires a migration and version bump.

---

## Node Schema

Every entity in the system is a **node**.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `id` | `string (UUID)` | ✅ | auto | Unique identifier |
| `node_type` | `string` | ✅ | — | Well-known types below, extensible |
| `schema_layer` | `string` | ✅ | `'pm_core'` | Schema namespace |
| `title` | `string` | ✅ | — | Human-readable name |
| `description` | `string` | ❌ | `null` | Longer description |
| `status` | `string` | ✅ | — | Lifecycle status |
| `metadata` | `json` | ❌ | `{}` | Arbitrary key-value pairs |
| **Provenance** | | | | |
| `source` | `string` | ✅ | `'ui'` | Originating system |
| `source_ref` | `string` | ❌ | `null` | External reference ID |
| `as_of` | `string (ISO)` | ❌ | `created_at` | When source data was current |
| `confidence` | `float` | ✅ | `1.0` | 0.0–1.0 trust score |
| **Lifecycle** | | | | |
| `created_by` | `string (UUID)` | ✅ | — | User or agent who created |
| `created_at` | `string (ISO)` | ✅ | auto | Creation timestamp |
| `updated_at` | `string (ISO)` | ✅ | auto | Last update timestamp |
| `deleted_at` | `string (ISO)` | ❌ | `null` | Soft-delete timestamp |
| `version` | `integer` | ✅ | `1` | Monotonically increasing |

### Well-Known Node Types

These are the core types. Agents and plugins may introduce additional types.

| Type | Description |
|------|-------------|
| `Task` | A unit of work to be completed |
| `Validation` | Acceptance criteria or test for a task |
| `Agent` | An autonomous agent in the system |
| `Issue` | A problem or defect |
| `Guardrail` | A constraint or policy rule |
| `ChangeRequest` | A proposed or approved change |
| `Notification` | A message or alert |
| `Note` | Free-form documentation |
| `LibraryItem` | A reusable knowledge artifact |

---

## Edge Schema

Every relationship is an **edge**.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `id` | `string (UUID)` | ✅ | auto | Unique identifier |
| `edge_type` | `string` | ✅ | — | Well-known types below, extensible |
| `source_node_id` | `string (UUID)` | ✅ | — | Origin node (FK → nodes.id) |
| `target_node_id` | `string (UUID)` | ✅ | — | Destination node (FK → nodes.id) |
| `schema_layer` | `string` | ✅ | `'pm_core'` | Schema namespace |
| `weight` | `float` | ✅ | `1.0` | Edge weight for traversal |
| `weight_metadata` | `json` | ❌ | `null` | Factors used in weight calculation |
| `directionality` | `enum` | ✅ | `'directed'` | `'directed'` or `'bidirectional'` |
| `metadata` | `json` | ❌ | `null` | Arbitrary key-value pairs |
| **Provenance** | | | | |
| `source` | `string` | ✅ | `'ui'` | Originating system |
| `source_ref` | `string` | ❌ | `null` | External reference ID |
| `as_of` | `string (ISO)` | ❌ | `created_at` | When source data was current |
| `confidence` | `float` | ✅ | `1.0` | 0.0–1.0 trust score |
| **Lifecycle** | | | | |
| `created_by` | `string (UUID)` | ✅ | — | User or agent who created |
| `created_at` | `string (ISO)` | ✅ | auto | Creation timestamp |
| `updated_at` | `string (ISO)` | ✅ | auto | Last update timestamp |
| `deleted_at` | `string (ISO)` | ❌ | `null` | Soft-delete timestamp |
| `version` | `integer` | ✅ | `1` | Monotonically increasing |

### Well-Known Edge Types

| Type | Description |
|------|-------------|
| `TRACES_TO` | Traceability link between artifacts |
| `VALIDATED_BY` | Task is validated by a Validation node |
| `ASSIGNED_TO` | Task is assigned to an Agent |
| `DEPENDS_ON` | Node depends on another node |
| `BLOCKS` | Node blocks another node |
| `REFERS_TO` | Informational reference |
| `PARENT_OF` | Hierarchical parent relationship |
| `CONTAINS` | Containment relationship |
| `DERIVED_FROM` | Node was derived from another |

### Constraints

- **No self-referencing edges** — `source_node_id ≠ target_node_id`
- **No duplicate active edges** — unique on `(source_node_id, target_node_id, edge_type)` where `deleted_at IS NULL`
- **Referential integrity** — both nodes must exist

---

## Provenance Rules

| Source Value | Confidence | Meaning |
|-------------|------------|---------|
| `'ui'` | `1.0` | Human created via UI |
| `'api'` | `1.0` | Created via authenticated API |
| `'import'` | `0.9` | Bulk import from external system |
| `'agent'` | `0.5–0.9` | Agent-inferred (varies by tool) |

- `source_ref` should contain the external system's ID (e.g., Jira key, task ID)
- `as_of` tracks when the source data was current (may differ from `created_at`)
- `confidence` is used by traversal algorithms to weight agent-inferred vs human-verified data

---

## History Tables

Both `node_history` and `edge_history` are **append-only** audit trails.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `UUID` | History record ID |
| `node_id` / `edge_id` | `UUID` | Reference to the entity |
| `version` | `integer` | Version number at time of change |
| `operation` | `string` | `'create'`, `'update'`, `'delete'` |
| `changed_by` | `UUID` | Who made the change |
| `changed_at` | `ISO string` | When the change was made |
| `change_reason` | `string` | Optional reason for the change |
| `before_state` | `json` | State before change (null for create) |
| `after_state` | `json` | State after change |

---

## Implementation Files

| Layer | File | Description |
|-------|------|-------------|
| **Migration** | `OPAL_SE/migrations/20260206200000_create_graph_schema.js` | Core tables |
| **Migration** | `OPAL_SE/migrations/20260208000000_add_provenance.js` | Provenance columns |
| **Server Types** | `OPAL_SE/src/types/se.ts` | TypeScript interfaces |
| **Server Service** | `OPAL_SE/src/services/graphService.ts` | CRUD + traversal |
| **Server SE Service** | `OPAL_SE/src/services/se/systemGraphService.ts` | SE-specific graph ops |
| **Frontend Client** | `CORE_UI/frontend/src/services/opal-client.ts` | API client types |

---

## Breaking Change Policy

1. **Adding** optional fields to `metadata` — allowed without version bump
2. **Adding** new well-known node/edge types — allowed without version bump
3. **Adding** required fields — requires migration + version bump
4. **Renaming** fields — requires migration + version bump + deprecation period
5. **Removing** fields — requires migration + version bump + deprecation period
