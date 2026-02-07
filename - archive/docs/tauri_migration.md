Got it. Let’s turn CORE-SE into a desktop app in a way your AI coder can execute without guessing.

Below is a **migration document** written as instructions for the AI coder, grounded in the current architecture you shared.

---

# CORE-SE Web → Desktop Migration Plan

**Target:** Tauri desktop app (Windows-first) using existing Next.js frontend + FastAPI backend

---

## 1. Scope and Goals

**Goal:**
Wrap the existing CORE-SE web app in a **desktop shell** while reusing:

* **Frontend:** Next.js React app in `frontend/`
* **Backend:** FastAPI app in `backend/` (SQLite demo DB)
* **Optional:** FDS + OPAL for demo / integration scenarios.

**Non-goals for this first migration:**

* No major UI rewrite.
* No backend rewrite (keep FastAPI in Python).
* No OPAL redesign (treat OPAL as external / later step).

---

## 2. Target Desktop Runtime Topology

### 2.1. Dev Mode (for contributors)

Processes on the developer’s machine:

* `FDS` (optional dev service) on port 4000
* `OPAL` (optional) on its WebSocket port (e.g. 3001)
* `backend` (FastAPI) on port 8000
* `frontend` (Next.js dev server) on port 3000
* `desktop` (Tauri shell) loading `http://localhost:3000`

So devs can still open the browser at `http://localhost:3000` **or** use the desktop app.

### 2.2. Desktop Production Mode (for engineers)

On the engineer’s machine:

* Desktop executable (Tauri)
* Tauri launches:

  * A **local FastAPI backend** (packaged/installed with the app or started by a script)
  * Optionally a **local FDS** for demo / fake data mode
* Tauri loads a **built Next.js app** (static/production build) as its UI, pointing at the local backend (`http://localhost:8000` or similar).

External systems:

* Jama, Jira, Windchill, Outlook, OPAL remain **remote HTTP/WS endpoints** that the backend calls.

---

## 3. Migration Strategy (High-Level)

We will:

1. **Add a Tauri desktop shell** as a new `desktop/` directory.
2. **Wire the shell to the existing frontend** in dev (use `localhost:3000`) and in production (use built assets).
3. **Standardize backend URLs** so the same frontend can work in:

   * Web mode (browser + remote backend)
   * Desktop mode (Tauri + local backend)
4. **Add tooling scripts** to start the necessary services and build/package the desktop app.
5. Keep FDS + OPAL integration **optional** in the first pass.

---

## 4. Detailed Task List for AI Coder

### 4.1. Create the Desktop Shell (Tauri)

**Objective:** Add a Tauri app that hosts the existing Next.js UI.

**Tasks:**

1. **Create `desktop/` project:**

   * Initialize a Tauri app in a new `desktop/` directory at the repo root.
   * Configure it to use the existing `frontend` for the webview content.
2. **Tauri dev configuration:**

   * In dev mode, configure Tauri so its webview loads `http://localhost:3000`.
   * Add a dev command (e.g. `npm run dev:desktop`) that:

     * Starts the FastAPI backend (`backend/`, port 8000).
     * Starts the Next.js dev server (`frontend/`, port 3000).
     * Starts the Tauri dev shell (`desktop/`).
3. **Tauri prod configuration:**

   * Define how the Tauri app will load the UI in production:

     * Build the Next.js app to static/prod assets (`frontend` build).
     * Configure Tauri to serve those assets from a local `dist` directory or from a small built-in file server.
   * Ensure the frontend’s API base URL in prod points to the local backend (e.g. `http://127.0.0.1:8000`).
4. **Window and app basics:**

   * Configure window title, size, min size, and a simple app menu.
   * Ensure there is a visible loading state (e.g. if backend/frontend not yet ready).
5. **Cross-platform baseline:**

   * Target **Windows** as the primary platform.
   * Keep macOS support in mind but do not optimize for it in this first pass.

---

### 4.2. Normalize Frontend API Configuration for Desktop + Web

**Objective:** Make the React/Next.js app agnostic to whether it runs in a browser or in Tauri.

**Tasks:**

1. **Centralize API base URL:**

   * Introduce a single helper (e.g. in `frontend/src/lib/config.ts`) that exposes `API_BASE_URL`.
   * Read this from environment variables (e.g. `NEXT_PUBLIC_API_BASE_URL`) with sensible defaults.
