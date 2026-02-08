# FDS Integration with OPAL_SE

This document explains how to integrate the Fake Data Service (FDS) with OPAL_SE to populate the system engineering database with aerospace test data.

## Overview

The **FDS (Fake Data Server)** generates realistic aerospace engineering test data including:
- **Jama** requirements and test cases (80-100 requirements, 40-60 test cases)
- **Jira** issues and links (aerospace engineering bugs, features, tasks)
- **Windchill** parts, BOMs, and ECNs (engineering change notices)
- **Email/Outlook** messages
- **Confluence** pages

**OPAL_SE** ingests this data into its system graph database and provides 10 SE MCP tools to query and analyze the data.

## Architecture

```
┌─────────────┐                    ┌──────────────────┐
│             │  HTTP REST API      │                  │
│  FDS Server │◄────────────────────│  OPAL_SE Server  │
│ (Port 4000) │                    │   (Port 7788)    │
│             │                    │                  │
└─────────────┘                    └──────────────────┘
      │                                     │
      │ Generates                           │ Stores in
      │ Test Data                           │ System Graph
      │                                     │
      └────────────────────────────────────┘
            Aerospace Engineering Data
```

## Getting Started

### 1. Start FDS Server

```bash
cd C:\Users\X1\PROJECT\CORE_SE\FDS
.\start_fds.bat
```

FDS will start on **http://localhost:4000**

Admin interface: http://localhost:4000/admin

### 2. Start OPAL_SE Server

```bash
cd C:\Users\X1\PROJECT\CORE_SE
.\start-server.bat
```

OPAL_SE will start on **http://localhost:7788**

Admin panel: http://localhost:7788/admin

### 3. Ingest FDS Data into OPAL_SE

```bash
cd C:\Users\X1\PROJECT\CORE_SE\OPAL_SE
.\ingest-fds-data.bat
```

This script will:
1. Check FDS server health
2. Fetch all Jama items (requirements & tests)
3. Fetch all Jira issues
4. Fetch all Windchill parts and ECNs
5. Ingest data into OPAL_SE database
6. Print statistics

**Expected output:**
```
============================================================
Ingestion Complete!
============================================================
Statistics:
  Jama Items:         80-100
  Jama Relationships: 60-80
  Jira Issues:        50-70
  Jira Links:         30-50
  Windchill Parts:    40-60
  Windchill BOMs:     20-40
  Windchill ECNs:     10-20
  Errors:             0
============================================================
```

## Testing SE MCP Tools

Once data is ingested, test the SE tools in the MCP Inspector:

1. Open **http://localhost:7788/admin**
2. Click **"MCP Inspector"**
3. Test the following tools:

### Tool 1: Query System Model

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "querySystemModel",
    "arguments": {
      "project_id": "proj-001",
      "node_type": "Requirement",
      "limit": 10
    }
  },
  "id": "test-query-1"
}
```

**Expected**: Returns 10 requirements from Jama

### Tool 2: Run Consistency Checks

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "runConsistencyChecks",
    "arguments": {
      "project_id": "proj-001"
    }
  },
  "id": "test-rules-1"
}
```

**Expected**: Returns rule violations such as:
- Unverified requirements (no test cases)
- Unallocated requirements (no component assignment)

### Tool 3: Find Verification Gaps

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "findVerificationGaps",
    "arguments": {
      "project_id": "proj-001"
    }
  },
  "id": "test-gaps-1"
}
```

**Expected**: Returns requirements without test case verification

### Tool 4: Get Verification Coverage Metrics

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "getVerificationCoverageMetrics",
    "arguments": {
      "project_id": "proj-001"
    }
  },
  "id": "test-metrics-1"
}
```

**Expected**: Returns statistics like:
- Total requirements: 80-100
- Verified requirements: 50-70
- Coverage percentage: 60-80%

## FDS Endpoints

The FDS server provides the following endpoints:

### Health Check
- `GET /health` - Check server health

### Jama Data
- `GET /mock/jama/items?size=100` - Get requirements and test cases
- `GET /mock/jama/relationships` - Get verification relationships

