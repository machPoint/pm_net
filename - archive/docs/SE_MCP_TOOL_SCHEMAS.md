# OPAL_SE MCP Tool JSON Schemas

Complete API reference for all Systems Engineering MCP tools with strict input/output schemas.

## Table of Contents

1. [Graph Query Tools](#graph-query-tools)
2. [Traceability Tools](#traceability-tools)
3. [Verification Tools](#verification-tools)
4. [History & Analytics Tools](#history--analytics-tools)
5. [Rule Engine Tools](#rule-engine-tools)

---

## Graph Query Tools

### querySystemModel

Query the system graph with flexible filters.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "project_id": {
      "type": "string",
      "description": "Project identifier (required)",
      "example": "proj-001"
    },
    "node_filters": {
      "type": "object",
      "properties": {
        "type": {
          "type": "string",
          "enum": ["Requirement", "TestCase", "Component", "Interface", "Issue", "ECN", "EmailMessage", "Note", "Task", "LibraryItem"],
          "description": "Filter by node type"
        },
        "subsystem": {
          "type": "string",
          "description": "Filter by subsystem name"
        },
        "status": {
          "type": "string",
          "description": "Filter by status (e.g. 'active', 'approved', 'draft')"
        },
        "ids": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Filter by specific node IDs"
        },
        "external_refs": {
          "type": "object",
          "description": "Filter by external references (e.g. {\"jama_id\": \"REQ-123\"})"
        }
      }
    },
    "edge_filters": {
      "type": "object",
      "properties": {
        "relation_type": {
          "type": "string",
          "enum": ["TRACES_TO", "VERIFIED_BY", "ALLOCATED_TO", "INTERFACES_WITH", "BLOCKS", "DERIVED_FROM", "REFERS_TO"],
          "description": "Filter edges by relation type"
        }
      }
    },
    "limit": {
      "type": "integer",
      "default": 100,
      "description": "Maximum number of nodes to return"
    },
    "offset": {
      "type": "integer",
      "default": 0,
      "description": "Pagination offset"
    }
  },
  "required": ["project_id"]
}
```

**Output Schema:**
```json
{
  "type": "object",
  "properties": {
    "nodes": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "project_id": { "type": "string" },
          "type": { "type": "string" },
          "name": { "type": "string" },
          "description": { "type": "string" },
          "external_refs": { "type": "object" },
          "subsystem": { "type": "string" },
          "status": { "type": "string" },
          "owner": { "type": "string" },
          "metadata": { "type": "object" },
          "created_at": { "type": "string", "format": "date-time" },
          "updated_at": { "type": "string", "format": "date-time" }
        }
      }
    },
    "edges": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "from_node_id": { "type": "string" },
          "to_node_id": { "type": "string" },
          "relation_type": { "type": "string" },
          "source_system": { "type": "string" },
          "rationale": { "type": "string" },
          "metadata": { "type": "object" }
        }
      }
    },
    "total_nodes": { "type": "integer" },
    "total_edges": { "type": "integer" }
  }
}
```

---

### getSystemSlice

Extract a bounded subgraph around specific nodes or within a subsystem.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "project_id": {
      "type": "string",
      "description": "Project identifier (required)"
    },
    "subsystem": {
      "type": "string",
      "description": "Extract all nodes in this subsystem"
    },
    "start_node_ids": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Starting nodes for graph expansion"
    },
    "max_depth": {
      "type": "integer",
      "default": 2,
      "description": "Maximum traversal depth from start nodes"
    },
    "include_metadata": {
      "type": "boolean",
      "default": true,
      "description": "Include statistics and metadata"
    }
  },
  "required": ["project_id"],
  "oneOf": [
    { "required": ["subsystem"] },
    { "required": ["start_node_ids"] }
  ]
}
```

