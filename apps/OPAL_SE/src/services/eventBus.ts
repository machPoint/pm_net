/**
 * Event Bus Service
 * 
 * In-process pub/sub for real-time event broadcasting.
 * Supports SSE (Server-Sent Events) connections for pushing
 * activity events to frontend clients.
 */

import { EventEmitter } from 'events';
import { Response } from 'express';
import logger from '../logger';

// ============================================================================
// Types
// ============================================================================

/**
 * Unified activity event pushed to clients via SSE.
 * This is the wire format — lightweight, serializable.
 */
export interface ActivityEvent {
  id: string;
  /** Event category */
  event_type: 'created' | 'updated' | 'deleted' | 'linked' | 'unlinked' | 'status_changed';
  /** What kind of entity changed */
  entity_type: string;
  /** ID of the changed entity */
  entity_id: string;
  /** Human-readable summary */
  summary: string;
  /** Who/what caused the event */
  source: 'ui' | 'agent' | 'api' | 'import' | 'scheduler' | 'gateway' | 'system';
  /** ISO timestamp */
  timestamp: string;
  /** Optional project scope */
  project_id?: string;
  /** Optional extra data */
  metadata?: Record<string, any>;
}

// ============================================================================
// Bus Implementation
// ============================================================================

class EventBus {
  private emitter = new EventEmitter();
  private clients: Set<Response> = new Set();
  private stats = {
    total_events_emitted: 0,
    total_events_since_start: 0,
    connected_clients: 0,
  };

  constructor() {
    // Allow many listeners (one per SSE client)
    this.emitter.setMaxListeners(200);
  }

  /**
   * Emit an activity event to all connected SSE clients
   * and any in-process listeners.
   */
  emit(event: ActivityEvent): void {
    this.stats.total_events_emitted++;
    this.stats.total_events_since_start++;

    // Broadcast to in-process listeners
    this.emitter.emit('activity', event);

    // Broadcast to SSE clients
    const payload = `data: ${JSON.stringify(event)}\n\n`;
    const deadClients: Response[] = [];

    for (const client of this.clients) {
      try {
        client.write(payload);
      } catch {
        deadClients.push(client);
      }
    }

    // Clean up dead clients
    for (const dead of deadClients) {
      this.clients.delete(dead);
      this.stats.connected_clients = this.clients.size;
    }

    logger.debug(`[EventBus] Emitted ${event.event_type} on ${event.entity_type}:${event.entity_id} to ${this.clients.size} clients`);
  }

  /**
   * Register an SSE client connection.
   * Returns a cleanup function to call on disconnect.
   */
  addSSEClient(res: Response): () => void {
    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    // Send initial connection event
    res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`);

    this.clients.add(res);
    this.stats.connected_clients = this.clients.size;

    logger.info(`[EventBus] SSE client connected (total: ${this.clients.size})`);

    // Return cleanup function
    return () => {
      this.clients.delete(res);
      this.stats.connected_clients = this.clients.size;
      logger.info(`[EventBus] SSE client disconnected (total: ${this.clients.size})`);
    };
  }

  /**
   * Subscribe to activity events in-process (for services that need to react).
   */
  on(listener: (event: ActivityEvent) => void): () => void {
    this.emitter.on('activity', listener);
    return () => this.emitter.off('activity', listener);
  }

  /**
   * Get bus statistics
   */
  getStats() {
    return { ...this.stats };
  }
}

// Singleton
export const eventBus = new EventBus();
