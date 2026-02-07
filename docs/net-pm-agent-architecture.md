# Network PM — Agent Architecture

**Version:** 1.0  
**Date:** 2026-02-07  
**Status:** Reference Specification  
**Purpose:** Defines the agent types, responsibilities, and layering for the Network PM platform.

---

## 1. Overview

Agents in Network PM operate on the graph — they traverse, query, build, and maintain the network structure. The key insight: **agents navigate verified structure rather than generating claims from training data**, eliminating hallucination risk in high-stakes domains.

All agents follow the human-in-the-loop model: agents propose, humans approve. Plans are reviewed before execution.

---

## 2. Agent Layers

```
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 5: META AGENTS                                           │
│  Orchestration, spawning, learning                              │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 4: GOVERNANCE AGENTS                                     │
│  Plan approval, verification, audit                             │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 3: OPERATIONAL AGENTS                                    │
│  Query, artifact generation, research, execution                │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 2: NETWORK CONSTRUCTION AGENTS                           │
│  Build, refine, ingest, maintain integrity                      │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 1: SCHEMA GENERATION AGENTS                              │
│  Onboarding, schema building, validation                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Layer 1: Schema Generation Agents

Responsible for understanding user intent and creating the network schema.

### Onboarding Agent ✅ MVP

**Purpose:** Extracts user intent via conversation to understand their domain and needs.

**Capabilities:**
- Conversational discovery of user's business domain
- Identifies key entities (what are the "things" in their world?)
- Identifies key relationships (how do things connect?)
- Gathers goals and success metrics
- Determines which schema extensions apply (SEO, aerospace, etc.)

**Inputs:** User conversation  
**Outputs:** Structured intent document for Schema Builder Agent

---

### Schema Builder Agent ✅ MVP

**Purpose:** Converts user intent into a formal network schema.

**Capabilities:**
- Generates node type definitions with metadata schemas
- Generates edge type definitions with weight semantics
- Extends pm_core base layer with domain-specific types
- Validates schema consistency
- Produces human-readable schema documentation

**Inputs:** Intent document from Onboarding Agent  
**Outputs:** Schema definition (node types, edge types, weight definitions)

---

### Schema Validator Agent (Post-MVP)

**Purpose:** Checks schema completeness and correctness.

**Capabilities:**
- Validates all required fields are present
- Checks for circular dependencies
- Ensures edge types reference valid node types
- Validates weight ranges and semantics
- Suggests missing elements based on domain patterns

---

### Agent Architect Agent (Post-MVP)

**Purpose:** Designs domain-specific operational agents based on schema.

**Capabilities:**
- Analyzes schema to determine needed agent capabilities
- Generates agent specifications
- Configures agent permissions and boundaries
- Creates agent-to-agent communication rules

---

## 4. Layer 2: Network Construction Agents

Responsible for building and maintaining the network structure.

### Network Builder Agent ✅ MVP

**Purpose:** Constructs initial graph from data sources.

**Capabilities:**
- Creates nodes from ingested data
- Infers and creates edges based on schema rules
- Assigns initial weights
- Validates created structure against schema
- Reports construction progress and issues

**Inputs:** Schema definition, raw data from Data Ingestion Agent  
**Outputs:** Populated network graph

---

### Network Refiner Agent (Post-MVP)

**Purpose:** Continuously improves network quality by finding gaps and inconsistencies.

**Capabilities:**
- Detects missing edges that should exist based on patterns
- Identifies orphan nodes not connected meaningfully
- Finds weight inconsistencies and anomalies
- Suggests node/edge additions based on domain knowledge
- Flags potential duplicate nodes
- Proposes merges for similar entities

**Runs:** Background process, periodic or triggered

**Detection Patterns:**
```
Missing edges:
  - Task assigned to agent but no has_plan edge after N hours
  - Content_piece with no targets edge to any keyword
  - Run completed but no produced edge to artifacts

Orphan nodes:
  - Nodes with zero incoming AND zero outgoing edges
  - Nodes only connected to system user

Weight anomalies:
  - Edge weights outside defined range
  - Sudden weight changes without corresponding events
  - Inconsistent weights on parallel paths
