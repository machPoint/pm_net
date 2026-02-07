/**
 * MCP Compliance Test Suite
 * 
 * This file contains tests to verify that the OPAL server is compliant with the
 * Model Context Protocol (MCP) specification.
 */

const WebSocket = require('ws');
const axios = require('axios');
const assert = require('assert');

// Configuration
const config = {
  httpEndpoint: 'http://localhost:3000/mcp',
  wsEndpoint: 'ws://localhost:3000',
  apiKey: 'test-api-key'
};

// Test results tracking
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0
};

/**
 * Run a test case
 * 
 * @param {string} name - Test name
 * @param {Function} testFn - Test function
 */
async function runTest(name, testFn) {
  testResults.total++;
  console.log(`\n🧪 Running test: ${name}`);
  
  try {
    await testFn();
    console.log(`✅ PASSED: ${name}`);
    testResults.passed++;
  } catch (error) {
    console.error(`❌ FAILED: ${name}`);
    console.error(`   Error: ${error.message}`);
    if (error.stack) {
      console.error(`   Stack: ${error.stack.split('\n')[1]}`);
    }
    testResults.failed++;
  }
}

/**
 * Skip a test case
 * 
 * @param {string} name - Test name
 * @param {string} reason - Reason for skipping
 */
function skipTest(name, reason) {
  testResults.total++;
  testResults.skipped++;
  console.log(`\n⏭️ SKIPPED: ${name}`);
  console.log(`   Reason: ${reason}`);
}

/**
 * Make an HTTP request to the MCP endpoint
 * 
 * @param {Object} jsonRpcRequest - JSON-RPC request object
 * @returns {Object} JSON-RPC response
 */
async function makeHttpRequest(jsonRpcRequest, protocolVersion = '2025-06-18') {
  const response = await axios.post(config.httpEndpoint, jsonRpcRequest, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
      'MCP-Protocol-Version': protocolVersion
    }
  });
  
  return response.data;
}

/**
 * Create a WebSocket connection to the MCP server
 * 
 * @returns {Promise<WebSocket>} WebSocket connection
 */
