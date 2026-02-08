# PM_NET Codebase Summary

## Program Overview

PM_NET is a comprehensive project management and systems engineering platform built on a modern hybrid architecture. The system combines a web-based frontend (Next.js/React), a Python backend (FastAPI), and an OPAL server (Node.js/TypeScript) that implements the Model Context Protocol (MCP) for AI agent orchestration.

### Core Architecture

1. **CORE_UI Frontend** - Next.js 14 React application with modern UI components
2. **CORE_UI Backend** - FastAPI Python service for API gateway and data management  
3. **OPAL_SE Server** - Node.js/TypeScript MCP server for AI agent orchestration
4. **Desktop Mode** - Tauri wrapper for native desktop deployment

The platform provides a unified workspace for project management, systems engineering, requirements traceability, agent orchestration, and AI-powered analysis tools.

---

## Frontend Components & Functions

### Main Application (`/apps/CORE_UI/frontend/src/app/page.tsx`)
- **PageContent()** - Main application shell with resizable panels
- **renderActiveSection()** - Renders different sections based on active tab
- **generateContextData()** - Creates mock related items for context panel
- **generateAgentListData()** - Generates mock agent status information
- **generateCapabilitiesData()** - Creates agent capability mappings
- **generateSystemInfoData()** - Provides system status and metrics

### Key UI Components

#### Navigation & Layout
- **TopBar** - Header with breadcrumbs, search, theme toggle, user menu
- **LeftNav** - Main navigation with Messages, Tasks, Notes, Network, etc.
- **AgentTaskFlow** - Sankey-style visualization of agent task execution paths

#### Section Components
- **PulseSection** - Real-time agent messages and activity feed
- **TasksSection** - Task management with Kanban-style interface
- **NotesSection** - Note-taking and documentation management
- **NetworkSection** - Network topology and agent task flow visualization
- **AgentsSection** - Agent management and monitoring
- **GanttSection** - Project timeline and Gantt chart visualization
- **RisksSection** - Risk assessment and management
- **DecisionsSection** - Decision tracking and analysis
- **AnalyticsSection** - Data analytics and reporting

#### Theme System
- **ThemeProvider** - React context for theme management
- **useTheme()** - Hook for accessing and modifying theme settings
- **theme-config.ts** - Theme configuration with 2×3×2 matrix (base theme × color scheme × glass effect)

---

## Backend API Functions

### Main Application (`/apps/CORE_UI/backend/main.py`)
- **lifespan()** - Application lifecycle management and initialization
- **AgentService initialization** - Sets up agent providers and configurations

### API Routes & Services

#### Authentication & Users (`/app/routers/auth.py`)
- **hash_password()** - Secure password hashing with bcrypt
- **verify_password()** - Password verification
- **create_access_token()** - JWT token generation
- **verify_token()** - JWT token validation
- **create_token_response()** - Authentication response creation

#### Data Management
- **Tasks Router** - Task CRUD operations and status management
- **Notes Router** - Note creation, editing, and organization
- **Knowledge Router** - Knowledge base and document management
- **Settings Router** - User preferences and configuration
- **System Model Router** - System modeling and architecture

#### AI & Agents (`/src/routes/agents.py`)
- **AgentService** - Agent orchestration and communication
- **OpenClaw Provider** - Integration with OpenClaw agent framework
- **Mock Provider** - Development/testing agent simulation

#### Analysis & Impact
- **Impact Router** - Impact analysis and relationship mapping
- **Pulse Router** - Real-time activity and message handling
- **AI Router** - AI chat and analysis services

---

## OPAL_SE Server Functions

### Core Server (`/apps/OPAL_SE/src/server.ts`)
- **MCP Protocol Implementation** - Model Context Protocol server
- **WebSocket Management** - Real-time bidirectional communication
- **JSON-RPC Server** - Structured API method handling
- **Authentication & Authorization** - Secure access control
- **Rate Limiting** - API protection and throttling

### Key Services

#### Graph & Data Management
- **graphService.ts** - Graph database operations and node/edge management
- **auditService.ts** - Audit logging and change tracking
- **backupService.ts** - Data backup and restoration
- **memoryService.ts** - Context and memory management

