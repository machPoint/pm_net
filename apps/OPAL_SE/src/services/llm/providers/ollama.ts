/**
 * Ollama Provider Adapter
 * Adapter for Ollama (local LLM provider)
 */

import logger from '../../../logger';
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
          temperature: params.temperature ?? 0.7,
          num_predict: params.max_tokens
        }
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`Ollama API error: ${response.status}`, errorText);
      throw new Error(`Ollama API error: ${response.status}`);
    }
    
    const data: any = await response.json();
    
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
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeout);
      return response.ok;
    } catch (error) {
      logger.debug(`Ollama not available: ${error}`);
      return false;
    }
  }
  
  async getModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) return [];
      
      const data: any = await response.json();
      return data.models?.map((m: any) => m.name) || [];
    } catch (error) {
      logger.warn(`Failed to get Ollama models: ${error}`);
      return [];
    }
  }
  
  getCost(): number {
    return 0; // Local models are free
  }
}
