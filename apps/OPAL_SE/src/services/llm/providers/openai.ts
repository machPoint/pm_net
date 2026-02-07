/**
 * OpenAI Provider Adapter
 * Adapter for OpenAI API (cloud-based LLM provider)
 */

import logger from '../../../logger';
import { LLMProvider, ChatParams, ChatResponse, EmbeddingParams, EmbeddingResponse } from '../../../types/llm';

export class OpenAIAdapter implements LLMProvider {
  name = 'openai';
  type = 'cloud' as const;
  private apiKey: string;
  private baseUrl = 'https://api.openai.com/v1';
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
  
  async chat(params: ChatParams): Promise<ChatResponse> {
    const requestBody: any = {
      model: params.model || 'gpt-4o',
      messages: params.messages,
      temperature: params.temperature ?? 0.7,
      max_tokens: params.max_tokens
    };
    
    if (params.response_format === 'json_object') {
      requestBody.response_format = { type: 'json_object' };
    }
    
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`OpenAI API error: ${response.status}`, errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText.substring(0, 200)}`);
    }
    
    const data = await response.json();
    
    return {
      content: data.choices[0].message.content,
      model: data.model,
      usage: {
        prompt_tokens: data.usage.prompt_tokens,
        completion_tokens: data.usage.completion_tokens,
        total_tokens: data.usage.total_tokens
      },
      finish_reason: data.choices[0].finish_reason
    };
  }
  
  async embeddings(params: EmbeddingParams): Promise<EmbeddingResponse> {
    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: params.model || 'text-embedding-3-small',
        input: params.input,
        encoding_format: 'float'
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI Embeddings API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      embeddings: data.data.map((item: any) => item.embedding),
      model: data.model,
      usage: {
        total_tokens: data.usage.total_tokens
      }
    };
  }
  
  async isAvailable(): Promise<boolean> {
    return !!this.apiKey && this.apiKey !== 'your-openai-api-key' && this.apiKey.startsWith('sk-');
  }
  
  async getModels(): Promise<string[]> {
    // Return commonly used models
    return [
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4-turbo',
      'gpt-3.5-turbo',
      'text-embedding-3-small',
      'text-embedding-3-large'
    ];
  }
  
  getCost(usage: { prompt_tokens: number; completion_tokens: number }): number {
    // GPT-4o pricing (as of 2025)
    // Input: $5 per 1M tokens, Output: $15 per 1M tokens
    const promptCost = (usage.prompt_tokens / 1_000_000) * 5.0;
    const completionCost = (usage.completion_tokens / 1_000_000) * 15.0;
    return promptCost + completionCost;
  }
}
