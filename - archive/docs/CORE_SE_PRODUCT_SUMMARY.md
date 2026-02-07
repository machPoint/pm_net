# CORE_SE – Integrated Systems Engineering Stack

This document is a **top-level product summary** for the combined CORE_SE stack now organized into three primary components:

- **CORE_UI** – CORE-SE user interface and API gateway
- **FDS** – Fake Data Server (integration emulator for external tools)
- **OPAL_SE** – OPAL MCP server (persistent AI/memory runtime)

It is intended as a high-level overview you can feed into other tools or models when reasoning about the overall system.

---

## 1. Product Concept

**CORE_SE** is an **AI-assisted systems engineering environment** for high-reliability domains (aerospace, defense, space, advanced manufacturing). It unifies:

- Requirements (e.g., Jama Connect)
- Issues and tasks (e.g., Jira)
- PLM/parts (e.g., Windchill)
- Communications (e.g., Outlook/email)

into a single workspace where engineers can:

- Understand **what changed** across tools (Pulse feed)
- See **impact & traceability** across requirements, tests, and parts
- Capture **notes, tasks, and knowledge** in one place
- Use **AI** to summarize, break down, and reason about system changes

The system is composed of three cooperating products: **CORE_UI**, **FDS**, and **OPAL_SE**.

---

## 2. Current vs Target Architecture

### 2.1 Current State

- **CORE_UI**: Web/Tauri-hybrid UI backed by a FastAPI service. Implements Pulse, Notes/Tasks, and basic Trace/Impact views. In demo mode, it calls **FDS** directly for mock Jama/Jira/Windchill/Outlook data and uses OPAL only for **generic memory/tools**.
- **FDS**: Mock upstream APIs that generate synthetic engineering data (requirements, issues, parts, emails). Used to simulate integrations without requiring live external systems.
- **OPAL_SE**: A **generic MCP server** with:
  - Tools mapped to configured external APIs
  - Vector memory and reverse summarization
  - Generic resource CRUD
  - Admin panel with metrics/logs
  - **No engineering-specific system graph or event log yet**
  - **No deterministic systems-engineering tools yet**

### 2.2 Target State – Systems Intelligence Layer

The target is to evolve OPAL_SE into the **engineering system brain** for CORE-SE and make CORE_SE as a whole a **Systems Intelligence Layer** over all tools:

- **OPAL_SE upgrades**
  - Add a **typed system graph** of engineering entities:
    - Nodes: Requirement, Test, Component, Interface, ECN, Issue, EmailMessage, Note, Task, LibraryItem
    - Edges: TRACES_TO, VERIFIED_BY, ALLOCATED_TO, INTERFACES_WITH, BLOCKS, DERIVED_FROM, REFERS_TO
  - Add a **persistent event log + change sets** capturing cross-tool history:
    - Events with source_system, entity_type/id, event_type, timestamps, diff payloads
    - Change sets anchored on ECNs or time windows with counts by type/subsystem
  - Add deterministic **SE analysis MCP tools**, including:
    - Graph/context: `querySystemModel`, `getSystemSlice`
    - Impact/trace: `traceDownstreamImpact`, `traceUpstreamRationale`
    - Verification/consistency: `findVerificationGaps`, `checkAllocationConsistency`, `getVerificationCoverageMetrics`, `runConsistencyChecks`
    - History: `getHistory`, `findSimilarPastChanges`
  - Add **project-level scoping**: every node, edge, event, change set, and memory is scoped by `project_id`.

- **CORE_UI upgrades**
  - Pulse, Impact, Trace, Verification, and Daily Summary panels will call **OPAL_SE tools** instead of hand-assembled logic or direct FDS calls:
    - Pulse feed driven by OPAL’s event log and change sets.
    - Impact panel uses `traceDownstreamImpact` plus optional `runConsistencyChecks`.
    - Trace graph uses `getSystemSlice(project_id, subsystem)` as the **only** graph source.
    - Verification views call `findVerificationGaps`, `checkAllocationConsistency`, `getVerificationCoverageMetrics`.
    - Daily summary flow:
      1. OPAL builds a change set for the last 24 hours
      2. CORE_UI gathers counts and violations
      3. LLM generates narrative
      4. Summary optionally stored back into OPAL memory.

