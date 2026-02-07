/**
 * Configuration Type Definitions
 */

// ============================================================================
// Environment Configuration
// ============================================================================

export interface EnvironmentConfig {
  NODE_ENV: 'development' | 'production' | 'test';
  MCP_PORT: number;
  
  // Database
  DB_FILE?: string;
  DB_HOST?: string;
  DB_PORT?: number;
  DB_USER?: string;
  DB_PASSWORD?: string;
  DB_NAME?: string;
  
  // Authentication
  JWT_SECRET: string;
  JWT_EXPIRY: string;
  
  // MCP
  MACHPOINT_MODE: 'persistent' | 'ephemeral';
  MACHPOINT_EPHEMERAL_TIMEOUT: number;
  
  // API Integrations
  MCP_API_COUNT: number;
  [key: `MCP_API_${number}_NAME`]: string;
  [key: `MCP_API_${number}_BASE_URL`]: string;
  [key: `MCP_API_${number}_AUTH_TYPE`]: string;
  [key: `MCP_API_${number}_AUTH_VALUE`]: string;
}

// ============================================================================
// API Integration Types
// ============================================================================

export interface ApiIntegration {
  id: string;
  name: string;
  baseUrl: string;
  authType: 'bearer_token' | 'api_key' | 'oauth' | 'basic' | 'none';
  authValue: string | null;
  headers?: Record<string, string>;
  timeout?: number;
  endpoints?: ApiEndpoint[];
}

export interface ApiEndpoint {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  description?: string;
}

// ============================================================================
// Logger Configuration
// ============================================================================

export interface LoggerConfig {
  level: 'error' | 'warn' | 'info' | 'debug';
  format: 'json' | 'simple';
  colorize: boolean;
  timestamp: boolean;
  filename?: string;
}

// ============================================================================
// Database Configuration
// ============================================================================

export interface DatabaseConfig {
  client: 'sqlite3' | 'pg';
  connection: {
    filename?: string;
    host?: string;
    port?: number;
    user?: string;
    password?: string;
    database?: string;
  };
  pool?: {
    min: number;
    max: number;
  };
  useNullAsDefault?: boolean;
}

// ============================================================================
// Server Constants
// ============================================================================

export interface ServerConstants {
  MCP_PORT: number;
  MCP_VERSION: string;
  PROTOCOL_VERSION: string;
  ERROR_CODES: {
    PARSE_ERROR: number;
    INVALID_REQUEST: number;
    METHOD_NOT_FOUND: number;
    INVALID_PARAMS: number;
    INTERNAL_ERROR: number;
    SERVER_NOT_INITIALIZED: number;
    RESOURCE_NOT_FOUND: number;
  };
  SERVER_INFO: {
    name: string;
    version: string;
  };
  SERVER_CAPABILITIES: {
    tools: {
      listChanged: boolean;
    };
    resources: {
      subscribe: boolean;
      listChanged: boolean;
    };
    prompts: {
      listChanged: boolean;
    };
  };
  DEFAULT_HEADERS: Record<string, string>;
  SSE_HEADERS: Record<string, string>;
  CORS_HEADERS: Record<string, string>;
  HEARTBEAT_INTERVAL: number;
}
