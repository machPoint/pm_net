# CORE-SE – Current Architecture Overview

This document captures the current architecture and runtime topology of the CORE-SE system as implemented in this repository. It is intended as input to future refactors, including a Tauri-based desktop packaging of the frontend.

---

## 1. High-Level System Topology

CORE-SE is currently implemented as a **web-first, full-stack application** with optional auxiliary services. The main components and their typical dev ports are:

- **Frontend (Next.js App)** – React + TypeScript UI
  - Dev server on **port 3000**
  - Located at `frontend/`
- **Backend (FastAPI API Gateway)** – Python, orchestrates data & AI calls
  - Uvicorn server on **port 8000**
  - Located at `backend/`
- **FDS (Fake Data Service)** – mock integration layer for external systems
  - Uvicorn server on **port 4000**
  - Separate repo: `C:\Users\X1\PROJECT\FDS`
- **OPAL MCP Server (Standalone)** – per-user, persistent MCP server
  - Node/TypeScript server, default WebSocket port **3001** in the scripts in this repo
  - Implemented in a separate repo (standalone OPAL project)

The `start_all.bat` script (in the repo root) is designed to start all services in sequence for a full demo environment:

```text
FDS (4000) → OPAL (3001) → CORE-SE Backend (8000) → CORE-SE Frontend (3000)
```

> **Note:** For the standalone OPAL server project, OPAL should be treated as independent and environment-agnostic (no required FDS/CORE-SE dependency). In this repo, OPAL is referenced only as an optional upstream service.

---

## 2. Frontend – Next.js / React Application

**Location:** `frontend/`

**Key Technologies**

- Next.js (App Router) with React + TypeScript
- Tailwind CSS with a custom theme system (dark/light/custom)
- Radix UI components with custom styling
- Framer Motion for animations
- React Hook Form + Zod for forms and validation
- Some Three.js integration via `@react-three/fiber` and `@react-three/drei`

**Structure** (per `WARP.md` and code organization):

- `src/app/`
  - App Router entrypoints, including `layout.tsx` and main `page.tsx`
  - Global providers (e.g., theme, data mode, etc.)
- `src/components/`
  - **Core sections:**
    - `PulseSection` – activity feed aggregation
    - `TasksSection` – task and work item management
    - `NotesSection` – markdown notes with artifact references
    - `TraceImpactSection` – visualization of requirements traceability and impact graph
    - `KnowledgeAgentsSection` – AI-powered knowledge and agent experiences
    - `ToolWindowSection` – hosting external-system views / window frames
  - Shared UI components and layout primitives (cards, panels, nav, etc.)
- `src/hooks/`
  - Custom React hooks (e.g., theme management, data mode, selection state)
- `src/lib/`
  - Utility functions, mock/fake data generators, shared logic

**Front-End Responsibilities**

- Render the main CORE-SE workspace:
  - Notes, Tasks, Pulse feed, Trace graph, Knowledge, Agents, Admin, Themes, etc.
- Call backend REST API endpoints for:
  - Pulse feed data
  - Impact and trace graphs
  - Notes, tasks, and knowledge operations
  - AI-powered microcalls (summaries, subtasks, daily reports)
- Manage local interaction state, theme, and layout.

The frontend is currently **web-first**, but its architecture is compatible with being wrapped by Tauri as a desktop shell (e.g., by pointing Tauri at the built Next.js app or a static build served by a local backend).

---

## 3. Backend – FastAPI Application

**Location:** `backend/`

**Runtime:**

- Started via `python start_backend.py` (which runs `uvicorn main:app --reload --port 8000`)
- Uses `app/` as the main application package

**Key Components**

- `app/main.py`
  - FastAPI app instance
  - Router registration
  - CORS and middleware configuration
- `app/config.py`
  - `Settings` class (Pydantic BaseSettings) with environment-driven configuration
  - Important fields:
    - `MODE`: default `demo`
    - `DATABASE_URL`: `sqlite:///./core_demo.db`
    - `FDS_BASE_URL`: base URL for FDS (e.g., `http://localhost:8001` in docs, but `start_fds.py` currently runs on 4000)
    - `OPENAI_API_KEY`: optional, for AI features
    - Demo auth and JWT settings
    - Feature flags: `FEATURE_EMAIL`, `FEATURE_WINDCHILL`, `FEATURE_OUTLOOK`, `FEATURE_AI_MICROCALLS`, `FEATURE_TRACE_GRAPH`, `FEATURE_THEMES`
    - AI model config: `OPENAI_MODEL`, `EMBEDDING_MODEL`, `VECTOR_DIMENSIONS`, timeouts
