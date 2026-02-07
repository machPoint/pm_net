# Fake Data Service (FDS) Requirements for CORE-SE

## Overview
The Fake Data Service (FDS) is a FastAPI-based mock data service that simulates multiple engineering systems (Jama, Jira, Windchill, Email, Outlook) for the CORE-SE systems engineering demo application. It provides realistic aerospace/systems engineering data with intentional traceability gaps (~15%) to demonstrate impact analysis and gap detection capabilities.

## Core Purpose
- Provide mock data endpoints that mimic real PLM/ALM/Requirements Management systems
- Generate realistic aerospace engineering artifacts (requirements, test cases, issues, parts, ECNs, emails)
- Support document upload and requirements extraction from PDFs
- Enable traceability analysis with intentional gaps for demo purposes
- Serve aggregated data feeds (pulse, impact analysis, trace graphs)

---

## Technical Stack

### Required Dependencies
```
fastapi
uvicorn[standard]
pydantic>=2
faker
python-dateutil
sqlalchemy[asyncio]  # For database persistence
aiosqlite  # For async SQLite support
httpx  # For simulating external system connections
```

### Architecture
- **Framework**: FastAPI with async/await support
- **Port**: 8001 (default)
- **CORS**: Enabled for all origins (demo purposes)
- **Data Persistence**: SQLite database for uploaded documents and extracted requirements
- **Mock Latency**: Supports `X-Mock-Latency` header for simulating network delays
- **MCP Connectivity Simulation**: Simulates how Jama, Jira, Confluence, and Outlook connect to OPAL MCP server

---

## MCP Server Connectivity Simulation

### Overview
The FDS must simulate how real external systems (Jama, Jira, Confluence, Outlook) would connect to the OPAL MCP (Model Context Protocol) server. This allows CORE to test the integration patterns before connecting to actual systems.

### Connection Patterns by System

#### 1. **Jama Connect (Requirements Management)**
**Authentication Method**: OAuth 2.0 + API Key
```python
# Simulated connection headers
{
    "Authorization": "Bearer mock-jama-oauth-token-xyz123",
    "X-Jama-API-Key": "mock-api-key-jama-abc456",
    "Content-Type": "application/json",
    "Accept": "application/json"
}
```

**Connection Endpoints to Simulate**:
- `POST /mock/jama/connect` - Establish connection to MCP server
  - Request: `{"instance_url": "https://jama.example.com", "api_key": "...", "oauth_token": "..."}`
  - Response: `{"status": "connected", "connection_id": "jama-conn-001", "capabilities": ["read_items", "read_relationships", "webhooks"]}`
- `GET /mock/jama/connection/status` - Check connection health
- `POST /mock/jama/webhook/register` - Register webhook for real-time updates
  - Request: `{"webhook_url": "http://opal-mcp-server/webhooks/jama", "events": ["item.created", "item.updated", "relationship.created"]}`
- `POST /mock/jama/sync` - Trigger data synchronization
  - Request: `{"sync_type": "full" | "incremental", "since": "2024-10-01T00:00:00Z"}`

**MCP Integration Pattern**:
```
Jama → REST API → FDS → MCP Server (OPAL) → CORE Backend
```

---

#### 2. **Jira (Issue Tracking)**
**Authentication Method**: OAuth 2.0 or Personal Access Token (PAT)
```python
# Simulated connection headers
{
    "Authorization": "Bearer mock-jira-pat-token-def789",
    "Content-Type": "application/json",
    "Accept": "application/json",
    "X-Atlassian-Token": "no-check"  # CSRF protection bypass for API
}
```

**Connection Endpoints to Simulate**:
- `POST /mock/jira/connect` - Establish connection to MCP server
  - Request: `{"instance_url": "https://company.atlassian.net", "auth_type": "oauth" | "pat", "token": "...", "cloud_id": "..."}`
  - Response: `{"status": "connected", "connection_id": "jira-conn-001", "capabilities": ["read_issues", "read_links", "webhooks", "jql_search"]}`
- `GET /mock/jira/connection/status` - Check connection health
- `POST /mock/jira/webhook/register` - Register webhook for issue updates
  - Request: `{"webhook_url": "http://opal-mcp-server/webhooks/jira", "events": ["jira:issue_created", "jira:issue_updated", "issuelink_created"]}`
- `POST /mock/jira/sync` - Trigger data synchronization
  - Request: `{"jql_query": "project = AERO AND updated >= -30d", "sync_type": "incremental"}`

**MCP Integration Pattern**:
```
Jira Cloud → REST API v3 → FDS → MCP Server (OPAL) → CORE Backend
```

---