#### AI & LLM Integration
- **gateway.ts** - LLM provider abstraction and routing
- **providers/openai.ts** - OpenAI API integration
- **providers/ollama.ts** - Local Ollama model integration

#### Systems Engineering Tools
- **se/coreTools.ts** - Core SE functionality (requirements, tests, components)
- **se/agentGraphTools.ts** - Agent-specific graph operations
- **se/changeSetService.ts** - Change set management
- **se/eventLogService.ts** - Event logging and history
- **se/ruleEngineService.ts** - Business rule engine
- **se/pathfindingService.ts** - Graph traversal and analysis

#### MCP Handlers
- **toolHandler.ts** - MCP tool execution and management
- **resourceHandler.ts** - Resource access and manipulation
- **promptHandler.ts** - Prompt template processing

---

## Key Features & Capabilities

### 1. **Multi-Modal Interface**
- Web browser access with responsive design
- Desktop application via Tauri wrapper
- Mobile-responsive interface

### 2. **Agent Orchestration**
- 5-layer agent hierarchy (Meta → Governance → Operational → Construction → Schema)
- Real-time agent monitoring and management
- Task flow visualization with Sankey diagrams

### 3. **Systems Engineering**
- Requirements traceability and management
- Test case management and verification
- Component and interface tracking
- Change set and impact analysis

### 4. **Project Management**
- Task management with Kanban boards
- Gantt chart timeline visualization
- Risk assessment and tracking
- Decision documentation

### 5. **AI Integration**
- Multiple LLM provider support (OpenAI, Ollama)
- Context-aware AI assistance
- Automated analysis and reporting
- Agent-powered workflows

### 6. **Data Visualization**
- Interactive network topology graphs
- Agent task flow diagrams
- Analytics dashboards
- Real-time activity monitoring

### 7. **Theme System**
- 12 theme combinations (2 base themes × 3 color schemes × 2 visual styles)
- Glass morphism effects
- Persistent user preferences
- Theme-aware component styling

---

## Technology Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Modern UI component library
- **React Flow** - Interactive graph visualization
- **Recharts** - Data visualization charts

### Backend
- **FastAPI** - Modern Python web framework
- **SQLAlchemy** - ORM and database toolkit
- **Pydantic** - Data validation and settings
- **JWT** - Authentication tokens
- **bcrypt** - Password hashing

### OPAL Server
- **Node.js/TypeScript** - Runtime and language
- **Express.js** - Web framework
- **WebSocket** - Real-time communication
- **SQLite/PostgreSQL** - Database options
- **MCP Protocol** - AI agent orchestration

### Desktop
- **Tauri v2** - Rust-based desktop wrapper
- **SQLite** - Local database storage

---

## Development & Deployment

### Environment Setup
- Docker containerization support
- Environment variable configuration
- Development vs production modes
- Hot reload and debugging support

### Startup Scripts
- `start-all.sh` - Linux startup script
- `start-all.bat` - Windows startup script
- Individual service startup scripts

### Configuration
- Centralized settings management
- API key and provider configuration
- Database connection management
- Theme and UI preferences

---

## Integration Points

### External Systems
- **JIRA** - Project management integration
- **Jama** - Requirements management
- **OpenAI API** - AI model access
- **Ollama** - Local model hosting

### Internal Services
- **OPAL_SE** - Agent orchestration
- **CORE_UI Backend** - API gateway
- **Frontend** - User interface
- **Database** - Data persistence

---

This codebase represents a sophisticated, modern platform that combines project management, systems engineering, and AI-powered automation in a unified, extensible architecture.

