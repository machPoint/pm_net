/**
 * MCP Inspector for OPAL Admin Panel
 * This script handles the MCP testing functionality for the OPAL server
 */

// DOM elements
const mcpUrlInput = document.getElementById('mcp-url');
const initButton = document.getElementById('init-button');
const startSseButton = document.getElementById('start-sse-button');
const startWsButton = document.getElementById('start-ws-button');
const terminateButton = document.getElementById('terminate-button');
const disconnectButton = document.getElementById('disconnect-button');
const sendButton = document.getElementById('send-button');
const payloadSelect = document.getElementById('payload-select');
const requestPayloadTextarea = document.getElementById('request-payload');
const sessionIdSpan = document.getElementById('session-id');
const sessionStatusSpan = document.getElementById('session-status');
const logDiv = document.getElementById('log-container');

// Function to copy log content to clipboard
function copyLog() {
  const logText = Array.from(logDiv.children)
    .map(entry => entry.textContent)
    .join('\n');
  
  if (logText.trim() === '') {
    log('Log is empty, nothing to copy', 'error');
    return;
  }
  
  navigator.clipboard.writeText(logText)
    .then(() => {
      log('Log content copied to clipboard', 'success');
    })
    .catch(err => {
      log(`Failed to copy log: ${err}`, 'error');
      
      // Fallback method
      const textArea = document.createElement('textarea');
      textArea.value = logText;
      document.body.appendChild(textArea);
      textArea.select();
      
      try {
        const successful = document.execCommand('copy');
        if (successful) {
          log('Log content copied to clipboard (fallback method)', 'success');
        } else {
          log('Failed to copy log content', 'error');
        }
      } catch (err) {
        log(`Error during fallback copy: ${err}`, 'error');
      }
      
      document.body.removeChild(textArea);
    });
}

let eventSource = null;
let webSocket = null;
let currentSessionId = null;
let isSessionInitialized = false;
let requestIdCounter = 0;
let toolName = null;

function log(message, type = 'info') {
  const entry = document.createElement('div');
  entry.className = `log-entry log-${type}`;
  entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
  logDiv.appendChild(entry);
  logDiv.scrollTop = logDiv.scrollHeight; // Auto-scroll
}

function clearLog() {
  logDiv.innerHTML = '';
}

function generateId(prefix = 'req') {
    return `${prefix}-${++requestIdCounter}`;
}

function setPayload(payloadString) {
    if (payloadString) {
        try {
          // Replace placeholder for unique IDs
          const uniquePayload = payloadString.replace('{{id}}', generateId('auto'));
          const parsed = JSON.parse(uniquePayload);
          if (parsed.method === 'runTool') {
            parsed.params.toolName = toolName;
          }
          requestPayloadTextarea.value = JSON.stringify(parsed, null, 2);
        } catch (e) {
            log(`Error parsing predefined payload: ${e}`, 'error');
        }
    }
}

function updateUiState() {
  const hasSession = !!currentSessionId;
  const canSend = hasSession && isSessionInitialized;

  // Update button states
  document.getElementById('init-button').disabled = hasSession;
  document.getElementById('start-sse-button').disabled = !hasSession || !!eventSource; // Disable if no session or SSE active
  document.getElementById('start-ws-button').disabled = !hasSession || !!webSocket; // Disable if no session or WS active
  document.getElementById('terminate-button').disabled = !hasSession;
  document.getElementById('send-button').disabled = !canSend && !(requestPayloadTextarea.value.includes('"method":"exit"')); // Allow exit even if not initialized
  document.getElementById('test-api-button').disabled = !canSend;

  // Update session display
  document.getElementById('session-id').textContent = currentSessionId || 'N/A';
  document.getElementById('session-status').textContent = isSessionInitialized ? 'Initialized' : (hasSession ? 'Initializing...' : 'Not Initialized');
  document.getElementById('session-status').className = isSessionInitialized ? 'status-initialized' : '';
}

