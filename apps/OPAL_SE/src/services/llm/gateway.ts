/**
 * LLM Gateway Service
 * Central hub for all AI/LLM calls with routing, monitoring, and fallback
 */

import logger from '../../logger';
import db from '../../config/database';
import { 
  LLMProvider, 
  ChatParams, 
  ChatResponse, 
  ToolModelMapping,
  LLMCallLog,
  ProviderStatus 
} from '../../types/llm';
import { OpenAIAdapter } from './providers/openai';
import { OllamaAdapter } from './providers/ollama';

class LLMGateway {
  private providers: Map<string, LLMProvider> = new Map();
  private routingConfig: Map<string, ToolModelMapping> = new Map();
  private initialized = false;
  
  async initialize() {
    if (this.initialized) return;
    
    logger.info('[LLM Gateway] Initializing...');
    
    // Initialize providers
    await this.initializeProviders();
    
    // Load routing configuration
    await this.loadRoutingConfig();
    
    this.initialized = true;
    logger.info('[LLM Gateway] Initialized successfully');
  }
  
  private async initializeProviders() {
    // OpenAI Provider
    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey && openaiKey !== 'your-openai-api-key') {
      const openai = new OpenAIAdapter(openaiKey);
      this.providers.set('openai', openai);
      
      const available = await openai.isAvailable();
      logger.info(`[LLM Gateway] OpenAI provider: ${available ? '✅ Available' : '❌ Unavailable'}`);
    } else {
      logger.warn('[LLM Gateway] OpenAI API key not configured');
    }
    
    // Ollama Provider (local)
    const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    const ollama = new OllamaAdapter(ollamaUrl);
    this.providers.set('ollama', ollama);
    