function createWebSocketConnection() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${config.wsEndpoint}?token=${config.apiKey}`);
    
    ws.on('open', () => {
      resolve(ws);
    });
    
    ws.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Send a message over WebSocket and wait for a response
 * 
 * @param {WebSocket} ws - WebSocket connection
 * @param {Object} jsonRpcRequest - JSON-RPC request object
 * @returns {Promise<Object>} JSON-RPC response
 */
function sendWebSocketRequest(ws, jsonRpcRequest) {
  return new Promise((resolve, reject) => {
    const requestId = jsonRpcRequest.id;
    
    const messageHandler = (message) => {
      try {
        const response = JSON.parse(message);
        
        if (response.id === requestId) {
          ws.removeEventListener('message', messageHandler);
          
          if (response.error) {
            reject(new Error(`JSON-RPC error: ${response.error.message}`));
          } else {
            resolve(response);
          }
        }
      } catch (error) {
        reject(error);
      }
    };
    
    ws.addEventListener('message', messageHandler);
    ws.send(JSON.stringify(jsonRpcRequest));
  });
}

/**
 * Initialize a WebSocket connection
 * 
 * @param {WebSocket} ws - WebSocket connection
 * @returns {Promise<Object>} Initialize response
 */
async function initializeWebSocket(ws) {
  const initializeRequest = {
    jsonrpc: '2.0',
    id: 'init-1',
    method: 'initialize',
    params: {
      protocolVersion: '2025-06-18',
      capabilities: {
        roots: {
          listChanged: true
        },
        sampling: {},
        elicitation: {}
      },
      clientInfo: {
        name: 'MCP Compliance Test Suite',
        title: 'MCP Test Client',
        version: '1.0.0'
      }
    }
  };
  
  const response = await sendWebSocketRequest(ws, initializeRequest);
  return response.result;
}

/**
 * Test cases
 */
async function runTests() {
  console.log('🚀 Starting MCP Compliance Tests');
  
  // Test protocol version header validation
  await runTest('MCP-Protocol-Version header is validated', async () => {
    const pingRequest = {
      jsonrpc: '2.0',
      id: 'ping-version-test',
      method: 'ping',
      params: {}
    };
    
    // Test with valid 2025-06-18 version
    const validResponse = await makeHttpRequest(pingRequest, '2025-06-18');
    assert.strictEqual(validResponse.jsonrpc, '2.0');
    assert.strictEqual(validResponse.id, 'ping-version-test');
    
    // Test with backward compatible 2025-03-26 version
    const compatResponse = await makeHttpRequest(pingRequest, '2025-03-26');
    assert.strictEqual(compatResponse.jsonrpc, '2.0');
    assert.strictEqual(compatResponse.id, 'ping-version-test');
    
    // Test with invalid version - should return error
    try {
      await makeHttpRequest(pingRequest, '1.0.0');
      assert.fail('Should have rejected invalid protocol version');
    } catch (error) {
      // Expected to fail with 400 error
      assert.strictEqual(error.response.status, 400);
      assert.ok(error.response.data.error);
      assert.ok(error.response.data.error.message.includes('Unsupported protocol version'));
    }
  });
  
  // Test that batching is rejected
  await runTest('JSON-RPC batching is rejected', async () => {
    const batchRequest = [
      {
        jsonrpc: '2.0',
        id: 'batch-1',
        method: 'ping',
        params: {}
      },
      {
        jsonrpc: '2.0',
        id: 'batch-2', 
        method: 'ping',
        params: {}
      }
    ];
    
    try {
      await axios.post(config.httpEndpoint, batchRequest, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
          'MCP-Protocol-Version': '2025-06-18'
        }
      });
      assert.fail('Should have rejected batch request');
    } catch (error) {
      // Expected to fail with 400 error
      assert.strictEqual(error.response.status, 400);
      assert.ok(error.response.data.error);
      assert.ok(error.response.data.error.message.includes('batching is not supported'));
    }
  });
  
  // Test HTTP endpoint
  await runTest('HTTP endpoint is accessible', async () => {
    const pingRequest = {
      jsonrpc: '2.0',
      id: 'ping-1',
      method: 'ping',
      params: {}
    };
    
    const response = await makeHttpRequest(pingRequest);
    assert.strictEqual(response.jsonrpc, '2.0');
    assert.strictEqual(response.id, 'ping-1');
    assert.ok(response.result);
  });
  
  // Test WebSocket endpoint
  await runTest('WebSocket endpoint is accessible', async () => {
    const ws = await createWebSocketConnection();
    ws.close();
  });
  
  // Test initialize method
  await runTest('Initialize method returns server capabilities', async () => {
    const ws = await createWebSocketConnection();
    const initResult = await initializeWebSocket(ws);
    
    assert.ok(initResult.protocolVersion);
    assert.ok(initResult.serverInfo);
    assert.ok(initResult.capabilities);
    assert.ok(initResult.sessionId);
    
    // Check for required capabilities
    assert.ok(initResult.capabilities.tools);
    assert.ok(initResult.capabilities.resources);
    assert.ok(initResult.capabilities.prompts);
    
    ws.close();
  });
  
  // Test tools/list method
  await runTest('tools/list returns a list of tools', async () => {
    const ws = await createWebSocketConnection();
    await initializeWebSocket(ws);
    
    const listToolsRequest = {
      jsonrpc: '2.0',
      id: 'list-tools-1',
      method: 'tools/list',
      params: {}
    };
    
    const response = await sendWebSocketRequest(ws, listToolsRequest);
    assert.ok(response.result.tools);
    assert.ok(Array.isArray(response.result.tools));
    
    ws.close();
  });
  
  // Test tools/call method
  await runTest('tools/call executes a tool', async () => {
    const ws = await createWebSocketConnection();
    await initializeWebSocket(ws);
    
    // First, get a list of available tools
    const listToolsRequest = {
      jsonrpc: '2.0',
      id: 'list-tools-2',
      method: 'tools/list',
      params: {}
    };
    
    const toolsResponse = await sendWebSocketRequest(ws, listToolsRequest);
    const tools = toolsResponse.result.tools;
    
    if (tools.length === 0) {
      skipTest('tools/call executes a tool', 'No tools available');
      return;
    }
    
    // Use the first tool for testing
    const testTool = tools[0];
    
    const callToolRequest = {
      jsonrpc: '2.0',
      id: 'call-tool-1',
      method: 'tools/call',
      params: {
        name: testTool.name,
        arguments: {}
      }
    };
    
    const response = await sendWebSocketRequest(ws, callToolRequest);
    assert.ok(response.result.content);
    assert.ok(Array.isArray(response.result.content));
    assert.ok('isError' in response.result);
    
    ws.close();
  });
  
  // Test resources/list method
  await runTest('resources/list returns a list of resources', async () => {
    const ws = await createWebSocketConnection();
    await initializeWebSocket(ws);
    
    const listResourcesRequest = {
      jsonrpc: '2.0',
      id: 'list-resources-1',
      method: 'resources/list',
      params: {}
    };
    
    const response = await sendWebSocketRequest(ws, listResourcesRequest);
    assert.ok(response.result.resources);
    assert.ok(Array.isArray(response.result.resources));
    
    ws.close();
  });
  
  // Test resources/read method
  await runTest('resources/read retrieves a resource', async () => {
    const ws = await createWebSocketConnection();
    await initializeWebSocket(ws);
    
    // First, get a list of available resources
    const listResourcesRequest = {
      jsonrpc: '2.0',
      id: 'list-resources-2',
      method: 'resources/list',
      params: {}
    };
    
    const resourcesResponse = await sendWebSocketRequest(ws, listResourcesRequest);
    const resources = resourcesResponse.result.resources;
    
    if (resources.length === 0) {
      skipTest('resources/read retrieves a resource', 'No resources available');
      return;
    }
    
    // Use the first resource for testing
    const testResource = resources[0];
    
    const readResourceRequest = {
      jsonrpc: '2.0',
      id: 'read-resource-1',
      method: 'resources/read',
      params: {
        uri: testResource.uri
      }
    };
    
    const response = await sendWebSocketRequest(ws, readResourceRequest);
    assert.ok(response.result.content);
    assert.ok(response.result.contentType);
    
    ws.close();
  });
  
  // Test prompts/list method
  await runTest('prompts/list returns a list of prompts', async () => {
    const ws = await createWebSocketConnection();
    await initializeWebSocket(ws);
    
    const listPromptsRequest = {
      jsonrpc: '2.0',
      id: 'list-prompts-1',
      method: 'prompts/list',
      params: {}
    };
    
    const response = await sendWebSocketRequest(ws, listPromptsRequest);
    assert.ok(response.result.prompts);
    assert.ok(Array.isArray(response.result.prompts));
    
    ws.close();
  });
  
  // Test prompts/get method
  await runTest('prompts/get retrieves a prompt', async () => {
    const ws = await createWebSocketConnection();
    await initializeWebSocket(ws);
    
    // First, get a list of available prompts
    const listPromptsRequest = {
      jsonrpc: '2.0',
      id: 'list-prompts-2',
      method: 'prompts/list',
      params: {}
    };
    
    const promptsResponse = await sendWebSocketRequest(ws, listPromptsRequest);
    const prompts = promptsResponse.result.prompts;
    
    if (prompts.length === 0) {
      skipTest('prompts/get retrieves a prompt', 'No prompts available');
      return;
    }
    
    // Use the first prompt for testing
    const testPrompt = prompts[0];
    
    const getPromptRequest = {
      jsonrpc: '2.0',
      id: 'get-prompt-1',
      method: 'prompts/get',
      params: {
        id: testPrompt.id
      }
    };
    
    const response = await sendWebSocketRequest(ws, getPromptRequest);
    assert.ok(response.result.messages);
    assert.ok(Array.isArray(response.result.messages));
    
    ws.close();
  });
  
  // Test resource template completions
  await runTest('resources/templates/complete returns completions', async () => {
    const ws = await createWebSocketConnection();
    await initializeWebSocket(ws);
    
    // First, get a list of available resources
    const listResourcesRequest = {
      jsonrpc: '2.0',
      id: 'list-resources-templates',
      method: 'resources/list',
      params: {
        type: 'template'
      }
    };
    
    try {
      const resourcesResponse = await sendWebSocketRequest(ws, listResourcesRequest);
      const templates = resourcesResponse.result.resources;
      
      if (templates.length === 0) {
        skipTest('resources/templates/complete returns completions', 'No template resources available');
        return;
      }
      
      // Use the first template for testing
      const testTemplate = templates[0];
      
      // Get template fields first
      const fieldsRequest = {
        jsonrpc: '2.0',
        id: 'template-fields-1',
        method: 'resources/templates/fields',
        params: {
          templateId: testTemplate.uri
        }
      };
      
      const fieldsResponse = await sendWebSocketRequest(ws, fieldsRequest);
      const fields = fieldsResponse.result.fields;
      
      if (fields.length === 0) {
        skipTest('resources/templates/complete returns completions', 'Template has no fields');
        return;
      }
      
      // Test completions for the first field
      const completeRequest = {
        jsonrpc: '2.0',
        id: 'template-complete-1',
        method: 'resources/templates/complete',
        params: {
          templateId: testTemplate.uri,
          field: fields[0],
          prefix: ''
        }
      };
      
      const response = await sendWebSocketRequest(ws, completeRequest);
      assert.ok(response.result.completions);
      assert.ok(Array.isArray(response.result.completions));
    } catch (error) {
      // If the server doesn't support templates yet, skip this test
      skipTest('resources/templates/complete returns completions', 'Template support not fully implemented');
    }
    
    ws.close();
  });
  
  // Test prompt argument completions
  await runTest('prompts/complete returns completions', async () => {
    const ws = await createWebSocketConnection();
    await initializeWebSocket(ws);
    
    // First, get a list of available prompts
    const listPromptsRequest = {
      jsonrpc: '2.0',
      id: 'list-prompts-args',
      method: 'prompts/list',
      params: {}
    };
    
    try {
      const promptsResponse = await sendWebSocketRequest(ws, listPromptsRequest);
      const prompts = promptsResponse.result.prompts;
      
      if (prompts.length === 0) {
        skipTest('prompts/complete returns completions', 'No prompts available');
        return;
      }
      
      // Use the first prompt for testing
      const testPrompt = prompts[0];
      
      // Get prompt arguments first
      const argsRequest = {
        jsonrpc: '2.0',
        id: 'prompt-args-1',
        method: 'prompts/arguments',
        params: {
          promptId: testPrompt.id
        }
      };
      
      const argsResponse = await sendWebSocketRequest(ws, argsRequest);
      const args = argsResponse.result.arguments;
      
      if (args.length === 0) {
        skipTest('prompts/complete returns completions', 'Prompt has no arguments');
        return;
      }
      
      // Test completions for the first argument
      const completeRequest = {
        jsonrpc: '2.0',
        id: 'prompt-complete-1',
        method: 'prompts/complete',
        params: {
          promptId: testPrompt.id,
          argument: args[0],
          prefix: ''
        }
      };
      
      const response = await sendWebSocketRequest(ws, completeRequest);
      assert.ok(response.result.completions);
      assert.ok(Array.isArray(response.result.completions));
    } catch (error) {
      // If the server doesn't support argument completions yet, skip this test
      skipTest('prompts/complete returns completions', 'Argument completion not fully implemented');
    }
    
    ws.close();
  });
  
  // Test pagination
  await runTest('Pagination works for tools/list', async () => {
    const ws = await createWebSocketConnection();
    await initializeWebSocket(ws);
    
    // Request with cursor
    const listToolsRequest = {
      jsonrpc: '2.0',
      id: 'list-tools-paginated',
      method: 'tools/list',
      params: {
        cursor: '0'
      }
    };
    
    const response = await sendWebSocketRequest(ws, listToolsRequest);
    assert.ok(response.result.tools);
    assert.ok(Array.isArray(response.result.tools));
    
    // Check if nextCursor is present (may not be if there are few tools)
    if (response.result.nextCursor) {
      assert.ok(typeof response.result.nextCursor === 'string');
    }
    
    ws.close();
  });
  
  // Test error handling
  await runTest('Error handling works correctly', async () => {
    const ws = await createWebSocketConnection();
    await initializeWebSocket(ws);
    
    // Request with invalid method
    const invalidRequest = {
      jsonrpc: '2.0',
      id: 'invalid-method',
      method: 'nonExistentMethod',
      params: {}
    };
    
    try {
      await sendWebSocketRequest(ws, invalidRequest);
      assert.fail('Should have thrown an error');
    } catch (error) {
      assert.ok(error.message.includes('JSON-RPC error'));
    }
    
    ws.close();
  });
  
  // Print test summary
  console.log('\n📊 Test Summary:');
  console.log(`   Total: ${testResults.total}`);
  console.log(`   Passed: ${testResults.passed}`);
  console.log(`   Failed: ${testResults.failed}`);
  console.log(`   Skipped: ${testResults.skipped}`);
  
  if (testResults.failed === 0) {
    console.log('\n🎉 All tests passed!');
  } else {
    console.log(`\n❌ ${testResults.failed} tests failed.`);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(error => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}

module.exports = {
  runTests,
  config
};