```

---

### Data Ingestion Agent ✅ MVP (limited)

**Purpose:** Connects to external sources and pulls data into the network.

**Capabilities:**
- OAuth connections to external services
- API integrations (Search Console, analytics, CRMs)
- Web crawling and scraping
- File import (CSV, JSON, XML)
- Scheduled refresh of external data
- Deduplication and conflict resolution

**Supported Sources (MVP):**
- Google Search Console
- Site crawlers
- CSV/JSON import

**Future Sources:**
- Google Analytics
- Ahrefs/SEMrush APIs
- CRM systems
- Project management tools

---

### Network Integrity Agent (Post-MVP)

**Purpose:** Monitors network health and fixes issues.

**Capabilities:**
- Schema violation detection and repair
- Stale data identification and refresh triggers
- Circular dependency detection
- Referential integrity enforcement
- Performance monitoring (query times, graph density)
- Automated cleanup of soft-deleted nodes past retention

---

## 5. Layer 3: Operational Agents

Responsible for day-to-day work on the network.

### Query Agent ✅ MVP

**Purpose:** Answers questions by traversing the network.

**Capabilities:**
- Natural language to graph query translation
- Multi-hop traversal with edge type filtering
- Aggregation and summarization
- Comparison queries (A vs B)
- Trend detection (changes over time)
- Explanation of query results (show the path)

**Example Queries:**
```
"What's blocking my highest priority tasks?"
→ Traverse depends_on edges from high-priority tasks

"Which keywords have no content targeting them?"
→ Find keyword nodes with no incoming targets edges

"What's the impact if this component fails?"
→ Impact analysis traversal from component node

"Why isn't my pricing page ranking?"
→ Analyze page node: backlinks, content, technical issues
```

**Inputs:** Natural language question  
**Outputs:** Structured answer with supporting evidence (nodes, edges, paths)

---

### Artifact Agent ✅ MVP

**Purpose:** Generates reports and documents from network state.

**Capabilities:**
- Report templates (weekly status, client reports, audits)
- Dynamic data population from graph queries
- Multiple output formats (PDF, Markdown, Google Docs)
- Visualization embedding (charts, mini-graphs)
- Scheduled report generation
- Comparison reports (this period vs last)

**Artifact Types:**
- Status reports
- Client deliverables
- Audit trails
- Decision logs
- Gap analyses
- Impact assessments

---

### Research Agent ✅ MVP (limited)

**Purpose:** Gathers external information to enrich the network.

**Capabilities:**
- Web search and scraping
- Competitor analysis
- Market research
- Content research for briefs
- Fact verification

**Constraints:**
- All findings proposed as new nodes/edges
- Human approval required before network changes
- Sources tracked for provenance

---

### Execution Agent (Post-MVP)

**Purpose:** Performs actions based on approved plans.

**Capabilities:**
- Content creation/editing
- Technical fixes (within sandboxed environment)
- Outreach execution
- Data entry and updates
- Integration actions (post to CMS, update CRM)

**Constraints:**
- Only executes approved plans
- All actions logged to Run nodes
- Rollback capability for reversible actions

---

### Monitoring Agent (Post-MVP)

**Purpose:** Watches for anomalies and important changes.

**Capabilities:**
- Threshold alerts (ranking drops, traffic changes)
- Pattern detection (unusual activity)
- Deadline monitoring
- Dependency chain monitoring
- External change detection (competitor moves)

**Outputs:** Alerts, suggested tasks, status updates

---

## 6. Layer 4: Governance Agents

Responsible for human-in-the-loop oversight.

### Plan Proposer Agent (Post-MVP)

**Purpose:** Creates detailed execution plans for human approval.

**Capabilities:**
- Analyzes task requirements
- Generates step-by-step plans
- Estimates effort and timeline
- Identifies risks and dependencies
- Presents alternatives with trade-offs

**Outputs:** Plan nodes with status "pending_approval"

---

### Verification Agent (Post-MVP)

**Purpose:** Checks that acceptance criteria are met.

**Capabilities:**
- Automated verification where possible
- Evidence collection from runs and artifacts
- Gap identification (what's not yet verified)
- Verification report generation

**Outputs:** Verification nodes linked to evidence

---

### Audit Agent (Post-MVP)

**Purpose:** Generates compliance trails and audit reports.

**Capabilities:**
- Full history traversal for any node
- Decision trace compilation
- Approval chain documentation
- Change impact documentation
- Regulatory report formatting

---

## 7. Layer 5: Meta Agents

Responsible for agent coordination and system improvement.

### Orchestrator Agent ✅ MVP (simple)

**Purpose:** Routes tasks to appropriate agents.

**Capabilities (MVP):**
- Intent classification (what type of request?)
- Agent selection (who handles this?)
- Simple handoff between agents
- Status tracking

**Capabilities (Future):**
- Complex multi-agent workflows
- Parallel task distribution
- Load balancing
- Failure recovery and retry

**Routing Logic:**
```
User input
    ↓
