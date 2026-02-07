# OPAL MCP API Documentation

## Overview

This document provides comprehensive documentation for the Model Context Protocol (MCP) API endpoints implemented in the OPAL server. The OPAL server is fully compliant with the latest MCP specification, supporting Tools, Resources, and Prompts APIs.

## Protocol Information

- **Protocol Version**: 1.0
- **Server Name**: OPAL MCP Server
- **Server Version**: 1.0.0

## Authentication

All API endpoints require authentication using an API key. The API key can be provided in one of the following ways:

- For WebSocket connections: As a query parameter `token` in the WebSocket URL
- For HTTP connections: As a Bearer token in the Authorization header

Example:
```
Authorization: Bearer your-api-key-here
```

## Connection Methods

The OPAL MCP server supports two connection methods:

1. **WebSocket**: For real-time communication and notifications
   - Endpoint: `ws://localhost:3000?token=your-api-key`

2. **HTTP**: For standard JSON-RPC requests
   - Endpoint: `http://localhost:3000/mcp`

## Common Request Format

All requests follow the JSON-RPC 2.0 format:

```json
{
  "jsonrpc": "2.0",
  "id": "request-id",
  "method": "method-name",
  "params": {
    // Method-specific parameters
  }
}
```

## Common Response Format

All responses follow the JSON-RPC 2.0 format:

```json
{
  "jsonrpc": "2.0",
  "id": "request-id",
  "result": {
    // Method-specific result
  }
}
```

Or in case of an error:

```json
{
  "jsonrpc": "2.0",
  "id": "request-id",
  "error": {
    "code": error-code,
    "message": "Error message"
  }
}
```

## Error Codes

| Code | Name | Description |
|------|------|-------------|
| -32700 | Parse error | Invalid JSON was received |
| -32600 | Invalid request | The JSON sent is not a valid Request object |
| -32601 | Method not found | The method does not exist / is not available |
| -32602 | Invalid params | Invalid method parameter(s) |
| -32603 | Internal error | Internal JSON-RPC error |
| -32000 | Server error | Generic server error |
| -32001 | Unauthorized | Authentication required |
| -32002 | Server not initialized | Server not initialized |
| -32003 | Rate limit exceeded | Rate limit exceeded |
| -32004 | Not found | Resource not found |

## Session Management

### Initialize

Initializes a session with the server and retrieves server capabilities.

- **Method**: `initialize`
- **Parameters**:
  - `clientInfo` (object): Information about the client
    - `name` (string): Client name
    - `version` (string): Client version

**Example Request**:
```json
{
  "jsonrpc": "2.0",
  "id": "init-1",
  "method": "initialize",
  "params": {
    "clientInfo": {
      "name": "Example Client",
      "version": "1.0.0"
    }
  }
}
```

**Example Response**:
```json
{
  "jsonrpc": "2.0",
  "id": "init-1",
  "result": {
    "protocolVersion": "1.0",
    "serverInfo": {
      "name": "OPAL MCP Server",
      "version": "1.0.0"
    },
    "capabilities": {
      "tools": {
        "listChanged": true
      },
      "resources": {
        "subscribe": true,
        "listChanged": true
      },
      "prompts": {
        "listChanged": true
      }
    },
    "sessionId": "session-id"
  }
}
```

### Ping

Checks if the server is alive.

- **Method**: `ping`
- **Parameters**: None

**Example Request**:
```json
{
  "jsonrpc": "2.0",
  "id": "ping-1",
  "method": "ping",
  "params": {}
}
```

**Example Response**:
```json
{
  "jsonrpc": "2.0",
  "id": "ping-1",
  "result": true
}
```

## Tools API

### List Tools

Lists available tools.

- **Method**: `tools/list`
- **Parameters**:
  - `cursor` (string, optional): Pagination cursor
  - `limit` (number, optional): Maximum number of tools to return

**Example Request**:
```json
{
  "jsonrpc": "2.0",
  "id": "list-tools-1",
  "method": "tools/list",
  "params": {
    "limit": 10
  }
}
```

