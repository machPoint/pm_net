# OPAL Core Toolbox & Sidecar MCP Connector

This document describes the OPAL Core Toolbox and Sidecar MCP Connector framework - a comprehensive, vendor-agnostic tool ecosystem for cross-interface AI operations.

## Overview

The OPAL Core Toolbox provides **90% of cross-interface needs** through standardized, reusable tools, while the Sidecar MCP Connector enables seamless integration with specialized external systems like Jama, Jira, and other domain-specific tools.

## Architecture

```
OPAL Server
├── Core Toolbox (90% coverage)
│   ├── System & Orchestration
│   ├── Secrets, Config & Storage  
│   ├── HTTP, Webhooks & Crypto
│   ├── Parse, Transform & Validate
│   ├── Search, Summarize & Vector
│   ├── Document & Diagram
│   └── Safety, Redaction & Format
└── Sidecar Connector (10% specialized)
    ├── Registry & Lifecycle
    ├── Capability Discovery
    ├── Invocation Proxy
    ├── Event Plumbing
    └── Sync Helpers
```

## Core Toolbox Categories

### 1. System and Orchestration
- **sys.ping()** → `{ok, version}` - Health check
- **sys.time_now()** → `{iso8601}` - Current time
- **sys.uuid()** → `{id}` - Generate UUID
- **rbac.check()** → `{allow, reason?}` - Permission check
- **policy.enforce()** → `{allow, obligations?}` - Policy enforcement
- **audit.log()** → `{ok}` - Audit logging
- **events.publish/subscribe()** - Event system
- **schedule.at/cron()** - Job scheduling
- **task.enqueue()** - Background tasks

### 2. Secrets, Config & Storage
- **vault.fetch_secret()** → `{value, lease_expires_at}` - Secret management
- **config.get()** → `{value}` - Configuration retrieval
- **kv.get/set()** - Key-value storage with TTL
- **blob.put/get()** - Binary data storage
- **blob.signed_url()** - Secure file access

### 3. HTTP, Webhooks & Crypto
- **http.fetch()** → `{status, headers, body}` - HTTP client
- **webhook.register()** - Webhook management
- **webhook.verify_hmac()** - Signature verification
- **crypto.hash_sha256/hmac_sha256()** - Cryptographic functions
- **crypto.encrypt/decrypt()** - Data encryption

### 4. Parse, Transform & Validate
- **text.extract()** - Regex pattern extraction
- **html.to_markdown()** - Format conversion
- **pdf.parse()** - PDF text extraction
- **csv.parse()** - CSV processing
- **json.validate()** - Schema validation
- **schema.coerce()** - Data transformation
- **diff.compute()** - Change detection

### 5. Search, Summarize & Vector
- **search.web()** - Web search
- **rss.pull()** - RSS feed processing
- **embeddings.create()** - Vector generation
- **vector.upsert/query()** - Vector database operations
- **summarize.chunked()** - Text summarization

### 6. Document & Diagram
- **markdown.render()** - Markdown to HTML
- **diagram.sequence/block()** - Diagram generation
- **table.detect()** - Table extraction

### 7. Safety, Redaction & Format
- **pii.redact()** - PII removal
- **content.moderate()** - Content filtering
- **format.ticket/email()** - Standard formatting

## Sidecar MCP Connector

### Registry & Lifecycle
- **sidecar.register()** - Register external MCP server
- **sidecar.list()** - List registered adapters
- **sidecar.health()** - Health monitoring
- **sidecar.disconnect()** - Connection management

### Capability Discovery
- **sidecar.capabilities()** - Get available tools
- **sidecar.describe_tool()** - Tool schema inspection

### Invocation Proxy
- **sidecar.invoke()** - Universal tool invocation with RBAC/policy

### Event Plumbing
- **sidecar.events.pull/push()** - Event synchronization
- **sidecar.events.ack()** - Event acknowledgment

### Sync Helpers
- **sidecar.cursor.info/set()** - Synchronization cursors
- **sidecar.sync.backfill()** - Historical data sync

## Usage Examples

