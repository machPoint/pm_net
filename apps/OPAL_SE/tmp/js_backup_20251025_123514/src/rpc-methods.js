/**
 * RPC Methods for the OPAL Server
 * Contains all the WebSocket JSON-RPC method handlers
 */

const { ERROR_CODES } = require('./config/constants');
const logger = require('./logger');

/**
 * Register all RPC methods with the server
 * 
 * @param {Object} rpcServer - JSON-RPC server instance
 * @param {Object} configs - Server configuration
 * @param {Object} wss - WebSocket server
 * @param {Function} findSessionByWs - Function to find session by WebSocket
 * @param {Object} services - Service instances
 */
function registerRpcMethods(rpcServer, configs, wss, findSessionByWs, services) {
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
    rpcServer.addMethod('tools/register', async (params, serverParams) => {
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
        } catch (error) {
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
    rpcServer.addMethod('tools/remove', async (params, serverParams) => {
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
        } catch (error) {
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

module.exports = {
    registerRpcMethods
};
