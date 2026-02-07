/**
 * OPAL Client SDK
 * A lightweight JavaScript client for interacting with the OPAL server
 */

class OpalClient {
  /**
   * Create a new OPAL client
   * @param {Object} options - Configuration options
   * @param {string} options.serverUrl - OPAL server URL (default: http://localhost:3000)
   * @param {string} options.wsEndpoint - WebSocket endpoint (default: ws://localhost:3000/mcp)
   * @param {string} options.apiToken - API token for authentication
   */
  constructor(options = {}) {
    this.serverUrl = options.serverUrl || 'http://localhost:3000';
    this.wsEndpoint = options.wsEndpoint || `ws://localhost:3000/mcp`;
    this.apiToken = options.apiToken;
    this.ws = null;
    this.connected = false;
    this.requestId = 1;
    this.pendingRequests = new Map();
    this.onOpenCallbacks = [];
    this.onCloseCallbacks = [];
    this.onErrorCallbacks = [];
  }

  /**
   * Connect to the OPAL server
   * @param {Object} options - Connection options
   * @param {boolean} options.retry - Whether to retry connection on failure
   * @param {number} options.maxRetries - Maximum number of retry attempts
   * @returns {Promise<void>} - Resolves when connected
   */
  connect(options = {}) {
    const { retry = true, maxRetries = 3 } = options;
    this.connectAttempts = 0;
    this.maxRetries = maxRetries;
    this.shouldRetry = retry;
    
    return this._attemptConnection();
  }
  
