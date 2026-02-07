/**
 * Prompts Service
 * Handles prompt management and notifications
 */

const logger = require('../logger');
const { sendNotificationToAll } = require('../utils/notifications');
const crypto = require('crypto');

// In-memory prompts storage (would be replaced with a database in production)
const promptStore = new Map();

/**
 * Generate a unique ID for a prompt
 * 
 * @param {string} name - The name of the prompt
 * @returns {string} The ID for the prompt
 */
function generatePromptId(name) {
  const hash = crypto.createHash('md5').update(`${name}:${Date.now()}`).digest('hex');
  return `${name.replace(/[^a-zA-Z0-9_-]/g, '_')}_${hash.substring(0, 8)}`;
}

/**
 * Add or update a prompt
 * 
 * @param {Object} configs - The global configs object
 * @param {Object} wss - The WebSocket server instance
 * @param {string} id - The ID of the prompt (optional, will be generated if not provided)
 * @param {Object} prompt - The prompt data
 * @returns {Object} The created or updated prompt
 */
function setPrompt(configs, wss, id, prompt) {
  if (!prompt.name) {
    throw new Error('Prompt must have a name');
  }
  
  if (!prompt.messages || !Array.isArray(prompt.messages) || prompt.messages.length === 0) {
    throw new Error('Prompt must have at least one message');
  }
  
  // Generate ID if not provided
  if (!id) {
    id = generatePromptId(prompt.name);
  }
  
  // Check if prompt already exists
  const isNewPrompt = !promptStore.has(id);
  
  // Create the prompt object
  const mcpPrompt = {
    id,
    name: prompt.name,
    description: prompt.description || '',
    messages: prompt.messages,
    argumentSchema: prompt.argumentSchema || null,
    created: isNewPrompt ? new Date().toISOString() : promptStore.get(id).created,
    updated: new Date().toISOString()
  };
  
  // Add optional title field (MCP 2025-06-18)
  if (prompt.title) {
    mcpPrompt.title = prompt.title;
  }
  
  // Store the prompt
  promptStore.set(id, mcpPrompt);
  
  logger.info(`${isNewPrompt ? 'Created' : 'Updated'} prompt: ${id}`);
  
  // Send notification if WebSocket server is available
  if (wss) {
    // Notify all clients about the prompt list change
    sendNotificationToAll(wss, 'notifications/prompts/list_changed');
    logger.info('Sent prompts/list_changed notification');
  }
  
  return mcpPrompt;
}

/**
 * Get a prompt by ID
 * 
 * @param {string} id - The ID of the prompt
 * @param {Object} args - Arguments to apply to the prompt (optional)
 * @returns {Object|null} The prompt or null if not found
 */
function getPrompt(id, args = null) {
  const prompt = promptStore.get(id);
  if (!prompt) {
    return null;
  }
  
  // If no arguments provided, return the prompt as is
  if (!args) {
    return prompt;
  }
  
  // Apply arguments to the prompt
  const processedPrompt = {
    ...prompt,
    messages: applyArgumentsToMessages(prompt.messages, args)
  };
  
  return processedPrompt;
}

/**
 * Apply arguments to prompt messages
 * 
 * @param {Array} messages - The prompt messages
 * @param {Object} args - The arguments to apply
 * @returns {Array} The processed messages
 */
function applyArgumentsToMessages(messages, args) {
  if (!args) {
    return messages;
  }
  
  return messages.map(message => {
    // Process text content
    if (message.content && typeof message.content === 'string') {
      let processedContent = message.content;
      
      // Replace placeholders with argument values
      for (const [key, value] of Object.entries(args)) {
        const placeholder = `{{${key}}}`;
        processedContent = processedContent.replace(new RegExp(placeholder, 'g'), value);
      }
      
      return {
        ...message,
        content: processedContent
      };
    }
    
    // Process array content (e.g., for multi-part messages)
    if (message.content && Array.isArray(message.content)) {
      const processedContent = message.content.map(part => {
        if (part.type === 'text' && part.text) {
          let processedText = part.text;
          
          // Replace placeholders with argument values
          for (const [key, value] of Object.entries(args)) {
            const placeholder = `{{${key}}}`;
            processedText = processedText.replace(new RegExp(placeholder, 'g'), value);
          }
          
          return {
            ...part,
            text: processedText
          };
        }
        
        return part;
      });
      
      return {
        ...message,
        content: processedContent
      };
    }
    
    return message;
  });
}

/**
 * Delete a prompt
 * 
 * @param {Object} configs - The global configs object
 * @param {Object} wss - The WebSocket server instance
 * @param {string} id - The ID of the prompt to delete
 * @returns {boolean} True if the prompt was deleted, false if it didn't exist
 */
function deletePrompt(configs, wss, id) {
  if (!promptStore.has(id)) {
    return false;
  }
  
  // Delete the prompt
  promptStore.delete(id);
  
  logger.info(`Deleted prompt: ${id}`);
  
  // Send notification if WebSocket server is available
  if (wss) {
    // Notify all clients about the prompt list change
    sendNotificationToAll(wss, 'notifications/prompts/list_changed');
    logger.info('Sent prompts/list_changed notification');
  }
  
  return true;
}

/**
 * List all prompts with pagination
 * 
 * @param {function} paginateItems - The pagination function
 * @param {string|null} cursor - The pagination cursor
 * @returns {Object} The paginated prompts
 */
function listPrompts(paginateItems, cursor = null) {
  // Get all prompts as an array
  const prompts = Array.from(promptStore.values());
  
  // Apply pagination
  const { items: paginatedPrompts, nextCursor } = paginateItems(prompts, cursor);
  
  return {
    prompts: paginatedPrompts,
    nextCursor
  };
}

module.exports = {
  setPrompt,
  getPrompt,
  deletePrompt,
  listPrompts,
  generatePromptId
};
