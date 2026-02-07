/**
 * Tools Service
 * Handles tool management and notifications
 */

const logger = require('../logger');
const { sendNotificationToAll } = require('../utils/notifications');
const fs = require('fs').promises;
const path = require('path');
const mime = require('mime-types');

/**
 * Add or update a tool in the tools registry
 * 
 * @param {Object} configs - The global configs object
 * @param {WebSocketServer} wss - The WebSocket server instance
 * @param {String} toolName - The name of the tool
 * @param {Object} toolDefinition - The tool definition object
 * @returns {Object} The updated tool
 */
function updateTool(configs, wss, toolName, toolDefinition) {
  if (!configs.tools) {
    configs.tools = {};
  }
  
  // Check if tool already exists
  const isNewTool = !configs.tools[toolName];
  
  // Ensure the tool has the required MCP properties
  const mcpTool = {
    name: toolName,
    description: toolDefinition.description || `Tool: ${toolName}`,
    inputSchema: toolDefinition.inputSchema || {
      type: 'object',
      properties: {}
    },
    // Store internal properties for execution
    _internal: {
      ...(toolDefinition._internal || {}),
      method: toolDefinition.method || toolDefinition._internal?.method || 'GET',
      path: toolDefinition.path || toolDefinition._internal?.path || '/',
      apiIntegrationId: toolDefinition.apiIntegrationId || toolDefinition._internal?.apiIntegrationId
    }
  };
  
  // Add optional title field (MCP 2025-06-18)
  if (toolDefinition.title) {
    mcpTool.title = toolDefinition.title;
  }
  
  // Add optional outputSchema field (MCP 2025-06-18)
  if (toolDefinition.outputSchema) {
    mcpTool.outputSchema = toolDefinition.outputSchema;
  }
  
  // Add or update the tool
  configs.tools[toolName] = mcpTool;
  
  logger.info(`${isNewTool ? 'Added' : 'Updated'} tool: ${toolName}`);
  
  // Send notification if WebSocket server is available
  if (wss) {
    sendNotificationToAll(wss, 'notifications/tools/list_changed');
    logger.info('Sent tools/list_changed notification');
  }
  
  return mcpTool;
}

/**
 * Remove a tool from the tools registry
 * 
 * @param {Object} configs - The global configs object
 * @param {WebSocketServer} wss - The WebSocket server instance
 * @param {String} toolName - The name of the tool to remove
 * @returns {Boolean} True if the tool was removed, false if it didn't exist
 */
function removeTool(configs, wss, toolName) {
  if (!configs.tools || !configs.tools[toolName]) {
    return false;
  }
  
  // Remove the tool
  delete configs.tools[toolName];
  
  logger.info(`Removed tool: ${toolName}`);
  
  // Send notification if WebSocket server is available
  if (wss) {
    sendNotificationToAll(wss, 'notifications/tools/list_changed');
    logger.info('Sent tools/list_changed notification');
  }
  
  return true;
}

/**
 * Format a tool result with different content types
 * 
 * @param {any} result - The result data from the tool execution
 * @param {Object} options - Options for formatting
 * @returns {Object} MCP-compliant tool result object
 */
