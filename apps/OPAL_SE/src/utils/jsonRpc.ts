/**
 * JSON-RPC Utilities
 * Handles JSON-RPC 2.0 message formatting and validation
 */

import { ERROR_CODES } from '../config/constants';
import { WebSocket } from 'ws';

/**
 * Send a JSON-RPC 2.0 result
 */
export function sendResult(ws: WebSocket, id: string | number | null | undefined, result: any): void {
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
 */
export function sendError(
  ws: WebSocket,
  id: string | number | null,
  code: number,
  message: string,
  data?: any
): void {
  const response: any = {
    jsonrpc: '2.0',
    id,
    error: {
      code,
      message
    }
  };
  
  if (data !== undefined) {
    response.error.data = data;
  }
  
  ws.send(JSON.stringify(response));
}

/**
 * Validate a JSON-RPC 2.0 request
 */
export function validateRequest(request: any): boolean {
  return (
    request &&
    request.jsonrpc === '2.0' &&
    typeof request.method === 'string' &&
    (request.id === undefined ||
     typeof request.id === 'string' ||
     typeof request.id === 'number' ||
     request.id === null)
  );
}

/**
 * Create error response helpers
 */
export const errors = {
  parseError: (ws: WebSocket, id: string | number | null) => 
    sendError(ws, id, ERROR_CODES.PARSE_ERROR, 'Parse error'),
    
  invalidRequest: (ws: WebSocket, id: string | number | null, details?: any) =>
    sendError(ws, id, ERROR_CODES.INVALID_REQUEST, 'Invalid Request', details),
    
  methodNotFound: (ws: WebSocket, id: string | number | null, method: string) =>
    sendError(ws, id, ERROR_CODES.METHOD_NOT_FOUND, `Method not found: ${method}`),
    
  invalidParams: (ws: WebSocket, id: string | number | null, details?: any) =>
    sendError(ws, id, ERROR_CODES.INVALID_PARAMS, 'Invalid params', details),
    
  internalError: (ws: WebSocket, id: string | number | null, message: string) =>
    sendError(ws, id, ERROR_CODES.INTERNAL_ERROR, message),
    
  serverNotInitialized: (ws: WebSocket, id: string | number | null) =>
    sendError(ws, id, ERROR_CODES.SERVER_NOT_INITIALIZED, 'Server Not Initialized')
};
