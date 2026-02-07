/**
 * LLM Gateway Types
 * Type definitions for the centralized LLM gateway system
 */

// ============================================================================
// Core LLM Types
// ============================================================================

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatParams {
  messages: Message[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
  response_format?: 'text' | 'json_object';
}

export interface ChatResponse {
  content: string;
  model: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  finish_reason: string;
}

export interface EmbeddingParams {
  input: string | string[];
  model?: string;
}

export interface EmbeddingResponse {
  embeddings: number[][];
  model: string;
  usage: {
    total_tokens: number;
  };
}

// ============================================================================
// Provider Interface
// ============================================================================

export interface LLMProvider {
  name: string;
  type: 'cloud' | 'local' | 'hybrid';
  
  // Core methods
  chat(params: ChatParams): Promise<ChatResponse>;
  embeddings?(params: EmbeddingParams): Promise<EmbeddingResponse>;
  
  // Metadata
  isAvailable(): Promise<boolean>;
  getModels?(): Promise<string[]>;
  getCost(usage: { prompt_tokens: number; completion_tokens: number }): number;
}

// ============================================================================
// Routing Configuration
// ============================================================================

export interface ProviderConfig {
  provider: string;  // 'openai', 'ollama', 'azure', etc.
  model: string;     // 'gpt-4o', 'llama3.1:8b', etc.
}

export interface ToolModelMapping {
  tool_name: string;
  description?: string;
  primary: ProviderConfig;
  fallback?: ProviderConfig;
  config: {
    max_tokens?: number;
    temperature?: number;
    timeout_ms?: number;
    response_format?: 'text' | 'json_object';
  };
  enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface LLMRoutingConfig {
  version: string;
  default_provider: string;
  fallback_enabled: boolean;
  tools: Record<string, ToolModelMapping>;
}

// ============================================================================
// Monitoring & Logging
// ============================================================================

export interface LLMCallLog {
  call_id: string;
  timestamp: string;
  
  // Request info
  tool_name: string;
  function_name?: string;
  user_id?: string;
  session_id?: string;
  
  // Routing info
  provider: string;
  model: string;
  is_fallback: boolean;
  
  // Performance
  duration_ms: number;
  tokens_used: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  
  // Cost
  cost_usd: number;
  
  // Status
  status: 'success' | 'error' | 'timeout';
  error_message?: string;
}

export interface LLMStats {
  total_calls: number;
  total_cost: number;
  total_tokens: number;
  by_tool: Record<string, {
    calls: number;
    cost: number;
    tokens: number;
    avg_duration_ms: number;
  }>;
  by_provider: Record<string, {
    calls: number;
    cost: number;
    tokens: number;
    success_rate: number;
  }>;
  by_model: Record<string, {
    calls: number;
    cost: number;
    tokens: number;
  }>;
  time_range: {
    start: string;
    end: string;
  };
}

// ============================================================================
// Provider Status
// ============================================================================

export interface ProviderStatus {
  name: string;
  type: 'cloud' | 'local' | 'hybrid';
  available: boolean;
  models?: string[];
  last_check: string;
  error_message?: string;
}