**Output Schema:**
```json
{
  "type": "object",
  "properties": {
    "nodes": {
      "type": "array",
      "items": { "$ref": "#/definitions/Node" }
    },
    "edges": {
      "type": "array",
      "items": { "$ref": "#/definitions/Edge" }
    },
    "metadata": {
      "type": "object",
      "properties": {
        "node_counts": {
          "type": "object",
          "additionalProperties": { "type": "integer" }
        },
        "edge_counts": {
          "type": "object",
          "additionalProperties": { "type": "integer" }
        },
        "subsystem": { "type": "string" },
        "depth_reached": { "type": "integer" }
      }
    }
  }
}
```

---

## Traceability Tools

### traceDownstreamImpact

Trace downstream impact from one or more starting nodes.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "project_id": { "type": "string" },
    "start_node_ids": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Starting nodes for impact analysis"
    },
    "max_depth": {
      "type": "integer",
      "default": 3,
      "description": "Maximum trace depth"
    },
    "include_relation_types": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": ["TRACES_TO", "VERIFIED_BY", "ALLOCATED_TO", "INTERFACES_WITH"]
      },
      "description": "Which edge types to follow"
    },
    "exclude_node_types": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Node types to skip in traversal"
    }
  },
  "required": ["project_id", "start_node_ids"]
}
```

**Output Schema:**
```json
{
  "type": "object",
  "properties": {
    "impacted_nodes": {
      "type": "array",
      "items": { "$ref": "#/definitions/Node" }
    },
    "impacted_nodes_by_type": {
      "type": "object",
      "additionalProperties": {
        "type": "array",
        "items": { "$ref": "#/definitions/Node" }
      }
    },
    "trace_edges": {
      "type": "array",
      "items": { "$ref": "#/definitions/Edge" }
    },
    "depth_map": {
      "type": "object",
      "additionalProperties": { "type": "integer" },
      "description": "Maps node_id to depth from start"
    }
  }
}
```

---

### traceUpstreamRationale

Trace upstream dependencies and rationale.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "project_id": { "type": "string" },
    "start_node_ids": {
      "type": "array",
      "items": { "type": "string" }
    },
    "max_depth": {
      "type": "integer",
      "default": 3
    },
    "include_relation_types": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": ["DERIVED_FROM", "TRACES_TO"]
      },
      "default": ["DERIVED_FROM", "TRACES_TO"]
    }
  },
  "required": ["project_id", "start_node_ids"]
}
```

**Output Schema:**
```json
{
  "type": "object",
  "properties": {
    "upstream_nodes": {
      "type": "array",
      "items": { "$ref": "#/definitions/Node" }
    },
    "trace_paths": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "from_node_id": { "type": "string" },
          "to_node_id": { "type": "string" },
          "path": {
            "type": "array",
            "items": { "type": "string" }
          },
          "depth": { "type": "integer" }
        }
      }
    }
  }
}
```

---

## Verification Tools

### findVerificationGaps

Identify verification gaps in the system model.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "project_id": { "type": "string" },
    "subsystem": { "type": "string" },
    "requirement_type": { "type": "string" }
  },
  "required": ["project_id"]
}
```

**Output Schema:**
```json
{
  "type": "object",
  "properties": {
    "requirements_missing_tests": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "name": { "type": "string" },
          "type": { "type": "string" },
          "subsystem": { "type": "string" },
          "level": { "type": "string" }
        }
      }
    },
    "tests_without_requirements": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "name": { "type": "string" },
          "subsystem": { "type": "string" }
        }
      }
    },
    "broken_chains": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "requirement_id": { "type": "string" },
          "requirement_name": { "type": "string" },
          "issue": { "type": "string" }
        }
      }
    }
  }
}
```

---

### checkAllocationConsistency

Check allocation consistency across components and requirements.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "project_id": { "type": "string" },
    "subsystem": { "type": "string" }
  },
  "required": ["project_id"]
}
```

**Output Schema:**
```json
{
  "type": "object",
  "properties": {
    "unallocated_requirements": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "name": { "type": "string" },
          "level": { "type": "string" }
        }
      }
    },
    "orphan_components": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "name": { "type": "string" }
        }
      }
    },
    "conflicting_allocations": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "requirement_id": { "type": "string" },
          "component_ids": {
            "type": "array",
            "items": { "type": "string" }
          },
          "issue": { "type": "string" }
        }
      }
    }
  }
}
```