**Example Response**:
```json
{
  "jsonrpc": "2.0",
  "id": "list-tools-1",
  "result": {
    "tools": [
      {
        "name": "weather",
        "description": "Get current weather information",
        "inputSchema": {
          "type": "object",
          "properties": {
            "location": {
              "type": "string",
              "description": "Location to get weather for"
            }
          },
          "required": ["location"]
        }
      }
    ],
    "nextCursor": "next-page-cursor"
  }
}
```

### Call Tool

Calls a tool with the specified parameters.

- **Method**: `tools/call`
- **Parameters**:
  - `name` (string): Tool name
  - `arguments` (object): Tool arguments

**Example Request**:
```json
{
  "jsonrpc": "2.0",
  "id": "call-tool-1",
  "method": "tools/call",
  "params": {
    "name": "weather",
    "arguments": {
      "location": "New York"
    }
  }
}
```

**Example Response**:
```json
{
  "jsonrpc": "2.0",
  "id": "call-tool-1",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Current weather in New York: 72°F, Sunny"
      }
    ],
    "isError": false
  }
}
```

## Resources API

### List Resources

Lists available resources.

- **Method**: `resources/list`
- **Parameters**:
  - `cursor` (string, optional): Pagination cursor
  - `limit` (number, optional): Maximum number of resources to return
  - `type` (string, optional): Filter by resource type

**Example Request**:
```json
{
  "jsonrpc": "2.0",
  "id": "list-resources-1",
  "method": "resources/list",
  "params": {
    "limit": 10,
    "type": "template"
  }
}
```

**Example Response**:
```json
{
  "jsonrpc": "2.0",
  "id": "list-resources-1",
  "result": {
    "resources": [
      {
        "uri": "weather-template",
        "type": "template",
        "name": "Weather Template",
        "description": "Template for weather information"
      }
    ],
    "nextCursor": "next-page-cursor"
  }
}
```

### Read Resource

Reads a resource by URI.

- **Method**: `resources/read`
- **Parameters**:
  - `uri` (string): Resource URI

**Example Request**:
```json
{
  "jsonrpc": "2.0",
  "id": "read-resource-1",
  "method": "resources/read",
  "params": {
    "uri": "weather-template"
  }
}
```

**Example Response**:
```json
{
  "jsonrpc": "2.0",
  "id": "read-resource-1",
  "result": {
    "content": "...",
    "contentType": "application/json"
  }
}
```

### Set Resource

Sets a resource.

- **Method**: `resources/set`
- **Parameters**:
  - `uri` (string): Resource URI
  - `type` (string): Resource type
  - `name` (string): Resource name
  - `description` (string, optional): Resource description
  - `content` (string): Resource content
  - `contentType` (string): Content MIME type

**Example Request**:
```json
{
  "jsonrpc": "2.0",
  "id": "set-resource-1",
  "method": "resources/set",
  "params": {
    "uri": "weather-template",
    "type": "template",
    "name": "Weather Template",
    "description": "Template for weather information",
    "content": "...",
    "contentType": "application/json"
  }
}
```

**Example Response**:
```json
{
  "jsonrpc": "2.0",
  "id": "set-resource-1",
  "result": {
    "success": true
  }
}
```

### Delete Resource

Deletes a resource.

- **Method**: `resources/delete`
- **Parameters**:
  - `uri` (string): Resource URI

**Example Request**:
```json
{
  "jsonrpc": "2.0",
  "id": "delete-resource-1",
  "method": "resources/delete",
  "params": {
    "uri": "weather-template"
  }
}
```

**Example Response**:
```json
{
  "jsonrpc": "2.0",
  "id": "delete-resource-1",
  "result": {
    "success": true
  }
}
```

### Subscribe to Resource

Subscribes to resource changes.

- **Method**: `resources/subscribe`
- **Parameters**:
  - `uri` (string): Resource URI

**Example Request**:
```json
{
  "jsonrpc": "2.0",
  "id": "subscribe-resource-1",
  "method": "resources/subscribe",
  "params": {
    "uri": "weather-template"
  }
}
```

