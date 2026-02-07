/**
 * API Service
 * Handles API-related operations and tool execution
 */

const axios = require('axios');
const { DEFAULT_HEADERS, ERROR_CODES } = require('../config/constants');

/**
 * Execute an API tool
 * @param {Object} configs - Tool configurations
 * @param {String} toolName - Name of the tool to execute
 * @param {Object} params - Tool parameters
 * @returns {Promise<Object>} Tool execution result
 */
async function executeApiTool(configs, toolName, params = {}) {
  try {
    console.log(`Executing API tool: ${toolName} with params:`, params);
    
    // Get tool configuration from the tools object
    const tool = configs.tools[toolName];
    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`);
    }
    
    // Validate parameters against inputSchema if available
    if (tool.inputSchema) {
      validateToolInput(tool.inputSchema, params);
    }
    
    // Get internal tool configuration
    const internalConfig = tool._internal || {};
    
    // Check if tool has a processor function (for direct execution)
    if (internalConfig.processor && typeof internalConfig.processor === 'function') {
      console.log(`Executing tool ${toolName} with processor function`);
      try {
        const result = await internalConfig.processor(params);
        return result;
      } catch (error) {
        console.error(`Error in processor function for ${toolName}:`, error);
        throw error;
      }
    }
    
    // Get API integration
    const apiIntegrationId = internalConfig.apiIntegrationId;
    const apiIntegrations = Array.isArray(configs.apiIntegrations) ? configs.apiIntegrations : [];
    
    console.log(`Looking for API integration with ID: ${apiIntegrationId}`);
    console.log(`Available API integrations: ${apiIntegrations.map(api => `${api.id} (${api.name})`).join(', ')}`);
    
    const apiIntegration = apiIntegrations.find(api => api.id === apiIntegrationId);
    if (!apiIntegration) {
      throw new Error(`API integration not found: ${apiIntegrationId}`);
    }
    
    console.log(`Found API integration: ${apiIntegration.name} (${apiIntegration.baseUrl})`);
    
    // Process path parameters (replace :param with actual values)
    let processedPath = internalConfig.path;
    
    // If there's an actualPath defined for this endpoint, use that instead
    // This allows for mapping between generic paths like /resources and API-specific paths like /products
    if (internalConfig.actualPath) {
      processedPath = internalConfig.actualPath;
      console.log(`Using actual API path: ${processedPath} instead of generic path: ${internalConfig.path}`);
    }
    
    // Check for dynamic resource path mapping from the client
    // This allows the MCP Inspector to specify the actual resource paths for testing
    if (params && params._resourcesPath && internalConfig.path === '/resources') {
      processedPath = params._resourcesPath;
      console.log(`Using client-provided resources path: ${processedPath}`);
      // Remove this parameter as it's not meant for the API
      delete params._resourcesPath;
    }
    
    if (params && params._resourceIdPath && internalConfig.path === '/resources/:id') {
      processedPath = params._resourceIdPath;
      console.log(`Using client-provided resource ID path: ${processedPath}`);
      // Remove this parameter as it's not meant for the API
      delete params._resourceIdPath;
    }
    
    const pathParams = {};
    const queryParams = {};
    
    // Extract path parameters from the path - support both :param and {param} formats
    // This handles both Express-style and OpenAPI-style path parameters
    const pathParamRegex = /[:]{1}([a-zA-Z0-9_]+)|\{([a-zA-Z0-9_]+)\}/g;
    
    let match;
    while ((match = pathParamRegex.exec(processedPath)) !== null) {
      // The regex has two capture groups - one for :param and one for {param}
      const paramName = match[1] || match[2];
      
      if (params && params[paramName] !== undefined) {
        // Replace both :param and {param} formats
        processedPath = processedPath
          .replace(`:${paramName}`, encodeURIComponent(params[paramName]))
          .replace(`{${paramName}}`, encodeURIComponent(params[paramName]));
        
        pathParams[paramName] = params[paramName];
        console.log(`Set path parameter ${paramName} = ${params[paramName]}`);
      } else {
        throw new Error(`Missing required path parameter: ${paramName}`);
      }
    }
    
    // Separate query parameters (all params that aren't path params or special params)
    if (params) {
      Object.keys(params).forEach(key => {
        // Skip path params and special params that start with underscore
        if (!pathParams[key] && !key.startsWith('_')) {
          queryParams[key] = params[key];
          console.log(`Set query parameter ${key} = ${params[key]}`);
        }
      });
    }
    
    // Prepare request URL
    let url;
    try {
      // Handle both relative and absolute paths
      if (processedPath.startsWith('http')) {
        url = processedPath;
      } else {
        // Ensure baseUrl ends with / if path doesn't start with /
        let baseUrl = apiIntegration.baseUrl;
        if (!baseUrl.endsWith('/') && !processedPath.startsWith('/')) {
          baseUrl = `${baseUrl}/`;
        }
        
        // Remove leading / from path if baseUrl ends with /
        let path = processedPath;
        if (baseUrl.endsWith('/') && path.startsWith('/')) {
          path = path.substring(1);
        }
        
        url = baseUrl + path;
      }
    } catch (error) {
      console.error('Error constructing URL:', error);
      throw new Error(`Invalid URL: ${apiIntegration.baseUrl}${processedPath}`);
    }
    
    console.log(`Making ${internalConfig.method} request to: ${url}`);
    
    // Prepare headers
    const headers = { ...DEFAULT_HEADERS };
    
    // Add auth headers based on API integration auth type
    addAuthHeaders(headers, apiIntegration);
    
    // Make request
    const response = await axios({
      method: internalConfig.method,
      url,
      headers,
      data: internalConfig.method !== 'GET' ? params : undefined,
      params: internalConfig.method === 'GET' ? queryParams : undefined,
      validateStatus: () => true // Don't throw on non-2xx responses
    });
    
    return formatResponse(response);
  } catch (error) {
    console.error('Error executing API tool:', error);
    
    // Format error for JSON-RPC response
    const formattedError = {
      code: ERROR_CODES.INTERNAL_ERROR,
      message: error.message || 'Unknown error executing API tool'
    };
    
    // Add additional context if available
    if (error.response) {
      formattedError.data = {
        status: error.response.status,
        statusText: error.response.statusText,
        headers: error.response.headers,
        data: error.response.data
      };
    }
    
    throw formattedError;
  }
}

/**
 * Validate tool input against JSON Schema
 * @param {Object} schema - JSON Schema for the tool input
 * @param {Object} input - Tool input parameters
 * @throws {Error} If validation fails
 */
function validateToolInput(schema, input) {
  // Basic validation for required fields
  if (schema.required && Array.isArray(schema.required)) {
    for (const requiredField of schema.required) {
      if (input[requiredField] === undefined) {
        throw new Error(`Missing required parameter: ${requiredField}`);
      }
    }
  }
  
  // Type validation for properties
  if (schema.properties) {
    Object.entries(schema.properties).forEach(([propName, propSchema]) => {
      if (input[propName] !== undefined) {
        // Type validation
        if (propSchema.type) {
          const valueType = typeof input[propName];
          let isValid = false;
          
          switch (propSchema.type) {
            case 'string':
              isValid = valueType === 'string';
              break;
            case 'number':
            case 'integer':
              isValid = valueType === 'number';
              break;
            case 'boolean':
              isValid = valueType === 'boolean';
              break;
            case 'object':
              isValid = valueType === 'object' && input[propName] !== null;
              break;
            case 'array':
              isValid = Array.isArray(input[propName]);
              break;
          }
          
          if (!isValid) {
            throw new Error(`Invalid type for parameter ${propName}: expected ${propSchema.type}, got ${valueType}`);
          }
        }
        
        // Enum validation
        if (propSchema.enum && Array.isArray(propSchema.enum)) {
          if (!propSchema.enum.includes(input[propName])) {
            throw new Error(`Invalid value for parameter ${propName}: must be one of [${propSchema.enum.join(', ')}]`);
          }
        }
      }
    });
  }
}

/**
 * Add authentication headers based on API integration auth type
 * @param {Object} headers - Headers object to modify
 * @param {Object} apiIntegration - API integration configuration
 */
function addAuthHeaders(headers, apiIntegration) {
  switch (apiIntegration.authType) {
    case 'bearer':
      headers['Authorization'] = `Bearer ${apiIntegration.authValue}`;
      break;
    case 'basic':
      headers['Authorization'] = `Basic ${Buffer.from(apiIntegration.authValue).toString('base64')}`;
      break;
    case 'apikey':
      // Check if the auth value contains a key-value pair (key:value)
      if (apiIntegration.authValue && apiIntegration.authValue.includes(':')) {
        const [key, value] = apiIntegration.authValue.split(':');
        headers[key] = value;
      } else {
        headers['X-API-Key'] = apiIntegration.authValue;
      }
      break;
    case 'custom':
      // Custom auth should be a JSON string with header key-value pairs
      try {
        const customHeaders = JSON.parse(apiIntegration.authValue);
        Object.assign(headers, customHeaders);
      } catch (e) {
        console.error('Error parsing custom auth headers:', e);
      }
      break;
    case 'none':
    default:
      // No authentication required
      break;
  }
}

/**
 * Format API response
 * @param {Object} response - Axios response object
 * @returns {Object} Formatted response
 */
function formatResponse(response) {
  // Check if response is valid
  if (!response) {
    return { error: 'No response received' };
  }
  
  // Check content type
  const contentType = response.headers && response.headers['content-type'];
  const isJson = contentType && contentType.includes('application/json');
  
  // Format response based on status code
  if (response.status >= 200 && response.status < 300) {
    // Success response
    return isJson ? response.data : { 
      statusCode: response.status,
      statusText: response.statusText,
      data: typeof response.data === 'string' ? response.data : 'Non-text response' 
    };
  } else {
    // Error response
    return {
      error: {
        statusCode: response.status,
        statusText: response.statusText,
        message: isJson && response.data.message ? response.data.message : `Request failed with status ${response.status}`,
        data: isJson ? response.data : { 
          raw: typeof response.data === 'string' ? response.data : 'Non-text response'
        }
      }
    };
  }
}

module.exports = {
  executeApiTool
};