async function initializeSession() {
  const url = mcpUrlInput.value;
  const token = document.getElementById('api-token').value;
  
  if (!url) {
    log('MCP Endpoint URL is required.', 'error');
    return;
  }
  
  if (!token) {
    log('API Token is required.', 'error');
    return;
  }

  const initPayload = {
    jsonrpc: "2.0",
    id: generateId('init'),
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      clientInfo: { name: "OPAL Inspector", version: "1.0.0" },
      capabilities: {}
    }
  };

  log(`Sending Initialize Request (POST to ${url})...`, 'sent');
  log(JSON.stringify(initPayload, null, 2), 'sent');

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(initPayload)
    });

    const responseSessionId = response.headers.get('Mcp-Session-Id');
    const responseBody = await response.json();

    log(`Received Initialize Response (Status: ${response.status})`, 'received');
    log(`Session ID: ${responseSessionId}`, 'received');
    log(JSON.stringify(responseBody, null, 2), 'received');

    if (!response.ok || !responseSessionId || responseBody.error) {
      throw new Error(`Initialization failed. Status: ${response.status}, Session ID: ${responseSessionId}, Body: ${JSON.stringify(responseBody)}`);
    }

    currentSessionId = responseSessionId;
    // Don't set isSessionInitialized yet, wait for server confirmation via notification
    log('Initialization request successful. Waiting for server... Send notifications/initialized.', 'info');
    updateUiState();

    // Send initialized notification immediately
    sendInitializedNotification();

  } catch (error) {
    log(`Initialization Error: ${error.message}`, 'error');
    currentSessionId = null;
    isSessionInitialized = false;
    updateUiState();
  }
}

async function sendInitializedNotification() {
  if (!currentSessionId) {
      log('Cannot send initialized: No active session ID.', 'error');
      return;
  }
  const initNotification = {
      jsonrpc: "2.0",
      method: "notifications/initialized",
      params: {}
  };

  log(`Sending Initialized Notification (POST to ${mcpUrlInput.value})...`, 'sent');
  log(JSON.stringify(initNotification, null, 2), 'sent');

  try {
      const response = await fetch(mcpUrlInput.value, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Mcp-Session-Id': currentSessionId
          },
          body: JSON.stringify(initNotification)
      });

      if (!response.ok) {
          // Notifications don't typically have content, just check status
          const errorText = await response.text();
           log(`Initialized Notification Send Issue (Status: ${response.status}): ${errorText}`, 'error');
      } else {
           log('Initialized Notification Sent successfully.', 'info');
           // Now we can consider the client side fully initialized *after sending*
           isSessionInitialized = true;
           log('Session marked as initialized client-side.', 'success');
      }
      updateUiState(); // Update UI to enable Send button etc.

  } catch(error) {
      log(`Error sending Initialized Notification: ${error.message}`, 'error');
      updateUiState();
  }
}

function startSseStream() {
  if (!currentSessionId) {
    log('Cannot start SSE: No active session ID.', 'error');
    return;
  }
  if (eventSource) {
      log('SSE stream already active.', 'info');
      return;
  }
  if (webSocket) {
      log('Cannot start SSE while WebSocket is active.', 'error');
      return;
  }
  
  const token = document.getElementById('api-token').value;
  if (!token) {
    log('API Token is required for SSE connection.', 'error');
    return;
  }

  log(`Starting SSE Stream...`, 'info');
  log(`SSE Connection Details:`, 'info');
  log(`- Session ID: ${currentSessionId}`, 'info');
  log(`- Token Length: ${token.length} characters`, 'info');
  log(`- Token Format: ${token.startsWith('ey') ? 'Likely JWT' : 'Not JWT format'}`, 'info');
  
  // Based on server code review, we found that the server only accepts POST requests for MCP
  // The 404 error for GET requests confirms this
  log('IMPORTANT: Server only accepts POST requests for MCP, not GET which is required for standard SSE', 'info');
  log('Using alternative approach: Long-polling with POST requests...', 'info');

  // Set up a polling mechanism to simulate SSE
  setupLongPolling();
}

