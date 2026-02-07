/**
 * MCP Inspector for OPAL Admin Panel
 * This script handles the MCP testing functionality integrated into the OPAL admin panel
 */

// Initialize the MCP Inspector when the tab is activated
document.addEventListener('DOMContentLoaded', () => {
  // Check if we're on the admin panel page with tabs
  const mcpInspectorTab = document.querySelector('.nav-tab[data-tab="mcp-inspector"]');
  if (mcpInspectorTab) {
    mcpInspectorTab.addEventListener('click', initMcpInspector);
  }
});

// Variables to track MCP Inspector state
let eventSource = null;
let webSocket = null;
let currentSessionId = null;
let isSessionInitialized = false;
let requestIdCounter = 0;
let toolName = null;
let mcpInspectorInitialized = false;

function initMcpInspector() {
  // Only initialize once
  if (mcpInspectorInitialized) return;
  mcpInspectorInitialized = true;
  
  console.log('Initializing MCP Inspector...');
  
  // Set up event listeners for MCP Inspector UI elements
  document.getElementById('init-button').addEventListener('click', initializeSession);
  document.getElementById('start-sse-button').addEventListener('click', startSseStream);
  document.getElementById('start-ws-button').addEventListener('click', startWebSocket);
  document.getElementById('terminate-button').addEventListener('click', terminateSession);
  document.getElementById('disconnect-button').addEventListener('click', disconnectStreams);
  document.getElementById('send-button').addEventListener('click', sendRequest);
  document.getElementById('clear-log-button').addEventListener('click', clearLog);
  document.getElementById('clear-log-button-2').addEventListener('click', clearLog);
  document.getElementById('copy-log-button').addEventListener('click', copyLog);
  document.getElementById('test-api-button').addEventListener('click', testApiIntegration);
  document.getElementById('payload-select').addEventListener('change', function() {
    setPayload(this.value);
  });
  
  // Set initial UI state
  updateUiState();
  
  // If there's a token in localStorage, pre-fill it
  const savedToken = localStorage.getItem('opal_admin_token');
  if (savedToken) {
    document.getElementById('api-token').value = savedToken;
  }
  
  // Log initialization
  log('MCP Inspector initialized. Ready to test MCP compliance.', 'info');
}