- **FDS upgrades**
  - FDS becomes a **demo data emitter**, not just a mock API.
  - Every FDS action (e.g., requirement change, ECN issuance, test update, interface modification, issue/email changes) will emit:
    - Node/edge creation/update/delete
    - Event log entry
    - Optional change-set membership
  - These normalized events are sent directly to OPAL_SE ingestion endpoints to populate the system graph and event log in demo scenarios.

This roadmap positions CORE_SE as a **stacked system** where OPAL_SE is the brain and historical memory, FDS is the controlled simulator, and CORE_UI is the human workspace on top.

---

## 3. Component Overview

### 3.1 CORE_UI (User Interface + API Backend)

**Location:** `CORE_SE/CORE_UI`

**Role:** The primary **user-facing application** and **API gateway**.

- **Frontend:**
  - Next.js App Router (React + TypeScript)
  - Tailwind + Radix UI + Framer Motion
  - Sections include:
    - **Pulse Feed** – cross-tool activity stream
    - **Tasks** – work item management
    - **Notes** – markdown notes with artifact references (@REQ-123)
    - **Trace/Impact** – graph of requirements/tests/parts/issues
    - **Knowledge/Agents** – AI-powered knowledge and helpers
    - **Tool Windows** – external system embeds
    - **Admin/System** – service status, links, and diagnostics
  - Theme system (dark/light/custom) tailored to long engineering sessions.

- **Backend (FastAPI):**
  - Lives in `CORE_UI/backend` (as described by `ARCHITECTURE_CURRENT.md`).
  - Acts as an **API gateway** for the frontend.
  - Routers such as:
    - `pulse.py` – aggregated activity feed
    - `impact.py` – impact and traceability analysis
    - `tasks.py` – tasks and work items
    - `notes.py` – engineering notes
    - `knowledge.py` – knowledge/KB endpoints
    - `ai.py` – AI microcalls (summaries, subtasks, reports)
    - `windows.py` – external system window management
    - `auth.py`, `settings.py`, `config.py` – auth and configuration
  - Uses SQLite for demo; designed to move to PostgreSQL in production.
  - Integrates with external systems **via FDS in demo mode**, and with real REST APIs in production.

- **AI Layer (today):**
  - Uses OpenAI Chat + Embedding APIs for microcalls (summaries, subtasks, impact reasoning, daily reports).
  - ROADMAP: integrate OPAL_SE for persistent memory + small local models (SLIMs) in desktop/enterprise deployments.

- **Deployment modes:**
  - Web-first (Next.js + FastAPI on localhost ports).
  - Migration in progress to a **Tauri desktop shell**, packaging the UI and local backend into a desktop app.


### 3.2 FDS (Fake Data Server)

**Location:** `CORE_SE/FDS`

**Role:** A **fake data / integration emulator** for external engineering tools.

- Provides mock but realistic APIs for:
  - Jama (requirements)
  - Jira (issues)
  - Windchill (parts/PLM)
  - Outlook/email and related signals
- Implements endpoints for:
  - Pulse feed (`/mock/pulse`)
  - Impact/trace trees (e.g., `/mock/impact/{id}`)
  - Health and admin endpoints (`/health`, `/admin`, `/sidecar/info`, `/mock/admin/seed`).
- Used by CORE_UI backend to simulate real systems, especially in demo and development mode.

From **`FDS_REQUIREMENTS.md`** and **`FDS_CONNECTIVITY_GUIDE.md`**:

- FDS is also designed to integrate with **OPAL_SE** as one of its upstream APIs, using MCP or REST.
- Supports being registered as a sidecar service for OPAL (e.g., via admin API or environment variables).


