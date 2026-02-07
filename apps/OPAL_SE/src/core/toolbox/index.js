/**
 * OPAL Core Toolbox - Base Registry and Tool Management
 * 
 * This module provides the core infrastructure for the OPAL Core Toolbox,
 * managing the registration and lifecycle of cross-interface tools.
 */

const loggerModule = require('../../logger');
const logger = loggerModule.default || loggerModule;

class OPALCoreToolbox {
  constructor(configs, wss) {
    this.configs = configs;
    this.wss = wss;
    this.tools = new Map();
    this.categories = new Map();
    this.initialized = false;
  }

  /**
   * Initialize the core toolbox with all tool categories
   */
  async initialize() {
    if (this.initialized) {
      logger.warn('OPAL Core Toolbox already initialized');
      return;
    }

    logger.info('Initializing OPAL Core Toolbox...');

    try {
      // Load all core tool categories
      await this.loadToolCategory('system', require('./system'));
      await this.loadToolCategory('secrets', require('./secrets'));
      await this.loadToolCategory('http', require('./http'));
      await this.loadToolCategory('transform', require('./transform'));
      await this.loadToolCategory('search', require('./search'));
      await this.loadToolCategory('document', require('./document'));
      await this.loadToolCategory('safety', require('./safety'));

      this.initialized = true;
      logger.info(`OPAL Core Toolbox initialized with ${this.tools.size} tools across ${this.categories.size} categories`);
    } catch (error) {
      logger.error('Failed to initialize OPAL Core Toolbox:', error);
      throw error;
    }
  }

  /**
   * Load a tool category and register its tools
   */
  async loadToolCategory(categoryName, categoryModule) {
    try {
      const tools = await categoryModule.initialize(this.configs, this.wss);
      this.categories.set(categoryName, tools);
      
      // Register individual tools
      for (const [toolName, toolConfig] of tools) {
        this.tools.set(toolName, {
          category: categoryName,
          config: toolConfig,
          registered: false
        });
      }

      logger.info(`Loaded ${tools.size} tools from category: ${categoryName}`);
    } catch (error) {
      logger.error(`Failed to load tool category ${categoryName}:`, error);
      throw error;
    }
  }

  /**
   * Register all tools with the MCP server
   */
  async registerAllTools() {
    if (!this.initialized) {
      throw new Error('Core Toolbox not initialized');
    }

    logger.info('Registering all core tools...');
    let registeredCount = 0;

    for (const [toolName, toolInfo] of this.tools) {
      try {
        await this.registerTool(toolName);
        registeredCount++;
      } catch (error) {
        logger.error(`Failed to register tool ${toolName}:`, error);
      }
    }

    logger.info(`Successfully registered ${registeredCount}/${this.tools.size} core tools`);
  }

  /**
   * Register a specific tool
   */
  async registerTool(toolName) {
    const toolInfo = this.tools.get(toolName);
    if (!toolInfo) {
      throw new Error(`Tool ${toolName} not found`);
    }

    if (toolInfo.registered) {
      logger.debug(`Tool ${toolName} already registered`);
      return;
    }

    // Register with the existing tool creator system
    const toolCreator = require('../../utils/toolCreator');
    await toolCreator.createTool(this.configs, this.wss, toolInfo.config);
    
    toolInfo.registered = true;
    logger.debug(`Registered tool: ${toolName}`);
  }

  /**
   * Get information about all available tools
   */
  getToolInfo() {
    const info = {
      categories: Array.from(this.categories.keys()),
      tools: {},
      stats: {
        totalTools: this.tools.size,
        registeredTools: Array.from(this.tools.values()).filter(t => t.registered).length,
        categories: this.categories.size
      }
    };

    for (const [toolName, toolInfo] of this.tools) {
      info.tools[toolName] = {
        category: toolInfo.category,
        registered: toolInfo.registered,
        description: toolInfo.config.description
      };
    }

    return info;
  }

  /**
   * Get tools by category
   */
  getToolsByCategory(categoryName) {
    const categoryTools = this.categories.get(categoryName);
    if (!categoryTools) {
      return new Map();
    }
    return categoryTools;
  }
}

module.exports = OPALCoreToolbox;