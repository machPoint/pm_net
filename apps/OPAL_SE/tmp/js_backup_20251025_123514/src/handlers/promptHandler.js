/**
 * Prompt Handler
 * Manages prompt-related operations and method handling
 */

const { sendResult } = require('../utils/jsonRpc');

class PromptHandler {
  constructor() {
    this.prompts = new Map();
  }

  /**
   * Initialize prompts based on API integrations
   * @param {Array} apiIntegrations - Available API integrations
   */
  initializePrompts(apiIntegrations) {
    // Clear existing prompts
    this.prompts.clear();
    
    // Create a basic prompt for each API integration
    apiIntegrations.forEach(api => {
      const prompt = {
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
   * @param {Object} client - Client connection info
   * @param {WebSocket} ws - WebSocket connection
   * @param {string|number} id - Request ID
   */
  handleList(client, ws, id) {
    const promptsList = Array.from(this.prompts.values());
    sendResult(ws, id, { prompts: promptsList });
  }

  /**
   * Handle prompts/get method
   * @param {Object} client - Client connection info
   * @param {WebSocket} ws - WebSocket connection
   * @param {string|number} id - Request ID
   * @param {Object} params - Request parameters
   */
  handleGet(client, ws, id, params) {
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
   * @returns {Map} Map of prompts
   */
  getPrompts() {
    return this.prompts;
  }

  /**
   * Get a specific prompt
   * @param {string} id - Prompt ID
   * @returns {Object|undefined} Prompt object if found
   */
  getPrompt(id) {
    return this.prompts.get(id);
  }

  /**
   * Add a new prompt
   * @param {Object} prompt - Prompt object to add
   */
  addPrompt(prompt) {
    if (!prompt.id || !prompt.name || !prompt.template) {
      throw new Error('Invalid prompt: id, name, and template are required');
    }
    
    this.prompts.set(prompt.id, prompt);
  }

  /**
   * Update an existing prompt
   * @param {string} id - Prompt ID
   * @param {Object} updates - Updates to apply
   * @returns {Object} Updated prompt
   */
  updatePrompt(id, updates) {
    const prompt = this.prompts.get(id);
    if (!prompt) {
      throw new Error(`Prompt not found: ${id}`);
    }
    
    const updatedPrompt = { ...prompt, ...updates };
    this.prompts.set(id, updatedPrompt);
    return updatedPrompt;
  }
}

module.exports = PromptHandler;
