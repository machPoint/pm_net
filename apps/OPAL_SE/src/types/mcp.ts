/**
 * MCP Protocol Type Definitions
 * Based on MCP 2025-06-18 specification
 */

// ============================================================================
// JSON-RPC 2.0 Base Types
// ============================================================================

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown> | unknown[];
}

export interface JsonRpcResponse<T = unknown> {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: T;
  error?: JsonRpcError;
}

export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

export interface JsonRpcNotification {
  jsonrpc: '2.0';
  method: string;
  params?: Record<string, unknown>;
}

// ============================================================================
// MCP Protocol Types
// ============================================================================

export interface MCPInitializeParams {
  protocolVersion: string;
  capabilities: ClientCapabilities;
  clientInfo: Implementation;
}

export interface MCPInitializeResult {
  protocolVersion: string;
  capabilities: ServerCapabilities;
  serverInfo: Implementation;
}

export interface Implementation {
  name: string;
  version: string;
}

export interface ClientCapabilities {
  experimental?: Record<string, unknown>;
  roots?: {
    listChanged?: boolean;
  };
  sampling?: Record<string, unknown>;
}

export interface ServerCapabilities {
  experimental?: Record<string, unknown>;
  logging?: Record<string, unknown>;
  prompts?: {
    listChanged?: boolean;
  };
  resources?: {
    subscribe?: boolean;
    listChanged?: boolean;
  };
  tools?: {
    listChanged?: boolean;
  };
}

// ============================================================================
// Tool Types
// ============================================================================

export interface Tool {
  name: string;
  description?: string;
  title?: string;
  inputSchema: {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
    [key: string]: unknown;
  };
  outputSchema?: {
    type: string;
    properties?: Record<string, unknown>;
    [key: string]: unknown;
  };
}

export interface ToolCallParams {
  name: string;
  arguments?: Record<string, unknown>;
}

export interface ToolCallResult {
  content: Content[];
  isError?: boolean;
  _meta?: {
    structuredOutput?: Record<string, unknown>;
  };
}

// ============================================================================
// Resource Types
// ============================================================================

export interface Resource {
  uri: string;
  name: string;
  description?: string;
  title?: string;
  mimeType?: string;
  annotations?: Annotations;
}

export interface ResourceContents {
  uri: string;
  mimeType?: string;
  text?: string;
  blob?: string;
}

export interface ResourceListParams {
  cursor?: string;
}

export interface ResourceReadParams {
  uri: string;
}

// ============================================================================
// Prompt Types
// ============================================================================

export interface Prompt {
  name: string;
  description?: string;
  title?: string;
  arguments?: PromptArgument[];
}

export interface PromptArgument {
  name: string;
  description?: string;
  required?: boolean;
}

export interface PromptGetParams {
  name: string;
  arguments?: Record<string, string>;
}

export interface PromptGetResult {
  description?: string;
  messages: PromptMessage[];
}

export interface PromptMessage {
  role: 'user' | 'assistant';
  content: Content;
}

// ============================================================================
// Content Types
// ============================================================================

export type Content = TextContent | ImageContent | ResourceContent | ResourceLinkContent;

export interface TextContent {
  type: 'text';
  text: string;
  annotations?: Annotations;
}

export interface ImageContent {
  type: 'image';
  data: string;
  mimeType: string;
  annotations?: Annotations;
}

export interface ResourceContent {
  type: 'resource';
  resource: ResourceContents;
  annotations?: Annotations;
}

export interface ResourceLinkContent {
  type: 'resource_link';
  uri: string;
  title?: string;
  description?: string;
  annotations?: Annotations;
}

export interface Annotations {
  audience?: ('user' | 'assistant')[];
  priority?: number;
  timestamp?: string;
  [key: string]: unknown;
}

// ============================================================================
// Pagination Types
// ============================================================================

export interface PaginatedResult<T> {
  data: T[];
  nextCursor?: string;
}

export interface ListToolsResult extends PaginatedResult<Tool> {}
export interface ListResourcesResult extends PaginatedResult<Resource> {}
export interface ListPromptsResult extends PaginatedResult<Prompt> {}

// ============================================================================
// Error Codes
// ============================================================================

export enum MCPErrorCode {
  // Standard JSON-RPC errors
  ParseError = -32700,
  InvalidRequest = -32600,
  MethodNotFound = -32601,
  InvalidParams = -32602,
  InternalError = -32603,
  
  // MCP-specific errors
  ToolNotFound = -32001,
  ResourceNotFound = -32002,
  PromptNotFound = -32003,
  Unauthorized = -32004,
  RateLimitExceeded = -32005,
}
