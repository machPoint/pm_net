/**
 * API Configuration Module
 * Handles loading and managing API integrations from environment variables
 */

import logger from '../logger';
import { ApiIntegration, ApiEndpoint } from '../types/config';
import { Tool } from '../types/mcp';
import validateApiIntegration from './validateApiIntegration';

interface ToolDefinition extends Tool {
  method: string;
  path: string;
  actualPath?: string;
  apiIntegrationId: string;
}

export interface ApiConfigResult {
  tools: Record<string, ToolDefinition>;
  apiIntegrations: ApiIntegration[];
}

/**
 * Load API integrations from environment variables and create tool configurations
 */
export function loadApiIntegrationsFromEnv(): ApiConfigResult {
  const apiIntegrations: ApiIntegration[] = [];
  const tools: Record<string, ToolDefinition> = {};

  // Check for API integrations in environment variables
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

    // Create the API integration object
    const apiId = name.toLowerCase();
    const api: ApiIntegration = {
      id: apiId,
      name,
      baseUrl,
      authType: (process.env[`MCP_API_${i}_AUTH_TYPE`] as ApiIntegration['authType']) || 'none',
      authValue: process.env[`MCP_API_${i}_AUTH_VALUE`] || null,
      endpoints: loadApiEndpoints(i, name)
    };

    // Validate API integration config
    try {
      validateApiIntegration({
        name: api.name,
        baseUrl: api.baseUrl,
        resourcesPath: process.env[`MCP_API_${i}_RESOURCES_PATH`] || '/resources',
        resourceIdPath: process.env[`MCP_API_${i}_RESOURCE_ID_PATH`] || '/resources/:id',
        endpoints: api.endpoints,
        auth: api.authType !== 'none' ? { type: api.authType, token: api.authValue || '' } : null
      });
    } catch (err: any) {
      logger.error('Invalid API integration config, skipping', { index: i, name, baseUrl, error: err.message });
      continue;
    }

    apiIntegrations.push(api);

    // If no endpoints are defined, create default ones
    if (!api.endpoints || api.endpoints.length === 0) {
      api.endpoints = [];
      logger.info('No endpoints defined for API, creating default endpoints', { name });

      const defaultEndpoints: ApiEndpoint[] = [
        { method: 'GET', path: '/', description: `Get ${name} root` },
        { method: 'GET', path: '/resources', description: `Get all ${name} resources` },
        { method: 'GET', path: '/resources/:id', description: `Get ${name} resource by ID` }
      ];

      api.endpoints.push(...defaultEndpoints);
    }

    // Create tools for each endpoint
    api.endpoints.forEach(endpoint => {
      const resourceName = extractResourceName(endpoint.path);
      const operation = determineOperation(endpoint.method, endpoint.path);
      const toolName = `${operation}_${resourceName}`;

      logger.info(`Creating tool: ${toolName} for endpoint ${endpoint.method} ${endpoint.path}`);

      tools[toolName] = {
        name: toolName,
        description: endpoint.description || generateDescription(operation, resourceName),
        inputSchema: {
          type: 'object',
          properties: {}
        },
        method: endpoint.method,
        path: endpoint.path,
        apiIntegrationId: apiId
      };
    });
  }

  // Check for simple API URL environment variables
  Object.keys(process.env).forEach(key => {
    if (key.startsWith('MCP_API_URL_')) {
      const baseUrl = process.env[key];
      const apiName = key.replace('MCP_API_URL_', '').toLowerCase();

      if (baseUrl && !apiIntegrations.find(api => api.name.toLowerCase() === apiName)) {
        const apiId = apiName;
        const api: ApiIntegration = {
          id: apiId,
          name: apiName,
          baseUrl,
          authType: 'none',
          authValue: null,
          endpoints: [
            { method: 'GET', path: '/', description: `Get ${apiName} root` },
            { method: 'GET', path: '/resources', description: `Get all ${apiName} resources` },
            { method: 'GET', path: '/resources/:id', description: `Get ${apiName} resource by ID` }
          ]
        };

        apiIntegrations.push(api);

        // @ts-ignore
        api.endpoints.forEach(endpoint => {
          const resourceName = extractResourceName(endpoint.path);
          const operation = determineOperation(endpoint.method, endpoint.path);
          const toolName = `${operation}_${resourceName}`;

          tools[toolName] = {
            name: toolName,
            description: endpoint.description || generateDescription(operation, resourceName),
            inputSchema: {
              type: 'object',
              properties: {}
            },
            method: endpoint.method,
            path: endpoint.path,
            apiIntegrationId: apiId
          };
        });
      }
    }
  });

  logger.info(`Total API integrations loaded: ${apiIntegrations.length}`);
  logger.info(`Total tools created: ${Object.keys(tools).length}`);

  return { tools, apiIntegrations };
}

/**
 * Load endpoints for a specific API integration
 */
function loadApiEndpoints(apiIndex: number, _apiName: string): ApiEndpoint[] {
  const endpoints: ApiEndpoint[] = [];
  let endpointIndex = 0;

  while (process.env[`MCP_API_${apiIndex}_ENDPOINT_${endpointIndex}_METHOD`]) {
    const method = process.env[`MCP_API_${apiIndex}_ENDPOINT_${endpointIndex}_METHOD`] as ApiEndpoint['method'];
    const path = process.env[`MCP_API_${apiIndex}_ENDPOINT_${endpointIndex}_PATH`];

    if (method && path) {
      const endpoint: ApiEndpoint = {
        method,
        path,
        description: process.env[`MCP_API_${apiIndex}_ENDPOINT_${endpointIndex}_DESCRIPTION`] || `${method} ${path}`
      };

      endpoints.push(endpoint);
    }

    endpointIndex++;
  }

  return endpoints;
}

/**
 * Extract resource name from endpoint path
 */
function extractResourceName(path: string): string {
  const pathSegments = path.split('/').filter(Boolean);

  if (pathSegments.length > 0) {
    for (let i = pathSegments.length - 1; i >= 0; i--) {
      if (!pathSegments[i].includes(':') && !pathSegments[i].includes('{')) {
        return pathSegments[i];
      }
    }

    if (pathSegments.length > 0) {
      return pathSegments[0].replace(/[{}:]/g, '');
    }
  }

  return path
    .replace(/\//g, '_')
    .replace(/:/g, '')
    .replace(/[{}]/g, '')
    .replace(/^_+|_+$/g, '') || 'resource';
}

/**
 * Determine operation type from method and path
 */
function determineOperation(method: string, path: string): string {
  if (method === 'GET') {
    return path.includes(':id') || path.includes('{id}') ? 'get' : 'list';
  } else if (method === 'POST') {
    return 'create';
  } else if (method === 'PUT') {
    return 'update';
  } else if (method === 'DELETE') {
    return 'delete';
  } else if (method === 'PATCH') {
    return 'patch';
  }
  return method.toLowerCase();
}

/**
 * Generate description for tool
 */
function generateDescription(operation: string, resourceName: string): string {
  const descriptions: Record<string, string> = {
    list: `Get all ${resourceName}`,
    get: `Get a specific ${resourceName} by ID`,
    create: `Create a new ${resourceName}`,
    update: `Update a ${resourceName}`,
    delete: `Delete a ${resourceName}`,
    patch: `Partially update a ${resourceName}`
  };

  return descriptions[operation] || `${operation} ${resourceName}`;
}