    const available = await ollama.isAvailable();
    logger.info(`[LLM Gateway] Ollama provider: ${available ? '✅ Available' : '❌ Unavailable'}`);
  }
  
  private async loadRoutingConfig() {
    try {
      // Try to load from database
      const configs = await db('llm_routing_config')
        .where('enabled', true)
        .select('*');
      
      for (const config of configs) {
        this.routingConfig.set(config.tool_name, {
          tool_name: config.tool_name,
          description: config.description,
          primary: JSON.parse(config.primary),
          fallback: config.fallback ? JSON.parse(config.fallback) : undefined,
          config: JSON.parse(config.config),
          enabled: config.enabled,
          created_at: config.created_at,
          updated_at: config.updated_at
        });
      }
      
      logger.info(`[LLM Gateway] Loaded ${configs.length} routing configs from database`);
    } catch (error) {
      logger.warn('[LLM Gateway] Database not available, using default routing config');
      this.loadDefaultRoutingConfig();
    }
  }
  
  private loadDefaultRoutingConfig() {
    // Default routing configuration
    const defaults: ToolModelMapping[] = [
      {
        tool_name: 'ai.chat',
        description: 'Context-aware AI chat with system engineering knowledge',
        primary: { provider: 'openai', model: 'gpt-4o' },
        fallback: { provider: 'ollama', model: 'llama3.1:8b' },
        config: { max_tokens: 4000, temperature: 0.7 },
        enabled: true
      },
      {
        tool_name: 'ai.analyze',
        description: 'AI analysis for relationship discovery and impact assessment',
        primary: { provider: 'openai', model: 'gpt-4o' },
        fallback: { provider: 'ollama', model: 'llama3.1:8b' },
        config: { max_tokens: 2000, temperature: 0.7, response_format: 'json_object' },
        enabled: true
      },
      {
        tool_name: 'ai.summarize',
        description: 'Content summarization (headlines, paragraphs, full)',
        primary: { provider: 'ollama', model: 'llama3.1:8b' },
        fallback: { provider: 'openai', model: 'gpt-4o-mini' },
        config: { max_tokens: 500, temperature: 0.3 },
        enabled: true
      },
      {
        tool_name: 'ai.embeddings',
        description: 'Generate vector embeddings for semantic search',
        primary: { provider: 'openai', model: 'text-embedding-3-small' },
        config: {},
        enabled: true
      },
      {
        tool_name: 'ai.code.generate',
        description: 'Generate code snippets and implementations',
        primary: { provider: 'ollama', model: 'codellama:13b' },
        fallback: { provider: 'openai', model: 'gpt-4o' },
        config: { max_tokens: 8000, temperature: 0.2 },
        enabled: true
      }
    ];
    
    for (const config of defaults) {
      this.routingConfig.set(config.tool_name, config);
    }
  }
  
  /**
   * Main entry point for all AI chat calls
   */
  async chat(toolName: string, params: ChatParams): Promise<ChatResponse> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    const callId = `llm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    logger.info(`[LLM Gateway] ${callId} - Tool: ${toolName}`);
    
    // Get routing config
    const routing = this.routingConfig.get(toolName);
    if (!routing) {
      logger.warn(`[LLM Gateway] No routing config for ${toolName}, using default`);
    }
    
    const primaryProvider = routing?.primary.provider || 'openai';
    const primaryModel = routing?.primary.model || 'gpt-4o';
    
    // Merge config with params
    const finalParams: ChatParams = {
      ...params,
      model: params.model || primaryModel,
      max_tokens: params.max_tokens || routing?.config.max_tokens,
      temperature: params.temperature ?? routing?.config.temperature,
      response_format: params.response_format || routing?.config.response_format
    };
    
    // Try primary provider
    try {
      const provider = this.providers.get(primaryProvider);
      if (!provider) {
        throw new Error(`Provider ${primaryProvider} not available`);
      }
      
      const isAvailable = await provider.isAvailable();
      if (!isAvailable) {
        throw new Error(`Provider ${primaryProvider} not available`);
      }
      
      const response = await provider.chat(finalParams);
      const duration = Date.now() - startTime;
      
      // Log successful call
      await this.logCall({
        call_id: callId,
        timestamp: new Date().toISOString(),
        tool_name: toolName,
        provider: primaryProvider,
        model: response.model,
        is_fallback: false,
        duration_ms: duration,
        tokens_used: response.usage,
        cost_usd: provider.getCost(response.usage),
        status: 'success'
      });
      
      logger.info(`[LLM Gateway] ${callId} - Success (${duration}ms, ${response.usage.total_tokens} tokens, $${provider.getCost(response.usage).toFixed(4)})`);
      return response;
      
    } catch (primaryError: any) {
      logger.warn(`[LLM Gateway] ${callId} - Primary failed: ${primaryError.message}`);
      
      // Try fallback if configured
      if (routing?.fallback) {
        try {
          const fallbackProvider = this.providers.get(routing.fallback.provider);
          if (fallbackProvider) {
            const fallbackParams = { ...finalParams, model: routing.fallback.model };
            const response = await fallbackProvider.chat(fallbackParams);
            const duration = Date.now() - startTime;
            
            await this.logCall({
              call_id: callId,
              timestamp: new Date().toISOString(),
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
        timestamp: new Date().toISOString(),
        tool_name: toolName,
        provider: primaryProvider,
        model: primaryModel,
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
  
  private async logCall(log: LLMCallLog) {
    try {
      // Try to save to database
      await db('llm_call_logs').insert({
        call_id: log.call_id,
        timestamp: log.timestamp,
        tool_name: log.tool_name,
        function_name: log.function_name,
        user_id: log.user_id,
        session_id: log.session_id,
        provider: log.provider,
        model: log.model,
        is_fallback: log.is_fallback,
        duration_ms: log.duration_ms,
        prompt_tokens: log.tokens_used.prompt_tokens,
        completion_tokens: log.tokens_used.completion_tokens,
        total_tokens: log.tokens_used.total_tokens,
        cost_usd: log.cost_usd,
        status: log.status,
        error_message: log.error_message
      });
    } catch (error) {
      // If database not available, just log to console
      logger.debug('[LLM Gateway] Call log:', log);
    }
  }
  
  /**
   * Get all routing configurations
   */
  async getRoutingConfigs(): Promise<ToolModelMapping[]> {
    if (!this.initialized) {
      await this.initialize();
    }
    return Array.from(this.routingConfig.values());
  }
  
  /**
   * Update routing configuration
   */
  async updateRoutingConfig(config: ToolModelMapping): Promise<void> {
    try {
      const existing = await db('llm_routing_config')
        .where('tool_name', config.tool_name)
        .first();
      
      const data = {
        tool_name: config.tool_name,
        description: config.description,
        primary: JSON.stringify(config.primary),
        fallback: config.fallback ? JSON.stringify(config.fallback) : null,
        config: JSON.stringify(config.config),
        enabled: config.enabled,
        updated_at: new Date().toISOString()
      };
      
      if (existing) {
        await db('llm_routing_config')
          .where('tool_name', config.tool_name)
          .update(data);
      } else {
        await db('llm_routing_config').insert({
          ...data,
          created_at: new Date().toISOString()
        });
      }
      
      // Update in-memory config
      this.routingConfig.set(config.tool_name, config);
      
      logger.info(`[LLM Gateway] Updated routing config for ${config.tool_name}`);
    } catch (error) {
      logger.error(`[LLM Gateway] Failed to update routing config:`, error);
      throw error;
    }
  }
  
  /**
   * Get provider status
   */
  async getProviderStatus(): Promise<ProviderStatus[]> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    const statuses: ProviderStatus[] = [];
    
    for (const [name, provider] of this.providers.entries()) {
      try {
        const available = await provider.isAvailable();
        const models = provider.getModels ? await provider.getModels() : undefined;
        
        statuses.push({
          name,
          type: provider.type,
          available,
          models,
          last_check: new Date().toISOString()
        });
      } catch (error: any) {
        statuses.push({
          name,
          type: provider.type,
          available: false,
          last_check: new Date().toISOString(),
          error_message: error.message
        });
      }
    }
    
    return statuses;
  }
  
  /**
   * Get call statistics
   */
  async getStats(timeRange?: { start: Date; end: Date }) {
    try {
      const query = db('llm_call_logs').select('*');
      
      if (timeRange) {
        query.whereBetween('timestamp', [
          timeRange.start.toISOString(),
          timeRange.end.toISOString()
        ]);
      }
      
      const logs = await query;
      
      // Aggregate statistics
      const stats = {
        total_calls: logs.length,
        total_cost: logs.reduce((sum, log) => sum + (log.cost_usd || 0), 0),
        total_tokens: logs.reduce((sum, log) => sum + (log.total_tokens || 0), 0),
        by_tool: {} as any,
        by_provider: {} as any,
        by_model: {} as any,
        time_range: timeRange ? {
          start: timeRange.start.toISOString(),
          end: timeRange.end.toISOString()
        } : undefined
      };
      
      // Group by tool
      for (const log of logs) {
        if (!stats.by_tool[log.tool_name]) {
          stats.by_tool[log.tool_name] = {
            calls: 0,
            cost: 0,
            tokens: 0,
            total_duration_ms: 0
          };
        }
        stats.by_tool[log.tool_name].calls++;
        stats.by_tool[log.tool_name].cost += log.cost_usd || 0;
        stats.by_tool[log.tool_name].tokens += log.total_tokens || 0;
        stats.by_tool[log.tool_name].total_duration_ms += log.duration_ms || 0;
      }
      
      // Calculate averages
      for (const tool in stats.by_tool) {
        const toolStats = stats.by_tool[tool];
        toolStats.avg_duration_ms = toolStats.total_duration_ms / toolStats.calls;
        delete toolStats.total_duration_ms;
      }
      
      // Group by provider
      for (const log of logs) {
        if (!stats.by_provider[log.provider]) {
          stats.by_provider[log.provider] = {
            calls: 0,
            cost: 0,
            tokens: 0,
            successes: 0
          };
        }
        stats.by_provider[log.provider].calls++;
        stats.by_provider[log.provider].cost += log.cost_usd || 0;
        stats.by_provider[log.provider].tokens += log.total_tokens || 0;
        if (log.status === 'success') {
          stats.by_provider[log.provider].successes++;
        }
      }
      
      // Calculate success rates
      for (const provider in stats.by_provider) {
        const providerStats = stats.by_provider[provider];
        providerStats.success_rate = providerStats.successes / providerStats.calls;
        delete providerStats.successes;
      }
      
      // Group by model
      for (const log of logs) {
        if (!stats.by_model[log.model]) {
          stats.by_model[log.model] = { calls: 0, cost: 0, tokens: 0 };
        }
        stats.by_model[log.model].calls++;
        stats.by_model[log.model].cost += log.cost_usd || 0;
        stats.by_model[log.model].tokens += log.total_tokens || 0;
      }
      
      return stats;
    } catch (error) {
      logger.error('[LLM Gateway] Failed to get stats:', error);
      return {
        total_calls: 0,
        total_cost: 0,
        total_tokens: 0,
        by_tool: {},
        by_provider: {},
        by_model: {}
      };
    }
  }
}

// Export singleton
export const llmGateway = new LLMGateway();