#### 3. **Confluence (Knowledge Management)**
**Authentication Method**: OAuth 2.0 or Personal Access Token (PAT)
```python
# Simulated connection headers
{
    "Authorization": "Bearer mock-confluence-pat-token-ghi012",
    "Content-Type": "application/json",
    "Accept": "application/json",
    "X-Atlassian-Token": "no-check"
}
```

**Connection Endpoints to Simulate**:
- `POST /mock/confluence/connect` - Establish connection to MCP server
  - Request: `{"instance_url": "https://company.atlassian.net/wiki", "auth_type": "oauth" | "pat", "token": "...", "cloud_id": "..."}`
  - Response: `{"status": "connected", "connection_id": "confluence-conn-001", "capabilities": ["read_pages", "read_spaces", "search", "webhooks"]}`
- `GET /mock/confluence/connection/status` - Check connection health
- `POST /mock/confluence/webhook/register` - Register webhook for page updates
  - Request: `{"webhook_url": "http://opal-mcp-server/webhooks/confluence", "events": ["page_created", "page_updated", "comment_created"]}`
- `POST /mock/confluence/sync` - Trigger data synchronization
  - Request: `{"space_keys": ["ENG", "PROJ"], "sync_type": "incremental", "since": "2024-10-01T00:00:00Z"}`
- `GET /mock/confluence/pages` - Get Confluence pages
  - Query params: `space`, `title`, `limit`, `expand` (content, version, metadata)
  - Returns: `List[ConfluencePage]`
- `GET /mock/confluence/search` - Search Confluence content
  - Query params: `cql` (Confluence Query Language), `limit`
  - Returns: `List[ConfluenceSearchResult]`

**New Data Models for Confluence**:
```python
class ConfluencePage(BaseModel):
    id: str
    title: str
    space_key: str
    space_name: str
    content: str  # HTML or storage format
    version: int
    status: str  # "current", "draft", "archived"
    created_date: datetime
    modified_date: datetime
    created_by: str
    modified_by: str
    labels: List[str]
    parent_id: Optional[str]
    url: str
    linked_artifacts: List[str]  # References to requirements, issues, etc.

class ConfluenceSearchResult(BaseModel):
    page: ConfluencePage
    excerpt: str  # Search result excerpt
    relevance_score: float
```

**MCP Integration Pattern**:
```
Confluence Cloud → REST API v2 → FDS → MCP Server (OPAL) → CORE Backend
```

---

#### 4. **Outlook (Email & Calendar)**
**Authentication Method**: Microsoft OAuth 2.0 (Microsoft Graph API)
```python
# Simulated connection headers
{
    "Authorization": "Bearer mock-microsoft-graph-token-jkl345",
    "Content-Type": "application/json",
    "Accept": "application/json",
    "Prefer": "outlook.timezone=\"UTC\""  # Timezone preference
}
```

**Connection Endpoints to Simulate**:
- `POST /mock/outlook/connect` - Establish connection to MCP server
  - Request: `{"tenant_id": "...", "client_id": "...", "auth_type": "delegated" | "application", "token": "...", "scopes": ["Mail.Read", "Calendars.Read"]}`
  - Response: `{"status": "connected", "connection_id": "outlook-conn-001", "capabilities": ["read_mail", "read_calendar", "webhooks", "delta_sync"]}`
- `GET /mock/outlook/connection/status` - Check connection health
- `POST /mock/outlook/webhook/register` - Register Microsoft Graph webhook (subscription)
  - Request: `{"webhook_url": "http://opal-mcp-server/webhooks/outlook", "resource": "/me/messages", "change_types": ["created", "updated"], "expiration_datetime": "2024-11-01T00:00:00Z"}`
- `POST /mock/outlook/sync` - Trigger delta synchronization
  - Request: `{"resource_type": "messages" | "events", "delta_token": "...", "folder_id": "inbox"}`
- `GET /mock/outlook/calendar/events` - Get calendar events
  - Query params: `start_date`, `end_date`, `calendar_id`
  - Returns: `List[OutlookCalendarEvent]`

**New Data Models for Outlook Calendar**:
```python
class OutlookCalendarEvent(BaseModel):
    id: str
    global_id: str  # e.g., "OUTLOOK-EVENT-001"
    subject: str
    body: str
    start_time: datetime
    end_time: datetime
    location: str
    organizer: str
    attendees: List[str]
    is_all_day: bool
    is_recurring: bool
    importance: str  # "low", "normal", "high"
    show_as: str  # "free", "tentative", "busy", "out_of_office"
    response_status: str  # "none", "organizer", "tentativelyAccepted", "accepted", "declined"
    linked_artifacts: List[str]
    teams_meeting_url: Optional[str]
```

**MCP Integration Pattern**:
```
Outlook/Microsoft 365 → Microsoft Graph API → FDS → MCP Server (OPAL) → CORE Backend
```