2. **Define modes:**

   * Web mode: `NEXT_PUBLIC_API_BASE_URL` points to a remote backend (e.g. `https://core-se-api.example.com` or `http://localhost:8000` in local web dev).
   * Desktop mode: `NEXT_PUBLIC_API_BASE_URL` points to `http://127.0.0.1:<backend_port>`.
3. **Update all frontend API calls:**

   * Replace any hard-coded backend URLs in the frontend with calls to `API_BASE_URL`.
   * Ensure all sections (Pulse, Impact/Trace, Notes, Tasks, Knowledge, AI microcalls, etc.) route through this shared config.
4. **Add build scripts:**

   * Script for **web build** (existing).
   * New script for **desktop build** that sets the correct API base URL and outputs the build where Tauri expects it.

---

### 4.3. Backend Adjustments for Desktop Mode

**Objective:** Make the FastAPI backend easy to run as a local service from the desktop app, without major structural changes.

**Tasks:**

1. **Startup entrypoint cleanup:**

   * Verify the backend can be started via a single python entrypoint (e.g. `python start_backend.py`) that:

     * Reads `.env` / config.
     * Runs uvicorn on a fixed port (e.g. 8000).
   * Ensure this script logs a clear “Backend started on port 8000” message.
2. **Config for desktop vs web:**

   * Use existing `Settings` / `MODE` config to add a `MODE=desktop` if needed.
   * In desktop mode:

     * Treat FDS as optional (can be disabled).
     * Set appropriate defaults for `FDS_BASE_URL`, `DATABASE_URL`, etc.
3. **Local DB file management:**

   * Confirm SQLite DB path is relative to the backend directory (e.g. `sqlite:///./core_demo.db`).
   * In desktop mode, ensure DB path resolves inside an app-specific folder (e.g. under user’s AppData or a Tauri-managed data dir) instead of the install directory.
4. **Graceful startup / shutdown hooks:**

   * Ensure the backend can be cleanly stopped (Ctrl+C / signal).
   * If Tauri is going to start/stop the backend, provide a clear process control path.

---

### 4.4. Coordinated Startup Scripts

**Objective:** Give developers and desktop users a clean way to start everything.

**Tasks:**

1. **Dev script (`start_dev_desktop`):**

   * At the repo root, create a script that:

     1. Starts FDS (optional) on port 4000.
     2. Starts OPAL (optional) if needed for dev.
     3. Starts FastAPI backend on port 8000.
     4. Starts Next.js dev server on port 3000.
     5. Starts Tauri dev (`desktop`).
   * It’s acceptable if some of these are optional steps with flags or interactive prompts.
2. **Prod/packaging script (`build_desktop`):**

   * Build frontend (Next.js) for production.
   * Prepare backend settings for desktop (maybe `.env.desktop` → final `.env`).
   * Run Tauri bundling to create an installer / executable.
3. **Existing scripts compatibility:**

   * Keep `start_all.bat` for pure web demo mode (browser only).
   * Add new scripts rather than replacing the existing ones at this stage.

---

### 4.5. FDS Integration Strategy (Desktop)

**Objective:** Keep FDS useful for demos, but not required for desktop usage.

**Tasks:**

1. **Desktop config:**

   * In `MODE=desktop`, set `FDS_BASE_URL` via `.env` so:

     * If FDS is running locally (e.g. `http://localhost:4000`), the backend can call it.
     * If FDS is absent, backend endpoints that depend on it can either:

       * Fail gracefully with a clear error, or
       * Serve stub/mock data from embedded fixtures.
2. **Document two desktop modes:**

   * **Desktop Demo Mode:** run FDS and show realistic mock integration with Jama/Jira/Windchill.
   * **Desktop Standalone Mode:** run only backend + frontend; no FDS; use internal demo data where necessary.
3. **Tauri env switching:**

   * Allow Tauri app to start in “demo” or “standalone” modes (e.g. via CLI argument or config flag) which sets the appropriate env variables.

---

### 4.6. OPAL Integration (Phase 2, not mandatory for first pass)

**Objective:** Provide a place in the desktop architecture where OPAL can live later.