// Function to copy log content to clipboard
function copyLog() {
  const logContainer = document.getElementById('log-container');
  const logText = Array.from(logContainer.children)
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

function log(message, type = 'info') {
  const logContainer = document.getElementById('log-container');
  if (!logContainer) return;
  
  const entry = document.createElement('div');
  entry.className = `log-entry log-${type}`;
  entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
  logContainer.appendChild(entry);
  logContainer.scrollTop = logContainer.scrollHeight; // Auto-scroll
}

function clearLog() {
  const logContainer = document.getElementById('log-container');
  if (logContainer) {
    logContainer.innerHTML = '';
  }
}

// Function to display tools in the UI
function displayTools(tools) {
  // Check if tools container exists, if not create it
  let toolsContainer = document.getElementById('mcp-tools-list');
  if (!toolsContainer) {
    // Create a new section for tools
    const mcpControls = document.querySelector('.mcp-controls');
    const toolsSection = document.createElement('div');
    toolsSection.className = 'tools-section';
    toolsSection.innerHTML = `
      <h3>Available MCP Tools (${tools.length})</h3>
      <div id="mcp-tools-list" class="tools-list"></div>
    `;
    mcpControls.appendChild(toolsSection);
    toolsContainer = document.getElementById('mcp-tools-list');
  } else {
    // Update the heading to show the tool count
    const heading = toolsContainer.previousElementSibling;
    if (heading && heading.tagName === 'H3') {
      heading.textContent = `Available MCP Tools (${tools.length})`;
    }
  }
  
  // Clear existing tools
  toolsContainer.innerHTML = '';
  
  // Sort tools by name
  tools.sort((a, b) => a.name.localeCompare(b.name));
  
  // Group tools by category (first part of name before underscore)
  const toolsByCategory = {};
  tools.forEach(tool => {
    const category = tool.name.includes('_') ? 
      tool.name.split('_')[0] : 
      'core';
    
    if (!toolsByCategory[category]) {
      toolsByCategory[category] = [];
    }
    toolsByCategory[category].push(tool);
  });
  
  // Create a collapsible section for each category
  Object.keys(toolsByCategory).sort().forEach(category => {
    const categoryTools = toolsByCategory[category];
    const categorySection = document.createElement('div');
    categorySection.className = 'tool-category';
    
    const categoryHeader = document.createElement('div');
    categoryHeader.className = 'category-header';
    categoryHeader.innerHTML = `
      <h4>${category} (${categoryTools.length})</h4>
      <button class="toggle-category">▼</button>
    `;
    
    const categoryContent = document.createElement('div');
    categoryContent.className = 'category-content';
    
    // Add each tool in this category
    categoryTools.forEach(tool => {
      const toolItem = document.createElement('div');
      toolItem.className = 'tool-item';
      toolItem.innerHTML = `
        <div class="tool-name">${tool.name}</div>
        <div class="tool-description">${tool.description || 'No description'}</div>
      `;
      
      // Add click handler to show tool details
      toolItem.addEventListener('click', () => {
        // Show tool details in a modal or panel
        log(`Tool details for ${tool.name}:`, 'info');
        log(JSON.stringify(tool, null, 2), 'info');
      });
      
      categoryContent.appendChild(toolItem);
    });
    
    categorySection.appendChild(categoryHeader);
    categorySection.appendChild(categoryContent);
    toolsContainer.appendChild(categorySection);
    
    // Add toggle functionality
    const toggleButton = categoryHeader.querySelector('.toggle-category');
    toggleButton.addEventListener('click', (e) => {
      e.stopPropagation();
      categoryContent.classList.toggle('collapsed');
      toggleButton.textContent = categoryContent.classList.contains('collapsed') ? '▶' : '▼';
    });
    
    // Expand the first few categories by default
    if (Object.keys(toolsByCategory).indexOf(category) >= 3) {
      categoryContent.classList.add('collapsed');
      toggleButton.textContent = '▶';
    }
  });
  
  // Add some CSS for the tools list
  addToolsStyles();
}

// Add CSS styles for the tools list
function addToolsStyles() {
  // Check if styles already exist
  if (document.getElementById('mcp-tools-styles')) {
    return;
  }
  
  const styleElement = document.createElement('style');
  styleElement.id = 'mcp-tools-styles';
  styleElement.textContent = `
    .tools-section {
      margin-top: 20px;
      border-top: 1px solid #ccc;
      padding-top: 10px;
    }
    .tools-list {
      max-height: 400px;
      overflow-y: auto;
      border: 1px solid #ddd;
      border-radius: 4px;
      margin-top: 10px;
    }
    .tool-category {
      border-bottom: 1px solid #eee;
    }
    .category-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      background-color: #f5f5f5;
      cursor: pointer;
    }
    .category-header h4 {
      margin: 0;
      font-size: 14px;
      color: #333;
    }
    .toggle-category {
      background: none;
      border: none;
      font-size: 12px;
      cursor: pointer;
      color: #666;
    }
    .category-content {
      max-height: 500px;
      overflow-y: auto;
      transition: max-height 0.3s ease-out;
    }
    .category-content.collapsed {
      max-height: 0;
      overflow: hidden;
    }
    .tool-item {
      padding: 8px 12px 8px 20px;
      border-top: 1px solid #eee;
      cursor: pointer;
    }
    .tool-item:hover {
      background-color: #f9f9f9;
    }
    .tool-name {
      font-weight: bold;
      margin-bottom: 4px;
      color: #0066cc;
    }
    .tool-description {
      font-size: 12px;
      color: #666;
    }
  `;
  document.head.appendChild(styleElement);
}

function generateId(prefix = 'req') {
  return `${prefix}-${++requestIdCounter}`;
}

function setPayload(payloadString) {
  const requestPayload = document.getElementById('request-payload');
  if (!requestPayload) return;
  
  if (payloadString) {
    try {
      // Replace placeholder for unique IDs
      const uniquePayload = payloadString.replace('{{id}}', generateId('auto'));
      const parsed = JSON.parse(uniquePayload);
      if (parsed.method === 'runTool') {
        parsed.params.toolName = toolName || 'fakestore_get_resources';
      }
      requestPayload.value = JSON.stringify(parsed, null, 2);
    } catch (e) {
      log(`Error parsing predefined payload: ${e}`, 'error');
    }
  }
}

function updateUiState() {
  const hasSession = !!currentSessionId;
  const canSend = hasSession && isSessionInitialized;

  // Update button states
  setElementState('init-button', hasSession);
  setElementState('start-sse-button', !hasSession || !!eventSource);
  setElementState('start-ws-button', !hasSession || !!webSocket);
  setElementState('terminate-button', !hasSession);
  
  const requestPayload = document.getElementById('request-payload');
  const sendButton = document.getElementById('send-button');
  if (sendButton && requestPayload) {
    sendButton.disabled = !canSend && !(requestPayload.value.includes('"method":"exit"'));
  }
  
  const testApiButton = document.getElementById('test-api-button');
  if (testApiButton) {
    testApiButton.disabled = !canSend;
  }

  // Update session display
  const sessionIdElement = document.getElementById('session-id');
  if (sessionIdElement) {
    sessionIdElement.textContent = currentSessionId || 'N/A';
  }
  
  const sessionStatusElement = document.getElementById('session-status');
  if (sessionStatusElement) {
    sessionStatusElement.textContent = isSessionInitialized ? 'Initialized' : (hasSession ? 'Initializing...' : 'Not Initialized');
    sessionStatusElement.className = isSessionInitialized ? 'info-value status-initialized' : 'info-value';
  }
}

function setElementState(elementId, disabled) {
  const element = document.getElementById(elementId);
  if (element) {
    element.disabled = disabled;
  }
}

async function initializeSession() {
  const mcpUrlInput = document.getElementById('mcp-url');
  const apiTokenInput = document.getElementById('api-token');
  
  if (!mcpUrlInput || !apiTokenInput) {
    console.error('MCP Inspector UI elements not found');
    return;
  }
  
  const url = mcpUrlInput.value;
  const token = apiTokenInput.value;
  
  if (!url) {
    log('MCP Endpoint URL is required.', 'error');
    return;
  }
  
  if (!token) {
    log('API Token is required.', 'error');
    return;
  }

  // Save token to localStorage for convenience
  localStorage.setItem('opal_admin_token', token);

  const initPayload = {
    jsonrpc: "2.0",
    id: generateId('init'),
    method: "initialize",
    params: {
      protocolVersion: "2025-03-26",
      clientInfo: { name: "OPAL Admin MCP Inspector", version: "1.0.0" },
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
  
  const mcpUrlInput = document.getElementById('mcp-url');
  if (!mcpUrlInput) return;
  
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
  const url = document.getElementById('mcp-url').value;
  
  log('Starting long-polling mechanism...', 'info');
  
  // Create a flag to track if polling should continue
  window.isPollingActive = true;
  
  // Function to perform a single poll
  // Track all tools received during polling
  let allTools = [];
  let nextCursor = null;
  
  function doPoll() {
    if (!window.isPollingActive) {
      log('Long-polling stopped', 'info');
      return;
    }
    
    // Create a request for getTools to simulate an event stream
    // Include pagination to get all tools
    const pollPayload = {
      jsonrpc: '2.0',
      method: 'getTools',
      params: {
        limit: 100,  // Request a larger number of tools
        includeInternal: true,  // Include internal tools as well
        cursor: nextCursor  // Include cursor for pagination
      },
      id: generateId('poll')
    };
    
    log(`Sending poll request${nextCursor ? ' with cursor' : ''}...`, 'info');
    
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
      // Process the response
      log('Received poll response:', 'received');
      
      if (data.result && data.result.tools) {
        // Add the new tools to our collection
        const newTools = data.result.tools;
        allTools = allTools.concat(newTools);
        
        log(`Received ${newTools.length} tools (total: ${allTools.length})`, 'success');
        
        // Display the tools in the UI
        displayTools(allTools);
        
        // Check if there are more tools to fetch (pagination)
        nextCursor = data.result.nextCursor || null;
        if (nextCursor) {
          log(`More tools available. Will fetch with cursor: ${nextCursor}`, 'info');
          // Immediately continue polling with the next cursor
          setTimeout(doPoll, 100);
        } else {
          // No more tools to fetch, wait longer before checking for updates
          log(`All tools received (${allTools.length} total)`, 'success');
          setTimeout(doPoll, 5000); // Poll every 5 seconds for updates
        }
      } else {
        // No tools in response or unexpected format
        log('No tools found in response or unexpected response format', 'warning');
        log(JSON.stringify(data, null, 2), 'received');
        setTimeout(doPoll, 2000); // Poll again after 2 seconds
      }
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

function startWebSocket() {
  if (!isSessionInitialized || !currentSessionId) {
    log('Please initialize a session first', 'error');
    return;
  }
  
  // If we already have a WebSocket connection, close it
  if (webSocket) {
    if (webSocket.readyState === WebSocket.OPEN || webSocket.readyState === WebSocket.CONNECTING) {
      log('Closing existing WebSocket connection...', 'info');
      webSocket.close();
      webSocket = null;
      document.getElementById('start-websocket').textContent = 'Start WebSocket';
      document.getElementById('start-websocket').classList.remove('connected');
      updateUiState();
      return;
    }
  }
  
  // If SSE is active, we can't start WebSocket
  if (eventSource) {
    log('Cannot start WebSocket while SSE is active. Stop SSE first.', 'error');
    return;
  }

  // Get the token from the input field
  const token = document.getElementById('api-token').value.trim();
  if (!token) {
    log('API token is required for WebSocket connection', 'error');
    return;
  }

  // Convert HTTP URL to WebSocket URL
  let wsUrl = document.getElementById('mcp-url').value.replace(/^http/, 'ws');
  log(`Starting WebSocket Connection (${wsUrl})...`, 'info');

  // For OPAL server, we need to ensure the WebSocket endpoint is correctly formatted
  // Make sure we're connecting to the WebSocket endpoint, not the HTTP endpoint
  if (!wsUrl.endsWith('/ws')) {
    // If URL ends with /mcp, replace it with /ws
    if (wsUrl.endsWith('/mcp')) {
      wsUrl = wsUrl.replace(/\/mcp$/, '/ws');
    } else {
      // Otherwise append /ws to the URL
      wsUrl += '/ws';
    }
  }
  
  log(`Adjusted WebSocket URL: ${wsUrl}`, 'info');

  // Add session ID and token to the WebSocket URL as query parameters
  wsUrl += `?session=${encodeURIComponent(currentSessionId)}&token=${encodeURIComponent(token)}`;
  
  log(`WebSocket URL: ${wsUrl}`, 'info');
  
  try {
    // Create new WebSocket connection
    webSocket = new WebSocket(wsUrl);
    
    webSocket.onopen = () => {
      log('WebSocket connection established', 'success');
      log(`WebSocket readyState: ${webSocket.readyState} (OPEN)`, 'info');
      
      // Update UI to show connected state
      document.getElementById('start-websocket').textContent = 'Disconnect WebSocket';
      document.getElementById('start-websocket').classList.add('connected');
      updateUiState();
      
      // Send a ping to verify connection
      const pingPayload = {
        jsonrpc: '2.0',
        id: generateId('ping'),
        method: 'ping'
      };
      
      log('Sending ping over WebSocket to verify connection...', 'info');
      log(JSON.stringify(pingPayload, null, 2), 'sent');
      
      try {
        webSocket.send(JSON.stringify(pingPayload));
      } catch (error) {
        log(`Error sending ping: ${error.message}`, 'error');
      }
    };
    
    webSocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        log('Received WebSocket message:', 'received');
        log(JSON.stringify(data, null, 2), 'received');
        
        // Handle ping response
        if (data.id && data.id.startsWith('ping-')) {
          log('Ping successful! WebSocket connection is working properly.', 'success');
        }
      } catch (error) {
        log(`Error parsing WebSocket message: ${error.message}`, 'error');
        log(event.data, 'received');
      }
    };
    
    webSocket.onclose = (event) => {
      log(`WebSocket Closed. Code: ${event.code}, Reason: ${event.reason || 'N/A'}`, 'info');
      webSocket = null;
      
      // Update UI to show disconnected state
      document.getElementById('start-websocket').textContent = 'Start WebSocket';
      document.getElementById('start-websocket').classList.remove('connected');
      updateUiState();
    };
    
    webSocket.onerror = (error) => {
      log(`WebSocket Error: ${error.message || 'Unknown error'}`, 'error');
      log('Check that the OPAL server is running and the WebSocket endpoint is properly configured.', 'error');
    };
    
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

  const url = document.getElementById('mcp-url').value;
  log(`Terminating Session (sending exit notification to ${url})...`, 'sent');
  log(JSON.stringify({
    jsonrpc: "2.0",
    method: "exit",
    params: {}
  }, null, 2), 'sent');

  try {
    // Send an exit notification instead of using DELETE method
    const exitPayload = {
      jsonrpc: "2.0",
      method: "exit",
      params: {}
    };
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Mcp-Session-Id': currentSessionId,
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(exitPayload)
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

  const requestPayload = document.getElementById('request-payload');
  if (!requestPayload) return;
  
  let payload;
  try {
    // Add/replace unique ID if placeholder is present
    let payloadString = requestPayload.value;
    if (payloadString.includes('"{{id}}"')) {
      payloadString = payloadString.replace('"{{id}}"', `"${generateId('req')}"`);
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

  const url = document.getElementById('mcp-url').value;
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
    const response = await fetch(document.getElementById('mcp-url').value, {
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