---

### Unified Connection Management

#### Connection Registry Endpoint
`GET /mock/connections` - List all active connections
```json
{
  "connections": [
    {
      "id": "jama-conn-001",
      "system": "jama",
      "status": "connected",
      "instance_url": "https://jama.example.com",
      "connected_at": "2024-10-20T20:00:00Z",
      "last_sync": "2024-10-20T21:00:00Z",
      "capabilities": ["read_items", "read_relationships", "webhooks"]
    },
    {
      "id": "jira-conn-001",
      "system": "jira",
      "status": "connected",
      "instance_url": "https://company.atlassian.net",
      "connected_at": "2024-10-20T20:05:00Z",
      "last_sync": "2024-10-20T21:00:00Z",
      "capabilities": ["read_issues", "read_links", "webhooks", "jql_search"]
    }
  ]
}
```

#### Webhook Simulation
`POST /mock/webhooks/{system}` - Receive webhook events from external systems
```json
{
  "event_type": "item.updated",
  "system": "jama",
  "connection_id": "jama-conn-001",
  "timestamp": "2024-10-20T21:05:00Z",
  "payload": {
    "item_id": "JAMA-SYS-042",
    "changes": {
      "status": {"old": "draft", "new": "approved"},
      "modified_by": "James Rodriguez"
    }
  }
}
```

**FDS should forward webhooks to MCP server**:
```python
async def forward_webhook_to_mcp(webhook_data: dict):
    async with httpx.AsyncClient() as client:
        await client.post(
            "http://opal-mcp-server:8002/webhooks/ingest",
            json=webhook_data,
            headers={"X-FDS-Source": "mock-system"}
        )
```

---

### Authentication Token Management

#### Token Refresh Simulation
`POST /mock/{system}/token/refresh` - Simulate OAuth token refresh
```json
{
  "connection_id": "jama-conn-001",
  "refresh_token": "mock-refresh-token",
  "expires_in": 3600
}
```

Response:
```json
{
  "access_token": "new-mock-access-token-xyz789",
  "refresh_token": "new-mock-refresh-token-abc123",
  "expires_in": 3600,
  "token_type": "Bearer"
}
```

#### Connection Health Checks
All systems should support periodic health checks:
```python
@app.get("/mock/{system}/connection/health")
async def check_connection_health(system: str):
    return {
        "status": "healthy",
        "system": system,
        "latency_ms": random.randint(50, 200),
        "last_successful_request": datetime.utcnow().isoformat(),
        "rate_limit_remaining": random.randint(800, 1000),
        "rate_limit_reset": (datetime.utcnow() + timedelta(hours=1)).isoformat()
    }
```

---

### Rate Limiting Simulation

Each system should simulate rate limits:

- **Jama**: 1000 requests/hour per API key
- **Jira**: 10,000 requests/hour (Cloud), 1000/hour (Server)
- **Confluence**: 10,000 requests/hour (Cloud)
- **Outlook/Graph**: 10,000 requests/10 minutes per app

**Rate Limit Headers** (return in all responses):
```python
{
    "X-RateLimit-Limit": "1000",
    "X-RateLimit-Remaining": "847",
    "X-RateLimit-Reset": "1698012000",  # Unix timestamp
    "Retry-After": "3600"  # Seconds (if rate limited)
}
```

**Rate Limit Exceeded Response** (HTTP 429):
```json
{
  "error": "rate_limit_exceeded",
  "message": "API rate limit exceeded for Jama connection",
  "retry_after": 3600,
  "limit": 1000,
  "window": "1 hour"
}
```

---

### Delta Sync / Incremental Updates

All systems should support incremental synchronization:

#### Delta Sync Pattern
```python
@app.post("/mock/{system}/sync/delta")
async def delta_sync(system: str, request: DeltaSyncRequest):
    """
    Simulate delta/incremental sync
    Returns only items changed since last sync
    """
    return {
        "sync_token": "new-delta-token-xyz",  # Use for next sync
        "has_more": False,
        "items_changed": 15,
        "items_deleted": 2,
        "changes": [
            {
                "change_type": "updated",
                "item_id": "JAMA-SYS-042",
                "timestamp": "2024-10-20T21:00:00Z",
                "fields_changed": ["status", "modified_date"]
            }
        ]
    }
```

---

### Error Simulation

FDS should simulate common connection errors:

1. **Authentication Failures** (HTTP 401)
```json
{
  "error": "authentication_failed",
  "message": "Invalid or expired OAuth token",
  "error_code": "INVALID_TOKEN"
}
```

2. **Connection Timeouts** (HTTP 504)
```json
{
  "error": "gateway_timeout",
  "message": "Connection to Jama instance timed out after 30s",
  "retry_recommended": true
}
```

