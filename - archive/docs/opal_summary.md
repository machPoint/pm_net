# OPAL Server – Technical Specification

## Overview

An **OPAL server** is a long-running, persistent implementation of the **Model Context Protocol (MCP)**, packaged as a Docker container. Each OPAL server instance is created specifically for an individual user—so every user gets their own persistent OPAL server. This architecture enables true user-centric AI: each OPAL grows with its user over time, eventually maintaining its own database, context, and personal information unique to that user. OPALs are the atomic compute unit in the MachPoint ecosystem, each acting as an identity-bearing agent hub.

The OPAL server is fully compliant with the latest MCP specification (2025-06-18) with backward compatibility for 2025-03-26 clients, implementing all required methods, lifecycle management, and tool formats. It includes a comprehensive web-based admin panel and provides a complete connection package in the `docs/connect` folder for integration.

---

## Core Functions

1. **Tool Serving**
   * Dynamically exposes tools that map to API endpoints
   * Tools follow the MCP spec: typed inputs, JSON Schema validation, structured outputs
   * Supports 36+ tools including custom and auto-generated API tools
2. **Resource Handling**
   * Exposes resources at canonical URIs (e.g., `/resources`, `/resources/:id`)
   * Supports GET/POST/PUT/DELETE operations via configured external APIs
   * Cursor-based pagination for resource lists
3. **Prompt Execution**
   * Accepts prompts that simulate agent workflows or summarize data
   * Prompts can call tools, embed context, and return reasoning chains
   * Supports argument substitution and template-based prompts
4. **Reverse Mode Summarization**
   * Accepts inbound JSON payloads (e.g., polled API responses)
   * Transforms them into human-readable summaries via `summarizeContent` tool
   * Supports multiple summary types: headline, paragraph, full
5. **Memory & Context Storage**
   * Persistent storage of memories with vector embeddings (384-dimensional)
   * Full-text search and semantic search capabilities
   * User-scoped memory with metadata and tagging
6. **Web-Based Admin Panel**
   * Comprehensive admin interface at `/admin`
   * Health metrics monitoring with real-time server statistics
   * Token management (create, view, delete API tokens)
   * User management (create users, view activity)
   * MCP Inspector for protocol testing and debugging
   * Audit logs for tool execution tracking
7. **Authentication & Authorization**
   * JWT-based authentication with access and refresh tokens
   * API token system for programmatic access
   * Role-based access control (admin/user roles)
8. **Database Management**
   * SQLite for development with WAL mode for durability
   * PostgreSQL support for production deployments
   * Automated migrations with Knex.js
   * Backup and restore functionality

---

## MCP Protocol Alignment

| MCP Component        | OPAL Implementation                                                 |
| -------------------- | ------------------------------------------------------------------- |
| **Transports** | WebSocket (JSON-RPC 2.0), HTTP (RESTful API)                    |
| **Protocol Version** | 2025-06-18 with backward compatibility for 2025-03-26 clients |
| **Lifecycle**  | Full MCP lifecycle with protocol version negotiation, capabilities declaration, and proper initialization/shutdown flow |
| **Tools**      | MCP-compliant tool format with name, title, description, and inputSchema; supports tools/list and tools/call methods with cursor-based pagination; structured output support |
| **Resources**  | Resources accessible via resources/list, resources/read, resources/set, resources/delete methods with cursor-based pagination |
| **Prompts**    | Prompts accessible via prompts/list, prompts/get, prompts/set, prompts/delete methods with cursor-based pagination and argument substitution |
| **Elicitation** | Server-initiated user input requests (NEW in 2025-06-18 spec) |
| **Schemas**    | Tool inputs validated against JSON Schema using Ajv; proper error handling with standard JSON-RPC error codes |
| **Notifications** | Support for notifications/initialized, notifications/tools/list_changed, notifications/resources/list_changed, notifications/prompts/list_changed |
| **Content Format** | Tool results follow the MCP content structure format with text, image, audio, resource, and resource_link types; support for content annotations with _meta fields |
| **Rate Limiting** | Configurable rate limits per endpoint and user |

