/**
 * Prompts Service
 * Handles prompt management and notifications
 */

import logger from '../logger';
import { sendNotificationToAll } from '../utils/notifications';
import crypto from 'crypto';
import { Prompt, PromptMessage } from '../types/mcp';
import { WebSocketServer } from 'ws';

// In-memory prompts storage
const promptStore = new Map<string, any>();

interface Configs {
  [key: string]: any;
}

/**
 * Generate a unique ID for a prompt
 */
export function generatePromptId(name: string): string {
  const hash = crypto.createHash('md5').update(`${name}:${Date.now()}`).digest('hex');
  return `${name.replace(/[^a-zA-Z0-9_-]/g, '_')}_${hash.substring(0, 8)}`;
}

/**
 * Add or update a prompt
 */
export function setPrompt(
  configs: Configs,
  wss: WebSocketServer | null,
  id: string | null,
  prompt: {
    name: string;
    description?: string;
    title?: string;
    messages: PromptMessage[];
    argumentSchema?: any;
  }
): any {
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
  
  const isNewPrompt = !promptStore.has(id);
  
  const mcpPrompt: any = {
    id,
    name: prompt.name,
    description: prompt.description || '',
    messages: prompt.messages,
    argumentSchema: prompt.argumentSchema || null,
    created: isNewPrompt ? new Date().toISOString() : promptStore.get(id).created,
    updated: new Date().toISOString()
  };
  
  if (prompt.title) {
    mcpPrompt.title = prompt.title;
  }
  
  promptStore.set(id, mcpPrompt);
  
  logger.info(`${isNewPrompt ? 'Created' : 'Updated'} prompt: ${id}`);
  
  if (wss) {
    sendNotificationToAll(wss, 'notifications/prompts/list_changed');
    logger.info('Sent prompts/list_changed notification');
  }
  
  return mcpPrompt;
}

/**
 * Get a prompt by ID
 */
export function getPrompt(id: string, args: Record<string, string> | null = null): any | null {
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
 */
function applyArgumentsToMessages(
  messages: PromptMessage[],
  args: Record<string, string>
): PromptMessage[] {
  if (!args) {
    return messages;
  }
  
  return messages.map(message => {
    // Process text content
    if (message.content && typeof message.content === 'string') {
      let processedContent: string = message.content as string;
      
      // Replace placeholders with argument values
      for (const [key, value] of Object.entries(args)) {
        const placeholder = `{{${key}}}`;
        processedContent = processedContent.replace(new RegExp(placeholder, 'g'), value as string);
      }
      
      return {
        ...message,
        content: processedContent
      };
    }
    
    // Process array content (e.g., for multi-part messages)
    if (message.content && typeof message.content === 'object') {
      const content = message.content as any;
      if (content.type === 'text' && content.text) {
        let processedText = content.text;
        
        // Replace placeholders with argument values
        for (const [key, value] of Object.entries(args)) {
          const placeholder = `{{${key}}}`;
          processedText = processedText.replace(new RegExp(placeholder, 'g'), value);
        }
        
        return {
          ...message,
          content: {
            ...content,
            text: processedText
          }
        };
      }
    }
    
    return message;
  });
}

/**
 * Delete a prompt
 */
export function deletePrompt(
  configs: Configs,
  wss: WebSocketServer | null,
  id: string
): boolean {
  if (!promptStore.has(id)) {
    return false;
  }
  
  promptStore.delete(id);
  
  logger.info(`Deleted prompt: ${id}`);
  
  if (wss) {
    sendNotificationToAll(wss, 'notifications/prompts/list_changed');
    logger.info('Sent prompts/list_changed notification');
  }
  
  return true;
}

/**
 * List all prompts with pagination
 */
export function listPrompts(
  paginateItems: (items: any[], cursor: string | null) => { items: any[]; nextCursor: string | null },
  cursor: string | null = null
): { prompts: any[]; nextCursor: string | null } {
  const prompts = Array.from(promptStore.values());
  
  const { items: paginatedPrompts, nextCursor } = paginateItems(prompts, cursor);
  
  return {
    prompts: paginatedPrompts,
    nextCursor
  };
}
