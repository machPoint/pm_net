/**
 * API Configuration Module
 * Handles loading and managing API integrations from environment variables
 */

/**
 * Load API integrations from environment variables and create tool configurations
 * @returns {Object} Object containing tools and apiIntegrations
 */
const logger = require('../logger');
const validateApiIntegration = require('./validateApiIntegration');

function loadApiIntegrationsFromEnv() {
  const apiIntegrations = [];
  const tools = {};

  // Check for API integrations in environment variables
  // First, look for the MCP_API_COUNT variable
  const apiCount = parseInt(process.env.MCP_API_COUNT || '0', 10);
  logger.info('Found MCP_API_COUNT', { apiCount });

  // Process each API integration
  for (let i = 0; i < apiCount; i++) {
    const name = process.env[`MCP_API_${i}_NAME`];
    const baseUrl = process.env[`MCP_API_${i}_BASE_URL`];
    
    if (!name || !baseUrl) {
      logger.warn('Skipping API integration: missing name or baseUrl', { index: i, name, baseUrl });
      continue;
    }

    logger.info('Loading API integration', { index: i, name, baseUrl });

    // Create the API integration object with a consistent ID format that matches the frontend
    const apiId = name.toLowerCase();
    const api = {
      id: apiId,
      name,
      baseUrl,
      authType: process.env[`MCP_API_${i}_AUTH_TYPE`] || 'none',
      authValue: process.env[`MCP_API_${i}_AUTH_VALUE`] || null,
      endpoints: loadApiEndpoints(i)
    };

    // Validate API integration config
    try {
      validateApiIntegration({
        name: api.name,
        baseUrl: api.baseUrl,
        resourcesPath: process.env[`MCP_API_${i}_RESOURCES_PATH`] || '/resources',
        resourceIdPath: process.env[`MCP_API_${i}_RESOURCE_ID_PATH`] || '/resources/:id',
        endpoints: api.endpoints,
        auth: api.authType !== 'none' ? { type: api.authType, token: api.authValue } : null
      });
    } catch (err) {
      logger.error('Invalid API integration config, skipping', { index: i, name, baseUrl, error: err.message });
      continue;
    }

    apiIntegrations.push(api);
    
    // If no endpoints are defined, create default ones for common RESTful patterns
    if (api.endpoints.length === 0) {
      logger.info('No endpoints defined for API, creating default endpoints', { name });
      
      // Add default endpoints for common RESTful patterns
      const defaultEndpoints = [
        { method: 'GET', path: '/', description: `Get ${name} root` },
        { method: 'GET', path: '/resources', description: `Get all ${name} resources`, 
          actualPath: process.env[`MCP_API_${i}_RESOURCES_PATH`] || '/resources' },
        { method: 'GET', path: '/resources/:id', description: `Get ${name} resource by ID`, 
          parameters: { id: { type: 'string', description: 'Resource ID' } }, 
          required: ['id'],
          actualPath: process.env[`MCP_API_${i}_RESOURCE_ID_PATH`] || '/resources/:id' }
      ];
      
      defaultEndpoints.forEach((endpoint, index) => {
        const endpointId = `${name.toLowerCase()}-${index}`;
        const endpointObj = {
          id: endpointId,
          method: endpoint.method,
          path: endpoint.path,
          description: endpoint.description,
          parameters: endpoint.parameters,
          required: endpoint.required,
          actualPath: endpoint.actualPath,
          api_integration_id: apiId
        };
        
        api.endpoints.push(endpointObj);
      });
    }
    
    // Create tools for each endpoint
    api.endpoints.forEach(endpoint => {
      // Extract meaningful resource name from the path
      let resourceName = '';
      const pathSegments = endpoint.path.split('/').filter(Boolean);
      
      if (pathSegments.length > 0) {
        // Use the last non-parameter segment as the resource name
        for (let i = pathSegments.length - 1; i >= 0; i--) {
          if (!pathSegments[i].includes(':') && !pathSegments[i].includes('{')) {
            resourceName = pathSegments[i];
            break;
          }
        }
        
        // If we couldn't find a non-parameter segment, use the first segment
        if (!resourceName && pathSegments.length > 0) {
          resourceName = pathSegments[0].replace(/[{}:]/g, '');
        }
      }
      
      // If no resource name was found, create a fallback
      if (!resourceName) {
        resourceName = endpoint.path
          .replace(/\//g, '_')
          .replace(/:/g, '')
          .replace(/[{}]/g, '')
          .replace(/^_+|_+$/g, '');
      }
      
      // Create a human-readable operation name
      let operation = endpoint.method.toLowerCase();
      
      // Make the operation more descriptive based on the method and path pattern
      if (endpoint.method === 'GET') {
        if (endpoint.path.includes(':id') || endpoint.path.includes('{id}')) {
          operation = 'get';
        } else {
          operation = 'list';
        }
      } else if (endpoint.method === 'POST') {
        operation = 'create';
      } else if (endpoint.method === 'PUT') {
        operation = 'update';
      } else if (endpoint.method === 'DELETE') {
        operation = 'delete';
      } else if (endpoint.method === 'PATCH') {
        operation = 'patch';
      }
      
      // Construct a more meaningful tool name
      const toolName = `${operation}_${resourceName}`;
      
      console.log(`Creating tool: ${toolName} for endpoint ${endpoint.method} ${endpoint.path}`);
      
      // Create a more descriptive tool description
      let description = endpoint.description || '';
      if (!description) {
        if (operation === 'list') {
          description = `Get all ${resourceName}`;
        } else if (operation === 'get') {
          description = `Get a specific ${resourceName} by ID`;
        } else if (operation === 'create') {
          description = `Create a new ${resourceName}`;
        } else if (operation === 'update') {
          description = `Update a ${resourceName}`;
        } else if (operation === 'delete') {
          description = `Delete a ${resourceName}`;
        } else if (operation === 'patch') {
          description = `Partially update a ${resourceName}`;
        } else {
          description = `${operation} ${resourceName}`;
        }
      }
      
      tools[toolName] = {
        name: toolName,
        description: description,
        method: endpoint.method,
        path: endpoint.path,
        actualPath: endpoint.actualPath,
        apiIntegrationId: apiId
      };
      
      // If the endpoint has parameters, add a schema
      if (endpoint.parameters) {
        tools[toolName].paramsSchema = {
          type: 'object',
          properties: endpoint.parameters,
          required: endpoint.required || []
        };
      }
    });
  }
  
  // Also check for API integrations defined as individual environment variables
  // This is a simpler format for testing and development
  Object.keys(process.env).forEach(key => {
    if (key.startsWith('MCP_API_URL_')) {
      const baseUrl = process.env[key];
      const apiName = key.replace('MCP_API_URL_', '').toLowerCase();
      
      if (baseUrl) {
        console.log(`Found API URL environment variable: ${key}=${baseUrl}`);
        
        // Check if we already have this API
        const existingApi = apiIntegrations.find(api => api.name.toLowerCase() === apiName);
        
        if (!existingApi) {
          // Create a new API integration
          const apiId = apiName;
          const api = {
            id: apiId,
            name: apiName,
            baseUrl,
            authType: 'none',
            authValue: null,
            endpoints: []
          };
          
          // Add default endpoints based on common patterns
          const defaultEndpoints = [
            { method: 'GET', path: '/', description: `Get ${apiName} root` },
            { method: 'GET', path: '/resources', description: `Get all ${apiName} resources`, 
              actualPath: process.env[`MCP_API_${apiName}_RESOURCES_PATH`] || '/resources' },
            { method: 'GET', path: '/resources/:id', description: `Get ${apiName} resource by ID`, 
              parameters: { id: { type: 'string', description: 'Resource ID' } }, 
              required: ['id'],
              actualPath: process.env[`MCP_API_${apiName}_RESOURCE_ID_PATH`] || '/resources/:id' }
          ];
          
          defaultEndpoints.forEach((endpoint, index) => {
            const endpointId = `${apiName}-${index}`;
            const endpointObj = {
              id: endpointId,
              method: endpoint.method,
              path: endpoint.path,
              description: endpoint.description,
              parameters: endpoint.parameters,
              required: endpoint.required,
              actualPath: endpoint.actualPath,
              api_integration_id: apiId
            };
            
            api.endpoints.push(endpointObj);
            
            // Extract meaningful resource name from the path
            let resourceName = '';
            const pathSegments = endpoint.path.split('/').filter(Boolean);
            
            if (pathSegments.length > 0) {
              // Use the last non-parameter segment as the resource name
              for (let i = pathSegments.length - 1; i >= 0; i--) {
                if (!pathSegments[i].includes(':') && !pathSegments[i].includes('{')) {
                  resourceName = pathSegments[i];
                  break;
                }
              }
              
              // If we couldn't find a non-parameter segment, use the first segment
              if (!resourceName && pathSegments.length > 0) {
                resourceName = pathSegments[0].replace(/[{}:]/g, '');
              }
            }
            
            // If no resource name was found, create a fallback
            if (!resourceName) {
              resourceName = endpoint.path
                .replace(/\//g, '_')
                .replace(/:/g, '')
                .replace(/[{}]/g, '')
                .replace(/^_+|_+$/g, '');
            }
            
            // Create a human-readable operation name
            let operation = endpoint.method.toLowerCase();
            
            // Make the operation more descriptive based on the method and path pattern
            if (endpoint.method === 'GET') {
              if (endpoint.path.includes(':id') || endpoint.path.includes('{id}')) {
                operation = 'get';
              } else {
                operation = 'list';
              }
            } else if (endpoint.method === 'POST') {
              operation = 'create';
            } else if (endpoint.method === 'PUT') {
              operation = 'update';
            } else if (endpoint.method === 'DELETE') {
              operation = 'delete';
            } else if (endpoint.method === 'PATCH') {
              operation = 'patch';
            }
            
            // Construct a more meaningful tool name
            const toolName = `${operation}_${resourceName}`;
            
            console.log(`Creating tool: ${toolName} for endpoint ${endpoint.method} ${endpoint.path}`);
            
            // Create a more descriptive tool description
            let description = endpoint.description || '';
            if (!description) {
              if (operation === 'list') {
                description = `Get all ${resourceName}`;
              } else if (operation === 'get') {
                description = `Get a specific ${resourceName} by ID`;
              } else if (operation === 'create') {
                description = `Create a new ${resourceName}`;
              } else if (operation === 'update') {
                description = `Update a ${resourceName}`;
              } else if (operation === 'delete') {
                description = `Delete a ${resourceName}`;
              } else if (operation === 'patch') {
                description = `Partially update a ${resourceName}`;
              } else {
                description = `${operation} ${resourceName}`;
              }
            }
            
            tools[toolName] = {
              name: toolName,
              description: description,
              method: endpoint.method,
              path: endpoint.path,
              actualPath: endpoint.actualPath,
              apiIntegrationId: apiId
            };
            
            // If the endpoint has parameters, add a schema
            if (endpoint.parameters) {
              tools[toolName].paramsSchema = {
                type: 'object',
                properties: endpoint.parameters,
                required: endpoint.required || []
              };
            }
          });
          
          apiIntegrations.push(api);
        }
      }
    }
  });
  
  console.log(`Total API integrations loaded: ${apiIntegrations.length}`);
  console.log(`Total tools created: ${Object.keys(tools).length}`);
  
  // Return both tools and apiIntegrations
  return { tools, apiIntegrations };
}

/**
 * Load endpoints for a specific API integration
 * @param {number} apiIndex - Index of the API integration
 * @returns {Array} Array of endpoint configurations
 */
function loadApiEndpoints(apiIndex) {
  const endpoints = [];
  let endpointIndex = 0;
  
  while (process.env[`MCP_API_${apiIndex}_ENDPOINT_${endpointIndex}_METHOD`]) {
    const method = process.env[`MCP_API_${apiIndex}_ENDPOINT_${endpointIndex}_METHOD`];
    const path = process.env[`MCP_API_${apiIndex}_ENDPOINT_${endpointIndex}_PATH`];
    
    if (method && path) {
      const endpoint = {
        id: `${apiIndex}-${endpointIndex}`,
        method,
        path,
        description: process.env[`MCP_API_${apiIndex}_ENDPOINT_${endpointIndex}_DESCRIPTION`] || `${method} ${path}`,
        api_integration_id: process.env[`MCP_API_${apiIndex}_NAME`].toLowerCase()
      };
      
      // Check for parameters
      const paramsStr = process.env[`MCP_API_${apiIndex}_ENDPOINT_${endpointIndex}_PARAMS`];
      const actualPath = process.env[`MCP_API_${apiIndex}_ENDPOINT_${endpointIndex}_ACTUAL_PATH`];
      
      if (actualPath) {
        endpoint.actualPath = actualPath;
      }
      
      if (paramsStr) {
        try {
          endpoint.parameters = JSON.parse(paramsStr);
        } catch (e) {
          console.error(`Error parsing parameters for endpoint ${apiIndex}-${endpointIndex}:`, e);
        }
      }
      
      // Check for required parameters
      const requiredStr = process.env[`MCP_API_${apiIndex}_ENDPOINT_${endpointIndex}_REQUIRED`];
      if (requiredStr) {
        try {
          endpoint.required = JSON.parse(requiredStr);
        } catch (e) {
          console.error(`Error parsing required parameters for endpoint ${apiIndex}-${endpointIndex}:`, e);
        }
      }
      
      endpoints.push(endpoint);
    }
    
    endpointIndex++;
  }
  
  return endpoints;
}

module.exports = {
  loadApiIntegrationsFromEnv
};