OPAL_SE Server - Core Functions & Duties
1. MCP (Model Context Protocol) Server
Primary Role: Acts as the AI agent orchestration hub implementing the MCP specification
Protocol Handler: Manages JSON-RPC 2.0 requests over HTTP/WebSocket for tool execution
Agent Gateway: Provides structured access to AI tools and resources for agents
2. Graph Database Management
Node/Edge CRUD: Full CRUD operations for system graph data (/api/nodes, /api/edges)
Graph Traversal: Pathfinding, impact analysis, and relationship queries
Data Types: Tasks, Validations, Agents, Issues, Guardrails, ChangeRequests, Emails, Notes
Relationships: VALIDATED_BY, TRACES_TO, ASSIGNED_TO, DEPENDS_ON, BLOCKS, REFERS_TO
3. AI/LLM Integration Hub
OpenAI Gateway: Routes AI requests to OpenAI API with system context
Context Enhancement: Adds system engineering context to AI prompts
Analysis Services: Provides AI-powered analysis for relationships, impact, etc.
Model Abstraction: Supports multiple LLM providers (OpenAI, Ollama)
4. Systems Engineering Tools
Verification Coverage: Tracks requirement-to-test traceability
Consistency Checking: Rule engine for business rule validation
Impact Analysis: Traces upstream/downstream impacts of changes
Change Management: Tracks change sets and history
5. External Data Integration (FDS)
Sidecar Management: Manages external system connectors (JIRA, Task Definitions, Agent Registry)
Data Ingestion: Pulls data from external systems into the graph
Polling Control: Starts/stops data synchronization
Status Monitoring: Tracks ingestion health and statistics
How Our Program Interacts with OPAL_SE
Frontend → OPAL_SE (Direct API Calls)
Graph Data Operations
typescript
// Network topology visualization
GET /api/nodes?type=task
GET /api/edges
Health Monitoring
typescript
// Health check
GET /api/health
AI Chat Proxy
typescript
// AI chat with system context
POST /api/ai/chat → OPAL_SE → OpenAI
POST /api/ai/analyze → OPAL_SE → OpenAI
Frontend → Backend → OPAL_SE (Via opal-client.ts)
MCP Tool Execution
typescript
// Uses JSON-RPC over /mcp endpoint
POST /mcp {
  jsonrpc: '2.0',
  method: 'tools/call',
  params: {
    name: 'querySystemModel',
    arguments: { project_id, node_type, ... }
  }
}
SE Tools Available
querySystemModel - Graph queries with filters
getSystemSlice - Bounded subgraph extraction
traceDownstreamImpact - Impact analysis
traceUpstreamRationale - Traceability
findValidationGaps - Tasks without acceptance criteria
checkAssignmentConsistency - Tasks without agents
getValidationCoverageMetrics - Coverage statistics
runConsistencyChecks - Rule engine validation
getHistory - Change history
findSimilarPastChanges - Historical analysis
Backend → OPAL_SE (Limited)
System Model Integration
python
# Currently mocked, planned integration
# TODO: Call OPAL tool getSystemSlice
OPAL_SE's Actual Duties
1. Data Persistence & Query Engine
Graph Database: SQLite/PostgreSQL backend for nodes and edges
Query Optimization: Efficient graph traversals and filters
Data Integrity: Maintains referential integrity and constraints
2. AI Agent Orchestration
Tool Registry: Manages available MCP tools and their schemas
Execution Engine: Safely executes tools with proper validation
Context Management: Maintains conversation context and memory
Agent Communication: Handles agent-to-agent and agent-to-system communication
3. Systems Engineering Automation
Rule Engine: Validates system against engineering rules
Traceability Analysis: Ensures requirement coverage and verification
Impact Assessment: Automatically calculates change impacts
Compliance Checking: Validates against standards and regulations
4. External System Bridge
API Gateway: Manages connections to JIRA, Task Definitions, Agent Registry
Data Transformation: Maps external data to internal graph model
Synchronization: Keeps external data in sync with internal state
Error Handling: Manages connection failures and data inconsistencies
5. Real-time Services
WebSocket Server: Provides real-time updates to clients
Event Broadcasting: Notifies clients of graph changes
Health Monitoring: Tracks system health and performance
Audit Logging: Records all operations for compliance
Key Architecture Points
OPAL_SE is the "Brain" - Central hub for AI, data, and SE operations
Frontend talks to both - Direct API for simple operations, via backend for complex MCP tools
MCP Protocol - Structured tool execution with proper validation and error handling
Graph-Centric - Everything revolves around the system graph model
Context-Aware AI - OPAL enhances AI requests with relevant system context
OPAL_SE essentially serves as the intelligent middleware that connects our UI to the underlying graph database while providing AI-powered analysis and systems engineering automation.
