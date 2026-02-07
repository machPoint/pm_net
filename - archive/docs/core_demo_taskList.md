
# CORE-SE Demo Task List (Frontend + Backend + Fake Data Service)

## Phase 0 — Repo and Scaffolding

* Create monorepo structure:

  * core/apps/web for React (Node dev server)
  * core/apps/api for FastAPI backend
  * core/apps/fds for Fake Data Service
  * core/packages/types for shared JSON and TypeScript schemas
  * core/packages/ui for shared UI components
  * core/deployments for docker compose and env samples
  * core/docs for runbook and API contracts
* Add shared JSON schemas and mirror them in Pydantic:

  * PulseItem, ImpactResult, Task, Note, KnowledgeCard, WindowLink, DailyReport, ArtifactRef
* Add developer tooling:

  * Prettier and ESLint for web
  * mypy and ruff for Python
  * environment example file with MODE=demo, OPENAI\_API\_KEY, FDS\_BASE\_URL, DB\_URL=sqlite, DEMO\_AUTH\_TOKEN, and feature flags

Definition of Done: Repository boots with `pnpm dev` for web and `uvicorn` for backend.

---

## Phase 1 — Fake Data Service

* Implement endpoints:

  * /mock/jama/items, /mock/jama/relationships, /mock/jama/baselines
  * /mock/jira/issues, /mock/jira/links
  * /mock/windchill/parts, /mock/windchill/bom, /mock/windchill/ecn
  * /mock/email/messages, /mock/outlook/messages
  * /mock/graph/trace, /mock/impact/{id}, /mock/pulse
  * /mock/admin/seed to reset dataset
* Implement seed data with:

  * 80 to 100 requirements
  * 40 to 60 tests
  * 25 to 35 issues
  * 15 to 25 parts
  * 4 to 6 ECNs
  * 10 email messages
  * 10 outlook messages
  * About 15 percent traceability gaps
* Ensure cross-linked IDs like JAMA-REQ-123, JAMA-TC-45, JIRA-ENG-901, PN-00123, ECN-24-045, OUTLOOK-MSG-001
* Implement pulse aggregator that merges events
* Implement impact endpoint with ripple sets
* Support realism toggles:

  * X-Mock-Latency and X-Mock-Error headers
  * query params for page, size, q, type, since

Definition of Done: Seeding works, pulse returns diverse events, and all links resolve to mock HTML pages with read-only watermark.

---

## Phase 2 — Backend (FastAPI)

* Setup FastAPI app with:

  * CORS enabled
  * bearer token middleware for demo auth
  * health endpoint
* Implement endpoints:

  * GET /pulse proxies /mock/pulse
  * GET /impact/{id} proxies /mock/impact
  * GET /windows/{tool}/{id} returns {url, read\_only}
  * GET /knowledge returns stub knowledge cards
  * GET, POST, PATCH /tasks using SQLite
  * POST /notes stores notes with citations
  * GET /config returns feature flags and theme list
* Implement AI microcalls (via OpenAI API):

  * POST /ai/summarize input text, returns JSON with summary
  * POST /ai/subtasks input text, returns JSON with title and subtasks
  * POST /ai/bullets input text, returns JSON with bullet points
  * POST /ai/daily\_report compiles pulse and tasks, returns JSON with report text
* Add LRU cache for pulse and impact

Definition of Done: All endpoints return JSON that matches schemas, AI calls respond in less than 2 seconds.

---

## Phase 3 — Frontend (React and Node)

* Implement left navigation with tabs:
  Notes, Pulse, Requirements, Design and Interfaces, Verification, Trace Graph, Impact Analysis, Knowledge, Tasks, Agents, Admin, Themes
* Notes tab:

  * markdown editor
  * ArtifactChip rendering for references like @REQ-123 or @OUTLOOK-MSG-001
  * actions to add to task, summarize, and generate subtasks
* Pulse tab:

  * feed grouped by day
  * filters by source and type
  * item actions: open impact, open in source, save to note, add to task, summarize, subtasks
* Impact analysis tab:

  * search or paste ID input
  * tree and table outputs
  * actions to add to task, save to note, open in source
* Trace Graph tab:

  * cytoscape or vis-network graph
  * nodes include requirements, tests, issues, parts, BOM, ECN, Outlook messages
  * controls: search, highlight path, show gaps, export image
* Knowledge tab:

  * search
  * results with drag to note for citation
* Tasks tab:

  * list with title, status, due, owner, context
  * detail drawer with linked artifacts, generate subtasks, mark complete
* Agents tab:

  * cards for Trace Audit, Verification Planner, Daily Summary
* Admin tab:

  * show config flags and demo token
* Themes tab:

  * dark, light, and custom switcher
  * persist preference in local storage
* Right Context Panel:

  * related items
  * AI insights stubs
  * quick actions for Open in Source, Save to Note, Add to Task, Summarize, Subtasks, Daily Summary

Definition of Done: All tabs render, actions call backend, theme switch works and persists.

---

## Phase 4 — Outlook and Daily Summary

* Outlook integration:

  * show Outlook events in Pulse
  * open mock Outlook window from windows/outlook endpoint
* Daily Summary:

  * button in right panel and card in Agents
  * call ai/daily\_report endpoint
  * display summary modal with formatted text

Definition of Done: Outlook events visible, daily summary report displayed consistently.

---

## Phase 5 — Packaging and Runbook

* Add docker compose file with services web, api, and fds
* Add demo script in docs/demo-script.md:

  * seed dataset
  * open Notes with artifact reference
  * check Pulse
  * run Impact
  * create Task
  * generate subtasks
  * view Windows
  * use Knowledge
  * run Daily Summary
  * switch Theme

Definition of Done: Fresh clone with docker compose up runs full demo end to end.