---

### getVerificationCoverageMetrics

Calculate verification coverage metrics.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "project_id": { "type": "string" },
    "subsystem": { "type": "string" }
  },
  "required": ["project_id"]
}
```

**Output Schema:**
```json
{
  "type": "object",
  "properties": {
    "overall_coverage": {
      "type": "number",
      "minimum": 0,
      "maximum": 1,
      "description": "Overall verification coverage ratio"
    },
    "by_type": {
      "type": "object",
      "additionalProperties": {
        "type": "object",
        "properties": {
          "total": { "type": "integer" },
          "verified": { "type": "integer" },
          "coverage": { "type": "number" }
        }
      }
    },
    "by_level": {
      "type": "object",
      "additionalProperties": {
        "type": "object",
        "properties": {
          "total": { "type": "integer" },
          "verified": { "type": "integer" },
          "coverage": { "type": "number" }
        }
      }
    },
    "by_subsystem": {
      "type": "object",
      "additionalProperties": {
        "type": "object",
        "properties": {
          "total": { "type": "integer" },
          "verified": { "type": "integer" },
          "coverage": { "type": "number" }
        }
      }
    }
  }
}
```

---

## History & Analytics Tools

### getHistory

Get chronological event history for entities.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "project_id": { "type": "string" },
    "entity_ids": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Entity IDs to fetch history for"
    },
    "days": {
      "type": "integer",
      "default": 30,
      "description": "Number of days to look back"
    },
    "event_types": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": ["created", "updated", "deleted", "linked", "unlinked", "status_changed"]
      },
      "description": "Filter by event types"
    },
    "source_systems": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Filter by source systems"
    }
  },
  "required": ["project_id", "entity_ids"]
}
```

**Output Schema:**
```json
{
  "type": "object",
  "properties": {
    "events": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "project_id": { "type": "string" },
          "source_system": { "type": "string" },
          "entity_type": { "type": "string" },
          "entity_id": { "type": "string" },
          "event_type": { "type": "string" },
          "timestamp": { "type": "string", "format": "date-time" },
          "diff_payload": {
            "type": "object",
            "properties": {
              "before": { "type": "object" },
              "after": { "type": "object" }
            }
          }
        }
      }
    },
    "timeline_summary": {
      "type": "object",
      "properties": {
        "first_event": { "type": "string", "format": "date-time" },
        "last_event": { "type": "string", "format": "date-time" },
        "total_events": { "type": "integer" },
        "by_entity": {
          "type": "object",
          "additionalProperties": { "type": "integer" }
        }
      }
    }
  }
}
```

---

### findSimilarPastChanges

Find similar change patterns in historical change sets.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "project_id": { "type": "string" },
    "reference_change_set_id": {
      "type": "string",
      "description": "Find changes similar to this change set"
    },
    "signature": {
      "type": "object",
      "properties": {
        "node_types": {
          "type": "array",
          "items": { "type": "string" }
        },
        "subsystems": {
          "type": "array",
          "items": { "type": "string" }
        },
        "relation_patterns": {
          "type": "array",
          "items": { "type": "string" }
        }
      },
      "description": "Custom signature to match against"
    },
    "min_similarity": {
      "type": "number",
      "minimum": 0,
      "maximum": 1,
      "default": 0.5,
      "description": "Minimum similarity threshold"
    },
    "limit": {
      "type": "integer",
      "default": 10
    }
  },
  "required": ["project_id"],
  "oneOf": [
    { "required": ["reference_change_set_id"] },
    { "required": ["signature"] }
  ]
}
```

**Output Schema:**
```json
{
  "type": "object",
  "properties": {
    "similar_change_sets": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "change_set_id": { "type": "string" },
          "anchor": { "type": "string" },
          "label": { "type": "string" },
          "similarity_score": {
            "type": "number",
            "minimum": 0,
            "maximum": 1
          },
          "matching_features": {
            "type": "array",
            "items": { "type": "string" }
          },
          "stats": { "type": "object" },
          "created_at": { "type": "string", "format": "date-time" }
        }
      }
    }
  }
}
```

---

## Rule Engine Tools

### runConsistencyChecks

Run consistency checks using the rule engine.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "project_id": { "type": "string" },
    "subsystem": { "type": "string" },
    "rule_ids": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Specific rules to run (omit for all rules)"
    }
  },
  "required": ["project_id"]
}
```

