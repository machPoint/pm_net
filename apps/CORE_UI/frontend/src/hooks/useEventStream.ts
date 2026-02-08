"use client";

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * ActivityEvent — matches the OPAL_SE EventBus wire format.
 */
export interface ActivityEvent {
  id: string;
  event_type: 'created' | 'updated' | 'deleted' | 'linked' | 'unlinked' | 'status_changed';
  entity_type: string;
  entity_id: string;
  summary: string;
  source: 'ui' | 'agent' | 'api' | 'import' | 'scheduler' | 'gateway' | 'system';
  timestamp: string;
  project_id?: string;
  metadata?: Record<string, any>;
}

export interface UseEventStreamOptions {
  /** Max events to keep in buffer (default: 100) */
  maxEvents?: number;
  /** Auto-reconnect on disconnect (default: true) */
  autoReconnect?: boolean;
  /** Reconnect delay in ms (default: 3000) */
  reconnectDelay?: number;
  /** Filter: only keep events matching this predicate */
  filter?: (event: ActivityEvent) => boolean;
}

export interface UseEventStreamResult {
  /** Buffered events (newest first) */
  events: ActivityEvent[];
  /** Whether the SSE connection is open */
  connected: boolean;
  /** Connection error, if any */
  error: string | null;
  /** Manually reconnect */
  reconnect: () => void;
  /** Clear the event buffer */
  clear: () => void;
}

/**
 * React hook that connects to the OPAL event stream via SSE
 * and maintains a buffer of recent ActivityEvents.
 */
export function useEventStream(options: UseEventStreamOptions = {}): UseEventStreamResult {
  const {
    maxEvents = 100,
    autoReconnect = true,
    reconnectDelay = 3000,
    filter,
  } = options;

  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    // Clean up existing connection
    if (sourceRef.current) {
      sourceRef.current.close();
      sourceRef.current = null;
    }
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    try {
      const source = new EventSource('/api/events/stream');
      sourceRef.current = source;

      source.onopen = () => {
        setConnected(true);
        setError(null);
      };

      source.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);

          // Skip connection confirmation messages
          if (data.type === 'connected') return;

          const event: ActivityEvent = data;

          // Apply filter if provided
          if (filter && !filter(event)) return;

          setEvents((prev) => {
            const next = [event, ...prev];
            return next.slice(0, maxEvents);
          });
        } catch {
          // Ignore unparseable messages (keep-alive comments, etc.)
        }
      };

      source.onerror = () => {
        setConnected(false);
        source.close();
        sourceRef.current = null;

        if (autoReconnect) {
          setError('Disconnected — reconnecting...');
          reconnectTimerRef.current = setTimeout(() => {
            connect();
          }, reconnectDelay);
        } else {
          setError('Event stream disconnected');
        }
      };
    } catch (err: any) {
      setError(`Failed to connect: ${err.message}`);
      setConnected(false);
    }
  }, [maxEvents, autoReconnect, reconnectDelay, filter]);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    connect();

    return () => {
      if (sourceRef.current) {
        sourceRef.current.close();
        sourceRef.current = null;
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
  }, [connect]);

  const clear = useCallback(() => setEvents([]), []);

  return {
    events,
    connected,
    error,
    reconnect: connect,
    clear,
  };
}