3. **Service Unavailable** (HTTP 503)
```json
{
  "error": "service_unavailable",
  "message": "Jira Cloud is currently undergoing maintenance",
  "retry_after": 1800
}
```

4. **Invalid Permissions** (HTTP 403)
```json
{
  "error": "insufficient_permissions",
  "message": "API key does not have permission to read relationships",
  "required_scopes": ["read:relationships"]
}
```

---

### MCP Server Integration Flow

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Jama      │         │     FDS     │         │  OPAL MCP   │         │    CORE     │
│  (Mocked)   │────────▶│  (Port 8001)│────────▶│   Server    │────────▶│   Backend   │
└─────────────┘         └─────────────┘         │ (Port 8002) │         │ (Port 8000) │
                                                 └─────────────┘         └─────────────┘
      │                        │                        │                        │
      │  1. Connect Request    │                        │                        │
      │───────────────────────▶│                        │                        │
      │                        │  2. Register Connection│                        │
      │                        │───────────────────────▶│                        │
      │                        │                        │  3. Notify CORE        │
      │                        │                        │───────────────────────▶│
      │                        │                        │                        │
      │  4. Webhook Event      │                        │                        │
      │───────────────────────▶│  5. Forward to MCP     │                        │
      │                        │───────────────────────▶│  6. Process & Store    │
      │                        │                        │───────────────────────▶│
      │                        │                        │                        │
      │                        │  7. Query Data (via MCP)                        │
      │                        │◀───────────────────────────────────────────────│
      │  8. Fetch from Source  │                        │                        │
      │◀───────────────────────│                        │                        │
      │  9. Return Data        │                        │                        │
      │───────────────────────▶│  10. Cache in MCP      │                        │
      │                        │───────────────────────▶│  11. Return to CORE    │
      │                        │                        │───────────────────────▶│
```

---

### Configuration File Simulation

FDS should support loading connection configurations:

**`connections.json`** (example):
```json
{
  "connections": [
    {
      "id": "jama-prod",
      "system": "jama",
      "enabled": true,
      "config": {
        "instance_url": "https://jama.example.com",
        "api_key": "mock-api-key",
        "oauth_token": "mock-oauth-token",
        "sync_interval_minutes": 15,
        "webhook_enabled": true
      }
    },
    {
      "id": "jira-cloud",
      "system": "jira",
      "enabled": true,
      "config": {
        "instance_url": "https://company.atlassian.net",
        "auth_type": "pat",
        "token": "mock-pat-token",
        "cloud_id": "abc123-def456",
        "sync_interval_minutes": 10,
        "webhook_enabled": true
      }
    },
    {
      "id": "confluence-wiki",
      "system": "confluence",
      "enabled": true,
      "config": {
        "instance_url": "https://company.atlassian.net/wiki",
        "auth_type": "pat",
        "token": "mock-pat-token",
        "space_keys": ["ENG", "PROJ"],
        "sync_interval_minutes": 30
      }
    },
    {
      "id": "outlook-365",
      "system": "outlook",
      "enabled": true,
      "config": {
        "tenant_id": "tenant-uuid",
        "client_id": "client-uuid",
        "auth_type": "delegated",
        "token": "mock-graph-token",
        "scopes": ["Mail.Read", "Calendars.Read"],
        "sync_interval_minutes": 5
      }
    }
  ]
}
```

---

### Testing Connection Simulation

```bash
# Test Jama connection
curl -X POST http://localhost:8001/mock/jama/connect \
  -H "Content-Type: application/json" \
  -d '{"instance_url": "https://jama.example.com", "api_key": "test-key"}'

# Test webhook forwarding
curl -X POST http://localhost:8001/mock/webhooks/jama \
  -H "Content-Type: application/json" \
  -d '{"event_type": "item.updated", "item_id": "JAMA-SYS-042"}'

# Check all connections
curl http://localhost:8001/mock/connections

# Test rate limiting
for i in {1..1005}; do
  curl http://localhost:8001/mock/jama/items?size=1
