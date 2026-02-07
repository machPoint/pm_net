/**
 * MCP Tool Creator Utility
 * 
 * This utility makes it easy to create and register new MCP tools in the OPAL server.
 * It provides a simple interface for defining tools with various input schemas and handlers.
 */

const toolsService = require('../services/toolsService');
const logger = require('../logger').default || require('../logger');

/**
 * Create and register a new MCP tool
 * 
 * @param {Object} configs - The global configs object
 * @param {WebSocketServer} wss - The WebSocket server instance
 * @param {Object} toolDefinition - The tool definition
 * @returns {Object} The created tool
 */
async function createTool(configs, wss, toolDefinition) {
  if (!toolDefinition || !toolDefinition.name) {
    throw new Error('Tool definition must include a name');
  }

  const toolName = toolDefinition.name;
  
  logger.info(`Creating new MCP tool: ${toolName}`);
  
  return toolsService.updateTool(configs, wss, toolName, toolDefinition);
}

/**
 * Create multiple tools at once
 * 
 * @param {Object} configs - The global configs object
 * @param {WebSocketServer} wss - The WebSocket server instance
 * @param {Array<Object>} toolDefinitions - Array of tool definitions
 * @returns {Array<Object>} The created tools
 */
async function createTools(configs, wss, toolDefinitions) {
  if (!Array.isArray(toolDefinitions)) {
    throw new Error('Tool definitions must be an array');
  }
  
  logger.info(`Creating ${toolDefinitions.length} MCP tools`);
  
  return await Promise.all(toolDefinitions.map(def => createTool(configs, wss, def)));
}

/**
 * Create a simple text processing tool
 * 
 * @param {Object} configs - The global configs object
 * @param {WebSocketServer} wss - The WebSocket server instance
 * @param {string} name - The tool name
 * @param {string} description - The tool description
 * @param {Function} processor - Function that takes text input and returns processed output
 * @returns {Object} The created tool
 */
function createTextTool(configs, wss, name, description, processor) {
  const toolDefinition = {
    name,
    description,
    inputSchema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'Text to process'
        }
      },
      required: ['text']
    },
    _internal: {
      method: 'POST',
      path: `/text-tools/${name}`,
      processor
    }
  };
  
  return createTool(configs, wss, toolDefinition);
}

/**
 * Create a data retrieval tool
 * 
 * @param {Object} configs - The global configs object
 * @param {WebSocketServer} wss - The WebSocket server instance
 * @param {string} name - The tool name
 * @param {string} description - The tool description
 * @param {Object} parameters - Parameters for the tool (name, type, description)
 * @param {Function} retriever - Function that retrieves data based on parameters
 * @returns {Object} The created tool
 */
function createDataTool(configs, wss, name, description, parameters, retriever) {
  const properties = {};
  const required = [];
  
  // Build input schema from parameters
  parameters.forEach(param => {
    properties[param.name] = {
      type: param.type || 'string',
      description: param.description || `Parameter: ${param.name}`
    };
    
    if (param.required) {
      required.push(param.name);
    }
  });
  
  const toolDefinition = {
    name,
    description,
    inputSchema: {
      type: 'object',
      properties,
      required
    },
    _internal: {
      method: 'GET',
      path: `/data-tools/${name}`,
      retriever
    }
  };
  
  return createTool(configs, wss, toolDefinition);
}

module.exports = {
  createTool,
  createTools,
  createTextTool,
  createDataTool
};
