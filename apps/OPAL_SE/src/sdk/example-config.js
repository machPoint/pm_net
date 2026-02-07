/**
 * Example configuration for connecting to a local OPAL server
 * 
 * This file demonstrates how to configure an application to connect
 * to a local OPAL server running on localhost:3000
 */

// Configuration for a local OPAL server
const opalConfig = {
  // Server connection details
  server: {
    url: 'http://localhost:3000',        // Base URL for HTTP requests
    wsEndpoint: 'ws://localhost:3000/mcp', // WebSocket endpoint for MCP
    apiTokenName: 'x-opal-token'         // Header name for API token
  },
  
  // Authentication options
  auth: {
    // You can either use an API token or username/password
    apiToken: 'your-api-token-here',     // API token (if using token auth)
    
    // Or use username/password (if not using token)
    username: 'admin',                   // Username for login
    password: 'admin123'                 // Password for login
  },
  
  // Application settings
  app: {
    name: 'My OPAL App',                 // Application name
    version: '1.0.0',                    // Application version
    refreshInterval: 60000,              // Data refresh interval (ms)
    maxCacheSize: 100,                   // Maximum number of cached items
    debug: true                          // Enable debug logging
  }
};

// Example usage with the OPAL client SDK
// 
// const client = new OpalClient({
//   serverUrl: opalConfig.server.url,
//   wsEndpoint: opalConfig.server.wsEndpoint,
//   apiToken: opalConfig.auth.apiToken
// });
// 
// client.connect()
//   .then(() => {
//     console.log('Connected to OPAL server');
//     
//     // List memories
//     return client.listMemories({ limit: 10, page: 1 });
//   })
//   .then(result => {
//     console.log('Memories:', result.memories);
//   })
//   .catch(error => {
//     console.error('Error:', error);
//   });

// Export for CommonJS environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = opalConfig;
}

// Export for browser environments
if (typeof window !== 'undefined') {
  window.opalConfig = opalConfig;
}