// Function to set up long polling as an alternative to SSE
function setupLongPolling() {
  const token = document.getElementById('api-token').value;
  const url = mcpUrlInput.value;
  
  log('Starting long-polling mechanism...', 'info');
  
  // Create a flag to track if polling should continue
  window.isPollingActive = true;
  
  // Function to perform a single poll
  function doPoll() {
    if (!window.isPollingActive) {
      log('Long-polling stopped', 'info');
      return;
    }
    
    // Create a request for tools/list to simulate an event stream
    const pollPayload = {
      jsonrpc: '2.0',
      method: 'tools/list',
      params: {},
      id: generateId('poll')
    };
    
    log('Sending poll request...', 'info');
    
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Mcp-Session-Id': currentSessionId,
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(pollPayload)
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Poll request failed with status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      // Process the response as if it were an SSE event
      log('Received poll response:', 'received');
      log(JSON.stringify(data, null, 2), 'received');
      
      // Schedule the next poll
      setTimeout(doPoll, 2000); // Poll every 2 seconds
    })
    .catch(error => {
      log(`Poll error: ${error.message}`, 'error');
      
      // If there was an error, wait a bit longer before retrying
      setTimeout(doPoll, 5000); // Retry after 5 seconds on error
    });
  }
  
  // Start the polling process
  doPoll();
  
  // Create a simulated eventSource object to maintain compatibility with the rest of the code
  eventSource = {
    readyState: 1, // OPEN
    close: function() {
      log('Stopping long-polling...', 'info');
      window.isPollingActive = false;
      eventSource = null;
      updateUiState();
    }
  };
  
  log('Long-polling started successfully', 'success');
  updateUiState();
}

function setupSSEEventHandlers() {
  if (!eventSource) return;
  
  log('Setting up SSE event handlers...', 'info');
  
  eventSource.onopen = (event) => {
    log('SSE Connection Opened Successfully!', 'success');
    log(`SSE readyState: ${eventSource.readyState} (OPEN)`, 'info');
    updateUiState();
  };

  eventSource.onmessage = (event) => {
    log(`SSE Message Received (ID: ${event.lastEventId || 'none'})`, 'received');
    try {
      const data = JSON.parse(event.data);
      log(JSON.stringify(data, null, 2), 'received');
      // Handle potential server-side initialized confirmation if needed
      if (data.method === 'getTools') {
        toolName = data.params.toolName;
        log(`Received tool information: ${toolName}`, 'info');
      }
    } catch (e) {
      log(`Raw SSE Data: ${event.data}`, 'received');
      log(`Error parsing SSE data: ${e.message}`, 'error');
    }
  };

  eventSource.onerror = (error) => {
    log(`SSE Error Event Triggered`, 'error');
    log(`SSE readyState: ${eventSource.readyState} (${eventSource.readyState === 0 ? 'CONNECTING' : eventSource.readyState === 1 ? 'OPEN' : 'CLOSED'})`, 'error');
    
    // Detailed error information
    const errorInfo = {
      type: error.type,
      isTrusted: error.isTrusted,
      target: error.target ? 'EventSource' : 'unknown',
      eventPhase: error.eventPhase,
      bubbles: error.bubbles,
      cancelable: error.cancelable,
      defaultPrevented: error.defaultPrevented,
      timeStamp: error.timeStamp,
      returnValue: error.returnValue
    };
    log(`SSE Error Details: ${JSON.stringify(errorInfo, null, 2)}`, 'error');
    
    // Check if the server closed the connection
    if (eventSource.readyState === EventSource.CLOSED) {
      log('SSE connection closed by server or error.', 'error');
      log('Possible causes:', 'error');
      log('1. Authentication failure - check your token', 'error');
      log('2. Session ID invalid or expired', 'error');
      log('3. Server timeout or internal error', 'error');
      log('4. Server does not support SSE connections', 'error');
      
      eventSource = null;
      updateUiState();
    }
  };
  
  updateUiState();
}

