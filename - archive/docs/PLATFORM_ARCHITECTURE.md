# CORE-SE Platform Architecture

## Platform Structure

```
core-se-platform/                    ← Platform root
├── config/
│   └── sidecars.json               ← Sidecar registry
├── sidecars/                        ← All sidecar services
│   ├── outlook-connector/
│   ├── jira-connector/
│   ├── jama-connector/
│   ├── windchill-connector/
│   ├── ms-tasks-connector/
│   ├── ims-connector/
│   ├── lessons-service/            ← ✅ Implemented
│   ├── workload-service/
│   └── stem-python-sidecar/
├── apps/                            ← Core applications ✅
│   ├── OPAL_SE/                    ← ✅ OPAL backend (Node.js)
│   ├── CORE_UI/                    ← ✅ React UI + Backend
│   └── opal-server/                ← (empty placeholder)
└── FDS/                             ← External mock data server (not part of platform)
```

---

## Service Categories

### 🔌 **Connectors** (Category: `connector`)
External system integrations that pull data into CORE-SE.

| Service | Port | External Systems | Status |
|---------|------|------------------|--------|
| **Outlook Connector** | 7010 | Outlook, Microsoft 365 | 📋 Planned |
| **Jira Connector** | 7020 | Jira | 📋 Planned |
| **Jama Connector** | 7030 | Jama | 📋 Planned |
| **Windchill Connector** | 7040 | Windchill | 📋 Planned |
| **MS Tasks Connector** | 7050 | Microsoft Planner, To Do | 📋 Planned |
| **IMS Connector** | 7060 | MS Project, Primavera | 📋 Planned |

### 🛠️ **Services** (Category: `service`)
Internal platform services that own domain data.

| Service | Port | Purpose | Status |
|---------|------|---------|--------|
| **Lessons Service** | 7070 | Lessons learned management | ✅ Implemented |
| **Workload Service** | 7080 | Workload aggregation & Early Warning | 📋 Planned |

### 🧮 **Compute** (Category: `compute`)
Heavy computation and analysis services.

| Service | Port | Purpose | Status |
|---------|------|---------|--------|
| **STEM Python Sidecar** | 7090 | Engineering calculations & analysis | 📋 Planned |

---

## Core Applications

### OPAL Server (Port 7788)
- **Location**: `apps/OPAL_SE/` ✅
- **Technology**: Node.js + TypeScript + Express
- **Purpose**: MCP server, tool orchestration, system engineering backend
- **Key Features**:
  - MCP (Model Context Protocol) server
  - Tool registration and proxying (`tools/` folder)
  - System graph and relationships
  - WebSocket support

### CORE-SE UI Backend (Port 8000)
- **Location**: `apps/CORE_UI/backend/` ✅
- **Technology**: Python + FastAPI
- **Purpose**: API gateway between frontend and OPAL

### CORE-SE UI Frontend (Port 3000)
- **Location**: `apps/CORE_UI/frontend/` ✅
- **Technology**: React + TypeScript + Vite
- **Purpose**: Main user interface

---

## Sidecar Standards

### Directory Structure
Every sidecar follows this template:

```
sidecars/<sidecar-name>/
├── README.md                        ← Purpose, external systems, env vars
├── src/
│   ├── main.(py|ts)                ← Entry point
│   ├── api/
│   │   ├── routes.(py|ts)          ← HTTP endpoints
│   │   └── models.(py|ts)          ← Request/response DTOs
│   ├── core/
│   │   ├── service.(py|ts)         ← Business logic
│   │   └── clients/                ← External system clients (connectors only)
├── tests/
│   ├── test_api.(py|ts)
│   └── test_core.(py|ts)
├── Dockerfile
├── pyproject.toml | package.json
└── .env.example                     ← Env vars with placeholders
```

### README Requirements
Each sidecar README must include:
1. **One-sentence purpose** (from `sidecars.json`)
2. **External systems** it connects to
3. **Environment variables** required
4. **Example curl requests** for main endpoints
5. **Note**: "This is a sidecar service. All MCP tools live in apps/opal-server/tools, not here."

### Environment Variables
- Must match `env_vars` in `config/sidecars.json`
- Listed in `.env.example` with placeholder values
- No secrets committed to repo

---

## Communication Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    External Systems                         │
│  (Outlook, Jira, Jama, Windchill, MS Tasks, IMS)          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│                  Connector Sidecars                         │
│  (Ports 7010-7060)                                         │
│  - Poll external systems                                    │
│  - Normalize data                                           │
│  - Expose REST APIs                                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│                    OPAL Server                              │
│                   (Port 7788)                               │
│                                                             │
│  - MCP Server                                               │
│  - Tool Registration                                        │
│  - Proxies calls to sidecars                               │
│  - System graph & relationships                            │
└────────────────────┬────────────────────────────────────────┘
         │           │           │
         ↓           ↓           ↓
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  Lessons     │ │  Workload    │ │  STEM Python │
│  Service     │ │  Service     │ │  Sidecar     │
│  (7070)      │ │  (7080)      │ │  (7090)      │
└──────────────┘ └──────────────┘ └──────────────┘
         │
         ↓
