# OPAL Server Master Spec (Consolidated)

This document consolidates OPAL server architecture, core capabilities, and the “Core Toolbox + Sidecar Connector” approach into a single current reference. It is meant to replace scattered notes and reduce drift.

## 1. What OPAL is

OPAL is a long-running, identity-bearing server instance (typically one per user or per tenant) that implements the Model Context Protocol (MCP) and provides durable storage plus tool execution behind a stable contract.

OPAL’s role is **not** “an app.” It is the **persistent context + tools substrate** that higher-level products plug into.

## 2. Non-negotiables (design constraints)

- **Persistence**: data and configuration survive restarts and upgrades.
- **Deterministic tool surfaces**: tools have strict JSON schemas, bounded behavior, and predictable outputs.
- **Auditable execution**: tool calls are logged (who, what, when, inputs hash, outputs summary).
- **Separation of concerns**:
  - External systems remain systems of record for their content.
  - OPAL is the system of *context, linkage, history, policy, and execution*.
- **Security baseline**:
  - AuthN/AuthZ and API tokens.
  - RBAC/policy enforcement on tool execution.
  - Secrets stored via vault-like mechanism or encrypted storage.

## 3. Core capabilities (current baseline)

### 3.1 MCP server surface
- MCP lifecycle: initialization/negotiation, capabilities, shutdown.
- Tools: `tools/list`, `tools/call` with schema validation and stable tool metadata.
- Resources: list/read/write/delete with pagination where appropriate.
- Prompts: list/get/set/delete with argument substitution (if used by your client stack).
- Notifications: change notifications when tools/resources/prompts change (when clients need it).

### 3.2 Admin and ops
- Admin panel for health, metrics, tokens, users, audit logs, backup/restore.
- Observability: request logging, tool timing, error rates, storage metrics.

### 3.3 Storage and memory
- Durable DB storage (SQLite for dev; PostgreSQL for production).
- Text search + semantic search (embeddings) for memories or indexed resources.
- Backup/restore is first-class, not an afterthought.

## 4. OPAL Core Toolbox and Sidecar Connector model

OPAL should ship with a **Core Toolbox** that covers most cross-application needs, plus a **Sidecar Connector** framework for specialized systems.

### 4.1 Core Toolbox (common tools)

Core tool families (examples, not exhaustive):

- **System & orchestration**: health, time, UUID, audit logging, scheduling, event pub/sub.
- **Secrets/config/storage**: fetch secrets, read config, KV store, blob store, signed URLs.
- **HTTP/webhooks/crypto**: generic HTTP client, webhook registration/verification, hashing, encryption helpers.
- **Parse/transform/validate**: extract, convert formats, parse CSV/PDF, JSON schema validate, diff compute.
- **Search/summarize/vector**: embeddings, vector upsert/query, chunked summarization.
- **Document/diagram**: markdown render, diagram generation, table extraction.
- **Safety/redaction/format**: PII redaction, content moderation, standard formatting helpers.

### 4.2 Sidecar Connector (specialized systems)

Sidecars are external MCP-compatible services (or adapters) that OPAL can register and invoke via a uniform proxy with policy + audit controls.

Required primitives:
- sidecar registry (register/list/health/disconnect)
- capability discovery (list tools/schemas)
- universal invocation proxy (sidecar.invoke)
- event plumbing (pull/push + cursoring)
- sync helpers (backfill, cursor management)

This keeps OPAL vendor-agnostic: Jama/Jira/Windchill/Outlook etc. remain “10%” custom work, while OPAL’s 90% stays reusable.

## 5. LLM architecture stance (keep it simple, but centralized)

LLM calls should route through a **single gateway/service** rather than being scattered across endpoints and services. The gateway’s job:

- tool → model/provider routing
- retries/fallbacks
- cost + token accounting
- uniform logging and audit trail
- provider adapters (OpenAI/Azure/local/etc.)

This is an implementation detail, but it prevents the “every file calls OpenAI directly” failure mode.

## 6. Canonical references and what this replaces

This consolidated doc pulls from (and should supersede) the older fragments:
- OPAL server technical spec and runtime notes
- Core Toolbox + Sidecar Connector notes
- MCP API documentation notes
- AI/LLM architecture notes (only the architectural intent; code blocks removed)

If two documents disagree, **this master spec wins** unless you explicitly version an exception.

## Appendix A: “What to delete / stop maintaining”
To reduce drift:
- Stop maintaining multiple overlapping “tool catalogs.” Keep **one** canonical tool registry + one schema source-of-truth.
- Stop duplicating full code snippets in architecture docs. Keep code in repo; keep docs conceptual + contract-level.