function startWebSocket() {
  if (!currentSessionId) {
    log('Cannot start WebSocket: No active session ID.', 'error');
    return;
  }
  if (webSocket) {
      log('WebSocket already active.', 'info');
      return;
  }
   if (eventSource) {
      log('Cannot start WebSocket while SSE is active.', 'error');
      return;
  }
  
  const token = document.getElementById('api-token').value;
  if (!token) {
    log('API Token is required for WebSocket connection.', 'error');
    return;
  }

  let wsUrl = mcpUrlInput.value.replace(/^http/, 'ws');
  log(`Starting WebSocket Connection (${wsUrl})...`, 'info');

  // Add session ID and token to the WebSocket URL as query parameters
  // This is the most compatible approach across different WebSocket implementations
  wsUrl += `?session=${encodeURIComponent(currentSessionId)}&token=${encodeURIComponent(token)}`;
  
  log(`WebSocket URL: ${wsUrl}`, 'info');
  
  try {
      // Create a standard WebSocket connection without custom protocols
      webSocket = new WebSocket(wsUrl);
      
      // Add a timeout to detect hanging connections
      const wsTimeout = setTimeout(() => {
          if (webSocket && webSocket.readyState === WebSocket.CONNECTING) {
              log('WebSocket connection timeout - still in CONNECTING state after 5 seconds', 'error');
              log('Trying alternative connection method...', 'info');
              
              // Close the hanging connection
              webSocket.close();
              webSocket = null;
              
              // Try alternative connection method with token in URL
              const wsUrlWithToken = `${wsUrl}&token=${encodeURIComponent(token)}`;
              log(`Trying alternative WebSocket URL: ${wsUrlWithToken}`, 'info');
              webSocket = new WebSocket(wsUrlWithToken);
              
              // Set up event handlers for the new connection
              setupWebSocketHandlers();
          }
      }, 5000);
      
      // Clear the timeout if connection succeeds or fails
      webSocket.addEventListener('open', () => clearTimeout(wsTimeout));
      webSocket.addEventListener('error', () => clearTimeout(wsTimeout));
      webSocket.addEventListener('close', () => clearTimeout(wsTimeout));
  } catch (error) {
      log(`Error creating WebSocket: ${error.message}`, 'error');
  }


  // Set up the WebSocket event handlers
  setupWebSocketHandlers();
}

function setupWebSocketHandlers() {
  if (!webSocket) return;
  
  webSocket.onopen = (event) => {
    log('WebSocket connection established', 'success');
    log(`WebSocket readyState: ${webSocket.readyState} (OPEN)`, 'info');
    disconnectButton.disabled = false;
    
    // Send a ping message to test the connection
    const pingMessage = {
      jsonrpc: "2.0",
      method: "ping",
      id: generateId('ping')
    };
    
    log('Sending ping over WebSocket to verify connection...', 'sent');
    log(JSON.stringify(pingMessage, null, 2), 'sent');
    
    try {
      webSocket.send(JSON.stringify(pingMessage));
    } catch (error) {
      log(`Error sending ping: ${error.message}`, 'error');
    }
    
    updateUiState();
  };

  webSocket.onmessage = (event) => {
    log('WebSocket Received:', 'received');
    try {
        const data = JSON.parse(event.data);
        log(JSON.stringify(data, null, 2), 'received');
        
        // Check if this is a response to our ping
        if (data.id && data.id.startsWith('ping-')) {
          log('Ping response received - WebSocket connection is fully functional', 'success');
        }
    } catch(e) {
        log(`Raw WS Data: ${event.data}`, 'received');
        log(`Error parsing WebSocket data: ${e}`, 'error');
    }
  };

  webSocket.onerror = (error) => {
    log(`WebSocket Error: ${error.message || JSON.stringify(error)}`, 'error');
    webSocket = null;
    updateUiState();
  };

  webSocket.onclose = (event) => {
    log(`WebSocket Closed. Code: ${event.code}, Reason: ${event.reason || 'N/A'}`, 'info');
    webSocket = null;
    updateUiState();
  };
   updateUiState();
}

function disconnectStreams() {
    if (eventSource) {
        log('Closing SSE connection...', 'info');
        eventSource.close();
        eventSource = null;
    }
    if (webSocket) {
        log('Closing WebSocket connection...', 'info');
        webSocket.close();
        webSocket = null;
    }
    // Keep session ID, just disconnect transport
    updateUiState();
}

