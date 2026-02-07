/**
 * JSON-RPC Utilities
 * Handles JSON-RPC 2.0 message formatting and validation
 */

const { ERROR_CODES } = require('../config/constants');

/**
 * Send a JSON-RPC 2.0 result
 * @param {WebSocket} ws - WebSocket connection
 * @param {string|number|null} id - Request ID
 * @param {any} result - Result data
 */
function sendResult(ws, id, result) {
  if (id === undefined) return; // Don't send result for notifications
  
  const response = {
    jsonrpc: '2.0',
    id,
    result
  };
  
  ws.send(JSON.stringify(response));
}

/**
 * Send a JSON-RPC 2.0 error
 * @param {WebSocket} ws - WebSocket connection
 * @param {string|number|null} id - Request ID
 * @param {number} code - Error code
 * @param {string} message - Error message
 * @param {any} [data] - Additional error data
 */
function sendError(ws, id, code, message, data) {
  const response = {
    jsonrpc: '2.0',
    id, // Can be null for parse errors
    error: {
      code,
      message,
      data
    }
  };
  
  ws.send(JSON.stringify(response));
}

/**
 * Validate a JSON-RPC 2.0 request
 * @param {any} request - Request object to validate
 * @returns {boolean} True if request is valid
 */
function validateRequest(request) {
  return (
    request &&
    request.jsonrpc === '2.0' &&
    typeof request.method === 'string' &&
    (request.id === undefined || // Notification
     typeof request.id === 'string' ||
     typeof request.id === 'number' ||
     request.id === null)
  );
}

/**
 * Create error response helpers
 */
const errors = {
  parseError: (ws, id) => 
    sendError(ws, id, ERROR_CODES.PARSE_ERROR, 'Parse error'),
    
  invalidRequest: (ws, id, details) =>
    sendError(ws, id, ERROR_CODES.INVALID_REQUEST, 'Invalid Request', details),
    
  methodNotFound: (ws, id, method) =>
    sendError(ws, id, ERROR_CODES.METHOD_NOT_FOUND, `Method not found: ${method}`),
    
  invalidParams: (ws, id, details) =>
    sendError(ws, id, ERROR_CODES.INVALID_PARAMS, 'Invalid params', details),
    
  internalError: (ws, id, message) =>
    sendError(ws, id, ERROR_CODES.INTERNAL_ERROR, message),
    
  serverNotInitialized: (ws, id) =>
    sendError(ws, id, ERROR_CODES.SERVER_NOT_INITIALIZED, 'Server Not Initialized')
};

module.exports = {
  sendResult,
  sendError,
  validateRequest,
  errors
};
