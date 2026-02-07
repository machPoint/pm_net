/**
 * RPC Methods for the OPAL Server
 * Contains all the WebSocket JSON-RPC method handlers
 */

import { ERROR_CODES } from './config/constants';
import logger from './logger';
import { JSONRPCServer } from 'json-rpc-2.0';
import WebSocket from 'ws';

interface Session {
  user?: {
    id: number;
    role: string;
  };
  [key: string]: any;
}

interface Services {
  toolsService: any;
  resourcesService: any;
  promptsService: any;
  auditService: any;
  getResourceTemplateCompletions: any;
  getResourceTemplateFields: any;
  getPromptArgumentCompletions: any;
  getPromptArguments: any;
  paginateItems: any;
}

/**
 * Register all RPC methods with the server
 * 
 * @param rpcServer - JSON-RPC server instance
 * @param configs - Server configuration
 * @param wss - WebSocket server
 * @param findSessionByWs - Function to find session by WebSocket
 * @param services - Service instances
 */
export function registerRpcMethods(
  rpcServer: JSONRPCServer<any>,
  configs: any,
  wss: WebSocket.Server,
  findSessionByWs: (ws: WebSocket) => Session | undefined,
  services: Services
): void {
  const {
    toolsService,
    resourcesService,
    promptsService,
    auditService,
    getResourceTemplateCompletions,
    getResourceTemplateFields,
    getPromptArgumentCompletions,
    getPromptArguments,
    paginateItems
  } = services;

  // Register methods for tool management
  rpcServer.addMethod('tools/register', async (params: any, serverParams?: any) => {
    const ws = serverParams?.ws;
    if (!ws) {
      throw {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: "WebSocket instance not available"
      };
    }

    const session = findSessionByWs(ws);
    if (!session) {
      throw {
        code: ERROR_CODES.SERVER_NOT_INITIALIZED,
        message: "Session not found"
      };
    }

    // Check if the user is authenticated and has admin privileges
    if (!session.user || session.user.role !== 'admin') {
      throw {
        code: ERROR_CODES.INVALID_REQUEST,
        message: "Admin privileges required to register tools"
      };
    }

    // Validate tool definition
    const { name, definition } = params;
    if (!name || !definition) {
      throw {
        code: ERROR_CODES.INVALID_PARAMS,
        message: "Tool name and definition are required"
      };
    }

    // Register the tool
    try {
      const tool = toolsService.updateTool(configs, wss, name, definition);
      logger.info(`Tool registered: ${name}`);

      // Log the action
      await auditService.logToolExecution(
        session.user.id,
        'tools/register',
        { name, definition },
        { success: true }
      );

      return { tool };
    } catch (error: any) {
      logger.error(`Error registering tool ${name}:`, error);

      // Log the failure
      await auditService.logToolExecution(
        session.user.id,
        'tools/register',
        { name, definition },
        { success: false, error: error.message }
      );

      throw {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: `Error registering tool: ${error.message}`
      };
    }
  });

  // Register method to remove tools
  rpcServer.addMethod('tools/remove', async (params: any, serverParams?: any) => {
    const ws = serverParams?.ws;
    if (!ws) {
      throw {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: "WebSocket instance not available"
      };
    }

    const session = findSessionByWs(ws);
    if (!session) {
      throw {
        code: ERROR_CODES.SERVER_NOT_INITIALIZED,
        message: "Session not found"
      };
    }

    // Check if the user is authenticated and has admin privileges
    if (!session.user || session.user.role !== 'admin') {
      throw {
        code: ERROR_CODES.INVALID_REQUEST,
        message: "Admin privileges required to remove tools"
      };
    }

    // Validate tool name
    const { name } = params;
    if (!name) {
      throw {
        code: ERROR_CODES.INVALID_PARAMS,
        message: "Tool name is required"
      };
    }

    // Remove the tool
    try {
      const removed = toolsService.removeTool(configs, wss, name);
      logger.info(`Tool removed: ${name}`);

      // Log the action
      await auditService.logToolExecution(
        session.user.id,
        'tools/remove',
        { name },
        { success: removed }
      );

      return { success: removed };
    } catch (error: any) {
      logger.error(`Error removing tool ${name}:`, error);

      // Log the failure
      await auditService.logToolExecution(
        session.user.id,
        'tools/remove',
        { name },
        { success: false, error: error.message }
      );

      throw {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: `Error removing tool: ${error.message}`
      };
    }
  });

  // Add other RPC methods here...
  // These will be registered when the server starts
}