### 3.3 OPAL_SE (OPAL MCP Server)

**Location:** `CORE_SE/OPAL_SE`

**Role:** A **per-user MCP server** that acts as the **AI/memory runtime** for CORE_SE (and other products in the MachPoint ecosystem).

From **`OPAL_SE/docs/opal_summary.md`**:

- Fully MCP-compliant server implementing:
  - Tools: `tools/list`, `tools/call` (JSON Schema validated)
  - Resources: list/read/create/update/delete with pagination
  - Prompts: list/get/set/delete and execution
  - Reverse-mode summarization: takes feeds or JSON payloads and produces structured summaries
  - Notifications: `notifications/initialized`, `notifications/tools/list_changed`, etc.
- Implements:
  - **Tool Serving:** auto-generates tools for configured APIs from env (`MCP_API_*`).
  - **Resource Handling:** canonical URIs, pagination.
  - **Prompt Workflows:** templated prompts that can call tools.
  - **Vector Memory:** persistent memory DB with embeddings (SQLite in dev, PostgreSQL in prod).
  - **Admin Panel:** `/admin` for health, tokens, users, MCP inspector, metrics.
- Deploys as a **Docker container per user**, with default MCP WebSocket/HTTP endpoints.

In the CORE_SE context:

- OPAL_SE becomes the **long-lived agent runtime** behind CORE-SE’s AI features and future “agent” experiences.
- FDS and other APIs can be wired into OPAL_SE, which then presents MCP tools/resources to AI clients or to future CORE_SE integrations.

---

## 4. Combined System Architecture

At a high level, the combined CORE_SE product looks like this:

```text
External Tools (Jama/Jira/Windchill/Outlook/etc.)
          ▲
          │  (real APIs in production / FDS in demos)
          │
      FDS (Fake Data Server)
          ▲
          │  (optional MCP/REST integration)
          │
     OPAL_SE (MCP Server – per-user runtime)
          ▲
          │  (AI tools, memory, summarization)
          │
CORE_UI Backend (FastAPI API Gateway)
          ▲
          │  (REST calls, WebSocket in future)
          │
CORE_UI Frontend (Next.js App)
          ▲
          │
      Engineers / Users
```

Key points:

- **CORE_UI** is the main product surface engineers touch.
- **FDS** is an integration façade that lets CORE_SE demonstrate deep integrations without needing live Jama/Jira/Windchill instances.
- **OPAL_SE** is the AI/memory/control plane runtime that can:
  - Serve tools for CORE_SE (and other apps).
  - Store and retrieve memories, summaries, and session context.

---

## 5. Primary Use Cases

1. **Systems Engineering Workspace**
   - Engineers manage requirements, traces, notes, and tasks in one place.
   - Pulse + Impact + Trace visualizations keep change under control.

2. **AI-Assisted Change Analysis**
   - AI microcalls (via OpenAI today, OPAL_SE later) summarize diffs, generate subtasks, draft impact reports, and daily summaries.

3. **Integration Demonstration & Sandbox**
   - FDS + CORE_UI provide a complete demo story without needing production tool access.
   - Useful for sales, pilots, and offline evaluation.

4. **Future: Persistent Engineering Memory**
   - OPAL_SE enables long-lived, per-user AI behavior: remembering projects, decisions, and domain context over time.

---

## 6. Positioning Summary

- **CORE_SE** is the **application**: UI + FastAPI backend for engineers.
- **FDS** is the **integration simulator**: a safe, local way to emulate Jama/Jira/Windchill/Outlook.
- **OPAL_SE** is the **AI/memory engine**: an MCP-compliant per-user runtime that turns APIs into tools and tools into durable knowledge.

Together, they form a cohesive stack for **change-oriented systems engineering**: from raw signals and integrations, through AI reasoning and memory, up to a polished workspace that engineers can live in all day.