async function terminateSession() {
  if (!currentSessionId) {
    log('No active session to terminate.', 'error');
    return;
  }
  
  const token = document.getElementById('api-token').value;
  if (!token) {
    log('API Token is required to terminate session.', 'error');
    return;
  }

  disconnectStreams(); // Close any active streams first

  const url = mcpUrlInput.value;
  log(`Terminating Session (DELETE to ${url})...`, 'sent');

  try {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Mcp-Session-Id': currentSessionId,
        'Authorization': `Bearer ${token}`
      }
    });

    log(`Terminate Response Status: ${response.status}`, response.ok ? 'success' : 'error');
    if (!response.ok) {
        const errorText = await response.text();
        log(`Termination Error: ${errorText}`, 'error');
    }

  } catch (error) {
    log(`Error during session termination: ${error.message}`, 'error');
  }

  // Clear session state regardless of server response
  currentSessionId = null;
  isSessionInitialized = false;
  updateUiState();
}

async function sendRequest() {
  if (!currentSessionId) {
    log('Cannot send request: No active session ID.', 'error');
    return;
  }

  let payload;
  try {
      // Add/replace unique ID if placeholder is present
      let payloadString = requestPayloadTextarea.value;
      if (payloadString.includes('"{{id}}"')) {
          payloadString = payloadString.replace('"{{id}}"}', `"${generateId('req')}"}`);
      }
    payload = JSON.parse(payloadString);
    // Automatically set JSON-RPC version if missing
    if (!payload.jsonrpc) {
        payload.jsonrpc = "2.0";
    }
  } catch (e) {
    log(`Invalid JSON payload: ${e.message}`, 'error');
    return;
  }

  const url = mcpUrlInput.value;
  log(`Sending Request/Notification (POST to ${url})...`, 'sent');
  log(JSON.stringify(payload, null, 2), 'sent');

  try {
      // Send via WebSocket if active, otherwise POST
      if (webSocket && webSocket.readyState === WebSocket.OPEN) {
          webSocket.send(JSON.stringify(payload));
          log('Sent via WebSocket.', 'info');
      } else {
          const response = await fetch(url, {
              method: 'POST',
              headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Mcp-Session-Id': currentSessionId
              },
              body: JSON.stringify(payload)
          });

          // Only expect content for requests (have ID), not notifications
          if (payload.id) {
               const responseBody = await response.json();
               log(`Received Response (Status: ${response.status})`, 'received');
               log(JSON.stringify(responseBody, null, 2), 'received');
               if (!response.ok || responseBody.error) {
                   log('Server returned an error.', 'error');
               }
          } else {
               log(`Notification Sent (Status: ${response.status})`, response.ok ? 'info' : 'error');
               if (!response.ok) {
                   const errorText = await response.text();
                   log(`Send Error: ${errorText}`, 'error');
               }
          }
      }

      // If it was an exit notification, clear session locally
      if (payload.method === 'exit') {
          log('Sent exit notification. Clearing session locally.', 'info');
          currentSessionId = null;
          isSessionInitialized = false;
          disconnectStreams();
          updateUiState();
      }

  } catch (error) {
    log(`Error sending request: ${error.message}`, 'error');
    // Don't clear session on generic send error
    updateUiState();
  }
}