done
# Should return 429 after 1000 requests
```

---

## Data Models (Pydantic)

### 1. Jama (Requirements Management)
**JamaItem**
- `id`: str - Internal UUID
- `global_id`: str - Display ID (e.g., "JAMA-REQ-123", "JAMA-FTC-045")
- `document_key`: str - Document identifier (e.g., "SRD-2024", "FTP-2024")
- `item_type`: str - "requirement" or "test_case"
- `name`: str - Item title
- `description`: str - Detailed description
- `status`: str - "draft", "approved", "under_review", "verified", "validated", "planned", "ready", "in_progress", "completed", "passed", "failed"
- `created_date`: datetime
- `modified_date`: datetime
- `created_by`: str
- `modified_by`: str
- `fields`: Dict[str, Any] - Custom fields including:
  - `priority`: "critical", "high", "medium", "low"
  - `verification_method`: "flight_test", "ground_test", "simulation", "analysis", "inspection"
  - `safety_level`: "DAL-A", "DAL-B", "DAL-C", "DAL-D", "DAL-E"
  - `certification_basis`: "FAR-25", "FAR-23", "DO-178C", "DO-254", "ARP4754A"
  - `test_type`: "ground_test", "flight_test", "simulation", "rig_test", "bench_test"
  - `test_phase`: "development", "qualification", "certification", "production"

**JamaRelationship**
- `id`: str
- `from_item`: str - Source item ID
- `to_item`: str - Target item ID
- `relationship_type`: str - "verifies", "implements", "derives_from"
- `created_date`: datetime

**Expected Volume**: 80-100 requirements, 40-60 test cases, with ~85% traceability coverage (15% gaps)

---

### 2. Jira (Issue Tracking)
**JiraIssue**
- `id`: str - Internal UUID
- `key`: str - Issue key (e.g., "JIRA-AERO-001")
- `summary`: str - Issue title
- `description`: str - Detailed description
- `issue_type`: str - "defect", "flight_test_issue", "certification_task", "design_change", "compliance_review"
- `status`: str - "open", "in_progress", "testing", "review", "resolved", "closed"
- `priority`: str - "critical", "high", "medium", "low"
- `assignee`: Optional[str]
- `reporter`: str
- `created`: datetime
- `updated`: datetime
- `labels`: List[str] - e.g., ["flight-safety", "certification", "flight-test", "FAA", "DO-178C"]

**JiraLink**
- `id`: str
- `issue_id`: str
- `linked_issue_id`: str
- `link_type`: str - "blocks", "relates", "implements", "depends"

**Expected Volume**: 25-35 issues with ~70% having links to other issues

---

### 3. Windchill (PLM/Parts Management)
**WindchillPart**
- `id`: str - Internal UUID
- `number`: str - Part number (e.g., "AN1023", "PN-00123")
- `name`: str - Part name
- `description`: str - Detailed description
- `version`: str - e.g., "A.3", "B.1"
- `state`: str - "in_work", "released", "production", "obsolete"
- `created_by`: str
- `created_date`: datetime
- `modified_date`: datetime
- `classification`: str - "avionics", "mechanical", "electrical", "hydraulic", "structural", "propulsion"

**WindchillBOM** (Bill of Materials)
- `id`: str
- `parent_part`: str - Parent part number
- `child_part`: str - Child part number
- `quantity`: float
- `unit`: str - "EA", "LB", "FT", "IN"
- `find_number`: str - Position in BOM

**WindchillECN** (Engineering Change Notice)
- `id`: str
- `number`: str - ECN number (e.g., "ECN-2024-003")
- `title`: str
- `description`: str
- `status`: str - "draft", "review", "approved", "released", "implemented", "cancelled"
- `initiator`: str
- `created_date`: datetime
- `target_date`: Optional[datetime]
- `affected_parts`: List[str] - Part numbers affected by change

**Expected Volume**: 15-25 parts, 4-6 ECNs, hierarchical BOM structure

---

### 4. Email & Outlook (Communications)
**EmailMessage**
- `id`: str
- `global_id`: str - e.g., "EMAIL-001"
- `subject`: str
- `sender`: str - Email address
- `recipients`: List[str]
- `body`: str
- `sent_date`: datetime
- `attachments`: List[str] - Attachment filenames
- `linked_artifacts`: List[str] - Referenced artifact IDs

**OutlookMessage**
- `id`: str
- `global_id`: str - e.g., "OUTLOOK-MSG-001"
- `subject`: str
- `sender`: str - Name
- `recipients`: List[str] - Names
- `body`: str
- `sent_date`: datetime
- `importance`: str - "normal", "high"
- `has_attachments`: bool
- `linked_artifacts`: List[str]
- `meeting_request`: bool

**Expected Volume**: 10 emails, 10 Outlook messages

---

### 5. Aggregated Models (for CORE backend consumption)
**MockArtifactRef**
- `id`: str - Artifact ID
- `type`: str - Artifact type
- `source`: str - "jama", "jira", "windchill", "email", "outlook"
- `title`: str - Display title
- `status`: Optional[str]
- `url`: Optional[str] - Link to mock window view

**MockPulseItem** (Activity Feed)
- `id`: str
- `artifact_ref`: MockArtifactRef
- `change_type`: str - "created", "updated", "status_change"
- `change_summary`: str
- `timestamp`: datetime
- `author`: Optional[str]
- `metadata`: Dict[str, Any]

**MockImpactNode** (Impact Analysis Tree)
- `artifact_ref`: MockArtifactRef
- `impact_level`: int - Degree of separation from root
- `relationship_type`: str
- `children`: List[MockImpactNode] - Recursive structure

**MockImpactResult**
- `root_artifact`: MockArtifactRef
- `depth`: int - Analysis depth
- `total_impacted`: int
- `impact_tree`: List[MockImpactNode]
- `gap_count`: int - Number of traceability gaps found

**TraceNode** (Graph Visualization)
- `id`: str
- `label`: str
- `type`: str
- `status`: str
- `x`: float - X coordinate
- `y`: float - Y coordinate

**TraceEdge**
- `id`: str
- `from_node`: str
- `to_node`: str
- `label`: str
- `type`: str - Relationship type

**TraceGraph**
- `nodes`: List[TraceNode]
- `edges`: List[TraceEdge]
- `metadata`: Dict[str, Any]

---

## Required API Endpoints

### Health & Admin
- `GET /health` - Health check
- `POST /mock/admin/seed` - Reset and regenerate all mock data
- `GET /mock/admin/documents` - List uploaded documents
- `GET /mock/admin/documents/{document_id}` - Get document with requirements
- `POST /mock/admin/documents/{document_id}/process` - Extract requirements from document
- `DELETE /mock/admin/documents/{document_id}` - Delete document
- `GET /mock/admin/requirements` - Get requirements with filtering (document_id, category, priority, limit)
- `POST /mock/admin/generate-from-requirements` - Generate artifacts from stored requirements
- `POST /mock/admin/upload-document` - Upload requirements document (PDF)

### Jama Endpoints
- `GET /mock/jama/items` - Get Jama items
  - Query params: `page`, `size`, `q` (search), `type` (filter by item_type)
  - Header: `X-Mock-Latency` (optional)
  - Returns: `List[JamaItem]`
- `GET /mock/jama/relationships` - Get relationships
  - Query params: `item_id` (optional filter)
  - Returns: `List[JamaRelationship]`

### Jira Endpoints
- `GET /mock/jira/issues` - Get Jira issues
  - Query params: `page`, `size`, `q` (search), `status` (filter)
  - Returns: `List[JiraIssue]`
- `GET /mock/jira/links` - Get issue links
  - Query params: `issue_id` (optional filter)
  - Returns: `List[JiraLink]`

### Windchill Endpoints
- `GET /mock/windchill/parts` - Get parts
  - Query params: `page`, `size`, `q` (search)
  - Returns: `List[WindchillPart]`
- `GET /mock/windchill/bom` - Get BOM entries
  - Query params: `part_id` (optional filter)
  - Returns: `List[WindchillBOM]`
- `GET /mock/windchill/ecn` - Get ECNs
  - Query params: `status` (optional filter)
  - Returns: `List[WindchillECN]`

### Email & Outlook Endpoints
- `GET /mock/email/messages` - Get email messages
  - Query params: `since` (datetime, optional)
  - Returns: `List[EmailMessage]`
- `GET /mock/outlook/messages` - Get Outlook messages
  - Query params: `since` (datetime, optional)
  - Returns: `List[OutlookMessage]`

### Aggregated Endpoints
- `GET /mock/pulse` - Get pulse feed (activity stream)
  - Query params: `since`, `sources` (comma-separated), `types` (comma-separated), `limit`
  - Returns: `List[MockPulseItem]`
- `GET /mock/impact/{entity_id}` - Get impact analysis
  - Query params: `depth` (1-5, default 2)
  - Returns: `MockImpactResult`
- `GET /mock/graph/trace` - Get trace graph
  - Query params: `root_id` (optional)
  - Returns: `TraceGraph`

### Mock Windows (Read-Only Views)
- `GET /mock/windows/{tool}/{item_id}` - Return HTML mock window
  - Path params: `tool` (jama, jira, windchill, email, outlook), `item_id`
  - Returns: HTML page with watermark "READ-ONLY DEMO"

---

## Data Generation Requirements

### Content Characteristics
1. **Aerospace/Systems Engineering Focus**
   - Requirements should reference flight systems, avionics, propulsion, environmental control, etc.
   - Use aerospace terminology: DAL levels, FAR regulations, DO-178C, ARP4754A
   - Part numbers with aerospace prefixes (AN, PN)
   - Test cases for flight test, ground test, simulation, certification

2. **Realistic Naming Conventions**
   - Requirements: "SYS-001", "SYS-002", etc. with global IDs "JAMA-SYS-001"
   - Test Cases: "FTC-001" (Flight Test Case) with global IDs "JAMA-FTC-001"
   - Issues: "AERO-001" with keys "JIRA-AERO-001"
   - Parts: "AN1000", "AN1001", etc.
   - ECNs: "ECN-2024-001"
   - Emails: "EMAIL-001"
   - Outlook: "OUTLOOK-MSG-001"

3. **Traceability Gaps**
   - Intentionally create ~15% gaps in requirement-to-test traceability
   - Some requirements should have no test cases
   - Some test cases should have no requirements
   - ~70% of Jira issues should have links

4. **Temporal Realism**
   - Requirements created 6-12 months ago
   - Test cases created 3-8 months ago
   - Issues created 1-6 months ago
   - Recent modifications within last 30 days for pulse feed
   - ECNs with future target dates

5. **Personnel Names**
   - Use realistic names (via Faker library)
   - Aerospace-themed email domains: aerocorp.com, flighttest.gov, aviationeng.com
   - Consistent personnel across related items

### Data Relationships
- Requirements → Test Cases (verifies relationship, 85% coverage)
- Requirements → Jira Issues (via labels/references)
- Jira Issues → Jira Issues (blocks, relates, implements)
- Parts → BOM → Child Parts (hierarchical)
- ECNs → Affected Parts (1-3 parts per ECN)
- Pulse items reference all artifact types

---

## Database Persistence (Optional but Recommended)

### Document Management
- Store uploaded PDF documents
- Track processing status: "pending", "processing", "completed", "failed"
- Extract requirements from PDFs using text extraction
- Auto-detect document type (MRD, SRD, ICD) and mission (GOES-R, JWST, etc.)

### Requirements Storage
- Store extracted requirements with metadata
- Link requirements to generated artifacts (Jama items, Jira issues)
- Support filtering by document, category, priority
- Track extraction confidence and status

### Tables Needed
1. **RequirementDocumentDB**
   - id, filename, original_filename, file_path, file_size
   - document_type, mission, version, classification
   - processing_status, extraction_status, requirements_extracted
   - uploaded_at, processed_at, uploaded_by
   - metadata (JSON)

2. **RequirementDB**
   - id, document_id (FK), requirement_id
   - title, text, category, priority, verification_method
   - source_page, parent_section, tags (JSON)
   - extraction_confidence, status
   - extracted_at, updated_at
   - jama_items_generated (JSON), jira_issues_generated (JSON)
   - related_artifacts (JSON), metadata (JSON)

---

## Special Features

### 1. Mock Latency Simulation
- Accept `X-Mock-Latency` header (float seconds, max 5.0)
- Simulate network delays with `asyncio.sleep()`

### 2. Data Seeding
- `/mock/admin/seed` endpoint regenerates all data
- Can generate from database requirements OR synthetic data
- Returns generation statistics

### 3. Mock Window HTML
- Generate read-only HTML views for artifacts
- Include watermark "READ-ONLY DEMO"
- Display artifact details in formatted layout
- Use inline CSS for styling

### 4. Pulse Feed Generation
- Aggregate recent changes (last 30 days) from all systems
- Include change type, summary, timestamp, author
- Sort by timestamp descending
- Support filtering by source and type

### 5. Impact Analysis
- Traverse relationship graph from root entity
- Build tree structure with impact levels (degrees of separation)
- Count total impacted items and traceability gaps
- Support configurable depth (1-5 levels)

### 6. Trace Graph
- Generate graph visualization data (nodes + edges)
- Include node positions (x, y coordinates)
- Support filtering by root node
- Return metadata (gap count, coverage stats)

---

## Integration with CORE Backend

The CORE backend (`c:\Users\X1\PROJECT\CORE\backend\app\main.py`) acts as an API gateway that:
1. Proxies requests to FDS endpoints
2. Adds authentication/authorization
3. Caches responses
4. Enriches data with AI summaries
5. Manages local tasks and notes

**Expected FDS Base URL**: `http://localhost:8001`