---

## Runtime & Implementation

The OPAL server is implemented in **TypeScript** with a strict compiler configuration:

### Language & Build
- Source code lives under the `src/` directory with full TypeScript typing
- The TypeScript compiler (`tsc`) emits JavaScript into the `dist/` directory
- Production entrypoint is `dist/src/server.js`
- Strict mode enabled: `noImplicitAny`, `strictNullChecks`, `strictFunctionTypes`, `noUnusedLocals`, `noImplicitReturns`

### Key Scripts (package.json)
- `npm run dev` — Development mode with hot-reload via `tsx watch src/server.ts`
- `npm run build` — Compiles TypeScript to JavaScript using `tsc`
- `npm start` — Runs the built server from `dist/src/server.js`
- `npm run typecheck` — Type checking without emitting files (`tsc --noEmit`)
- `npm test` — Runs Jest test suite
- `npm run migrate` — Runs database migrations
- `npm run seed` — Seeds the database with initial data

### Architecture

**Server Core (`src/server.ts`)**
- Express.js HTTP server with WebSocket support
- JSON-RPC 2.0 server implementation
- Session management with capability negotiation
- CORS middleware and request logging

**Service Layer (`src/services/`)**
- `toolsService.ts` - Tool management, execution, and notifications
- `resourcesService.ts` - Resource CRUD operations with pagination
- `promptsService.ts` - Prompt management with argument substitution
- `elicitationService.ts` - Server-initiated user input requests (MCP 2025-06-18)
- `memoryService.ts` - Vector-based memory storage and retrieval
- `authService.ts` - JWT and API token authentication
- `auditService.ts` - Comprehensive audit logging
- `backupService.ts` - Database backup and restore
- `metricsService.ts` - Real-time health and performance metrics
- `apiService.ts` - External API integration and tool execution

**Route Handlers (`src/routes/`)**
- `admin.ts` - Admin panel and management endpoints
- `admin-health.ts` - Health metrics API
- `admin-tokens.ts` - Token management API
- `auth.ts` - Authentication endpoints
- `memory.ts` - Memory storage API
- `backup.ts` - Backup management
- `audit.ts` - Audit log access

**Database Layer**
- Knex.js ORM with migration system
- SQLite for development (with WAL mode)
- PostgreSQL for production
- Tables: users, sessions, memories, api_tokens, tool_runs

**Type Definitions (`src/types/`)**
- `mcp.ts` - MCP protocol types
- `database.ts` - Database schema types
- `config.ts` - Configuration types
- `express.ts` - Extended Express types

**Admin Panel (`src/admin/`)**
- Web-based UI for server management
- Real-time health metrics dashboard
- Token and user management
- Integrated MCP Inspector for protocol testing
- Audit log viewer

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

### Built-in MCP Inspector
* Web-based protocol testing tool at `/admin/mcp-inspector`
* Features:
  * Session initialization and lifecycle testing
  * Live tool, resource, and prompt discovery
  * Real-time request/response logging
  * Protocol version validation
  * WebSocket and HTTP transport testing
  * Pre-configured test payloads for common operations

### Automated Testing
* MCP compliance test suite in `test/mcp-compliance-tests.js`
* Tests include:
  * Protocol version header validation
  * Session initialization flow
  * Tool discovery and pagination
  * JSON-RPC 2.0 message format validation
  * Error handling and status codes

### Health Monitoring
* Real-time metrics dashboard in admin panel
* Tracks:
  * Server uptime and version
  * CPU, memory, and disk usage
  * API request rates and response times
  * Active WebSocket sessions
  * Database health and size
  * Recent errors and audit logs

---

## Connectivity & Deployment

### Server Endpoints

**Main Server (Port 7788)**
- MCP WebSocket: `ws://localhost:7788`
- MCP HTTP: `http://localhost:7788/mcp`
- Admin Panel: `http://localhost:7788/admin`
- Admin API: `http://localhost:7788/api/admin/*`
- MCP Inspector: `http://localhost:7788/admin/mcp-inspector`

