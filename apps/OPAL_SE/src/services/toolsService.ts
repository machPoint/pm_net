/**
 * Tools Service
 * Handles tool management and notifications
 */

import logger from '../logger';
import { sendNotificationToAll } from '../utils/notifications';
import { promises as fs } from 'fs';
import path from 'path';
import mime from 'mime-types';
import { Tool, ToolCallResult, Content } from '../types/mcp';
import { WebSocketServer } from 'ws';

interface ToolDefinition extends Partial<Tool> {
  method?: string;
  path?: string;
  apiIntegrationId?: string;
  _internal?: {
    method?: string;
    path?: string;
    apiIntegrationId?: string;
  };
}

interface Configs {
  tools?: Record<string, Tool>;
  [key: string]: any;
}

/**
 * Add or update a tool in the tools registry
 */
export function updateTool(
  configs: Configs,
  wss: WebSocketServer | null,
  toolName: string,
  toolDefinition: ToolDefinition
): Tool {
  if (!configs.tools) {
    configs.tools = {};
  }
  
  const isNewTool = !configs.tools[toolName];
  
  const mcpTool: Tool = {
    name: toolName,
    description: toolDefinition.description || `Tool: ${toolName}`,
    inputSchema: toolDefinition.inputSchema || {
      type: 'object',
      properties: {}
    }
  };
  
  // Add optional fields
  if (toolDefinition.title) {
    mcpTool.title = toolDefinition.title;
  }
  
  if (toolDefinition.outputSchema) {
    mcpTool.outputSchema = toolDefinition.outputSchema;
  }
  
  // Store internal properties for execution
  (mcpTool as any)._internal = {
    ...(toolDefinition._internal || {}),
    method: toolDefinition.method || toolDefinition._internal?.method || 'GET',
    path: toolDefinition.path || toolDefinition._internal?.path || '/',
    apiIntegrationId: toolDefinition.apiIntegrationId || toolDefinition._internal?.apiIntegrationId
  };
  
  configs.tools[toolName] = mcpTool;
  
  logger.info(`${isNewTool ? 'Added' : 'Updated'} tool: ${toolName}`);
  
  if (wss) {
    sendNotificationToAll(wss, 'notifications/tools/list_changed');
    logger.info('Sent tools/list_changed notification');
  }
  
  return mcpTool;
}

/**
 * Remove a tool from the tools registry
 */
export function removeTool(
  configs: Configs,
  wss: WebSocketServer | null,
  toolName: string
): boolean {
  if (!configs.tools || !configs.tools[toolName]) {
    return false;
  }
  
  delete configs.tools[toolName];
  
  logger.info(`Removed tool: ${toolName}`);
  
  if (wss) {
    sendNotificationToAll(wss, 'notifications/tools/list_changed');
    logger.info('Sent tools/list_changed notification');
  }
  
  return true;
}

/**
 * Format a tool result with different content types
 */