**CORE Proxy Pattern**:
```python
@app.get("/api/requirements")
async def get_requirements():
    async with httpx.AsyncClient() as client:
        response = await client.get("http://localhost:8001/mock/jama/items")
        return response.json()
```

---

## Startup & Configuration

### Running the FDS
```bash
cd backend/fds
pip install -r requirements.txt
python main.py
# OR
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

### Environment Variables (Optional)
- `FDS_PORT`: Port to run on (default: 8001)
- `FDS_HOST`: Host to bind to (default: 0.0.0.0)
- `FDS_DB_PATH`: Path to SQLite database (default: ./core_demo.db)

### Initialization Sequence
1. Create FastAPI app with CORS middleware
2. Initialize data generator
3. Initialize database (if using persistence)
4. Generate initial mock data on startup
5. Start uvicorn server

---

## Testing & Validation

### Health Check
```bash
curl http://localhost:8001/health
# Expected: {"status": "healthy", "service": "core-se-fds"}
```

### Sample Data Retrieval
```bash
# Get requirements
curl "http://localhost:8001/mock/jama/items?type=requirement&size=10"

# Get issues
curl "http://localhost:8001/mock/jira/issues?status=open"

# Get pulse feed
curl "http://localhost:8001/mock/pulse?limit=20"

# Get impact analysis
curl "http://localhost:8001/mock/impact/JAMA-SYS-001?depth=3"
```

### Data Seeding
```bash
curl -X POST http://localhost:8001/mock/admin/seed
```

---

## Key Differences from Production Systems

1. **No Authentication**: FDS is open for demo purposes
2. **In-Memory Data**: Data resets on restart (unless using database)
3. **Simplified Models**: Real systems have more complex data structures
4. **Mock Latency**: Simulated delays, not real network latency
5. **Intentional Gaps**: Traceability gaps for demo purposes
6. **Read-Only Windows**: HTML mocks instead of real system UIs
7. **Synthetic Data**: Generated via Faker, not real engineering data

---

## Success Criteria

A properly implemented FDS should:
1. ✅ Start on port 8001 without errors
2. ✅ Return health check successfully
3. ✅ Generate 80-100 requirements, 40-60 test cases
4. ✅ Generate 25-35 Jira issues, 15-25 parts, 4-6 ECNs
5. ✅ Create ~85% traceability coverage (15% gaps)
6. ✅ Support all required endpoints with correct response models
7. ✅ Return realistic aerospace engineering content
8. ✅ Generate pulse feed with recent changes
9. ✅ Perform impact analysis with configurable depth
10. ✅ Serve mock HTML windows for artifacts
11. ✅ Support document upload and requirements extraction (if implementing persistence)
12. ✅ Handle query parameters and filtering correctly
13. ✅ Return proper HTTP status codes and error messages

---

## Notes for Implementation

- Use **Faker** library for generating realistic names, dates, text
- Use **uuid** for generating unique IDs
- Use **random** for creating gaps and variations
- Implement **async/await** throughout for FastAPI compatibility
- Use **Pydantic v2** models with proper field validation
- Include **type hints** for all functions
- Add **docstrings** to all endpoints
- Consider **caching** for frequently accessed data
- Use **logging** for debugging and monitoring
- Handle **edge cases** (empty results, invalid IDs, etc.)

---

## Example Data Snippets

### Sample Requirement
```json
{
  "id": "uuid-here",
  "global_id": "JAMA-SYS-042",
  "document_key": "SRD-2024",
  "item_type": "requirement",
  "name": "Flight Control System Requirement",
  "description": "Flight Control System shall maintain aircraft stability during all flight phases including takeoff, cruise, and landing under normal and emergency conditions.",
  "status": "approved",
  "created_date": "2024-03-15T10:30:00Z",
  "modified_date": "2024-10-10T14:22:00Z",
  "created_by": "Sarah Mitchell",
  "modified_by": "James Rodriguez",
  "fields": {
    "priority": "critical",
    "verification_method": "flight_test",
    "safety_level": "DAL-A",
    "certification_basis": "DO-178C"
  }
}
```

### Sample Jira Issue
```json
{
  "id": "uuid-here",
  "key": "JIRA-AERO-015",
  "summary": "Hydraulic leak detected in landing gear actuator assembly",
  "description": "Issue discovered during ground test. Impact: Flight safety concern. Assigned to Landing Gear engineering team.",
  "issue_type": "defect",
  "status": "in_progress",
  "priority": "high",
  "assignee": "Michael Thompson",
  "reporter": "Anna Kowalski",
  "created": "2024-09-20T08:15:00Z",
  "updated": "2024-10-18T16:45:00Z",
  "labels": ["flight-safety", "ground-test", "hydraulic"]
}
```

### Sample Pulse Item
```json
{
  "id": "uuid-here",
  "artifact_ref": {
    "id": "JAMA-SYS-042",
    "type": "requirement",
    "source": "jama",
    "title": "Flight Control System Requirement",
    "status": "approved",
    "url": "http://localhost:8001/mock/windows/jama/JAMA-SYS-042"
  },
  "change_type": "updated",
  "change_summary": "Requirement 'Flight Control System Requirement' was updated",
  "timestamp": "2024-10-10T14:22:00Z",
  "author": "James Rodriguez",
  "metadata": {"document": "SRD-2024"}
}
```

---

## Contact & Support

This FDS is designed specifically for the CORE-SE demo application. For questions about integration or requirements, refer to:
- Main CORE project: `c:\Users\X1\PROJECT\CORE\`
- Backend API gateway: `c:\Users\X1\PROJECT\CORE\backend\app\main.py`
- Frontend components: `c:\Users\X1\PROJECT\CORE\frontend\src\`

**Version**: 1.0.0  
**Last Updated**: October 2024
