/**
 * OPAL Server
 * Implementation of the Model Context Protocol (March 2025 Specification)
 */

// Load environment variables
require('dotenv').config();

// Initialize database connection
const db = require('./config/database');
const { safelyCloseDatabase } = require('./config/database-shutdown');

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { JSONRPCServer } = require('json-rpc-2.0');
const constants = require('./config/constants');
const { MCP_VERSION, PROTOCOL_VERSION, SERVER_INFO, HEARTBEAT_INTERVAL, ERROR_CODES } = require('./config/constants');
const opalConfig = require('./config/opalConfig'); // Import OPAL configuration

// Server Port from environment or constants
const MCP_PORT = process.env.MCP_PORT || constants.MCP_PORT; // Ensure constants object is used if MCP_PORT is there

// Load handlers and utilities
const logger = require('./logger');
const { loadApiIntegrationsFromEnv } = require('./config/apiConfig');
const { executeApiTool } = require('./services/apiService'); // Corrected path
const { summarizeContent } = require('./services/summarizationService'); // Add summarization service
const memoryService = require('./services/memoryService'); // Memory service for Phase 2
const authService = require('./services/authService'); // Auth service for Phase 2
const auditService = require('./services/auditService'); // Audit service for Phase 2
const backupService = require('./services/backupService'); // Backup service for Phase 2
const appInterfaceService = require('./services/appInterfaceService'); // App interface service for Phase 2.10
const toolsService = require('./services/toolsService'); // Tools service for MCP compliance
const resourcesService = require('./services/resourcesService'); // Resources service for MCP compliance
const promptsService = require('./services/promptsService'); // Prompts service for MCP compliance
const { validateAndSanitize } = require('./utils/validation');
const { applyRateLimit } = require('./utils/rateLimit');
const { 
  getResourceTemplateCompletions, 
  getResourceTemplateFields,
  getPromptArgumentCompletions,
  getPromptArguments
} = require('./utils/completion'); // Completion utilities
const { paginateItems } = require('./utils/pagination'); // Pagination utility

// Load API integrations and tools
const configs = loadApiIntegrationsFromEnv();

// Ensure we have at least one API integration for our tools
if (configs.apiIntegrations.length === 0) {
  logger.info('No API integrations found, adding default MCP integration');
  configs.apiIntegrations.push({
    id: 'mcp',
    name: 'MCP Core',
    baseUrl: 'http://localhost:3000',
    authType: 'none',
    authValue: null,
    endpoints: []
  });
}

// Add summarization tool to the tools list
const summarizationToolId = 'summarizeContent';
const summarizationTool = {
  name: 'summarizeContent',
  description: 'Summarize content using AI',
  inputSchema: {
    type: 'object',
    properties: {
      content: {
        type: 'string',
        description: 'Content to summarize'
      },
      type: {
        type: 'string',
        description: 'Type of summary (headline, paragraph, full)',
        enum: ['headline', 'paragraph', 'full'],
        default: 'headline'
      }
    },
    required: ['content']
  },
  // Internal properties for execution (not part of MCP schema)
  _internal: {
    method: 'POST',
    path: '/summarize',
    apiIntegrationId: configs.apiIntegrations[0].id
  }
};

// Add the summarization tool to the configs using the toolsService
configs.tools = configs.tools || {};
// We'll add the tool properly when the WebSocket server is initialized

logger.info('Loaded API integrations and tools', {
  apiIntegrationCount: configs.apiIntegrations.length,
  toolCount: Object.keys(configs.tools).length
});
logger.info('Registered summarization tool: ' + summarizationToolId);

// --- Server Setup ---
const app = express();
const httpServer = http.createServer(app); // Single HTTP server instance
const wss = new WebSocket.Server({ server: httpServer }); // Attach WS server

// Create the JSON-RPC server
const rpcServer = new JSONRPCServer();

// --- Global State ---
const sessions = new Map(); // WebSocket session state: Map<sessionId, SessionState>

// Initialize tools with the WebSocket server for notifications
// Add the summarization tool
toolsService.updateTool(configs, wss, summarizationToolId, summarizationTool);
logger.info(`Registered summarization tool: ${summarizationToolId} with notification support`);

// Import RPC methods registration function
const { registerRpcMethods } = require('./rpc-methods');

// Register RPC methods
registerRpcMethods(rpcServer, configs, wss, findSessionByWs, {
  toolsService,
  resourcesService,
  promptsService,
  auditService,
  getResourceTemplateCompletions,
  getResourceTemplateFields,
  getPromptArgumentCompletions,
  getPromptArguments,
  paginateItems
});

