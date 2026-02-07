/**
 * MCP Server Constants
 */

import { ServerConstants } from '../types/config';

export const MCP_PORT = parseInt(process.env.MCP_PORT || '7788', 10);
export const MCP_VERSION = '2025-06-18' as const;
export const PROTOCOL_VERSION = '2025-06-18' as const;

export const ERROR_CODES = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  SERVER_NOT_INITIALIZED: -32002,
  RESOURCE_NOT_FOUND: -32002,
  TOO_MANY_REQUESTS: 429,
} as const;

export const SERVER_INFO = {
  name: 'OPALServer',
  version: '1.0.0',
} as const;

export const SERVER_CAPABILITIES = {
  tools: {
    listChanged: true,
  },
  resources: {
    subscribe: true,
    listChanged: true,
  },
  prompts: {
    listChanged: true,
  },
} as const;

export const DEFAULT_HEADERS = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
  'User-Agent': 'OPAL/1.0',
} as const;

export const SSE_HEADERS = {
  'Content-Type': 'text/event-stream; charset=utf-8',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
  'X-Accel-Buffering': 'no',
} as const;

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Last-Event-ID',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Expose-Headers': '*',
} as const;

export const HEARTBEAT_INTERVAL = 3000;

// Export all as a single object for backward compatibility
const constants: ServerConstants = {
  MCP_PORT,
  MCP_VERSION,
  PROTOCOL_VERSION,
  ERROR_CODES,
  SERVER_INFO,
  SERVER_CAPABILITIES,
  DEFAULT_HEADERS,
  SSE_HEADERS,
  CORS_HEADERS,
  HEARTBEAT_INTERVAL,
};

export default constants;
