/**
 * Example script for creating MCP tools
 * 
 * This script demonstrates how to use the toolCreator utility to add
 * various types of tools to your OPAL server.
 * 
 * To use this script:
 * 1. Require it in your server.js file after server initialization
 * 2. Call the registerExampleTools function with your configs and wss objects
 */

const toolCreator = require('../utils/toolCreator');
const logger = require('../logger');

/**
 * Register example MCP tools
 * 
 * @param {Object} configs - The global configs object
 * @param {WebSocketServer} wss - The WebSocket server instance
 */
function registerExampleTools(configs, wss) {
  logger.info('Registering example MCP tools...');
  
  // 1. Simple text transformation tools
  registerTextTools(configs, wss);
  
  // 2. Data retrieval tools
  registerDataTools(configs, wss);
  
  // 3. Custom advanced tools
  registerAdvancedTools(configs, wss);
  
  logger.info('Example MCP tools registered successfully');
}

/**
 * Register text processing tools
 */
function registerTextTools(configs, wss) {
  // Text to uppercase
  toolCreator.createTextTool(
    configs, 
    wss,
    'text_uppercase',
    'Convert text to uppercase',
    (params) => {
      return { result: params.text.toUpperCase() };
    }
  );
  
  // Text to lowercase
  toolCreator.createTextTool(
    configs, 
    wss,
    'text_lowercase',
    'Convert text to lowercase',
    (params) => {
      return { result: params.text.toLowerCase() };
    }
  );
  
  // Word count
  toolCreator.createTextTool(
    configs, 
    wss,
    'text_word_count',
    'Count words in text',
    (params) => {
      const words = params.text.trim().split(/\s+/).filter(w => w.length > 0);
      return { 
        count: words.length,
        text: params.text
      };
    }
  );
  
  // Text reversal
  toolCreator.createTextTool(
    configs, 
    wss,
    'text_reverse',
    'Reverse the characters in text',
    (params) => {
      return { result: params.text.split('').reverse().join('') };
    }
  );
}

/**
 * Register data retrieval tools - REMOVED weather_get tool
 */
function registerDataTools(configs, wss) {
  
  // User profile tool (simulated)
  toolCreator.createDataTool(
    configs,
    wss,
    'user_get_profile',
    'Get user profile information',
    [
      { name: 'userId', type: 'string', description: 'User ID', required: true }
    ],
    (params) => {
      // Simulated user profiles - in a real tool, you would query a database
      const users = {
        'user1': { name: 'John Doe', email: 'john@example.com', role: 'admin' },
        'user2': { name: 'Jane Smith', email: 'jane@example.com', role: 'user' },
        'default': { name: 'Unknown User', email: 'unknown@example.com', role: 'guest' }
      };
      
      return users[params.userId] || users.default;
    }
  );
}

/**
 * Register advanced custom tools - REMOVED unwanted tools
 * keeping this function for future extensibility
 */
function registerAdvancedTools(configs, wss) {
  // Advanced tools will be implemented in the Core Toolbox
  logger.info('Advanced tools registration placeholder - using Core Toolbox instead');
}

module.exports = registerExampleTools;