  /**
   * Internal method to attempt connection
   * @private
   * @returns {Promise<void>} - Resolves when connected
   */
  _attemptConnection() {
    return new Promise((resolve, reject) => {
      if (this.connected) {
        resolve();
        return;
      }
      
      this.connectAttempts++;
      console.log(`Connection attempt ${this.connectAttempts}/${this.maxRetries || 'unlimited'}`);

      try {
        // Create WebSocket connection
        const url = new URL(this.wsEndpoint);
        
        // Add API token to query parameters if provided
        if (this.apiToken) {
          // Use 'token' parameter for WebSocket authentication
          url.searchParams.append('token', this.apiToken);
          
          // Log that we're using the token for authentication
          console.log('Using API token for authentication');
        } else {
          console.warn('No API token provided. Authentication may fail for protected resources.');
        }
        
        this.ws = new WebSocket(url.toString());
        
        // Set up event handlers
        this.ws.onopen = () => {
          console.log('Connected to OPAL server');
          this.connected = true;
          
          // Add a small delay before initialization to ensure the connection is stable
          setTimeout(() => {
            // Initialize the connection
            this.callMethod('initialize', {
              client_info: {
                name: 'OPAL SDK Client',
                version: '1.0.0'
              }
            }).then((result) => {
              // Store user information if available
              if (result && result.user) {
                this.user = result.user;
                console.log(`Authenticated as user: ${this.user.username}`);
              }
              
              // Notify callbacks
              try {
                this.onOpenCallbacks.forEach(callback => {
                  try {
                    callback();
                  } catch (callbackError) {
                    console.error('Error in onOpen callback:', callbackError);
                  }
                });
              } catch (callbacksError) {
                console.error('Error notifying onOpen callbacks:', callbacksError);
              }
              
              resolve();
            }).catch((error) => {
              // Handle authentication errors
              if (error.message && error.message.includes('Authentication')) {
                console.error('Authentication error during initialization:', error.message);
                // Close the connection if it's still open
                if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                  this.ws.close();
                }
                reject(new Error(`Authentication failed: ${error.message}. Please provide a valid API token.`));
              } else {
                console.error('Error during initialization:', error);
                if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                  // Don't close the connection for non-authentication errors
                  // Just log the error and continue
                  console.warn('Continuing despite initialization error');
                  
                  // Notify callbacks with error protection
                  try {
                    this.onOpenCallbacks.forEach(callback => {
                      try {
                        callback();
                      } catch (callbackError) {
                        console.error('Error in onOpen callback:', callbackError);
                      }
                    });
                  } catch (callbacksError) {
                    console.error('Error notifying onOpen callbacks:', callbacksError);
                  }
                  
                  resolve();
                } else {
                  reject(error);
                }
              }
            });
          }, 100); // Small delay to ensure connection stability
        };
        
        this.ws.onclose = (event) => {
          console.log(`Disconnected from OPAL server: ${event.code} ${event.reason}`);
          this.connected = false;
          this.pendingRequests.clear();
          
          // If the connection was closed due to authentication issues, reject the connection promise
          if (!this.connected && (event.code === 4001 || event.code === 4002 || event.code === 4003)) {
            let errorMessage = 'Authentication failed';
            
            if (event.code === 4001) {
              errorMessage = 'Authentication required. Please provide a valid API token.';
            } else if (event.code === 4003) {
              errorMessage = 'Invalid or expired API token. Please generate a new token from the OPAL Admin Panel.';
            }
            
            reject(new Error(errorMessage));
          } else if (event.code === 1006) {
            // Code 1006 is an abnormal closure (server crashed, network issues, etc.)
            console.warn('Abnormal WebSocket closure (1006). This may indicate server issues or network problems.');
            
            // Attempt to reconnect if we should retry and haven't exceeded max retries
            if (this.shouldRetry && (this.maxRetries === undefined || this.connectAttempts < this.maxRetries)) {
              console.log(`Attempting to reconnect (${this.connectAttempts}/${this.maxRetries || 'unlimited'})...`);
              
              // Wait a bit before reconnecting (exponential backoff)
              const delay = Math.min(1000 * Math.pow(1.5, this.connectAttempts - 1), 10000);
              
              setTimeout(() => {
                this._attemptConnection()
                  .then(resolve)
                  .catch(reject);
              }, delay);
              return;
            } else if (this.connectAttempts >= this.maxRetries) {
              reject(new Error(`Failed to connect after ${this.maxRetries} attempts. Please check your network connection and server status.`));
            }
          }
          
          // Notify callbacks
          this.onCloseCallbacks.forEach(callback => callback(event));
        };
        
        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          
          // Notify callbacks
          this.onErrorCallbacks.forEach(callback => callback(error));
          
          // Reject the connection promise if not yet resolved
          if (!this.connected) {
            reject(error);
          }
        };
        
        this.ws.onmessage = (event) => {
          try {
            // Ensure we have data to parse
            if (!event || !event.data) {
              console.warn('Received empty WebSocket message');
              return;
            }
            
            // Try to parse the message as JSON
            let response;
            try {
              response = JSON.parse(event.data);
            } catch (parseError) {
              console.error('Failed to parse WebSocket message:', parseError, '\nRaw message:', event.data);
              return;
            }
            
            // Handle response
            if (response.id && this.pendingRequests.has(response.id)) {
              const { resolve, reject } = this.pendingRequests.get(response.id);
              
              if (response.error) {
                reject(new Error(response.error.message || 'Unknown error'));
              } else {
                resolve(response.result);
              }
              
              this.pendingRequests.delete(response.id);
            } else if (response.id) {
              console.warn('Received response for unknown request ID:', response.id);
            } else if (response.method) {
              // This is a notification or request from the server
              console.log('Received server notification:', response.method);
            }
          } catch (error) {
            console.error('Error handling WebSocket message:', error);
            // Don't rethrow the error - we want to keep the connection alive
          }
        };
      } catch (error) {
        console.error('Error connecting to OPAL server:', error);
        reject(error);
      }
    });
  }

  /**
   * Disconnect from the OPAL server
   */
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.connected = false;
    }
  }

  /**
   * Call a method on the OPAL server
   * @param {string} method - Method name
   * @param {Object} params - Method parameters
   * @returns {Promise<any>} - Method result
   */
  callMethod(method, params = {}) {
    return new Promise((resolve, reject) => {
      if (!this.connected) {
        reject(new Error('Not connected to OPAL server'));
        return;
      }
      
      const id = this.requestId++;
      const request = {
        jsonrpc: '2.0',
        id,
        method,
        params
      };
      
      // Store the promise callbacks
      this.pendingRequests.set(id, { resolve, reject });
      
      // Send the request
      this.ws.send(JSON.stringify(request));
    });
  }

  /**
   * Register an event handler for the WebSocket open event
   * @param {Function} callback - Event handler
   */
  onOpen(callback) {
    this.onOpenCallbacks.push(callback);
  }

  /**
   * Register an event handler for the WebSocket close event
   * @param {Function} callback - Event handler
   */
  onClose(callback) {
    this.onCloseCallbacks.push(callback);
  }

  /**
   * Register an event handler for the WebSocket error event
   * @param {Function} callback - Event handler
   */
  onError(callback) {
    this.onErrorCallbacks.push(callback);
  }
  
  /**
   * Disconnect from the OPAL server
   * @returns {void}
   */
  disconnect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      console.log('Disconnecting from OPAL server...');
      this.ws.close(1000, 'Client initiated disconnect');
    }
    
    this.connected = false;
    this.pendingRequests.clear();
    console.log('Disconnected from OPAL server');
  }

  // Memory methods

  /**
   * List memories for UI display
   * @param {Object} options - Options
   * @param {number} options.limit - Maximum number of results
   * @param {number} options.page - Page number
   * @returns {Promise<Object>} - Memories with pagination info
   */
  listMemories(options = {}) {
    return this.callMethod('memory.list_for_ui', {
      limit: options.limit,
      page: options.page
    });
  }

  /**
   * Get a single memory for UI display
   * @param {string} memoryId - Memory ID
   * @returns {Promise<Object>} - Memory
   */
  getMemory(memoryId) {
    return this.callMethod('memory.get_for_ui', { memoryId });
  }

  /**
   * Search memories for UI display
   * @param {string} query - Search query
   * @param {number} limit - Maximum number of results
   * @returns {Promise<Object>} - Search results
   */
  searchMemories(query, limit) {
    return this.callMethod('memory.search_for_ui', { query, limit });
  }

  // Tool run methods

  /**
   * List tool runs for UI display
   * @param {Object} options - Options
   * @param {number} options.limit - Maximum number of results
   * @param {number} options.page - Page number
   * @returns {Promise<Object>} - Tool runs with pagination info
   */
  listToolRuns(options = {}) {
    return this.callMethod('toolRun.list_for_ui', {
      limit: options.limit,
      page: options.page
    });
  }

  /**
   * Get tool run statistics for UI display
   * @returns {Promise<Object>} - Tool run statistics
   */
  getToolRunStats() {
    return this.callMethod('toolRun.stats_for_ui', {});
  }

  // Summary methods

  /**
   * Generate a summary for UI display
   * @param {string} content - Content to summarize
   * @param {string} type - Summary type (headline, paragraph, full)
   * @returns {Promise<Object>} - Generated summary
   */
  generateSummary(content, type = 'paragraph') {
    return this.callMethod('summary.generate_for_ui', { content, type });
  }
}

// Export for CommonJS environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = OpalClient;
}

// Export for browser environments
if (typeof window !== 'undefined') {
  window.OpalClient = OpalClient;
}
