# CORE_UI Technical Summary

**Last Updated:** 2026-02-06
**Version:** 0.1.0

## 1. Overview
CORE_UI is a hybrid web and desktop application designed for complex systems engineering and requirements management. It provides a unified interface for visualizing system relationships, managing tasks, and analyzing impact across engineering artifacts.

The application uses a **modern "Hybrid" Architecture**:
- **Desktop Mode**: Runs as a standalone Windows application using Tauri. Data is stored locally in SQLite (`~/.core_se/desktop/core_desktop.db`).
- **Web Mode**: Runs as a standard web application (cloud/server). Data is stored in a shared database (Postgres/RDS).

## 2. Technology Stack

### 2.1 Frontend (`apps/CORE_UI/frontend`)
A modern Single Page Application (SPA) built for performance and interactivity.
- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Shadcn/UI (Radix Primitives)
- **Icons**: Lucide React
- **Visualization**: 
  - [React Flow](https://reactflow.dev/) for Network/Trace Graphs
  - [Recharts](https://recharts.org/) for Analytics and Trends
- **Build Mode**: configured for `next export` (Static HTML/CSS/JS) to allow Tauri embedding.

**Key Components:**
- **`LeftNav`**: Main navigation controller.
- **`TraceImpactSection`**: Requirements traceability visualization.
- **`CriticalPathAnalyzer`**: Gantt and timeline analysis (Gantt Section).
- **`AdvancedImpactAnalysis`**: Risk assessment and simulation (Risks Section).
- **`RequirementImpactAnalytics`**: Coverage and metric dashboards (Analytics Section).

### 2.2 Backend (`apps/CORE_UI/backend`)
A lightweight, high-performance API server.
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python 3.10+)
- **ORM/Data**: SQLModel / SQLAlchemy
- **Database**: 
  - **Local**: SQLite (zero-config)
  - **Prod**: PostgreSQL compatible
- **Configuration**: Pydantic Settings (`config.py`) handles environment switching (`demo` vs `web` vs `desktop`).

**Key Features:**
- **`/api/pulse`**: Real-time project activity stream.
- **`/api/requirements`**: Impact analysis and graph traversal logic.
- **`/health`**: Service status monitoring.

### 2.3 Desktop Shell (`apps/CORE_UI/desktop`)
The native wrapper that bundles the frontend and manages the desktop experience.
- **Framework**: [Tauri v2](https://tauri.app/) (Rust)
- **Function**: 
  - Serves the static Frontend files.
  - Manages the native window (resize, minimize, integration).
  - Can spawn/manage the Python sidecar process (planned).
- **Configuration**: `tauri.conf.json` maps the frontend build output (`../frontend/out`) to the webview.

## 3. Deployment Models

### Desktop (Local)
- **Startup**: `start_dev_desktop.bat` (Dev) or `build_desktop.bat` (Prod).
- **Data**: Private SQLite database file per user.
- **Use Case**: Offline capable, single-user engineering workstation.

### Web (Cloud/VPS)
- **Startup**: Standard Docker container or Process Manager (systemd).
- **Data**: Centralized SQL database.
- **Use Case**: Collaborative team environment, accessible via browser.

## 4. Directory Structure
```
CORE_UI/
├── backend/            # FastAPI Server
├── frontend/           # Next.js Application
├── desktop/            # Tauri Project
├── docs/               # Documentation
└── build_desktop.bat   # Build automation
```
