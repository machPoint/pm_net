/**
 * Database Model Type Definitions
 */

// ============================================================================
// User & Authentication Types
// ============================================================================

export interface User {
  id: number;
  username: string;
  password_hash: string;
  role: 'admin' | 'user';
  created_at: Date;
  updated_at: Date;
}

export interface ApiToken {
  id: number;
  token: string;
  user_id: number;
  name: string;
  permissions: string[];
  expires_at: Date | null;
  created_at: Date;
  last_used_at: Date | null;
}

// ============================================================================
// Memory Types
// ============================================================================

export interface Memory {
  id: number;
  user_id: number;
  title: string;
  content: string;
  metadata: Record<string, unknown>;
  embedding: number[] | null;
  created_at: Date;
  updated_at: Date;
}

export interface MemorySearchParams {
  query?: string;
  userId?: number;
  limit?: number;
  offset?: number;
  threshold?: number;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Tool & Execution Types
// ============================================================================

export interface ToolExecution {
  id: number;
  tool_name: string;
  user_id: number | null;
  input_params: Record<string, unknown>;
  output: unknown;
  status: 'success' | 'error';
  error_message: string | null;
  execution_time_ms: number;
  created_at: Date;
}

export interface ToolDefinition {
  id: number;
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
  output_schema: Record<string, unknown> | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

// ============================================================================
// Resource Types
// ============================================================================

export interface ResourceRecord {
  id: number;
  uri: string;
  name: string;
  description: string | null;
  mime_type: string | null;
  content: string | null;
  user_id: number | null;
  created_at: Date;
  updated_at: Date;
}

// ============================================================================
// Prompt Types
// ============================================================================

export interface PromptRecord {
  id: number;
  name: string;
  description: string | null;
  template: string;
  arguments: string[]; // JSON array stored as string
  user_id: number | null;
  created_at: Date;
  updated_at: Date;
}

// ============================================================================
// Audit Log Types
// ============================================================================

export interface AuditLog {
  id: number;
  user_id: number | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: Date;
}

// ============================================================================
// Backup Types
// ============================================================================

export interface Backup {
  id: number;
  filename: string;
  file_path: string;
  size_bytes: number;
  created_by: number | null;
  created_at: Date;
}
