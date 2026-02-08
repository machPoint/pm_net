# AI/LLM Architecture for CORE SE

## Current State (As-Is)

### Call Flow Overview
```
Frontend (Next.js)
    ↓ /api/ai/chat
    ↓ /api/ai/discover-relationships
    ↓ /api/ai/search-context
    ↓
Frontend API Routes (Next.js API)
    ↓ Proxy to OPAL_SE
    ↓
OPAL_SE Backend
    ↓ /api/ai/chat
    ↓ /api/ai/analyze
    ↓
Direct OpenAI API Calls
    ↓ https://api.openai.com/v1/chat/completions
    ↓
OpenAI GPT-4o
```

### Current AI Endpoints

#### 1. **Frontend → OPAL_SE Proxies**
- **`/api/ai/chat`** (CORE_UI/frontend/src/app/api/ai/chat/route.ts)
  - Proxies to `OPAL_SE:7788/api/ai/chat`
  - Used by: AIChatPanel component
  
- **`/api/ai/discover-relationships`** (CORE_UI/frontend/src/app/api/ai/discover-relationships/route.ts)
  - Proxies to `OPAL_SE:7788/api/ai/analyze`
  - Used by: RelationshipsSection component
  
- **`/api/ai/search-context`** (implied, used by AIChatPanel)
  - Context search for AI chat

#### 2. **OPAL_SE AI Routes** (OPAL_SE/src/routes/ai-chat.ts)
- **`POST /api/ai/chat`**
  - Context-aware AI chat with system engineering knowledge
  - Gathers system context from database (nodes, edges, events)
  - Calls OpenAI directly with enriched context
  - Model: `gpt-4o` (from env or default)
  
- **`POST /api/ai/analyze`**
  - Custom AI analysis with flexible prompts
  - Used for relationship discovery, impact analysis, etc.
  - Supports JSON response format
  - Calls OpenAI directly

#### 3. **Other AI Services**
- **Memory Service** (OPAL_SE/src/services/memoryService.ts)
  - Uses OpenAI embeddings API (`text-embedding-3-small`)
  - Generates vector embeddings for semantic search
  - Fallback to random embeddings if OpenAI unavailable
  
- **Summarization Service** (OPAL_SE/src/services/summarizationService.js)
  - Summarizes content using OpenAI
  - Supports: headline, paragraph, full summaries
  - Fallback to simple text summarization

### Current Issues

❌ **No Central Hub**
- Each service calls OpenAI directly
- No unified monitoring or logging
- No ability to route different calls to different LLMs

❌ **Hardcoded OpenAI**
- All calls go to `https://api.openai.com/v1/chat/completions`
- No abstraction layer for different providers
- Cannot switch to local LLMs without code changes

❌ **No Call Tracking**
- No centralized logging of AI calls
- No cost tracking per tool/function
- No performance metrics

❌ **No Model Selection**
- All calls use same model (`gpt-4o`)
- Cannot map specific tools to specific models
- No fallback strategy

---

## Future State (To-Be)

### Centralized LLM Gateway Architecture

```
Frontend (Next.js)
    ↓ /api/ai/*
    ↓
OPAL_SE Backend
    ↓ /api/ai/*
    ↓
┌─────────────────────────────────────────┐
│   LLM Gateway Service (NEW)             │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │  Request Router                    │ │
│  │  - Tool → Model mapping            │ │
│  │  - Load balancing                  │ │
│  │  - Fallback logic                  │ │
│  └────────────────────────────────────┘ │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │  Call Monitor & Logger             │ │
│  │  - Track all AI calls              │ │
│  │  - Cost tracking                   │ │
│  │  - Performance metrics             │ │
│  │  - Audit trail                     │ │
│  └────────────────────────────────────┘ │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │  Provider Adapters                 │ │
│  │  - OpenAI adapter                  │ │
│  │  - Ollama adapter (local)          │ │
│  │  - Azure OpenAI adapter            │ │
│  │  - Anthropic adapter               │ │
│  │  - Custom model adapter            │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
    ↓           ↓           ↓
OpenAI      Ollama      Azure OpenAI
(Cloud)     (Local)     (Cloud)
```

### Key Components

