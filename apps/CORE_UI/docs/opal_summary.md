# OPAL Server – Technical Specification

## Overview

An **OPAL server** is a long-running, persistent implementation of the **Model Context Protocol (MCP)**, packaged as a Docker container. Each OPAL server instance is created specifically for an individual user—so every user gets their own persistent OPAL server. This architecture enables true user-centric AI: each OPAL grows with its user over time, eventually maintaining its own database, context, and personal information unique to that user. OPALs are the atomic compute unit in the MachPoint ecosystem, each acting as an identity-bearing agent hub.

The OPAL server is fully compliant with the latest MCP specification (2024-11-05), implementing all required methods, lifecycle management, and tool formats. It provides a comprehensive connection package in the `docs/connect` folder that contains everything another application needs to integrate with the server.

---

## Core Functions

1. **Tool Serving**
   * Dynamically exposes tools that map to API endpoints
   * Tools follow the MCP spec: typed inputs, JSON Schema validation, structured outputs
2. **Resource Handling**
   * Exposes resources at canonical URIs (e.g., `/resources`, `/resources/:id`)
   * Supports GET/POST/PUT/DELETE operations via configured external APIs
3. **Prompt Execution (Optional)**
   * Accepts prompts that simulate agent workflows or summarize data
   * Prompts can call tools, embed context, and return reasoning chains
4. **Reverse Mode Summarization (ATP)**
   * Accepts inbound JSON payloads (e.g., polled API responses)
   * Transforms them into human-readable summaries via `summarizeFeed(data)`
   * Supports multiple summary types: headline, bullets, full
5. **Memory (Future Option)**
   * Tracks past tool calls, summaries, or context states
   * Enables RAG-like comparisons (e.g., change detection across feed polls)

---

## MCP Protocol Alignment

| MCP Component        | OPAL Implementation                                                 |
| -------------------- | ------------------------------------------------------------------- |
| **Transports** | WebSocket (JSON-RPC 2.0), HTTP (RESTful API)                    |
| **Lifecycle**  | Full MCP lifecycle with protocol version negotiation, capabilities declaration, and proper initialization/shutdown flow |
| **Tools**      | MCP-compliant tool format with name, description, and inputSchema; supports tools/list and tools/call methods with pagination |
| **Resources**  | Resources accessible via resources/list method with cursor-based pagination |
| **Prompts**    | Prompts accessible via prompts/list method with cursor-based pagination |
| **Schemas**    | Tool inputs validated against JSON Schema using Ajv; proper error handling with standard JSON-RPC error codes |
| **Notifications** | Support for notifications/initialized and notifications/tools/list_changed |
| **Content Format** | Tool results follow the MCP content structure format with proper typing |

---

## Runtime & Implementation

The OPAL server implementation has been migrated to **TypeScript** with a strict compiler configuration:

- **Language & Build**
  - Source code lives under the `src/` directory (e.g., `src/server.ts`).
  - The TypeScript compiler (`tsc`) emits JavaScript into the `dist/` directory.
  - The production entrypoint is `dist/src/server.js`.
- **Key Scripts (package.json)**
  - `npm run dev` — TypeScript dev mode via `tsx` with `NODE_NO_WARNINGS=1`.
  - `npm run build` — Compiles TypeScript to JavaScript using `tsc`.
  - `npm start` — Runs the built server from `dist/src/server.js`.
  - `npm run typecheck` — Runs the TypeScript compiler in `--noEmit` mode for type checking only.
- **Type Safety**
  - Strict mode is enabled (`strict`, `noImplicitAny`, `strictNullChecks`, etc.).
  - Declaration files and source maps are generated to support tooling and debugging.

This migration improves maintainability, safety, and IDE tooling while preserving the MCP behavior described in this document.

---

## Documentation and Integration

The OPAL server provides comprehensive documentation and integration resources in the `docs/connect` folder:

| Resource | Description |
| -------- | ----------- |
| **Integration Guide** | Step-by-step guide for connecting to the OPAL server, including authentication workflow and WebSocket setup |
| **API Documentation** | Detailed documentation of all MCP methods, request/response formats, and error handling |
| **Testing Guide** | Instructions for testing the connection to the OPAL server |
| **MCP Compliance Checklist** | Checklist of MCP features implemented in the OPAL server |
| **OpenAPI Specification** | Machine-readable specification for HTTP endpoints |
| **AsyncAPI Specification** | WebSocket API specification following the AsyncAPI standard |
| **Test Client** | JavaScript client for testing the connection |
| **Test Scripts** | Scripts for validating authentication, tool validation, and pagination |

These resources make it easy for other applications to integrate with the OPAL server and verify MCP compliance.

---

## Configuration

OPAL servers are configured entirely via **environment variables** injected by the MachPoint backend:

```env
MCP_API_COUNT=1
MCP_API_0_NAME=fakestore
MCP_API_0_BASE_URL=https://your-api-base-url.com
MCP_API_0_AUTH_TYPE=none # or api_key, bearer_token, basic_auth, etc.
MCP_API_0_RESOURCES_PATH=/your-resources-path
MCP_API_0_RESOURCE_ID_PATH=/your-resources-path/:id
```

### Additional Endpoint Configuration:

```env
MCP_API_0_ENDPOINT_0_METHOD=GET
MCP_API_0_ENDPOINT_0_PATH=/special
MCP_API_0_ENDPOINT_0_ACTUAL_PATH=/v1/specials
MCP_API_0_ENDPOINT_0_DESCRIPTION=Fetches special offers
```

---

## Tool Generation Logic

Tool names follow predictable patterns:

* `{api_name}_{method}`
* `{api_name}_{method}_resources`
* `{api_name}_{method}_resources_id`
* Custom endpoints: `{api_name}_{method}_{path_slug}`

Each tool has:

* **Inputs:** Schema-defined parameters
* **Outputs:** JSON-transformed API responses
* **Auth Handling:** Headers, keys, tokens configured via ENV

---

## Testing & Validation

* **MCP Inspector** is used to:
  * Send live tool calls
  * View outputs
  * Score MCP spec compliance (via fuzzy and hard rules)
* **Compliance Checklist:**
  * Transport sequencing, version headers
  * Schema adherence (tool input/output)
  * Lifecycle observability (shutdown hooks)

---

## Connectivity & Deployment

### Inbound:

* AI clients connect via WebSocket (default port 7788)
* Reverse-mode (FOCAL) connects via internal HTTP post to summarization tool

### Outbound:

* Makes HTTPS requests to user-defined APIs
* Sends back structured results to LLM clients

### Hosting:

* Each OPAL is a Docker container with a unique instance ID
* Managed by the MachPoint backend (create, stop, delete)
* Kubernetes-ready for scale, CI/CD integration via GitHub Actions

---

## Identity & Persistence

* OPALs are  **persistent containers** , not ephemeral servlets
* Each has:
  * Unique config
  * Optional memory
  * Auditability (planned)
* This enables AI agents to build long-term understanding over time

---

## Alignment with FOCAL

In the FOCAL product:

* Each feed (API source) maps to one OPAL
* OPAL performs periodic polling and summarization
* FOCAL displays summaries as **Points** in a user feed
* OPAL memory can help detect pattern shifts or anomalies

---

## Summary

| Feature               | Status         |
| --------------------- | -------------- |
| MCP-compliant tools   | ✅ Done        |
| Reverse-mode summary  | ✅ Done        |
| OpenAPI import        | 🟡 In Progress |
| Memory/comparison     | ⏳ Planned     |
| Inspector integration | ✅ Done        |
| Docker support        | ✅ Done        |
| Kubernetes support    | 🟡 Planned     |

---

## Closing Note

OPAL servers are the brainstem of the MachPoint stack. Everything else routes around them. Each one is a containerized AI gateway that translates raw APIs into usable, queryable knowledge for humans and agents alike.

---

## Future Directions

The OPAL platform is designed with extensibility and evolution in mind. Planned and potential future features include:

- **Automated Workflow Integration:** Connecting OPAL servers to workflow management systems, enabling automated task execution and orchestration.
- **Custom Tool Creation:** Allowing users to define and publish their own custom tools and workflows, beyond auto-generated API endpoints.
- **API Aggregation:** Combining multiple APIs into a unified, queryable interface, making it easier for users and agents to interact with diverse data sources.
- **Advanced Memory and Context:** Implementing persistent memory, retrieval-augmented generation (RAG), and change detection to enable richer, context-aware AI experiences.
- **Person-Centric AI Runtime:** Expanding each OPAL instance to maintain long-term context, preferences, and identity for its user, supporting adaptive and relational AI.
- **Enterprise Features:** Adding role-based access control (RBAC), advanced scaling (Kubernetes, autoscaling), and integrated monitoring/logging for robust, production-grade deployments.

These directions will ensure OPAL continues to grow as a user-centric, secure, and powerful AI integration platform.




### 🚩 **MachPoint (Infrastructure Control Plane)**

* **Owned by you (MachPoint company).**
* **Manages, provisions, monitors all OPAL servers.**
* **System-wide orchestration, billing, compliance, and ops tooling.**
* **Multi-tenant, centralized, infrastructure-facing.**
* **Holds the global Control Plane DB.**

| Core Responsibilities                           | Examples                                      |
| ----------------------------------------------- | --------------------------------------------- |
| User & org account management                   | User creation, orgs, quotas, billing          |
| OPAL server orchestration                       | Create, stop, snapshot, delete OPAL instances |
| System-wide API catalog & integration templates | Managed at infra level, not per user          |
| Compliance & audit logging (MachPoint-wide)     | Instance events, usage metrics, system logs   |
| Monitoring & observability of OPAL fleet        | Prometheus, dashboards, lifecycle webhooks    |

---

### 🧠 **OPAL Server (User-Owned Runtime)**

* **Owned by the end user (or their org).**
* **Persistent MCP server running inside a private Docker container.**
* **Maintains its own isolated User DB (memory, events, sessions, tool runs).**
* **Acts as the user’s personal AI runtime—sovereign, identity-bearing, persistent.**
* **Bundled with its own Admin Panel for self-management.**

| Core Responsibilities              | Examples                                                 |
| ---------------------------------- | -------------------------------------------------------- |
| Memory & event storage (User DB)   | Embeddings, tool runs, session configs                   |
| API tool execution                 | Calls tools, returns structured results                  |
| Reverse-mode summarization         | Polls feeds, generates summaries                         |
| User admin panel (self-service UI) | Manage memory, logs, API tokens                          |
| Own lifecycle (while running)      | Clean shutdown, restart, manual snapshot via Admin Panel |

---

## FOR AI MODELS: HOW TO CONNECT TO THIS SERVER

**IMPORTANT: If you are an AI model reading this document, follow these instructions to connect to the OPAL server.**

1. **Go to the `docs/connect` folder** - This folder contains everything you need to establish a connection with this OPAL server.

2. **Read the following files in order**:
   - `README.md` - Overview and quick start guide
   - `Integration_Guide.md` - Detailed connection instructions
   - `api-documentation.md` - MCP protocol implementation details

3. **Use the provided client library**:
   - `mcp-client.js` - JavaScript client for connecting to the server

4. **Connection Process**:
   - Establish a WebSocket connection with authentication
   - Initialize the session with protocol version negotiation
   - Send the initialized notification
   - List available tools
   - Call tools as needed

5. **Test your connection** using the provided test scripts in the `test-scripts` folder.

The OPAL server implements the Model Context Protocol (MCP) specification version 2024-11-05 and provides a standardized way for AI models to access tools, resources, and context. All communication follows the JSON-RPC 2.0 format over WebSocket.

Example connection code:

```javascript
const { MCPClient } = require('./mcp-client');

async function connectToOPAL() {
  const client = new MCPClient('ws://localhost:3000', 'your_auth_token');
  
  // Connect and initialize
  await client.connect();
  await client.initialize();
  
  // List tools
  const toolsResult = await client.listTools();
  console.log('Available tools:', toolsResult.tools);
  
  // Call a tool
  const result = await client.callTool('summarizeContent', {
    content: 'This is content to summarize',
    type: 'headline'
  });
  
  console.log('Tool result:', result);
}
```
