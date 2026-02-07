/**
 * Notifications utilities for MCP
 */

import { WebSocketServer, WebSocket } from 'ws';

/**
 * Send a notification to all connected WebSocket clients
 */
export function sendNotificationToAll(
  wss: WebSocketServer,
  method: string,
  params: any = null
): void {
  if (!wss || !wss.clients) {
    console.error('WebSocket server or clients not available');
    return;
  }
  
  const notification: any = {
    jsonrpc: '2.0',
    method: method
  };
  
  if (params) {
    notification.params = params;
  }
  
  const notificationString = JSON.stringify(notification);
  
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(notificationString);
        console.log(`Sent notification: ${method} to client`);
      } catch (error: any) {
        console.error(`Error sending notification to client: ${error.message}`);
      }
    }
  });
}

/**
 * Send a notification to a specific WebSocket client
 */
export function sendNotificationToClient(
  ws: WebSocket,
  method: string,
  params: any = null
): void {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.error('WebSocket client not available or not open');
    return;
  }
  
  const notification: any = {
    jsonrpc: '2.0',
    method: method
  };
  
  if (params) {
    notification.params = params;
  }
  
  try {
    ws.send(JSON.stringify(notification));
    console.log(`Sent notification: ${method} to specific client`);
  } catch (error: any) {
    console.error(`Error sending notification to client: ${error.message}`);
  }
}