┌─────────────────────────────────────────────────────────────┐
│              CORE-SE UI Backend (Port 8000)                 │
│              API Gateway / Proxy                            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│              CORE-SE UI Frontend (Port 3000)                │
│              React Application                              │
└─────────────────────────────────────────────────────────────┘
```

---

## MCP Tools

**Important**: MCP tools are registered in `apps/opal-server/tools` (currently `OPAL_SE/src/services/se/`), NOT in sidecars.

Each sidecar's `mcp_tools_proxied` in `sidecars.json` lists which MCP tools call that sidecar.

### Example: Lessons Service

**Sidecar** (`sidecars/lessons-service/`):
- Provides REST API endpoints
- Owns data and business logic
- No MCP tool code

**OPAL Tools** (`apps/opal-server/tools/lessonsToolsRegistration.ts`):
- `searchLessons` - Calls `POST /api/lessons/search`
- `getLessonDetail` - Calls `GET /api/lessons/:id`
- `suggestLessonsForActivity` - Orchestrates context + calls sidecar

---

## Port Allocation

| Range | Purpose |
|-------|---------|
| 3000 | Frontend |
| 7788 | OPAL Server |
| 8000 | UI Backend |
| 7010-7060 | Connector sidecars |
| 7070-7080 | Service sidecars |
| 7090+ | Compute sidecars |

---

## Configuration Management

### `config/sidecars.json`
Single source of truth for all sidecars:
- Service metadata
- Port assignments
- Environment variables
- MCP tool mappings

**Usage**:
- Coder AI reads this to scaffold new sidecars
- OPAL reads this to discover available services
- Documentation generated from this file

---

## Development Workflow

### Adding a New Sidecar

1. **Add entry to `config/sidecars.json`**:
   ```json
   {
     "id": "new-service",
     "folder_name": "new-service",
     "display_name": "New Service",
     "category": "service",
     "description": "...",
     "external_systems": [],
     "api_type": "rest",
     "default_port": 7100,
     "env_vars": ["NEW_SERVICE_VAR"],
     "mcp_tools_proxied": ["newTool"]
   }
   ```

2. **Create sidecar folder**:
   ```bash
   mkdir sidecars/new-service
   cd sidecars/new-service
   ```

3. **Follow standard structure**:
   - Create `README.md` with purpose, external systems, env vars
   - Create `src/` with `main.ts`, `api/`, `core/`
   - Create `.env.example` with env vars from JSON
   - Create `package.json` or `pyproject.toml`

4. **Register MCP tools in OPAL**:
   - Create `apps/opal-server/tools/newServiceToolsRegistration.ts`
   - Tools call sidecar REST API
   - Import in main tools registration file

5. **Update documentation**:
   - This file
   - Start scripts
   - Deployment docs

---

## External vs. Internal

### ❌ **NOT Part of Platform**
- **FDS** (`FDS/`) - Mock data server for development
  - Simulates external systems (emails, Jira notifications)
  - Only used for demos and testing
  - Does not belong in `sidecars/`

### ✅ **Part of Platform**
- Everything in `sidecars/`
- Everything in `apps/` (or OPAL_SE, CORE_UI currently)
- Configuration in `config/`

---

## Migration Plan

### Phase 1: Sidecar Organization ✅ COMPLETE
- [x] Create `config/` directory
- [x] Create `sidecars/` directory
- [x] Create `apps/` directory
- [x] Create `config/sidecars.json`
- [x] Move `lessons-service` to `sidecars/`
- [x] Update lessons-service port to 7070
- [x] Update lessons-service README

### Phase 2: App Organization ✅ COMPLETE
- [x] Move `OPAL_SE/` to `apps/opal-server/`
- [x] Move `CORE_UI/` to `apps/core-se-ui/`
- [ ] Update all import paths (if needed)
- [ ] Update start scripts
- [ ] Update documentation references

### Phase 3: Connector Implementation (Future)
- [ ] Implement Jira connector
- [ ] Implement Outlook connector
- [ ] Implement Jama connector
- [ ] Implement other connectors per priority

### Phase 4: Service Implementation (Future)
- [ ] Implement Workload service
- [ ] Implement STEM Python sidecar

---

## Key Principles

1. **Sidecars belong to the platform**, not to OPAL or UI
2. **`config/sidecars.json` is the single source of truth**
3. **MCP tools live in OPAL**, not in sidecars
4. **Sidecars expose REST APIs**, OPAL proxies them as MCP tools
5. **Standard structure** for all sidecars (README, src/, tests/, .env.example)
6. **No FDS in sidecars/** - it's an external mock, not a platform service

---

## References

- `config/sidecars.json` - Sidecar registry
- `sidecars/lessons-service/README.md` - Example sidecar documentation
- `apps/OPAL_SE/docs/LESSONS_LEARNED_SIDECAR.md` - Lessons service integration guide
- `apps/OPAL_SE/src/services/se/lessonsToolsRegistration.ts` - Example MCP tool registration
- `apps/OPAL_SE/tools/` - MCP tools folder
- `apps/OPAL_SE/tools/registry.json` - Tools registry