export async function formatToolResult(
  result: any,
  options: { mimeType?: string } = {}
): Promise<ToolCallResult> {
  const content: Content[] = [];
  let isError = false;
  let structuredContent: any = null;
  
  try {
    // Handle error results
    if (result && result.error) {
      return {
        content: [{
          type: 'text',
          text: typeof result.error === 'string' ? result.error : 
                (result.error.message || JSON.stringify(result.error))
        }],
        isError: true
      };
    }
    
    // Check if result already has structuredContent
    if (result && typeof result === 'object' && result.structuredContent !== undefined) {
      structuredContent = result.structuredContent;
      if (result.content) {
        result = result.content;
      }
    }
    
    // Handle different result types
    if (result === null || result === undefined) {
      content.push({
        type: 'text',
        text: 'Operation completed successfully with no result.'
      });
    } else if (typeof result === 'string') {
      content.push({
        type: 'text',
        text: result
      });
    } else if (Buffer.isBuffer(result)) {
      const mimeType = options.mimeType || 'application/octet-stream';
      content.push({
        type: getMcpTypeFromMime(mimeType) as any,
        data: result.toString('base64'),
        mimeType: mimeType
      } as any);
    } else if (typeof result === 'object') {
      if (result.type && ['text', 'image', 'audio', 'resource', 'resource_link'].includes(result.type)) {
        content.push(result);
      } else if (result.filePath && await fileExists(result.filePath)) {
        const filePath = result.filePath;
        const mimeType = result.mimeType || mime.lookup(filePath) || 'application/octet-stream';
        const fileData = await fs.readFile(filePath);
        const mcpType = getMcpTypeFromMime(mimeType);
        
        content.push({
          type: mcpType as any,
          data: fileData.toString('base64'),
          mimeType: mimeType
        } as any);
      } else if (result.uri && result.mimeType) {
        content.push({
          type: 'resource',
          resource: {
            uri: result.uri,
            mimeType: result.mimeType,
            ...(result.text ? { text: result.text } : {}),
            ...(result.blob ? { blob: result.blob } : {})
          }
        } as any);
      } else {
        if (isStructuredData(result)) {
          structuredContent = result;
          content.push({
            type: 'text',
            text: 'Structured data retrieved successfully'
          });
        } else {
          content.push({
            type: 'text',
            text: JSON.stringify(result, null, 2)
          });
        }
      }
    } else {
      content.push({
        type: 'text',
        text: String(result)
      });
    }
  } catch (error: any) {
    logger.error('Error formatting tool result:', error);
    content.push({
      type: 'text',
      text: `Error formatting result: ${error.message}`
    });
    isError = true;
  }
  
  const toolResult: ToolCallResult = {
    content,
    isError
  };
  
  if (structuredContent !== null) {
    toolResult._meta = { structuredOutput: structuredContent };
  }
  
  return toolResult;
}

/**
 * Get MCP content type from MIME type
 */
export function getMcpTypeFromMime(mimeType: string): string {
  if (!mimeType) return 'text';
  
  if (mimeType.startsWith('image/')) {
    return 'image';
  } else if (mimeType.startsWith('audio/')) {
    return 'audio';
  } else if (mimeType.startsWith('text/')) {
    return 'text';
  } else {
    return 'resource';
  }
}

/**
 * Check if a file exists
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if an object looks like structured data
 */
export function isStructuredData(obj: any): boolean {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return false;
  }
  
  const keys = Object.keys(obj);
  if (keys.length === 0) return false;
  
  if (obj.type && ['text', 'image', 'audio', 'resource', 'resource_link'].includes(obj.type)) {
    return false;
  }
  
  const dataPatterns = ['id', 'name', 'value', 'data', 'result', 'items', 'records'];
  const hasDataFields = keys.some(key => 
    dataPatterns.some(pattern => key.toLowerCase().includes(pattern))
  );
  
  return hasDataFields || keys.length > 2;
}

/**
 * Create a resource_link content item
 */
export function createResourceLink(
  uri: string,
  options: {
    name?: string;
    description?: string;
    mimeType?: string;
    annotations?: any;
    audience?: string[];
    priority?: number;
  } = {}
): any {
  const resourceLink: any = {
    type: 'resource_link',
    uri: uri
  };
  
  if (options.name) resourceLink.name = options.name;
  if (options.description) resourceLink.description = options.description;
  if (options.mimeType) resourceLink.mimeType = options.mimeType;
  
  if (options.annotations) {
    resourceLink.annotations = options.annotations;
  } else if (options.audience || options.priority !== undefined) {
    resourceLink.annotations = {};
    if (options.audience) resourceLink.annotations.audience = options.audience;
    if (options.priority !== undefined) resourceLink.annotations.priority = options.priority;
  }
  
  return resourceLink;
}

/**
 * Add metadata annotations to content
 */
export function addContentMetadata(
  contentItem: any,
  metadata: {
    audience?: string | string[];
    priority?: number;
    lastModified?: string;
  } = {}
): any {
  if (!contentItem || typeof contentItem !== 'object') {
    return contentItem;
  }
  
  const _meta: any = {};
  
  if (metadata.audience) {
    _meta.audience = Array.isArray(metadata.audience) ? metadata.audience : [metadata.audience];
  }
  
  if (metadata.priority !== undefined) {
    _meta.priority = Math.max(0, Math.min(1, metadata.priority));
  }
  
  if (metadata.lastModified) {
    _meta.lastModified = metadata.lastModified;
  } else if (Object.keys(_meta).length > 0) {
    _meta.lastModified = new Date().toISOString();
  }
  
  if (Object.keys(_meta).length > 0) {
    contentItem._meta = _meta;
  }
  
  return contentItem;
}