**Tasks (design stub only for now):**

1. **Connection abstraction:**

   * Ensure anywhere the backend talks to OPAL (WebSocket / HTTP) is routed through a single config point, not hard-coded URLs.
2. **Mode choice:**

   * For now, assume OPAL is **remote** and accessed over the network.
   * Later we can decide whether the desktop app should:

     * Start a local OPAL container, or
     * Connect to a central OPAL instance.
3. **Do not block the desktop migration** on OPAL changes.

---

## 5. UX / Feature Expectations for Desktop

The initial desktop version should:

1. Offer the same main sections as the web app:

   * Pulse, Tasks, Notes, Trace/Impact, Knowledge/Agents, Tool Windows, Themes.
2. Persist user data locally via the backend’s DB (SQLite).
3. Talk to FDS/OPAL only when configured to do so.
4. Feel “native enough”:

   * Window frame, app icon, proper title.
   * No obvious “this is just a website” quirks like Chrome error pages.

---

## 6. Acceptance Criteria / Checklist

The migration is “done” when:

1. **Dev Experience**

   * `npm run dev:desktop` (or equivalent) launches:

     * Backend
     * Frontend
     * Desktop shell
   * Code changes in `frontend/` hot-reload inside the Tauri window.
2. **Desktop App Functionality**

   * Installer/executable can be produced for Windows.
   * Running the desktop app:

     * Starts the backend (or detects an existing one).
     * Opens the CORE-SE UI in a window.
     * Can load Pulse/Trace/Notes/Tasks/Knowledge via the local backend with no manual browser required.
3. **Config Modes**

   * Web mode still works: running `start_all.bat` + browser behaves as before.
   * Desktop mode works: using the Tauri executable alone.
4. **No Hard-coded URLs**

   * Backend and OPAL endpoints are configurable.
   * Frontend only calls APIs through a centralized `API_BASE_URL`.
5. **Data Persistence**

   * Notes, tasks, etc. created via the desktop app persist between app launches (SQLite DB is reused).

---

If you want, I can next:

* Turn this into a **step-by-step “issue list”** you can paste directly into your AI coder (Issue 1, Issue 2, etc.), or
* Add a short **“Tauri vs Electron vs web-only” comparison** tailored to CORE-SE for your own sanity check before committing fully.

CHANGES BEYOND MIGRATION


Short version:

No big rewrites. The React UI and FastAPI backend both mostly stay as–is.

You just need a few **“make this environment-agnostic”** tweaks so they behave nicely when wrapped by Tauri.

I’ll split it into UI + backend and keep it concrete.

---

## 1. UI (Next.js) – what should change

Most of your UI can stay identical. The main changes are about **how it talks to the backend** and how it behaves if the local backend isn’t ready yet. From the ARCHITECTURE_CURRENT doc: the frontend calls the FastAPI backend for Pulse, Impact, Tasks, Notes, AI, etc.

### 1.1 Centralize the API base URL

Right now the frontend hits the backend on `localhost:8000` in dev. For Tauri you want:

* A single source of truth for the API base URL (e.g. `API_BASE_URL`).
* Controlled by env vars like `NEXT_PUBLIC_API_BASE_URL`.
* Web mode → `http://localhost:8000` or your hosted backend.
* Desktop mode → `http://127.0.0.1:8000` (local backend) or whatever Tauri starts.

**Change required:**

Replace any scattered hardcoded URLs in `frontend/` with a shared config helper that reads `NEXT_PUBLIC_API_BASE_URL` and use that everywhere the UI calls the backend (Pulse, Impact, Notes, Tasks, Knowledge, AI microcalls, etc.).

### 1.2 Handle “backend not ready yet”

In desktop mode, Tauri will start your backend process, then load the UI. There can be a small race where the UI loads before the backend is listening.

**Change required:**

* Add a simple global “backend health” check on app load.
* Show a clean “Starting CORE-SE Engine…” state if the first call fails.
* Retry a few times before showing an error.

This prevents the Tauri window from opening into a wall of 500/failed fetches.

### 1.3 Don’t assume “browser-only” environment

Most of your stack (Next.js + React + Tailwind + Radix + Framer Motion) is webview-friendly already.

Things to double-check:

* Any direct `window.open` / new-tab behavior → in desktop, consider opening in system browser explicitly when viewing external links (Jama/Jira/Windchill/Confluence).
* Any use of `localStorage` / `sessionStorage` is fine, but avoid relying on 3rd party cookies or OAuth popups for now (we’re not doing heavy auth yet anyway).
* Don’t add browser extensions / chrome-specific APIs; Tauri’s webview is more restricted.

You don’t need to change component structure (PulseSection, TasksSection, NotesSection, TraceImpactSection, KnowledgeAgentsSection, ToolWindowSection stay the same).

### 1.4 Optional: a “Desktop Mode” toggle in settings

Not required, but useful later:

* A small flag in the UI settings: “Running in Desktop Mode.”
* Lets you:
  * Show “local db path” / “local engine status” in an About pane.
  * In the future, surface local-only features (file watchers, script launchers).

For now it can just be a read-only indicator driven by an env flag.

---

## 2. Backend (FastAPI) – what should change

The backend is already a clean API gateway with FDS, OpenAI, and SQLite.

For Tauri, we mostly need to make it **easy to start as a local service** and a bit more mode-aware.

### 2.1 Define a “desktop” mode in config

You already have `MODE=demo` and other flags in `app/config.py`.

**Change required:**

* Add `MODE=desktop` as a recognized mode.
* In `MODE=desktop`:
  * Use a stable port (e.g. 8000).
  * Use a local DB path that lives in an app data directory rather than the repo (Tauri can pass this path via env later).
  * Treat FDS as **optional** (see next).

### 2.2 Make FDS truly optional in desktop mode

Right now Pulse/Impact routes call FDS mock endpoints.

For desktop:

* If `FDS_BASE_URL` is set and reachable → use it (demo mode with realistic fake data).
* If not → either:
  * Serve built-in demo data, or
  * Return a clear “FDS not configured” error the UI can handle nicely.

**Change required:**

Guard the FDS calls with “if configured / reachable” logic instead of assuming FDS is always present.

### 2.3 CORS / origin setup for desktop

Today the backend is set up with CORS for the web dev origin.

For Tauri, you’ll either:

* Serve the frontend via `http://localhost:3000` even in desktop; or
* Load the built Next.js app from the local filesystem / `tauri://localhost`.

In both cases, CORS must allow the desktop frontend origin to talk to `http://127.0.0.1:8000`.

**Change required:**

* Update the CORS allowed origins list to include:
  * Your dev origin (`http://localhost:3000`).
  * Whatever origin the Tauri webview uses (often `tauri://localhost` or no CORS at all if you use Tauri’s HTTP plugin).
* Keep it configurable via env so you can lock it down in production.

### 2.4 Solid single entrypoint for Tauri to launch

You already start the backend via `python start_backend.py` which runs uvicorn on port 8000.

**Change required (light):**

* Make sure `start_backend.py`:
  * Uses the `MODE=desktop` config when launched from the desktop app.
  * Logs a clean “Backend listening on 8000 (mode: desktop)” line.
* Tauri can then spawn that command and watch its output.

No internal route changes are needed.

---

## 3. What does *not* need to change

* **Domain models** : Pulse, Impact, Notes, Tasks, Knowledge, AI routes stay the same.
* **Routing shape** : `/pulse`, `/impact/{id}`, `/notes`, `/tasks`, `/ai/...` all unchanged.
* **UI layout and sections** : the whole CORE-SE workspace structure stays as is; Tauri doesn’t care how you lay out React components.
* **OPAL/STEM/sidecar plans** : all of that lives behind HTTP/WS; Tauri just wraps the UI, it doesn’t change the OPAL wiring.

---

## TL;DR for your AI coder

If I boil it down to a punch list:

**UI**

1. Centralize API base URL and remove any hardcoded backend URLs.
2. Add a simple “backend health / loading” state.
3. Make sure no browser-only assumptions break in a webview.

**Backend**

4. Add `MODE=desktop` behavior (local DB path, FDS optional).
5. Relax/parameterize CORS to allow Tauri’s origin.
6. Ensure a clean `start_backend.py` entrypoint that Tauri can spawn.

Everything else (Pulse, Trace, Tasks, Notes, Knowledge, AI endpoints) can remain structurally the same while you wrap the app in Tauri.