#### 1. **LLM Gateway Service**
Central hub for all AI/LLM calls in the system.

**Location**: `OPAL_SE/src/services/llm/gateway.ts`

**Responsibilities**:
- Route requests to appropriate LLM provider
- Monitor and log all AI calls
- Track costs and performance
- Handle fallbacks and retries
- Enforce rate limits and quotas

#### 2. **Tool → Model Mapping**
Configuration that maps specific tools/functions to specific LLMs.

**Location**: `OPAL_SE/src/config/llm-routing.ts`

**Example Configuration**:
```typescript
{
  // High-value, complex analysis → GPT-4
  "ai.chat": { 
    primary: "openai:gpt-4o",
    fallback: "openai:gpt-4o-mini",
    maxTokens: 4000
  },
  "ai.analyze.relationships": {
    primary: "openai:gpt-4o",
    fallback: "azure:gpt-4",
    maxTokens: 2000
  },
  
  // Simple tasks → Local Ollama
  "ai.summarize.headline": {
    primary: "ollama:llama3.1:8b",
    fallback: "openai:gpt-4o-mini",
    maxTokens: 100
  },
  
  // Embeddings → Dedicated service
  "ai.embeddings": {
    primary: "openai:text-embedding-3-small",
    fallback: "ollama:nomic-embed-text",
    dimensions: 1536
  },
  
  // Code generation → Specialized model
  "ai.code.generate": {
    primary: "ollama:codellama:13b",
    fallback: "openai:gpt-4o",
    maxTokens: 8000
  }
}
```

#### 3. **Provider Adapters**
Unified interface for different LLM providers.

**Base Interface**:
```typescript
interface LLMProvider {
  name: string;
  type: 'cloud' | 'local' | 'hybrid';
  
  // Core methods
  chat(params: ChatParams): Promise<ChatResponse>;
  embeddings(params: EmbeddingParams): Promise<EmbeddingResponse>;
  
  // Metadata
  isAvailable(): Promise<boolean>;
  getModels(): Promise<Model[]>;
  getCost(usage: Usage): number;
}
```

**Adapters**:
- `OpenAIAdapter` - Cloud OpenAI API
- `OllamaAdapter` - Local Ollama models
- `AzureOpenAIAdapter` - Azure OpenAI Service
- `AnthropicAdapter` - Claude models
- `CustomAdapter` - Custom/self-hosted models

#### 4. **Call Monitor & Logger**
Tracks all AI calls for monitoring, debugging, and cost analysis.

**Tracked Metrics**:
```typescript
interface AICallLog {
  call_id: string;
  timestamp: string;
  
  // Request info
  tool_name: string;
  function_name: string;
  user_id?: string;
  session_id?: string;
  
  // Routing info
  provider: string;  // "openai", "ollama", etc.
  model: string;     // "gpt-4o", "llama3.1:8b", etc.
  is_fallback: boolean;
  
  // Performance
  duration_ms: number;
  tokens_used: {
    prompt: number;
    completion: number;
    total: number;
  };
  
  // Cost
  cost_usd: number;
  
  // Status
  status: 'success' | 'error' | 'timeout';
  error_message?: string;
}
```

---

## Implementation Plan

### Phase 1: Create LLM Gateway Foundation

#### Step 1.1: Define Core Types
**File**: `OPAL_SE/src/types/llm.ts`

```typescript
export interface LLMProvider {
  name: string;
  type: 'cloud' | 'local' | 'hybrid';
  chat(params: ChatParams): Promise<ChatResponse>;
  embeddings(params: EmbeddingParams): Promise<EmbeddingResponse>;
  isAvailable(): Promise<boolean>;
  getModels(): Promise<Model[]>;
  getCost(usage: Usage): number;
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

export interface ToolModelMapping {
  tool_name: string;
  primary: {
    provider: string;
    model: string;
  };
  fallback?: {
    provider: string;
    model: string;
  };
  config: {
    max_tokens?: number;
    temperature?: number;
    timeout_ms?: number;
  };
}
```

#### Step 1.2: Create OpenAI Adapter
**File**: `OPAL_SE/src/services/llm/providers/openai.ts`