### Inbound Connections

* AI clients connect via WebSocket with JSON-RPC 2.0
* HTTP clients can use RESTful MCP endpoints
* Admin users access web interface at `/admin`
* Supports authentication via JWT tokens or API tokens

### Outbound Connections

* Makes HTTPS requests to user-configured external APIs
* Sends structured MCP-compliant results to AI clients
* Supports multiple auth types: none, bearer, api_key, basic_auth

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

| Feature                        | Status         |
| ------------------------------ | -------------- |
| MCP 2025-06-18 compliance      | ✅ Done        |
| MCP-compliant tools            | ✅ Done        |
| Resource management            | ✅ Done        |
| Prompt management              | ✅ Done        |
| Elicitation support            | ✅ Done        |
| Reverse-mode summarization     | ✅ Done        |
| Vector-based memory            | ✅ Done        |
| Web-based admin panel          | ✅ Done        |
| Health metrics monitoring      | ✅ Done        |
| JWT authentication             | ✅ Done        |
| API token management           | ✅ Done        |
| Audit logging                  | ✅ Done        |
| Database backups               | ✅ Done        |
| MCP Inspector integration      | ✅ Done        |
| TypeScript implementation      | ✅ Done        |
| SQLite development database    | ✅ Done        |
| PostgreSQL production support  | ✅ Done        |
| Docker support                 | ✅ Done        |
| OpenAPI import                 | 🟡 In Progress |
| Kubernetes support             | 🟡 Planned     |
| Advanced RAG features          | ⏳ Planned     |

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

### Quick Start

**Default Connection Details:**
- WebSocket Endpoint: `ws://localhost:7788`
- HTTP Endpoint: `http://localhost:7788/mcp`
- Protocol Version: `2025-06-18` (also supports `2025-03-26`)
- Transport: JSON-RPC 2.0

### Connection Process

1. **Establish WebSocket Connection**
   - Connect to `ws://localhost:7788?token=YOUR_API_TOKEN`
   - Or use HTTP with `Authorization: Bearer YOUR_API_TOKEN` header

2. **Initialize Session**
   ```json
   {
     "jsonrpc": "2.0",
     "id": "init-1",
     "method": "initialize",
     "params": {
       "protocolVersion": "2025-06-18",
       "clientInfo": {
         "name": "Your Client Name",
         "version": "1.0.0"
       },
       "capabilities": {}
     }
   }
   ```

3. **Send Initialized Notification**
   ```json
   {
     "jsonrpc": "2.0",
     "method": "notifications/initialized",
     "params": {}
   }
   ```

4. **Discover Available Tools**
   ```json
   {
     "jsonrpc": "2.0",
     "id": "list-tools-1",
     "method": "tools/list",
     "params": {}
   }
   ```

5. **Call Tools**
   ```json
   {
     "jsonrpc": "2.0",
     "id": "call-1",
     "method": "tools/call",
     "params": {
       "name": "summarizeContent",
       "arguments": {
         "content": "Your content here",
         "type": "headline"
       }
     }
   }
   ```

### Testing Your Connection

**Using the Web Interface:**
1. Navigate to `http://localhost:7788/admin/mcp-inspector`
2. Enter your API token
3. Click "1. Initialize Session"
4. Test various MCP methods with the built-in inspector

**Authentication:**
- Obtain an API token from the admin panel at `http://localhost:7788/admin`
- Login with default credentials: `admin` / `admin123`
- Navigate to "API Tokens" tab to create a new token

### Detailed Documentation

For comprehensive integration guides:
1. **Go to the `docs/connect` folder** for detailed connection documentation
2. **Read `WARP.md`** in the project root for development setup and commands
3. **Check `docs/mcp-api-documentation.md`** for complete API reference

The OPAL server implements the Model Context Protocol (MCP) specification version 2025-06-18 with backward compatibility for 2025-03-26 clients.