- `app/database.py`
  - SQLAlchemy engine and session setup targeting SQLite
- `app/models.py`
  - Pydantic models for:
    - Pulse items
    - Artifact references
    - Impact/trace nodes
    - Notes, tasks, knowledge items
    - Other domain entities

**Routers (`app/routers/`)**

- `pulse.py`
  - Endpoint: `GET /pulse`
  - Parameters: `since`, `sources`, `types`, `limit`
  - Calls FDS endpoint (e.g., `GET {FDS_BASE_URL}/mock/pulse`) using `httpx.AsyncClient`
  - Maps FDS mock pulse items into internal `PulseItem` model
- `impact.py`
  - Endpoint: `GET /impact/{entity_id}`
  - Parameters: `depth`
  - Calls FDS endpoint (e.g., `GET {FDS_BASE_URL}/mock/impact/{entity_id}`)
  - Recursively maps FDS impact nodes into `ImpactResult` and nested nodes
- `tasks.py`
  - Task CRUD and work item management
- `notes.py`
  - Notes with artifact references and citations
- `knowledge.py`
  - Knowledge base and search endpoints
- `ai.py`
  - AI/LLM operations (summaries, subtasks, reports) via OpenAI APIs
- `windows.py`
  - External system window management (e.g., embedding views from other systems)

**Backend Responsibilities**

- Act as the **API gateway** for the frontend
- Orchestrate calls to external systems (via FDS in demo mode, real APIs later)
- Conduct AI microcalls via OpenAI
- Provide an authentication layer (simplified in demo mode)
- Provide an internal data model and persistence for notes, tasks, etc. (SQLite now; Postgres later)

The backend currently assumes a networked environment (HTTP calls to FDS). The Tauri architecture will need a strategy for local/offline operation, potentially replacing these external HTTP calls with local mock data or an embedded service.

---

## 4. Fake Data Service (FDS) – External System Emulator

**Location:** Separate repo at `C:\Users\X1\PROJECT\FDS`

**Runtime:**

- `start_fds.py`
  - Uvicorn FastAPI app on **port 4000** (`host=0.0.0.0`)
- `start_fds_dev.bat`
  - Interactive launcher with multiple options

**Purpose**

- Emulate external engineering systems:
  - Jama (requirements)
  - Jira (issues)
  - Windchill (parts/PLM)
  - Outlook/email
  - Other systems such as Confluence, etc.
- Provide **mock endpoints** for:
  - Pulse feed
  - Impact/trace graph
  - Connection status
  - Webhooks
  - Data seeding and regeneration

**Developer Interfaces (from `start_fds_dev.bat`)**

- Menu options:
  - `[1]` Start FDS server (port 4000)
  - `[2]` Start FDS + open Admin Dashboard (`http://localhost:4000/admin`)
  - `[3]` Run API tests (via `tmp_test_api.py` if present)
  - `[4]` Regenerate mock data (`POST /mock/admin/seed`)
  - `[5]` Check system status (`/health`, `/admin`, `/sidecar/info`)
  - `[6]` View integration or admin dashboard guides

**API Design (from `FDS_REQUIREMENTS.md` in this repo)**

- Detailed requirements for:
  - Jama mock endpoints
  - Jira mock endpoints
  - Other systems and impact analysis
- Integration pattern examples:

  ```text
  Jama → REST API → FDS → MCP Server (OPAL) → CORE Backend
  Jira → REST API → FDS → MCP Server (OPAL) → CORE Backend
  ```

> **Important for Tauri:** FDS is an **optional external service** used primarily for realistic demos. A desktop/Tauri architecture may:
>
> - Embed similar fake data generation directly in the app, or
> - Ship a bundled local service, or
> - Bypass FDS entirely for “offline mode” by using static/embedded data.

---

## 5. OPAL MCP Server (Standalone)

**Documentation File in this Repo:** `docs/opal_summary.md`

**Implementation:** separate repo (TypeScript)

**Role**

- Long-running, per-user **MCP server** that exposes tools/resources over WebSocket + HTTP
- Designed as a **persistent, identity-bearing AI runtime** with optional memory
- Can be used by multiple products (CORE-SE, FOCAL, other MachPoint services)

**Core Capabilities (from `opal_summary.md`)**

- MCP-compliant tools and resources
  - `tools/list`, `tools/call` with JSON Schema-validated inputs via Ajv
  - `resources/list` with pagination
  - `prompts/list` and optional prompt execution
- Reverse-mode summarization
  - Accepts JSON payloads (e.g., from polled feeds)
  - Generates summaries via `summarizeFeed(data)` in multiple formats (headline, bullets, full)