```typescript
import { LLMProvider, ChatParams, ChatResponse } from '../../../types/llm';

export class OpenAIAdapter implements LLMProvider {
  name = 'openai';
  type = 'cloud' as const;
  private apiKey: string;
  private baseUrl = 'https://api.openai.com/v1';
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
  
  async chat(params: ChatParams): Promise<ChatResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: params.model || 'gpt-4o',
        messages: params.messages,
        temperature: params.temperature || 0.7,
        max_tokens: params.max_tokens,
        response_format: params.response_format === 'json_object' 
          ? { type: 'json_object' } 
          : undefined
      })
    });
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }
    
    const data = await response.json();
    return {
      content: data.choices[0].message.content,
      model: data.model,
      usage: data.usage,
      finish_reason: data.choices[0].finish_reason
    };
  }
  
  async isAvailable(): Promise<boolean> {
    return !!this.apiKey && this.apiKey !== 'your-openai-api-key';
  }
  
  getCost(usage: { prompt_tokens: number; completion_tokens: number }): number {
    // GPT-4o pricing (as of 2025)
    const promptCost = (usage.prompt_tokens / 1000) * 0.005;
    const completionCost = (usage.completion_tokens / 1000) * 0.015;
    return promptCost + completionCost;
  }
}
```

#### Step 1.3: Create Ollama Adapter (Local LLM)
**File**: `OPAL_SE/src/services/llm/providers/ollama.ts`

```typescript
import { LLMProvider, ChatParams, ChatResponse } from '../../../types/llm';

export class OllamaAdapter implements LLMProvider {
  name = 'ollama';
  type = 'local' as const;
  private baseUrl: string;
  
  constructor(baseUrl: string = 'http://localhost:11434') {
    this.baseUrl = baseUrl;
  }
  
  async chat(params: ChatParams): Promise<ChatResponse> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: params.model || 'llama3.1:8b',
        messages: params.messages,
        stream: false,
        options: {
          temperature: params.temperature || 0.7,
          num_predict: params.max_tokens
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }
    
    const data = await response.json();
    return {
      content: data.message.content,
      model: data.model,
      usage: {
        prompt_tokens: data.prompt_eval_count || 0,
        completion_tokens: data.eval_count || 0,
        total_tokens: (data.prompt_eval_count || 0) + (data.eval_count || 0)
      },
      finish_reason: 'stop'
    };
  }
  
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }
  
  async getModels(): Promise<string[]> {
    const response = await fetch(`${this.baseUrl}/api/tags`);
    const data = await response.json();
    return data.models.map((m: any) => m.name);
  }
  
  getCost(): number {
    return 0; // Local models are free
  }
}
```

#### Step 1.4: Create LLM Gateway
**File**: `OPAL_SE/src/services/llm/gateway.ts`

