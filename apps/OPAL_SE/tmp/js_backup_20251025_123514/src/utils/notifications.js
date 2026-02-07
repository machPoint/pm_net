/**
 * Notifications utilities for MCP
 */

/**
 * Send a notification to all connected WebSocket clients
 * 
 * @param {WebSocketServer} wss - The WebSocket server instance
 * @param {string} method - The notification method name
 * @param {Object} params - The notification parameters (optional)
 */
function sendNotificationToAll(wss, method, params = null) {
  if (!wss || !wss.clients) {
    console.error('WebSocket server or clients not available');
    return;
  }
  
  const notification = {
    jsonrpc: '2.0',
    method: method
  };
  
  // Add params if provided
  if (params) {
    notification.params = params;
  }
  
  const notificationString = JSON.stringify(notification);
  
  // Send to all connected clients
  wss.clients.forEach(client => {
    if (client.readyState === 1) { // WebSocket.OPEN
      try {
        client.send(notificationString);
        console.log(`Sent notification: ${method} to client`);
      } catch (error) {
        console.error(`Error sending notification to client: ${error.message}`);
      }
    }
  });
}

/**
 * Send a notification to a specific WebSocket client
 * 
 * @param {WebSocket} ws - The WebSocket client
 * @param {string} method - The notification method name
 * @param {Object} params - The notification parameters (optional)
 */
function sendNotificationToClient(ws, method, params = null) {
  if (!ws || ws.readyState !== 1) { // WebSocket.OPEN
    console.error('WebSocket client not available or not open');
    return;
  }
  
  const notification = {
    jsonrpc: '2.0',
    method: method
  };
  
  // Add params if provided
  if (params) {
    notification.params = params;
  }
  
  try {
    ws.send(JSON.stringify(notification));
    console.log(`Sent notification: ${method} to specific client`);
  } catch (error) {
    console.error(`Error sending notification to client: ${error.message}`);
  }
}

module.exports = {
  sendNotificationToAll,
  sendNotificationToClient
};