Intent classification
    ├── Question about data → Query Agent
    ├── Generate report → Artifact Agent
    ├── Research something → Research Agent
    ├── Set up new domain → Onboarding Agent
    ├── Fix/improve something → Plan Proposer Agent
    └── Unknown → Clarification request
```

---

### Agent Spawner Agent (Post-MVP)

**Purpose:** Creates new agent instances dynamically.

**Capabilities:**
- Instantiates agents from specifications
- Configures agent workspaces and permissions
- Manages agent lifecycle (start, stop, restart)
- Scales agents based on load

---

### Learning Agent (Post-MVP)

**Purpose:** Observes system behavior and suggests improvements.

**Capabilities:**
- Pattern recognition across user interactions
- Schema improvement suggestions
- Agent performance analysis
- Workflow optimization recommendations
- Failure pattern detection

---

## 8. Future Agents

Identified gaps that may need dedicated agents:

| Gap | Agent | Purpose |
|-----|-------|---------|
| User preferences | **Personalization Agent** | Learns tone, frequency, format preferences |
| Multi-user work | **Collaboration Agent** | Handles handoffs, permissions, shared work |
| External sync | **Sync Agent** | Keeps network aligned with external tools |
| Cost management | **Resource Agent** | Monitors token spend, optimizes API calls |
| Debugging | **Diagnostic Agent** | Helps users understand why something happened |
| Schema evolution | **Migration Agent** | Handles schema changes without breaking data |

---

## 9. MVP Agent Set

For initial release, implement these 7 agents:

| # | Agent | Layer | Priority |
|---|-------|-------|----------|
| 1 | Onboarding Agent | Schema Generation | P0 |
| 2 | Schema Builder Agent | Schema Generation | P0 |
| 3 | Network Builder Agent | Network Construction | P0 |
| 4 | Data Ingestion Agent | Network Construction | P0 |
| 5 | Query Agent | Operational | P0 |
| 6 | Artifact Agent | Operational | P1 |
| 7 | Orchestrator Agent | Meta | P0 |

**Post-MVP priorities:**
- P1: Network Refiner Agent, Research Agent
- P2: Plan Proposer Agent, Verification Agent, Monitoring Agent
- P3: Everything else

---

## 10. Agent Permission Model

| Agent | Read Graph | Write Nodes | Write Edges | Execute Actions | Requires Approval |
|-------|------------|-------------|-------------|-----------------|-------------------|
| Onboarding | ✅ | ❌ | ❌ | ❌ | N/A |
| Schema Builder | ✅ | Schema only | Schema only | ❌ | Yes (schema changes) |
| Network Builder | ✅ | ✅ | ✅ | ❌ | Yes (initial build) |
| Data Ingestion | ✅ | ✅ | ✅ | ❌ | Configured per source |
| Network Refiner | ✅ | Proposals | Proposals | ❌ | Yes |
| Query | ✅ | ❌ | ❌ | ❌ | N/A |
| Artifact | ✅ | Artifact nodes | ✅ | File generation | No |
| Research | ✅ | Proposals | Proposals | Web access | Yes |
| Execution | ✅ | Run logs | Run logs | ✅ | Plan pre-approved |
| Orchestrator | ✅ | ❌ | ❌ | Agent routing | N/A |

---

## 11. Agent Communication

Agents communicate through:

1. **The graph itself** — One agent creates nodes/edges, another reads them
2. **Task assignment** — Orchestrator creates tasks assigned to agents
3. **Events** — Status changes emit events other agents can subscribe to
4. **Direct handoff** — Orchestrator passes context between agents

**No direct agent-to-agent calls in MVP.** All coordination goes through the graph or orchestrator.

---

*Agents operate on structure, not imagination.* 🦞