```typescript
import logger from '../../logger';
import { LLMProvider, ChatParams, ChatResponse, ToolModelMapping } from '../../types/llm';
import { OpenAIAdapter } from './providers/openai';
import { OllamaAdapter } from './providers/ollama';
import * as auditService from '../auditService';

class LLMGateway {
  private providers: Map<string, LLMProvider> = new Map();
  private routingConfig: Map<string, ToolModelMapping> = new Map();
  
  constructor() {
    this.initializeProviders();
    this.loadRoutingConfig();
  }
  
  private initializeProviders() {
    // OpenAI
    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey && openaiKey !== 'your-openai-api-key') {
      this.providers.set('openai', new OpenAIAdapter(openaiKey));
      logger.info('✅ OpenAI provider initialized');
    }
    
    // Ollama (local)
    const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    this.providers.set('ollama', new OllamaAdapter(ollamaUrl));
    logger.info('✅ Ollama provider initialized');
  }
  
  private loadRoutingConfig() {
    // Load from config file or database
    // For now, hardcoded defaults
    this.routingConfig.set('ai.chat', {
      tool_name: 'ai.chat',
      primary: { provider: 'openai', model: 'gpt-4o' },
      fallback: { provider: 'ollama', model: 'llama3.1:8b' },
      config: { max_tokens: 4000, temperature: 0.7 }
    });
    
    this.routingConfig.set('ai.summarize', {
      tool_name: 'ai.summarize',
      primary: { provider: 'ollama', model: 'llama3.1:8b' },
      fallback: { provider: 'openai', model: 'gpt-4o-mini' },
      config: { max_tokens: 500, temperature: 0.3 }
    });
  }
  
  /**
   * Main entry point for all AI calls
   */
  async chat(toolName: string, params: ChatParams): Promise<ChatResponse> {
    const callId = `llm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    logger.info(`[LLM Gateway] ${callId} - Tool: ${toolName}`);
    
    // Get routing config
    const routing = this.routingConfig.get(toolName) || {
      tool_name: toolName,
      primary: { provider: 'openai', model: 'gpt-4o' },
      config: {}
    };
    
    // Merge config with params
    const finalParams = {
      ...params,
      model: params.model || routing.primary.model,
      max_tokens: params.max_tokens || routing.config.max_tokens,
      temperature: params.temperature ?? routing.config.temperature
    };
    
    // Try primary provider
    try {
      const provider = this.providers.get(routing.primary.provider);
      if (!provider) {
        throw new Error(`Provider ${routing.primary.provider} not available`);
      }
      
      const isAvailable = await provider.isAvailable();
      if (!isAvailable) {
        throw new Error(`Provider ${routing.primary.provider} not available`);
      }
      
      const response = await provider.chat(finalParams);
      const duration = Date.now() - startTime;
      
      // Log successful call
      await this.logCall({
        call_id: callId,
        tool_name: toolName,
        provider: routing.primary.provider,
        model: response.model,
        is_fallback: false,
        duration_ms: duration,
        tokens_used: response.usage,
        cost_usd: provider.getCost(response.usage),
        status: 'success'
      });
      
      logger.info(`[LLM Gateway] ${callId} - Success (${duration}ms, ${response.usage.total_tokens} tokens)`);
      return response;
      
    } catch (primaryError: any) {
      logger.warn(`[LLM Gateway] ${callId} - Primary failed: ${primaryError.message}`);
      
      // Try fallback if configured
      if (routing.fallback) {
        try {
          const fallbackProvider = this.providers.get(routing.fallback.provider);
          if (fallbackProvider) {
            const fallbackParams = { ...finalParams, model: routing.fallback.model };
            const response = await fallbackProvider.chat(fallbackParams);
            const duration = Date.now() - startTime;
            
            await this.logCall({
              call_id: callId,
              tool_name: toolName,
              provider: routing.fallback.provider,
              model: response.model,
              is_fallback: true,
              duration_ms: duration,
              tokens_used: response.usage,
              cost_usd: fallbackProvider.getCost(response.usage),
              status: 'success'
            });
            
            logger.info(`[LLM Gateway] ${callId} - Fallback success (${duration}ms)`);
            return response;
          }
        } catch (fallbackError: any) {
          logger.error(`[LLM Gateway] ${callId} - Fallback failed: ${fallbackError.message}`);
        }
      }
      
      // Both failed
      const duration = Date.now() - startTime;
      await this.logCall({
        call_id: callId,
        tool_name: toolName,
        provider: routing.primary.provider,
        model: routing.primary.model,
        is_fallback: false,
        duration_ms: duration,
        tokens_used: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        cost_usd: 0,
        status: 'error',
        error_message: primaryError.message
      });
      
      throw new Error(`LLM Gateway failed: ${primaryError.message}`);
    }
  }
  
  private async logCall(log: any) {
    try {
      await auditService.logEvent({
        type: 'llm_call',
        action: log.tool_name,
        details: log,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.warn('Failed to log LLM call:', error);
    }
  }
  
  /**
   * Get statistics for monitoring
   */
  async getStats(timeRange: { start: Date; end: Date }) {
    // Query audit logs for LLM calls
    // Return aggregated stats: calls by tool, provider, cost, etc.
    return {
      total_calls: 0,
      total_cost: 0,
      by_tool: {},
      by_provider: {},
      by_model: {}
    };
  }
}

// Export singleton
export const llmGateway = new LLMGateway();
```

### Phase 2: Migrate Existing AI Calls

#### Step 2.1: Update ai-chat.ts
Replace direct OpenAI calls with gateway:

```typescript
// OLD
const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${openaiApiKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ model: 'gpt-4o', messages, ... })
});