// --- Express Middleware ---
// CORS Middleware (Simple Example)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Accept, Mcp-Session-Id, Authorization, X-API-Token');
  res.header('Access-Control-Expose-Headers', 'Mcp-Session-Id');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// JSON Body Parsing Middleware
app.use(express.json());

// Load routes
const apiRoutes = require('./routes/index');
const adminRoutes = require('./routes/admin');

// Use routes
app.use('/api', apiRoutes);
app.use('/admin', adminRoutes);

// Setup complete
// Static files middleware for the root path
app.use(express.static(path.join(__dirname, 'public')));

// --- HTTP Route Handlers ---

// Simple health check / info page
app.get('/', (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('OPAL Server is running.');
});

// Factory function for the MCP POST handler middleware
const createMcpPostHandler = (configs) => {
  return async (req, res, next) => {
    logger.info('[MCP HTTP] Incoming POST /mcp request');
    const requestData = req.body; // Thanks to express.json() middleware
    console.log(`[MCP HTTP] Request body: ${JSON.stringify(requestData).substring(0, 200)}...`);
    
    // Check if this is a batch request
    const isBatch = Array.isArray(requestData);
    const requests = isBatch ? requestData : [requestData];
    
    // Check if this contains any JSON-RPC requests (vs. only notifications/responses)
    const hasRequests = requests.some(req => req.id !== undefined && req.method !== undefined);
    
    // Get the session ID from the header if present
    const sessionId = req.headers['mcp-session-id'];
    
    // Check Accept header to determine if client supports SSE
    const acceptHeader = req.headers['accept'] || '';
    const clientSupportsSSE = acceptHeader.includes('text/event-stream');
    const clientSupportsJSON = acceptHeader.includes('application/json');
    
    // If neither supported content type is accepted, return 406 Not Acceptable
    if (!clientSupportsSSE && !clientSupportsJSON) {
      return res.status(406).send('Not Acceptable: Client must accept application/json or text/event-stream');
    }

    try {
      // If only notifications or responses, return 202 Accepted with no body
      if (!hasRequests) {
        return res.status(202).end();
      }
      
      // Process each request and collect results
      const results = [];
      
      for (const request of requests) {
        const { jsonrpc, method, params, id } = request;

        if (jsonrpc !== '2.0') {
          // Use error constants
          throw { code: ERROR_CODES.INVALID_REQUEST, message: 'Invalid JSON-RPC version', id: id || null };
        }

        // Skip processing for notifications (no id)
        if (id === undefined) {
          continue;
        }

        let resultData;

        switch (method) {
          case 'initialize':
            console.log(`[MCP HTTP] Session ${id || '(no id)'} received initialize`);
            
            // Generate a new session ID for initialization requests
            const newSessionId = uuidv4();
            
            // Respond with server info, protocol version, and capabilities
            resultData = { 
              protocolVersion: PROTOCOL_VERSION, 
              serverInfo: SERVER_INFO,
              capabilities: constants.SERVER_CAPABILITIES
            };
            
            // Set the session ID header for the response
            res.setHeader('Mcp-Session-Id', newSessionId);
            console.log(`[MCP HTTP] Generated new session ID: ${newSessionId}`);
            break;
          case 'ping':
            console.log(`[MCP HTTP] Received ping request (ID: ${id})`);
            resultData = {}; // Success response is enough for pong
            break;
          case 'shutdown':
             console.log(`[MCP HTTP] Received shutdown request (ID: ${id})`);
             resultData = {}; // Acknowledge shutdown
             break;
          case 'listTools':
          case 'getTools':
            console.log(`[MCP HTTP] Received ${method} request (ID: ${id})`);
            // Get cursor from params if available
            const toolCursor = params?.cursor || null;
            
            // Get the full list of tools
            const httpToolList = Object.values(configs.tools || {});
            
            // Apply pagination
            const { items: paginatedHttpTools, nextCursor: toolNextCursor } = paginateItems(httpToolList, toolCursor);
            
            console.log(`[MCP HTTP] Returning ${paginatedHttpTools.length} tools with details (page cursor: ${toolCursor || 'initial'})`);
            
            resultData = { 
                tools: paginatedHttpTools,
                nextCursor: toolNextCursor
            };
            break;
          case 'listResources':
          case 'getResources':
            console.log(`[MCP HTTP] Received ${method} request (ID: ${id})`);
            // Get cursor from params if available
            const resourceCursor = params?.cursor || null;
            
            // Get paginated resources
            const { resources: paginatedResources, nextCursor: resourceNextCursor } = resourcesService.listResources(paginateItems, resourceCursor);
            
            console.log(`[MCP HTTP] Returning ${paginatedResources.length} resources with details (page cursor: ${resourceCursor || 'initial'})`);
            
            resultData = { 
                resources: paginatedResources,
                nextCursor: resourceNextCursor
            };
            break;
          case 'listPrompts':
          case 'getPrompts':
            console.log(`[MCP HTTP] Received ${method} request (ID: ${id})`);
            // Get cursor from params if available
            const promptCursor = params?.cursor || null;
            
            // Get paginated prompts
            const { prompts: paginatedPrompts, nextCursor: promptNextCursor } = promptsService.listPrompts(paginateItems, promptCursor);
            
            console.log(`[MCP HTTP] Returning ${paginatedPrompts.length} prompts with details (page cursor: ${promptCursor || 'initial'})`);
            
            resultData = { 
                prompts: paginatedPrompts,
                nextCursor: promptNextCursor
            };
            break;
          case 'tools/call': // MCP compliant method name
          case 'CallTool': // Add case for CallTool
          case 'runTool': { // Keep runTool for compatibility if needed
            // Extract parameters based on method name
            let toolName, toolArgs;
            
            if (method === 'tools/call') {
              toolName = params?.name;
              toolArgs = params?.arguments || {};
            } else {
              toolName = params?.toolName;
              toolArgs = params?.arguments ?? params?.params ?? {}; // Accept 'arguments' or 'params'
            }
            
            logger.info(`[MCP HTTP] ${method} invoked for tool: ${toolName}`);
            
            // Define validation schema for tools/call
            const validationSchema = {
              required: ['name'],
              types: {
                name: 'string',
                arguments: 'object'
              }
            };
            
            // Create a properly formatted params object for validation
            const validationParams = {
              name: toolName,
              arguments: toolArgs
            };
            
            // Validate and sanitize parameters
            try {
              const validatedParams = validateAndSanitize(validationParams, validationSchema, method);
              toolName = validatedParams.name;
              toolArgs = validatedParams.arguments || {};
            } catch (validationError) {
              logger.warn(`[MCP HTTP] Validation error in ${method}:`, validationError);
              throw validationError;
            }
            
            // Apply rate limiting
            try {
              const userId = req.user?.id || 'anonymous';
              const rateLimitHeaders = applyRateLimit(userId, method, 'default');
              
              // Add rate limit headers to the response
              for (const [header, value] of Object.entries(rateLimitHeaders)) {
                res.setHeader(header, value);
              }
            } catch (rateLimitError) {
              logger.warn(`[MCP HTTP] Rate limit exceeded for ${method}:`, rateLimitError);
              throw rateLimitError;
            }
            
            // Check if the tool exists
            if (!configs.tools[toolName]) {
              throw { 
                code: ERROR_CODES.NOT_FOUND, 
                message: `Tool not found: ${toolName}` 
              };
            }
            
            // Execute the tool
            try {
              // Get the tool definition
              const tool = configs.tools[toolName];
              
              // Execute the tool
              let result;
              
              if (toolName === summarizationToolId) {
                // Special handling for summarization tool
                result = await summarizeContent(toolArgs.content, toolArgs.type);
              } else if (tool._internal) {
                // Execute API tool
                result = await executeApiTool(configs, toolName, toolArgs);
              } else {
                throw { 
                  code: ERROR_CODES.INTERNAL_ERROR, 
                  message: `Cannot execute tool: ${toolName}` 
                };
              }
              
              // Format the result according to MCP spec
              resultData = {
                content: Array.isArray(result) ? result : [result],
                isError: false
              };
              
              // Log the action
              if (req.user) {
                await auditService.logToolExecution(
                  req.user.id,
                  method,
                  { name: toolName, arguments: toolArgs },
                  { success: true }
                );
              }
            } catch (error) {
              logger.error(`[MCP HTTP] Error executing tool ${toolName}:`, error);
              
              // Log the failure
              if (req.user) {
                await auditService.logToolExecution(
                  req.user.id,
                  method,
                  { name: toolName, arguments: toolArgs },
                  { success: false, error: error.message }
                );
              }
              
              // Format error according to MCP spec
              resultData = {
                content: [{
                  type: 'text',
                  text: `Error executing tool ${toolName}: ${error.message || 'Unknown error'}`
                }],
                isError: true
              };
            }
            break;
          }
          // Add other HTTP method handlers here
          default:
             // Use error constants
            throw { code: ERROR_CODES.METHOD_NOT_FOUND, message: `Method not found: ${method}`, id: id };
        }

        // Add the result to the results array
        results.push({
          jsonrpc: '2.0',
          id,
          result: resultData
        });
      }

      // Return the results
      if (isBatch) {
        res.json(results);
      } else {
        res.json(results[0]);
      }
    } catch (error) {
      logger.error('[MCP HTTP] Error processing request:', error);
      
      // Format the error response according to JSON-RPC 2.0
      const errorResponse = {
        jsonrpc: '2.0',
        id: error.id || null,
        error: {
          code: error.code || ERROR_CODES.INTERNAL_ERROR,
          message: error.message || 'Internal server error'
        }
      };
      
      // Return the error response
      res.status(200).json(errorResponse);
    }
  };
};