**Example Response**:
```json
{
  "jsonrpc": "2.0",
  "id": "subscribe-resource-1",
  "result": {
    "success": true
  }
}
```

### Unsubscribe from Resource

Unsubscribes from resource changes.

- **Method**: `resources/unsubscribe`
- **Parameters**:
  - `uri` (string): Resource URI

**Example Request**:
```json
{
  "jsonrpc": "2.0",
  "id": "unsubscribe-resource-1",
  "method": "resources/unsubscribe",
  "params": {
    "uri": "weather-template"
  }
}
```

**Example Response**:
```json
{
  "jsonrpc": "2.0",
  "id": "unsubscribe-resource-1",
  "result": {
    "success": true
  }
}
```

### Resource Template Fields

Gets fields available in a resource template.

- **Method**: `resources/templates/fields`
- **Parameters**:
  - `templateId` (string): Template URI

**Example Request**:
```json
{
  "jsonrpc": "2.0",
  "id": "template-fields-1",
  "method": "resources/templates/fields",
  "params": {
    "templateId": "weather-template"
  }
}
```

**Example Response**:
```json
{
  "jsonrpc": "2.0",
  "id": "template-fields-1",
  "result": {
    "fields": ["location", "units"]
  }
}
```

### Resource Template Completions

Gets completions for a resource template field.

- **Method**: `resources/templates/complete`
- **Parameters**:
  - `templateId` (string): Template URI
  - `field` (string): Field name
  - `prefix` (string, optional): Prefix to filter completions

**Example Request**:
```json
{
  "jsonrpc": "2.0",
  "id": "template-complete-1",
  "method": "resources/templates/complete",
  "params": {
    "templateId": "weather-template",
    "field": "units",
    "prefix": "c"
  }
}
```

**Example Response**:
```json
{
  "jsonrpc": "2.0",
  "id": "template-complete-1",
  "result": {
    "completions": ["celsius"]
  }
}
```

## Prompts API

### List Prompts

Lists available prompts.

- **Method**: `prompts/list`
- **Parameters**:
  - `cursor` (string, optional): Pagination cursor
  - `limit` (number, optional): Maximum number of prompts to return

**Example Request**:
```json
{
  "jsonrpc": "2.0",
  "id": "list-prompts-1",
  "method": "prompts/list",
  "params": {
    "limit": 10
  }
}
```

**Example Response**:
```json
{
  "jsonrpc": "2.0",
  "id": "list-prompts-1",
  "result": {
    "prompts": [
      {
        "id": "weather-prompt",
        "name": "Weather Prompt",
        "description": "Prompt for weather information"
      }
    ],
    "nextCursor": "next-page-cursor"
  }
}
```

### Get Prompt

Gets a prompt by ID.

- **Method**: `prompts/get`
- **Parameters**:
  - `id` (string): Prompt ID
  - `arguments` (object, optional): Prompt arguments

**Example Request**:
```json
{
  "jsonrpc": "2.0",
  "id": "get-prompt-1",
  "method": "prompts/get",
  "params": {
    "id": "weather-prompt",
    "arguments": {
      "location": "New York"
    }
  }
}
```

**Example Response**:
```json
{
  "jsonrpc": "2.0",
  "id": "get-prompt-1",
  "result": {
    "messages": [
      {
        "role": "system",
        "content": [
          {
            "type": "text",
            "text": "You are a weather assistant for New York."
          }
        ]
      }
    ]
  }
}
```

### Set Prompt

Sets a prompt.

- **Method**: `prompts/set`
- **Parameters**:
  - `id` (string): Prompt ID
  - `name` (string): Prompt name
  - `description` (string, optional): Prompt description
  - `messages` (array): Prompt messages
  - `arguments` (array, optional): Prompt arguments

**Example Request**:
```json
{
  "jsonrpc": "2.0",
  "id": "set-prompt-1",
  "method": "prompts/set",
  "params": {
    "id": "weather-prompt",
    "name": "Weather Prompt",
    "description": "Prompt for weather information",
    "messages": [
      {
        "role": "system",
        "content": [
          {
            "type": "text",
            "text": "You are a weather assistant for {{location}}."
          }
        ]
      }
    ],
    "arguments": [
      {
        "name": "location",
        "type": "string",
        "description": "Location for weather information"
      }
    ]
  }
}
```