// NEW
import { llmGateway } from '../services/llm/gateway';

const response = await llmGateway.chat('ai.chat', {
  messages,
  temperature: 0.7,
  max_tokens: 4000
});
```

#### Step 2.2: Update memoryService.ts
```typescript
// OLD
const response = await openai.embeddings.create({
  model: "text-embedding-3-small",
  input: text
});

// NEW
const response = await llmGateway.embeddings('ai.embeddings', {
  input: text
});
```

#### Step 2.3: Update summarizationService.js
```typescript
// OLD
const response = await axios.post(OPENAI_API_URL, { ... });

// NEW
const response = await llmGateway.chat('ai.summarize', {
  messages: [{ role: 'user', content: prompt }],
  max_tokens: 500
});
```

### Phase 3: Add Monitoring Dashboard

Create admin UI to view:
- Real-time AI call logs
- Cost tracking by tool/provider
- Performance metrics
- Provider health status
- Model usage statistics

**Location**: Admin Settings → "AI/LLM Monitor" tab

---

## Benefits of Centralized Gateway

✅ **Unified Monitoring**
- Single place to see all AI calls
- Cost tracking and budgeting
- Performance analysis

✅ **Flexible Routing**
- Map tools to optimal models
- Use local LLMs for simple tasks
- Cloud LLMs for complex analysis

✅ **Resilience**
- Automatic fallback to backup providers
- Graceful degradation
- Health monitoring

✅ **Cost Optimization**
- Route cheap tasks to local models
- Track spending per tool
- Set budgets and alerts

✅ **Easy Migration**
- Swap providers without code changes
- Test new models easily
- Gradual rollout of local LLMs

✅ **Audit Trail**
- Complete history of AI calls
- Debugging and troubleshooting
- Compliance and governance

---

## Configuration Example

**File**: `OPAL_SE/.env`

```bash
# OpenAI (Cloud)
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o

# Ollama (Local)
OLLAMA_URL=http://localhost:11434
OLLAMA_DEFAULT_MODEL=llama3.1:8b

# Azure OpenAI (Optional)
AZURE_OPENAI_KEY=...
AZURE_OPENAI_ENDPOINT=https://...
AZURE_OPENAI_DEPLOYMENT=gpt-4

# Gateway Config
LLM_GATEWAY_ENABLED=true
LLM_GATEWAY_DEFAULT_PROVIDER=openai
LLM_GATEWAY_FALLBACK_ENABLED=true
LLM_GATEWAY_COST_TRACKING=true
```

**File**: `OPAL_SE/config/llm-routing.json`

```json
{
  "tools": {
    "ai.chat": {
      "primary": { "provider": "openai", "model": "gpt-4o" },
      "fallback": { "provider": "ollama", "model": "llama3.1:8b" },
      "config": { "max_tokens": 4000, "temperature": 0.7 }
    },
    "ai.summarize.headline": {
      "primary": { "provider": "ollama", "model": "llama3.1:8b" },
      "fallback": { "provider": "openai", "model": "gpt-4o-mini" },
      "config": { "max_tokens": 100, "temperature": 0.3 }
    },
    "ai.code.generate": {
      "primary": { "provider": "ollama", "model": "codellama:13b" },
      "fallback": { "provider": "openai", "model": "gpt-4o" },
      "config": { "max_tokens": 8000, "temperature": 0.2 }
    }
  }
}
```

---

## Next Steps

1. ✅ **Document current architecture** (this file)
2. ⏳ **Implement LLM Gateway foundation**
   - Create types and interfaces
   - Build OpenAI adapter
   - Build Ollama adapter
   - Create gateway service
3. ⏳ **Migrate existing AI calls**
   - Update ai-chat.ts
   - Update memoryService.ts
   - Update summarizationService.js
4. ⏳ **Add monitoring dashboard**
   - Create admin UI for LLM stats
   - Add cost tracking
   - Add performance metrics
5. ⏳ **Test with local Ollama**
   - Install Ollama locally
   - Pull models (llama3.1, codellama)
   - Test routing and fallback
6. ⏳ **Production rollout**
   - Gradual migration of tools
   - Monitor costs and performance
   - Optimize routing configuration
