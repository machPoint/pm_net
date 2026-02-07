/**
 * MCP Server Constants
 */

module.exports = {
  // Server configuration
  MCP_PORT: process.env.MCP_PORT || 3001, // Set to 3001 to avoid conflict with Admin UI (port 3000)
  MCP_VERSION: '2025-06-18', // Use the latest spec version
  PROTOCOL_VERSION: '2025-06-18', // Protocol version for MCP

  // JSON-RPC Error Codes
  ERROR_CODES: {
    PARSE_ERROR: -32700,
    INVALID_REQUEST: -32600,
    METHOD_NOT_FOUND: -32601,
    INVALID_PARAMS: -32602,
    INTERNAL_ERROR: -32603,
    SERVER_NOT_INITIALIZED: -32002,
    RESOURCE_NOT_FOUND: -32002
  },

  // Server Info
  SERVER_INFO: {
    name: 'OPALServer',
    version: '1.0.0'
  },

  // Server Capabilities
  SERVER_CAPABILITIES: {
    tools: {
      listChanged: true
    },
    resources: {
      subscribe: true,
      listChanged: true
    },
    prompts: {
      listChanged: true
    }
  },

  // Default Headers
  DEFAULT_HEADERS: {
    "Accept": "application/json",
    "Content-Type": "application/json",
    "User-Agent": "OPAL/1.0"
  },

  // SSE Configuration
  SSE_HEADERS: {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  },

  // CORS Headers
  CORS_HEADERS: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Last-Event-ID',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Expose-Headers': '*'
  },

  // Heartbeat Interval (ms)
  HEARTBEAT_INTERVAL: 3000
};