### Basic Core Tool Usage
```javascript
// System ping
await callTool('sys.ping', {})
// → {ok: true, version: '1.0.0', timestamp: '2024-...'}

// Secret retrieval
await callTool('vault.fetch_secret', {name: 'api_key'})
// → {value: 'secret-value', lease_expires_at: '2024-...'}

// JSON validation
await callTool('json.validate', {
  schema: {type: 'object', properties: {name: {type: 'string'}}},
  data: {name: 'John'}
})
// → {valid: true, errors: []}
```

### Sidecar Registration
```javascript
// Register Jama sidecar
await callTool('sidecar.register', {
  name: 'jama',
  url: 'http://localhost:3001',
  transport: 'http',
  auth: {type: 'bearer', vault_refs: {token: 'jama_api_token'}},
  tenant: 'demo',
  scopes: ['artifacts.read', 'artifacts.write']
})

// Invoke Jama tool via sidecar
await callTool('sidecar.invoke', {
  name: 'jama',
  tool: 'artifact.search',
  args: {query: 'authentication', limit: 10}
})
```

### Cross-Tool Workflow
```javascript
// 1. Validate input data
const validation = await callTool('json.validate', {
  schema: requirementSchema,
  data: inputData
})

if (!validation.valid) {
  throw new Error(`Invalid data: ${validation.errors.join(', ')}`)
}

// 2. Create artifact in Jama
const result = await callTool('sidecar.invoke', {
  name: 'jama',
  tool: 'artifact.create',
  args: {
    project_id: 'PROJ-001',
    item_type: 'requirement',
    fields: inputData
  }
})

// 3. Log audit trail
await callTool('audit.log', {
  actor: 'user123',
  action: 'create_requirement',
  target: result.id,
  args_hash: await callTool('crypto.hash_sha256', {
    bytes_b64: Buffer.from(JSON.stringify(inputData)).toString('base64')
  })
})
```

## Deployment

### Core Toolbox Only
```javascript
const { initializeOPALCore } = require('./src/examples/opal-core-integration-tmp');

// Initialize during server startup
await initializeOPALCore(configs, wss);
```

### With Jama Sidecar
```bash
# Terminal 1: Start Jama MCP Server
node src/sidecar/jama-server-tmp.js

# Terminal 2: Start OPAL Server (auto-registers sidecar)
npm start
```

### Production Configuration
```javascript
// Environment variables
MCP_ENABLE_CORE_TOOLBOX=true
MCP_ENABLE_SIDECAR_CONNECTOR=true
MCP_SIDECAR_AUTO_REGISTER=jama:http://jama-server:3001,jira:http://jira-server:3002
```

## Security

- **RBAC Integration**: All sidecar calls go through `rbac.check`
- **Policy Enforcement**: Tools respect `policy.enforce` decisions  
- **Audit Logging**: Comprehensive audit trail via `audit.log`
- **Secret Management**: Secure credential handling via `vault.fetch_secret`
- **Content Safety**: PII redaction and content moderation built-in

## Error Handling

All tools return standardized error responses:
```javascript
{
  error: {
    code: 'tool_error',
    message: 'Human readable error message',
    retriable: true/false,
    external_correlation_id?: 'abc123'
  }
}
```

## Extension Points

### Adding Custom Core Tools
```javascript
// In any toolbox category module
tools.set('custom.tool', {
  name: 'custom.tool',
  description: 'Your custom tool',
  inputSchema: { /* JSON Schema */ },
  _internal: {
    method: 'POST',
    path: '/custom/tool',
    processor: async (params) => {
      // Implementation
    }
  }
});
```

### Creating New Sidecars
```javascript
const JiraMCPServer = require('./jira-server');
const server = new JiraMCPServer({ port: 3002 });
await server.start();
```

## Tool Naming Conventions

- **Namespaced**: `category.action` (e.g., `sys.ping`, `blob.get`)
- **Consistent Verbs**: get, set, create, update, delete, search, validate
- **Clear Returns**: Always document return shape in tool description
- **Stable APIs**: Tool names and schemas are versioned for stability

## Next Steps

1. **Approve Tool Catalog**: Review and approve the core tool names and signatures
2. **Production Integration**: Replace existing MCP tools with Core Toolbox
3. **Sidecar Development**: Build production-ready Jama and Jira sidecars
4. **Monitoring**: Add health checks and metrics for all tools
5. **Documentation**: Generate API reference cards for each tool category

This framework provides a solid foundation for scalable, maintainable AI tool ecosystems across any interface.