async function testApiIntegration() {
  if (!isSessionInitialized || !currentSessionId) {
    log('Please initialize a session first', 'error');
    return;
  }

  const apiName = document.getElementById('api-name').value.trim();
  const apiMethod = document.getElementById('api-method').value;
  const apiEndpoint = document.getElementById('api-endpoint').value.trim();
  const resourcesPath = document.getElementById('api-resources-path').value.trim();
  const resourceIdPath = document.getElementById('api-resource-id-path').value.trim();
  let apiParamsText = document.getElementById('api-params').value.trim();
  let params = {};
  
  try {
    if (apiParamsText) {
      params = JSON.parse(apiParamsText);
    }
    
    // Add resource path mapping parameters
    params._resourcesPath = resourcesPath;
    params._resourceIdPath = resourceIdPath;
    
    // Determine if this is a collection endpoint or a single resource endpoint
    let toolName;
    let endpointType = 'collection';
    
    if (apiEndpoint.includes('/')) {
      // For paths like 'products/1', this is a single resource endpoint
      endpointType = 'resource';
      const parts = apiEndpoint.split('/');
      if (parts.length > 1) {
        // Add the ID to params
        params.id = parts[1];
      }
    }
    
    // Construct the tool name using the server's generic endpoint pattern
    if (endpointType === 'resource') {
      toolName = `${apiName.toLowerCase()}_${apiMethod.toLowerCase()}_resources_id`;
    } else if (apiEndpoint === '') {
      toolName = `${apiName.toLowerCase()}_${apiMethod.toLowerCase()}`;
    } else {
      toolName = `${apiName.toLowerCase()}_${apiMethod.toLowerCase()}_resources`;
    }
    
    log(`Testing API Integration using tool: ${toolName}`, 'info');
    log(`Actual endpoint being tested: ${apiEndpoint}`, 'info');
    
    // Create MCP runTool request
    const requestId = generateId('api-test');
    const request = {
      jsonrpc: '2.0',
      method: 'runTool',
      params: {
        toolName: toolName,
        params: params
      },
      id: requestId
    };
    
    // Log the outgoing request
    log(JSON.stringify(request, null, 2), 'sent');
    
    // Send the request to the MCP server
    const response = await fetch(mcpUrlInput.value, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Mcp-Session-Id': currentSessionId
      },
      body: JSON.stringify(request)
    });
    
    const responseText = await response.text();
    log(`Response Status: ${response.status}`, response.ok ? 'success' : 'error');
    
    try {
      const responseJson = JSON.parse(responseText);
      log(JSON.stringify(responseJson, null, 2), 'received');
      
      // Display the result in a more user-friendly way if possible
      if (responseJson.result && !responseJson.error) {
        log('API Integration test successful!', 'success');
      } else if (responseJson.error) {
        log(`API Integration test failed: ${responseJson.error.message}`, 'error');
      }
    } catch (e) {
      log(`Raw Response: ${responseText}`, 'received');
    }
  } catch (error) {
    log(`API Integration Test Error: ${error.message}`, 'error');
  }
}

// Initial UI state
updateUiState();

// --- EventSource Polyfill --- 
// Basic polyfill to support headers in EventSource, crucial for Mcp-Session-Id
// Source: Adapted from https://github.com/EventSource/eventsource
// Note: This is a simplified version for demonstration.
// For robust production use, consider a more complete polyfill library.
(function (global) {
  if (global.EventSource && !global.EventSource.prototype.hasOwnProperty('headers')) {
      console.log('Patching EventSource to support headers...');
      var OriginalEventSource = global.EventSource;
      global.EventSourcePolyfill = function (url, options) {
          var es = new OriginalEventSource(url, options); // Pass options like heartbeatTimeout
          // Add headers property for potential reference, though not used by native implementation
          es.headers = options && options.headers;
          // The native EventSource doesn't truly support custom headers after instantiation
          // This polyfill structure primarily allows *passing* them conceptually
          // and relies on server CORS configuration (Access-Control-Allow-Headers)
          // Actual header sending for the *initial* connection might still be browser-limited.
          // The REAL benefit comes if a polyfill library *replaces* the native XHR/fetch mechanism.
          // For this basic example, we assume the server is configured correctly.
          return es;
      };
  } else if (!global.EventSource) {
      console.warn('Native EventSource not found. Headers may not be sent correctly without a full polyfill.');
      global.EventSourcePolyfill = function(url, options) {
        console.error('EventSource not supported and no full polyfill provided.');
        // Return a dummy object that does nothing to avoid errors
        return {
          onopen: function() {},
          onmessage: function() {},
          onerror: function() { this.readyState = EventSource.CLOSED; (options.onerror || function(){})(new Error('Not Supported')); },
          close: function() { this.readyState = EventSource.CLOSED; },
          readyState: 0, // CONNECTING
          CONNECTING: 0, OPEN: 1, CLOSED: 2
        };
      };
      if (!global.EventSource) { global.EventSource = { CONNECTING: 0, OPEN: 1, CLOSED: 2 }; } // Define states
  }
   else {
      // Native EventSource exists and might already have header support (unlikely) or doesn't need patching
      global.EventSourcePolyfill = global.EventSource;
  }
})(this);
