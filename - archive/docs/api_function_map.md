# API Functions and Integrations Map

This document maps the key functions and API integration points across the application stack, focusing on the graph and systems engineering domains.

## 1. Frontend Integration Layer (`apps/CORE_UI`)

### Service: `opal-client.ts`
The primary bridge between the frontend and the OPAL backend. It uses a dual approach:
1.  **JSON-RPC (via `/mcp` endpoint)** used for complex tools and logic.
2.  **REST (via `/api/...`)** used for standard CRUD and ingestion.

| Function | Endpoint / Method | Description |
| :--- | :--- | :--- |
| `querySystemModel` | MCP `querySystemModel` | Fetches graph nodes with filters (type, project, status). |
| `getSystemSlice` | MCP `getSystemSlice` | Retrieves a connected subgraph starting from a root node. |
| `traceDownstreamImpact` | MCP `traceDownstreamImpact` | Performs impact analysis (critical for Network Layer propagation). |
| `ingestFromFDS` | POST `/api/fds/ingest/:source` | Triggers data ingestion from FDS (Jama, Jira, etc.). |

### Frontend Components Impact & Trace
These components consume the above services.
- **`ImpactGraph.tsx`**: Likely consumes `traceDownstreamImpact` (via `useRequirementImpact.ts`).
- **`TraceGraph.tsx`**: Likely consumes `querySystemModel` or `getSystemSlice`.

## 2. Backend API Layer (`apps/OPAL_SE`)

OPAL_SE exposes both Administrative REST APIs and the Core SE Logic.

### Route: `se-admin.ts` (Systems Engineering Dashboard)
REST endpoints specifically for visualizing the system graph.

| Endpoint | Method | Internal Logic | Description |
| :--- | :--- | :--- | :--- |
| `/se/graph/nodes` | GET | `db('se_nodes')` | Fetches filtered list of nodes (paginated). |
| `/se/graph/stats` | GET | `db('se_nodes').count()` | Aggregated counts of nodes/edges for dashboard charts. |
| `/se/events` | GET | `db('se_events')` | Streaming event log of system changes. |
| `/se/rules/violations` | GET | `ruleEngineService.run` | Trigger consistency checks on demand. |

### Route: `admin-api.ts` (Server Administration)
General server health and management.
- `/api/health`: Server status.
- `/api/metrics`: CPU/Memory/Request stats.
- `/api/tools/execute`: Direct MCP tool execution (debug).

## 3. Data Source Layer (`FDS`)

FDS acts as a mock external system, simulating integrations with enterprise tools.

### Main Endpoints (`FDS/main.py`)

| Endpoint | Method | Purpose | Data Model (Python) |
| :--- | :--- | :--- | :--- |
| `/mock/jama/items` | GET | Mock Jama Requirements | `JamaItem` |
| `/mock/jira/issues` | GET | Mock Jira Issues | `JiraIssue` |
| `/mock/impact/{id}` | GET | Simulated Impact Trees | `MockImpactResult` |
| `/mock/graph/trace` | GET | Pre-calculated Trace Graph | `TraceGraph` |
| `/mock/pulse` | GET | Aggregated Activity Feed | `MockPulseItem` |

### Connection Simulation (`connection_simulator.py`)
Simulates the state of external connectors (online/offline/latency).
- **/mock/{system}/connect**: Connects a system (e.g., "jira").
- **/webhooks/{system}**: Receives incoming webhooks (loopback or forwarded).

## 4. Integration Data Flow for Network Layer

To implement the Network Layer, the data flow will likely follow this path:

1.  **Ingestion/Sync**:
    - `FDS` generates mock Network Devices/topology via a new endpoint (e.g., `/mock/network/topology`).
    - `OPAL_SE` ingests this via `ingestFromFDS` (extended for Network).
    - Data is stored in `se_nodes` (with type `NetworkDevice`) and `se_edges`.

2.  **Visualization**:
    - **Frontend** calls `opalClient.querySystemModel({ type: 'NetworkDevice' })`.
    - **Frontend** renders nodes using `ReactFlow`.

3.  **Analysis**:
    - **Frontend** calls `opalClient.traceDownstreamImpact()` to see how a Network outage affects Requirements/Components.