**Example Response**:
```json
{
  "jsonrpc": "2.0",
  "id": "set-prompt-1",
  "result": {
    "success": true
  }
}
```

### Delete Prompt

Deletes a prompt.

- **Method**: `prompts/delete`
- **Parameters**:
  - `id` (string): Prompt ID

**Example Request**:
```json
{
  "jsonrpc": "2.0",
  "id": "delete-prompt-1",
  "method": "prompts/delete",
  "params": {
    "id": "weather-prompt"
  }
}
```

**Example Response**:
```json
{
  "jsonrpc": "2.0",
  "id": "delete-prompt-1",
  "result": {
    "success": true
  }
}
```

### Prompt Arguments

Gets arguments available in a prompt.

- **Method**: `prompts/arguments`
- **Parameters**:
  - `promptId` (string): Prompt ID

**Example Request**:
```json
{
  "jsonrpc": "2.0",
  "id": "prompt-args-1",
  "method": "prompts/arguments",
  "params": {
    "promptId": "weather-prompt"
  }
}
```

**Example Response**:
```json
{
  "jsonrpc": "2.0",
  "id": "prompt-args-1",
  "result": {
    "arguments": ["location"]
  }
}
```

### Prompt Argument Completions

Gets completions for a prompt argument.

- **Method**: `prompts/complete`
- **Parameters**:
  - `promptId` (string): Prompt ID
  - `argument` (string): Argument name
  - `prefix` (string, optional): Prefix to filter completions

**Example Request**:
```json
{
  "jsonrpc": "2.0",
  "id": "prompt-complete-1",
  "method": "prompts/complete",
  "params": {
    "promptId": "weather-prompt",
    "argument": "location",
    "prefix": "new"
  }
}
```

**Example Response**:
```json
{
  "jsonrpc": "2.0",
  "id": "prompt-complete-1",
  "result": {
    "completions": ["New York", "New Orleans", "New Delhi"]
  }
}
```

## Notifications

The OPAL MCP server supports the following notifications (WebSocket only):

### Tools List Changed

Sent when the list of available tools changes.

```json
{
  "jsonrpc": "2.0",
  "method": "tools/list_changed",
  "params": {}
}
```

### Resources List Changed

Sent when the list of available resources changes.

```json
{
  "jsonrpc": "2.0",
  "method": "resources/list_changed",
  "params": {}
}
```

### Resource Changed

Sent when a subscribed resource changes.

```json
{
  "jsonrpc": "2.0",
  "method": "resources/changed",
  "params": {
    "uri": "resource-uri"
  }
}
```

### Prompts List Changed

Sent when the list of available prompts changes.

```json
{
  "jsonrpc": "2.0",
  "method": "prompts/list_changed",
  "params": {}
}
```

## Rate Limiting

The OPAL MCP server implements rate limiting to prevent abuse. Rate limits are applied per user and per method. When a rate limit is exceeded, the server returns an error with code `-32003` and message `"Rate limit exceeded"`.

Rate limit headers are included in HTTP responses:

- `X-RateLimit-Limit`: Maximum number of requests allowed in the current time window
- `X-RateLimit-Remaining`: Number of requests remaining in the current time window
- `X-RateLimit-Reset`: Time in seconds until the rate limit resets

## Security Considerations

- All API endpoints require authentication
- Sensitive operations require user authentication
- Input validation is implemented to prevent injection attacks
- Rate limiting is implemented to prevent abuse
- Error messages are designed to not leak sensitive information

## Troubleshooting

If you encounter issues with the OPAL MCP server, check the following:

1. Ensure you are using the correct API key
2. Check that the server is running and accessible
3. Verify that your request format is correct
4. Check the server logs for error messages
5. Ensure you have initialized a session before making other requests

For further assistance, please contact the OPAL support team.