async function formatToolResult(result, options = {}) {
  const content = [];
  let isError = false;
  let structuredContent = null;
  
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
    
    // Check if result already has structuredContent (MCP 2025-06-18)
    if (result && typeof result === 'object' && result.structuredContent !== undefined) {
      structuredContent = result.structuredContent;
      // If result has both content and structuredContent, use the content
      if (result.content) {
        result = result.content;
      }
    }
    
    // Handle different result types
    if (result === null || result === undefined) {
      // Handle null/undefined
      content.push({
        type: 'text',
        text: 'Operation completed successfully with no result.'
      });
    } else if (typeof result === 'string') {
      // Handle string result
      content.push({
        type: 'text',
        text: result
      });
    } else if (Buffer.isBuffer(result)) {
      // Handle binary data
      const mimeType = options.mimeType || 'application/octet-stream';
      content.push({
        type: getMcpTypeFromMime(mimeType),
        data: result.toString('base64'),
        mimeType: mimeType
      });
    } else if (typeof result === 'object') {
      // Handle special content types
      if (result.type && ['text', 'image', 'audio', 'resource', 'resource_link'].includes(result.type)) {
        // Already in MCP format (including resource_link from 2025-06-18)
        content.push(result);
      } else if (result.filePath && await fileExists(result.filePath)) {
        // Handle file reference
        const filePath = result.filePath;
        const mimeType = result.mimeType || mime.lookup(filePath) || 'application/octet-stream';
        const fileData = await fs.readFile(filePath);
        const mcpType = getMcpTypeFromMime(mimeType);
        
        content.push({
          type: mcpType,
          data: fileData.toString('base64'),
          mimeType: mimeType
        });
      } else if (result.uri && result.mimeType) {
        // Handle resource reference
        content.push({
          type: 'resource',
          resource: {
            uri: result.uri,
            mimeType: result.mimeType,
            ...(result.text ? { text: result.text } : {}),
            ...(result.blob ? { blob: result.blob } : {})
          }
        });
      } else {
        // Handle regular object - try to extract structured data
        // If it looks like structured data (has common data fields), use it
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
      // Handle other types (number, boolean, etc.)
      content.push({
        type: 'text',
        text: String(result)
      });
    }
  } catch (error) {
    logger.error('Error formatting tool result:', error);
    content.push({
      type: 'text',
      text: `Error formatting result: ${error.message}`
    });
    isError = true;
  }
  
  // Build result object with optional structuredContent
  const toolResult = {
    content,
    isError
  };
  
  // Add structuredContent if present (MCP 2025-06-18)
  if (structuredContent !== null) {
    toolResult.structuredContent = structuredContent;
  }
  
  return toolResult;
}

/**
 * Get MCP content type from MIME type
 * 
 * @param {string} mimeType - The MIME type
 * @returns {string} The corresponding MCP content type
 */
function getMcpTypeFromMime(mimeType) {
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
 * 
 * @param {string} filePath - Path to the file
 * @returns {Promise<boolean>} True if the file exists
 */
async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if an object looks like structured data
 * 
 * @param {any} obj - The object to check
 * @returns {boolean} True if the object appears to be structured data
 */
function isStructuredData(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return false;
  }
  
  // Check if it has common data field patterns
  const keys = Object.keys(obj);
  if (keys.length === 0) return false;
  
  // Exclude objects that are clearly MCP content types
  if (obj.type && ['text', 'image', 'audio', 'resource', 'resource_link'].includes(obj.type)) {
    return false;
  }
  
  // If it has data-like fields, consider it structured
  const dataPatterns = ['id', 'name', 'value', 'data', 'result', 'items', 'records'];
  const hasDataFields = keys.some(key => 
    dataPatterns.some(pattern => key.toLowerCase().includes(pattern))
  );
  
  return hasDataFields || keys.length > 2;
}

/**
 * Create a resource_link content item (MCP 2025-06-18)
 * 
 * @param {string} uri - The URI of the resource
 * @param {Object} options - Additional options
 * @returns {Object} Resource link content item
 */
function createResourceLink(uri, options = {}) {
  const resourceLink = {
    type: 'resource_link',
    uri: uri
  };
  
  // Add optional fields
  if (options.name) resourceLink.name = options.name;
  if (options.description) resourceLink.description = options.description;
  if (options.mimeType) resourceLink.mimeType = options.mimeType;
  
  // Add annotations if provided (MCP 2025-06-18)
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
 * Add metadata annotations to content (MCP 2025-06-18)
 * 
 * @param {Object} contentItem - The content item to annotate
 * @param {Object} metadata - Metadata to add
 * @returns {Object} Content item with _meta field
 */
function addContentMetadata(contentItem, metadata = {}) {
  if (!contentItem || typeof contentItem !== 'object') {
    return contentItem;
  }
  
  const _meta = {};
  
  // Add audience (user, assistant)
  if (metadata.audience) {
    _meta.audience = Array.isArray(metadata.audience) ? metadata.audience : [metadata.audience];
  }
  
  // Add priority (0.0 to 1.0)
  if (metadata.priority !== undefined) {
    _meta.priority = Math.max(0, Math.min(1, metadata.priority));
  }
  
  // Add lastModified timestamp
  if (metadata.lastModified) {
    _meta.lastModified = metadata.lastModified;
  } else if (Object.keys(_meta).length > 0) {
    _meta.lastModified = new Date().toISOString();
  }
  
  // Only add _meta if we have metadata
  if (Object.keys(_meta).length > 0) {
    contentItem._meta = _meta;
  }
  
  return contentItem;
}

module.exports = {
  updateTool,
  removeTool,
  formatToolResult,
  getMcpTypeFromMime,
  isStructuredData,
  createResourceLink,
  addContentMetadata
};