- Transport and protocol
  - WebSocket (JSON-RPC 2.0)
  - HTTP REST endpoints
  - MCP spec version 2024-11-05
- Configuration via environment variables
  - `MCP_API_COUNT` and `MCP_API_0_*` envs define upstream APIs, resources, and endpoints
- Deployment
  - Docker container per OPAL instance
  - Managed by MachPoint control plane (create/stop/delete, metrics, etc.)

> **Important for Tauri:** OPAL is designed as an external, server-like component. For a fully self-contained desktop app, you’ll need to decide whether:
>
> - OPAL is a remote/cloud component only
> - or a local container/service that ships with the desktop app
> - or replaced by a lighter-weight embedded runtime for local-only use

---

## 6. Data, Storage, and Configuration

**Backend Storage**

- SQLite database (file **`core_demo.db`**) in demo mode
- SQLAlchemy ORM configured in `app/database.py`
- Alembic migration support (basic setup)

**Planned/Target Storage**

- PostgreSQL for MVP/production (as stated in docs)

**Backend Configuration**

- `.env` file (root of repo or backend) with settings:
  - `MODE=demo`
  - `DATABASE_URL`
  - `FDS_BASE_URL`
  - `OPENAI_API_KEY`
  - Feature flags for email, Windchill, Outlook, AI microcalls, trace graph, themes

**Frontend Configuration**

- Environment variables and configs (e.g., model selection, API URLs) via Next.js runtime configuration and `.env` files
- Theme and data mode contexts in React

**AI Layer**

- Currently uses **OpenAI Chat/Embedding APIs** (e.g., `gpt-4o-mini`, `text-embedding-ada-002`) as configured in backend settings
- OPAL + local SLIMs (e.g., Mistral-7B, Qwen2.5-7B, Phi-3.5) are part of the roadmap for local/enterprise inference rather than the current default in this repo

---

## 7. Developer Tooling, Scripts, and Demo Modes

**Root Scripts**

- `start_all.bat`
  - Full-stack launcher for **FDS + OPAL + CORE Backend + Frontend**
  - Manages port cleanup and opens browser windows (frontend and FDS admin)
- `start_demo.bat`
  - Frontend-only launcher (demo mode for UI without backend/FDS/OPAL)
  - Clears port 3000, starts Next.js dev server, and opens browser to `http://localhost:3000`

**Backend Utilities**

- `WARP.md`
  - Documentation for terminal workflows and architecture overview
- `test_apis.py`
  - Simple backend API test runner

**Frontend Utilities**

- `npm run dev` – Next.js dev server
- `npm run build` – production build
- `npm start` – production server
- `npm run lint` – ESLint

**FDS Utilities**

- `start_fds_dev.bat` – dev launcher with menu-driven operations
- `start_fds.py` – direct startup script

---

## 8. Considerations for Tauri Desktop Architecture

This section highlights aspects of the current architecture that a Tauri redesign will need to account for.

1. **Multiple Services vs. Single Desktop App**
   - Today: frontend, backend, FDS, and OPAL can all run as separate processes.
   - Tauri: typically embeds a frontend and can run a Rust/Node/other backend inside the same app or as child processes.

2. **Network Dependencies**
   - Backend ↔ FDS via HTTP
   - Backend ↔ OPAL (potentially) via HTTP/WebSocket
   - Desktop mode may need to:
     - Embed FDS-like logic (mock data) locally
     - Provide a local backend API endpoint (e.g., FastAPI bundled or replaced with a Rust backend)
     - Or treat backend/OPAL/FDS as remote services only (online mode only)

3. **Data Persistence**
   - Current SQLite database (`core_demo.db`) can map well to a desktop app (local DB file).
   - Tauri can use SQLite (via Rust bindings) or communicate with a local Python process that manages the DB.

4. **Auth and Secrets**
   - Demo mode uses simple token-based auth and `.env` configuration.
   - Desktop app will need a strategy for securely storing API keys (OpenAI, etc.) and handling user auth.

5. **AI & OPAL**
   - Today: OpenAI APIs directly from backend; OPAL as a conceptual external server.
   - Desktop mode must decide whether to:
     - Keep AI calls entirely remote
     - Bundle a lightweight local model runtime
     - Integrate OPAL as a local container/sidecar

6. **Frontend Integration**
   - Current Next.js app can be:
     - Served by a local backend process accessible via `http://localhost` inside the Tauri app, or
     - Built into static assets and loaded directly by Tauri’s webview, with API calls proxied to a local/remote backend.

This document reflects the **current state** of the CORE-SE architecture, with explicit callouts for elements that matter when designing a Tauri-based desktop architecture around or as a replacement for the existing stack.
