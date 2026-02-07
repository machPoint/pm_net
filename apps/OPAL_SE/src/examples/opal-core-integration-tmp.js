/**
 * OPAL Core Integration - Register Core Toolbox and Sidecar Manager
 * 
 * This module replaces the old example tools registration with the new
 * OPAL Core Toolbox and Sidecar MCP Connector framework.
 */

const OPALCoreToolbox = require('../core/toolbox');
const SidecarManager = require('../sidecar');
const loggerModule = require('../logger');
const logger = loggerModule.default || loggerModule;

/**
 * Register OPAL Core systems with the server
 * @param {Object} configs - Configuration object
 * @param {Object} wss - WebSocket server instance
 */
async function registerOPALCore(configs, wss) {
  logger.info('Initializing OPAL Core Systems...');

  try {
    // 1. Initialize Core Toolbox
    const coreToolbox = new OPALCoreToolbox(configs, wss);
    await coreToolbox.initialize();
    await coreToolbox.registerAllTools();

    // 2. Initialize Sidecar Manager
    const sidecarManager = new SidecarManager(configs, wss);
    await sidecarManager.initialize();

    // 3. Register demo sidecars
    await registerDemoSidecars(sidecarManager);

    // 4. Store references for later use
    configs._opal = {
      coreToolbox,
      sidecarManager
    };

    logger.info('OPAL Core Systems initialized successfully');

    return {
      coreToolbox,
      sidecarManager,
      stats: {
        coreTools: coreToolbox.tools.size,
        sidecarTools: sidecarManager.tools.size,
        registeredSidecars: sidecarManager.adapters.size
      }
    };

  } catch (error) {
    logger.error('Failed to initialize OPAL Core Systems:', error);
    throw error;
  }
}

/**
 * Register demo sidecars for testing
 * @param {SidecarManager} sidecarManager 
 */
async function registerDemoSidecars(sidecarManager) {
  logger.info('Registering demo sidecar adapters...');

  // Register Jama sidecar (if running on port 3001)
  try {
    await sidecarManager.registerSidecar({
      name: 'jama',
      url: 'http://localhost:3001',
      transport: 'http',
      auth: {
        type: 'bearer',
        vault_refs: {
          token: 'jama_api_token'
        }
      },
      tenant: 'demo',
      scopes: ['artifacts.read', 'artifacts.write', 'projects.read']
    });
  } catch (error) {
    logger.warn('Failed to register Jama sidecar:', error.message);
  }

  // Register Jira sidecar (placeholder - would run on port 3002)
  try {
    await sidecarManager.registerSidecar({
      name: 'jira',
      url: 'http://localhost:3002',
      transport: 'http',
      auth: {
        type: 'bearer',
        vault_refs: {
          token: 'jira_api_token'
        }
      },
      tenant: 'demo',
      scopes: ['issues.read', 'issues.write', 'projects.read']
    });
  } catch (error) {
    logger.warn('Failed to register Jira sidecar:', error.message);
  }
}

/**
 * Get OPAL Core system status
 * @param {Object} configs - Configuration object
 */
function getOPALCoreStatus(configs) {
  if (!configs._opal) {
    return { initialized: false };
  }

  const { coreToolbox, sidecarManager } = configs._opal;

  return {
    initialized: true,
    core_toolbox: coreToolbox.getToolInfo(),
    sidecar_manager: {
      registered_adapters: Array.from(sidecarManager.adapters.keys()),
      management_tools: Array.from(sidecarManager.tools.keys()),
      active_connections: Array.from(sidecarManager.connections.keys())
    },
    timestamp: new Date().toISOString()
  };
}

/**
 * Create a tool to expose OPAL Core status
 * @param {Object} configs 
 * @param {Object} wss 
 */
async function createOPALStatusTool(configs, wss) {
  const toolCreator = require('../utils/toolCreator');
  
  await toolCreator.createTool(configs, wss, {
    name: 'opal.status',
    description: 'Get OPAL Core system status and statistics',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    },
    _internal: {
      method: 'GET',
      path: '/opal/status',
      processor: async (params) => {
        return getOPALCoreStatus(configs);
      }
    }
  });
}

/**
 * Main initialization function
 * @param {Object} configs 
 * @param {Object} wss 
 */
async function initializeOPALCore(configs, wss) {
  // Register core systems
  const result = await registerOPALCore(configs, wss);
  
  // Create status tool
  await createOPALStatusTool(configs, wss);
  
  // Log summary
  logger.info('=== OPAL Core Initialization Complete ===');
  logger.info(`✓ Core Tools: ${result.stats.coreTools}`);
  logger.info(`✓ Sidecar Management Tools: ${result.stats.sidecarTools}`);
  logger.info(`✓ Registered Sidecars: ${result.stats.registeredSidecars}`);
  logger.info('==========================================');

  return result;
}

module.exports = {
  initializeOPALCore,
  registerOPALCore,
  getOPALCoreStatus,
  createOPALStatusTool
};