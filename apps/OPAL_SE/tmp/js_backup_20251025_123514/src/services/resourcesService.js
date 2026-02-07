/**
 * Resources Service
 * Handles resource management and notifications
 */

const logger = require('../logger');
const { sendNotificationToAll, sendNotificationToClient } = require('../utils/notifications');
const fs = require('fs').promises;
const path = require('path');
const mime = require('mime-types');
const crypto = require('crypto');

// Import the findSessionById function from server.js
// This will be available after server.js is loaded and exports the function
let findSessionById;
setTimeout(() => {
  try {
    findSessionById = require('../server').findSessionById;
    logger.info('Successfully imported findSessionById from server.js');
  } catch (error) {
    logger.error('Failed to import findSessionById from server.js:', error);
  }
}, 1000); // Wait for server.js to be fully loaded

// In-memory resource storage (would be replaced with a database in production)
const resourceStore = new Map();
const resourceSubscriptions = new Map(); // Map<resourceUri, Set<sessionId>>

/**
 * Generate a unique URI for a resource
 * 
 * @param {string} namespace - The namespace for the resource
 * @param {string} name - The name of the resource
 * @returns {string} The URI for the resource
 */
function generateResourceUri(namespace, name) {
  const hash = crypto.createHash('md5').update(`${namespace}:${name}:${Date.now()}`).digest('hex');
  return `${namespace}/${name.replace(/[^a-zA-Z0-9_-]/g, '_')}_${hash.substring(0, 8)}`;
}

/**
 * Add or update a resource
 * 
 * @param {Object} configs - The global configs object
 * @param {Object} wss - The WebSocket server instance
 * @param {string} uri - The URI of the resource (optional, will be generated if not provided)
 * @param {Object} resource - The resource data
 * @returns {Object} The created or updated resource
 */
async function setResource(configs, wss, uri, resource) {
  if (!resource.mimeType) {
    throw new Error('Resource must have a mimeType');
  }
  
  // Generate URI if not provided
  if (!uri) {
    const namespace = resource.namespace || 'default';
    const name = resource.name || 'resource';
    uri = generateResourceUri(namespace, name);
  }
  
  // Check if resource already exists
  const isNewResource = !resourceStore.has(uri);
  
  // Create the resource object
  const mcpResource = {
    uri,
    mimeType: resource.mimeType,
    created: isNewResource ? new Date().toISOString() : resourceStore.get(uri).created,
    updated: new Date().toISOString(),
    ...resource
  };
  
  // Add optional title field (MCP 2025-06-18)
  if (resource.title && !mcpResource.title) {
    mcpResource.title = resource.title;
  }
  
  // Add optional description field
  if (resource.description && !mcpResource.description) {
    mcpResource.description = resource.description;
  }
  
  // Store the resource
  resourceStore.set(uri, mcpResource);
  
  logger.info(`${isNewResource ? 'Created' : 'Updated'} resource: ${uri}`);
  
  // Send notification if WebSocket server is available
  if (wss) {
    // Notify all clients about the resource list change
    sendNotificationToAll(wss, 'notifications/resources/list_changed');
    
    // Notify subscribed clients about the specific resource change
    if (resourceSubscriptions.has(uri)) {
      const subscribers = resourceSubscriptions.get(uri);
      for (const sessionId of subscribers) {
        const session = findSessionById(sessionId);
        if (session && session.ws) {
          sendNotificationToClient(
            session.ws, 
            'notifications/resources/changed', 
            { uri }
          );
        }
      }
    }
    
    logger.info('Sent resource change notifications');
  }
  
  return mcpResource;
}

/**
 * Get a resource by URI
 * 
 * @param {string} uri - The URI of the resource
 * @returns {Object|null} The resource or null if not found
 */
function getResource(uri) {
  return resourceStore.get(uri) || null;
}

/**
 * Delete a resource
 * 
 * @param {Object} configs - The global configs object
 * @param {Object} wss - The WebSocket server instance
 * @param {string} uri - The URI of the resource to delete
 * @returns {boolean} True if the resource was deleted, false if it didn't exist
 */
function deleteResource(configs, wss, uri) {
  if (!resourceStore.has(uri)) {
    return false;
  }
  
  // Delete the resource
  resourceStore.delete(uri);
  
  logger.info(`Deleted resource: ${uri}`);
  
  // Send notification if WebSocket server is available
  if (wss) {
    // Notify all clients about the resource list change
    sendNotificationToAll(wss, 'notifications/resources/list_changed');
    
    // Notify subscribed clients about the specific resource deletion
    if (resourceSubscriptions.has(uri)) {
      const subscribers = resourceSubscriptions.get(uri);
      for (const sessionId of subscribers) {
        const session = findSessionById(sessionId);
        if (session && session.ws) {
          sendNotificationToClient(
            session.ws, 
            'notifications/resources/changed', 
            { uri, deleted: true }
          );
        }
      }
      
      // Remove subscriptions for this resource
      resourceSubscriptions.delete(uri);
    }
    
    logger.info('Sent resource deletion notifications');
  }
  
  return true;
}

/**
 * Subscribe to changes for a resource
 * 
 * @param {string} sessionId - The session ID of the subscriber
 * @param {string} uri - The URI of the resource to subscribe to
 * @returns {boolean} True if the subscription was successful
 */
function subscribeToResource(sessionId, uri) {
  if (!resourceStore.has(uri)) {
    throw new Error(`Resource not found: ${uri}`);
  }
  
  // Initialize subscription set if it doesn't exist
  if (!resourceSubscriptions.has(uri)) {
    resourceSubscriptions.set(uri, new Set());
  }
  
  // Add the session to the subscribers
  resourceSubscriptions.get(uri).add(sessionId);
  
  logger.info(`Session ${sessionId} subscribed to resource: ${uri}`);
  return true;
}

/**
 * Unsubscribe from changes for a resource
 * 
 * @param {string} sessionId - The session ID of the subscriber
 * @param {string} uri - The URI of the resource to unsubscribe from
 * @returns {boolean} True if the unsubscription was successful
 */
function unsubscribeFromResource(sessionId, uri) {
  if (!resourceSubscriptions.has(uri)) {
    return false;
  }
  
  // Remove the session from the subscribers
  const subscribers = resourceSubscriptions.get(uri);
  const result = subscribers.delete(sessionId);
  
  // Clean up empty subscription sets
  if (subscribers.size === 0) {
    resourceSubscriptions.delete(uri);
  }
  
  if (result) {
    logger.info(`Session ${sessionId} unsubscribed from resource: ${uri}`);
  }
  
  return result;
}

/**
 * List all resources with pagination
 * 
 * @param {function} paginateItems - The pagination function
 * @param {string|null} cursor - The pagination cursor
 * @returns {Object} The paginated resources
 */
function listResources(paginateItems, cursor = null) {
  // Get all resources as an array
  const resources = Array.from(resourceStore.values());
  
  // Apply pagination
  const { items: paginatedResources, nextCursor } = paginateItems(resources, cursor);
  
  return {
    resources: paginatedResources,
    nextCursor
  };
}

// findSessionById is now imported from server.js

module.exports = {
  setResource,
  getResource,
  deleteResource,
  subscribeToResource,
  unsubscribeFromResource,
  listResources,
  generateResourceUri
};