**Output Schema:**
```json
{
  "type": "object",
  "properties": {
    "violations": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "rule_id": { "type": "string" },
          "severity": {
            "type": "string",
            "enum": ["error", "warning", "info"]
          },
          "message": { "type": "string" },
          "affected_nodes": {
            "type": "array",
            "items": { "type": "string" }
          },
          "affected_edges": {
            "type": "array",
            "items": { "type": "string" }
          },
          "details": { "type": "object" }
        }
      }
    },
    "summary": {
      "type": "object",
      "properties": {
        "total_violations": { "type": "integer" },
        "by_severity": {
          "type": "object",
          "properties": {
            "error": { "type": "integer" },
            "warning": { "type": "integer" },
            "info": { "type": "integer" }
          }
        },
        "by_rule": {
          "type": "object",
          "additionalProperties": { "type": "integer" }
        }
      }
    }
  }
}
```

---

## Common Type Definitions

### Node
```json
{
  "type": "object",
  "properties": {
    "id": { "type": "string" },
    "project_id": { "type": "string" },
    "type": {
      "type": "string",
      "enum": ["Requirement", "TestCase", "Component", "Interface", "Issue", "ECN", "EmailMessage", "Note", "Task", "LibraryItem"]
    },
    "name": { "type": "string" },
    "description": { "type": "string" },
    "external_refs": {
      "type": "object",
      "properties": {
        "jama_id": { "type": "string" },
        "jira_key": { "type": "string" },
        "windchill_number": { "type": "string" }
      }
    },
    "subsystem": { "type": "string" },
    "status": { "type": "string" },
    "owner": { "type": "string" },
    "metadata": { "type": "object" },
    "created_at": { "type": "string", "format": "date-time" },
    "updated_at": { "type": "string", "format": "date-time" }
  }
}
```

### Edge
```json
{
  "type": "object",
  "properties": {
    "id": { "type": "string" },
    "project_id": { "type": "string" },
    "from_node_id": { "type": "string" },
    "to_node_id": { "type": "string" },
    "relation_type": {
      "type": "string",
      "enum": ["TRACES_TO", "VERIFIED_BY", "ALLOCATED_TO", "INTERFACES_WITH", "BLOCKS", "DERIVED_FROM", "REFERS_TO"]
    },
    "source_system": { "type": "string" },
    "rationale": { "type": "string" },
    "metadata": { "type": "object" },
    "created_at": { "type": "string", "format": "date-time" },
    "updated_at": { "type": "string", "format": "date-time" }
  }
}
```

---

## Usage Examples

### Example 1: Query all L2 requirements in Power subsystem
```json
{
  "project_id": "proj-001",
  "node_filters": {
    "type": "Requirement",
    "subsystem": "Power"
  }
}
```

### Example 2: Trace downstream impact from a requirement change
```json
{
  "project_id": "proj-001",
  "start_node_ids": ["req-l2-power-001"],
  "max_depth": 3,
  "include_relation_types": ["TRACES_TO", "VERIFIED_BY", "ALLOCATED_TO"]
}
```

### Example 3: Find verification gaps in Avionics subsystem
```json
{
  "project_id": "proj-001",
  "subsystem": "Avionics"
}
```

### Example 4: Run consistency checks for safety-critical requirements
```json
{
  "project_id": "proj-001",
  "rule_ids": ["R002"]
}
```

---

## Version History

- **v1.0** (2025-01-17): Initial schema definitions for OPAL_SE