### Jira Data
- `GET /mock/jira/issues?size=100` - Get Jira issues
- `GET /mock/jira/links` - Get issue links

### Windchill Data
- `GET /mock/windchill/parts?size=100` - Get parts
- `GET /mock/windchill/bom` - Get Bill of Materials
- `GET /mock/windchill/ecn` - Get Engineering Change Notices

### Pulse Feed
- `GET /mock/pulse?limit=50` - Get aggregated change feed (all systems)

## FDS Sidecar Polling (Optional)

OPAL_SE can automatically poll FDS for new events. This is configured in `server.ts`:

```typescript
// Default FDS URL (can override with FDS_URL environment variable)
const FDS_URL = process.env.FDS_URL || 'http://localhost:4000';

// Polling interval (default 30 seconds)
const FDS_POLLING_INTERVAL_MS = process.env.FDS_POLLING_INTERVAL_MS || '30000';
```

To disable automatic polling:
```bash
set FDS_ENABLED=false
```

To change poll interval:
```bash
set FDS_POLLING_INTERVAL_MS=60000  # 1 minute
```

## Data Model

### Jama Items (Requirements & Tests)
```typescript
{
  global_id: "JAMA-SYS-001",
  item_type: "requirement", // or "test_case"
  name: "Flight Control System Requirement",
  description: "Flight Control System shall maintain aircraft stability...",
  status: "approved",
  fields: {
    priority: "critical",
    verification_method: "flight_test",
    safety_level: "DAL-A",
    certification_basis: "DO-178C"
  }
}
```

### Jira Issues
```typescript
{
  key: "JIRA-ENG-001",
  summary: "Engine vibration exceeds limits during flight test",
  issue_type: "bug",
  priority: "critical",
  status: "in_progress",
  assignee: "John Doe"
}
```

### Windchill Parts
```typescript
{
  number: "PN-00123",
  name: "Engine Control Unit",
  classification: "Avionics",
  state: "released",
  version: "A.1"
}
```

## Troubleshooting

### FDS server not starting
- Check Python 3.8+ is installed
- Install dependencies: `pip install -r requirements.txt`
- Check port 4000 is not in use

### OPAL_SE server not starting
- Check Node.js is installed
- Run database migrations: `npm run migrate`
- Check port 7788 is not in use

### Ingestion fails
- Verify both servers are running
- Check server URLs in `ingest-fds-data.js`:
  ```javascript
  const FDS_URL = 'http://localhost:4000';
  const OPAL_URL = 'http://localhost:7788';
  ```
- Check authentication token if needed

### No data in SE tools
- Verify ingestion completed successfully
- Check database: `SELECT COUNT(*) FROM nodes;`
- Re-run ingestion script

## Advanced Configuration

### Custom Project ID
Edit `scripts/ingest-fds-data.js`:
```javascript
const PROJECT_ID = 'my-aerospace-project';
```

### Authentication
Set auth token:
```bash
set OPAL_AUTH_TOKEN=your-token-here
```

### Custom FDS URL
```bash
set FDS_URL=http://custom-fds-server:4000
```

## Next Steps

After successful integration:

1. **Test all 10 SE MCP tools** - See tool documentation in STATUS.md
2. **Add custom rules** - Modify `src/services/se/ruleEngineService.ts`
3. **Customize data** - Upload real requirements via FDS admin panel
4. **Build workflows** - Create AI agents that use SE tools via MCP

## File Locations

- FDS Server: `C:\Users\X1\PROJECT\CORE_SE\FDS\`
- OPAL_SE Server: `C:\Users\X1\PROJECT\CORE_SE\OPAL_SE\`
- Ingestion Script: `OPAL_SE\scripts\ingest-fds-data.js`
- FDS Connector: `OPAL_SE\src\services\se\fdsSidecarConnector.ts`
- FDS Adapter: `OPAL_SE\src\services\se\fdsAdapter.ts`

## Support

For issues or questions:
1. Check server logs for errors
2. Review STATUS.md for known issues
3. Verify all prerequisites are installed
