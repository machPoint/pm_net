/**
 * Resources Service
 * Handles resource management and notifications
 */

import logger from '../logger';
import { sendNotificationToAll, sendNotificationToClient } from '../utils/notifications';
import { promises as fs } from 'fs';
import path from 'path';
import mime from 'mime-types';
import crypto from 'crypto';
import { Resource } from '../types/mcp';
import { WebSocketServer, WebSocket } from 'ws';

// In-memory resource storage
const resourceStore = new Map<string, any>();
const resourceSubscriptions = new Map<string, Set<string>>();

// Placeholder for findSessionById - will be set by server
let findSessionById: ((sessionId: string) => any) | undefined;

export function setFindSessionById(fn: (sessionId: string) => any) {
  findSessionById = fn;
}

interface Configs {
  [key: string]: any;
}

/**
 * Generate a unique URI for a resource
 */
export function generateResourceUri(namespace: string, name: string): string {
  const hash = crypto.createHash('md5').update(`${namespace}:${name}:${Date.now()}`).digest('hex');
  return `${namespace}/${name.replace(/[^a-zA-Z0-9_-]/g, '_')}_${hash.substring(0, 8)}`;
}

/**
 * Add or update a resource
 */
export async function setResource(
  configs: Configs,
  wss: WebSocketServer | null,
  uri: string | null,
  resource: Partial<Resource> & { mimeType: string; namespace?: string; name?: string }
): Promise<any> {
  if (!resource.mimeType) {
    throw new Error('Resource must have a mimeType');
  }
  
  // Generate URI if not provided
  if (!uri) {
    const namespace = resource.namespace || 'default';
    const name = resource.name || 'resource';
    uri = generateResourceUri(namespace, name);
  }
  
  const isNewResource = !resourceStore.has(uri);
  
  const { mimeType, ...resourceRest } = resource;
  
  const mcpResource = {
    uri,
    mimeType,
    created: isNewResource ? new Date().toISOString() : resourceStore.get(uri).created,
    updated: new Date().toISOString(),
    ...resourceRest
  };
  
  if (resource.title && !mcpResource.title) {
    mcpResource.title = resource.title;
  }
  
  if (resource.description && !mcpResource.description) {
    mcpResource.description = resource.description;
  }
  
  resourceStore.set(uri, mcpResource);
  
  logger.info(`${isNewResource ? 'Created' : 'Updated'} resource: ${uri}`);
  
  if (wss) {
    sendNotificationToAll(wss, 'notifications/resources/list_changed');
    
    if (resourceSubscriptions.has(uri)) {
      const subscribers = resourceSubscriptions.get(uri)!;
      for (const sessionId of subscribers) {
        if (findSessionById) {
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
    }
    
    logger.info('Sent resource change notifications');
  }
  
  return mcpResource;
}

/**
 * Get a resource by URI
 */
export function getResource(uri: string): any | null {
  return resourceStore.get(uri) || null;
}

/**
 * Delete a resource
 */
export function deleteResource(
  configs: Configs,
  wss: WebSocketServer | null,
  uri: string
): boolean {
  if (!resourceStore.has(uri)) {
    return false;
  }
  
  resourceStore.delete(uri);
  
  logger.info(`Deleted resource: ${uri}`);
  
  if (wss) {
    sendNotificationToAll(wss, 'notifications/resources/list_changed');
    
    if (resourceSubscriptions.has(uri)) {
      const subscribers = resourceSubscriptions.get(uri)!;
      for (const sessionId of subscribers) {
        if (findSessionById) {
          const session = findSessionById(sessionId);
          if (session && session.ws) {
            sendNotificationToClient(
              session.ws, 
              'notifications/resources/changed', 
              { uri, deleted: true }
            );
          }
        }
      }
      
      resourceSubscriptions.delete(uri);
    }
    
    logger.info('Sent resource deletion notifications');
  }
  
  return true;
}

/**
 * Subscribe to changes for a resource
 */
export function subscribeToResource(sessionId: string, uri: string): boolean {
  if (!resourceStore.has(uri)) {
    throw new Error(`Resource not found: ${uri}`);
  }
  
  if (!resourceSubscriptions.has(uri)) {
    resourceSubscriptions.set(uri, new Set());
  }
  
  resourceSubscriptions.get(uri)!.add(sessionId);
  
  logger.info(`Session ${sessionId} subscribed to resource: ${uri}`);
  return true;
}

/**
 * Unsubscribe from changes for a resource
 */
export function unsubscribeFromResource(sessionId: string, uri: string): boolean {
  if (!resourceSubscriptions.has(uri)) {
    return false;
  }
  
  const subscribers = resourceSubscriptions.get(uri)!;
  const result = subscribers.delete(sessionId);
  
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
 */
export function listResources(
  paginateItems: (items: any[], cursor: string | null) => { items: any[]; nextCursor: string | null },
  cursor: string | null = null
): { resources: any[]; nextCursor: string | null } {
  const resources = Array.from(resourceStore.values());
  
  const { items: paginatedResources, nextCursor } = paginateItems(resources, cursor);
  
  return {
    resources: paginatedResources,
    nextCursor
  };
}