// MCP endpoint
app.post('/mcp', createMcpPostHandler(configs));

// --- WebSocket Connection Handling ---
wss.on('connection', (ws, req) => {
  // Parse token from query string
  const url = new URL(req.url, `http://${req.headers.host}`);
  const token = url.searchParams.get('token');
  
  // Generate a unique session ID
  const sessionId = uuidv4();
  
  // Create a new session
  const session = {
    id: sessionId,
    ws,
    user: null, // Will be set after authentication
    initialized: false,
    lastActivity: Date.now()
  };
  
  // Add the session to the sessions map
  sessions.set(sessionId, session);
  
  logger.info(`[MCP WS] New connection established, session ID: ${sessionId}`);
  
  // Authenticate the user based on the token
  if (token) {
    authService.getUserByToken(token)
      .then(user => {
        if (user) {
          session.user = user;
          logger.info(`[MCP WS] User authenticated: ${user.id}`);
        } else {
          logger.warn(`[MCP WS] Invalid token: ${token}`);
        }
      })
      .catch(error => {
        logger.error(`[MCP WS] Error authenticating user:`, error);
      });
  }
  
  // Handle incoming messages
  ws.on('message', async (message) => {
    try {
      // Update last activity timestamp
      session.lastActivity = Date.now();
      
      // Parse the message
      const data = JSON.parse(message);
      
      // Check if this is a batch request
      const isBatch = Array.isArray(data);
      const requests = isBatch ? data : [data];
      
      // Process each request
      const results = [];
      
      for (const request of requests) {
        // Skip processing for notifications (no id)
        if (request.id === undefined) {
          continue;
        }
        
        // Process the request with the JSON-RPC server
        const result = await rpcServer.receive({
          ...request,
          serverParams: { ws, session }
        });
        
        // Add the result to the results array if it's not null
        // (null means it was a notification)
        if (result !== null) {
          results.push(result);
        }
      }
      
      // Send the results back to the client
      if (results.length > 0) {
        if (isBatch) {
          ws.send(JSON.stringify(results));
        } else {
          ws.send(JSON.stringify(results[0]));
        }
      }
    } catch (error) {
      logger.error('[MCP WS] Error processing message:', error);
      
      // Format the error response according to JSON-RPC 2.0
      const errorResponse = {
        jsonrpc: '2.0',
        id: null,
        error: {
          code: ERROR_CODES.PARSE_ERROR,
          message: 'Parse error'
        }
      };
      
      // Send the error response
      ws.send(JSON.stringify(errorResponse));
    }
  });
  
  // Handle connection close
  ws.on('close', () => {
    logger.info(`[MCP WS] Connection closed, session ID: ${sessionId}`);
    
    // Remove the session from the sessions map
    sessions.delete(sessionId);
  });
  
  // Handle connection errors
  ws.on('error', (error) => {
    logger.error(`[MCP WS] Connection error, session ID: ${sessionId}:`, error);
  });
  
  // Set up ping/pong for keeping the connection alive
  const pingInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    }
  }, HEARTBEAT_INTERVAL);
  
  // Clear the ping interval when the connection is closed
  ws.on('close', () => {
    clearInterval(pingInterval);
  });
});

// Helper function to find a session by WebSocket
function findSessionByWs(ws) {
  for (const [id, session] of sessions.entries()) {
    if (session.ws === ws) {
      return session;
    }
  }
  return null;
}

// --- Server Startup ---
httpServer.listen(MCP_PORT, () => {
  logger.info(`OPAL Server is running on port ${MCP_PORT}`);
  logger.info(`MCP Protocol Version: ${MCP_VERSION}`);
  logger.info(`Server Info: ${JSON.stringify(SERVER_INFO)}`);
  logger.info(`Server Capabilities: ${JSON.stringify(constants.SERVER_CAPABILITIES)}`);
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down OPAL server...');
  
  // Close the HTTP server
  httpServer.close(() => {
    logger.info('HTTP server closed');
  });
  
  // Close all WebSocket connections
  wss.clients.forEach(client => {
    client.terminate();
  });
  
  // Close the database connection
  try {
    await safelyCloseDatabase();
    logger.info('Database connection closed');
  } catch (error) {
    logger.error('Error closing database connection:', error);
  }
  
  logger.info('OPAL server shutdown complete');
  process.exit(0);
});

// Export for testing
module.exports = {
  app,
  httpServer,
  wss,
  configs
};
