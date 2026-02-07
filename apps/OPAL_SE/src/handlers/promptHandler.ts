/**
 * Prompt Handler
 * Manages prompt-related operations and method handling
 */

import { sendResult } from '../utils/jsonRpc';
import { ApiIntegration } from '../types/config';
import { WebSocket } from 'ws';

interface Prompt {
  id: string;
  name: string;
  description: string;
  template: string;
  metadata: {
    apiId: string;
  };
}

interface Client {
  [key: string]: any;
}

class PromptHandler {
  private prompts: Map<string, Prompt>;

  constructor() {
    this.prompts = new Map();
  }

  /**
   * Initialize prompts based on API integrations
   */
  initializePrompts(apiIntegrations: ApiIntegration[]): void {
    this.prompts.clear();
    
    apiIntegrations.forEach(api => {
      const prompt: Prompt = {
        id: `api-prompt-${api.id}`,
        name: `Use ${api.name} API`,
        description: `Prompt to use the ${api.name} API`,
        template: `You can use the ${api.name} API to access data. The API is available at ${api.baseUrl}.`,
        metadata: {
          apiId: api.id
        }
      };
      
      this.prompts.set(prompt.id, prompt);
    });
  }

  /**
   * Handle prompts/list method
   */
  handleList(_client: Client, ws: WebSocket, id: string | number): void {
    const promptsList = Array.from(this.prompts.values());
    sendResult(ws, id, { prompts: promptsList });
  }

  /**
   * Handle prompts/get method
   */
  handleGet(_client: Client, ws: WebSocket, id: string | number, params: any): void {
    if (!params?.id) {
      throw new Error('Invalid params: id is required');
    }
    
    const prompt = this.prompts.get(params.id);
    if (!prompt) {
      throw new Error(`Prompt not found: ${params.id}`);
    }
    
    sendResult(ws, id, { prompt });
  }

  /**
   * Get all prompts
   */
  getPrompts(): Map<string, Prompt> {
    return this.prompts;
  }

  /**
   * Get a specific prompt
   */
  getPrompt(id: string): Prompt | undefined {
    return this.prompts.get(id);
  }

  /**
   * Add a new prompt
   */
  addPrompt(prompt: Prompt): void {
    if (!prompt.id || !prompt.name || !prompt.template) {
      throw new Error('Invalid prompt: id, name, and template are required');
    }
    
    this.prompts.set(prompt.id, prompt);
  }

  /**
   * Update an existing prompt
   */
  updatePrompt(id: string, updates: Partial<Prompt>): Prompt {
    const prompt = this.prompts.get(id);
    if (!prompt) {
      throw new Error(`Prompt not found: ${id}`);
    }
    
    const updatedPrompt = { ...prompt, ...updates };
    this.prompts.set(id, updatedPrompt);
    return updatedPrompt;
  }
}

export default PromptHandler;
