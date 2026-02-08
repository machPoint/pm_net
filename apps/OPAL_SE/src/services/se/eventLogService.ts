/**
 * Event Log Service
 * 
 * Records and queries events for all system graph mutations.
 * Every change to nodes and edges should generate an event.
 */

import { v4 as uuidv4 } from 'uuid';
import db from '../../config/database';
import logger from '../../logger';
import {
  Event,
  EventFilter,
  EventType,
  SourceSystem,
  DiffPayload,
  SystemNode,
  SystemEdge,
  EventRecord,
  TimelineEntry
} from '../../types/se';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert database record to Event
 */
function recordToEvent(record: EventRecord): Event {
  return {
    ...record,
    diff_payload: JSON.parse(record.diff_payload || '{}')
  };
}

/**
 * Convert Event to database record
 */
function eventToRecord(event: Partial<Event>): Partial<EventRecord> {
  const record: any = { ...event };
  if (event.diff_payload) {
    record.diff_payload = JSON.stringify(event.diff_payload);
  }
  return record;
}

/**
 * Compute diff between before and after states
 */
function computeDiff(
  before: Partial<SystemNode | SystemEdge> | null,
  after: Partial<SystemNode | SystemEdge> | null
): DiffPayload {
  const diff: DiffPayload = {
    before: before || undefined,
    after: after || undefined,
    fields_changed: [],
    details: {}
  };

  if (before && after) {
    // Compute changed fields
    const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
    for (const key of allKeys) {
      if (JSON.stringify((before as any)[key]) !== JSON.stringify((after as any)[key])) {
        diff.fields_changed!.push(key);
        diff.details![key] = {
          old: (before as any)[key],
          new: (after as any)[key]
        };
      }
    }
  }

  return diff;
}

// ============================================================================
// Event Recording
// ============================================================================

/**
 * Record an event in the event log
 */
export async function recordEvent(
  source_system: SourceSystem,
  entity_type: string,
  entity_id: string,
  event_type: EventType,
  diff_payload: DiffPayload,
  project_id: string
): Promise<Event> {
  try {
    const id = uuidv4();
    const now = new Date();

    const eventData = eventToRecord({
      id,
      project_id,
      source_system,
      entity_type,
      entity_id,
      event_type,
      timestamp: now,
      diff_payload,
      created_at: now,
      updated_at: now
    });

    const [created] = await db('events')
      .insert(eventData)
      .returning('*');

    const result = recordToEvent(created);
    logger.info(`Recorded event: ${event_type} on ${entity_type} ${entity_id} (source: ${source_system})`);

    return result;
  } catch (error: any) {
    logger.error('Error recording event:', error);
    throw new Error(`Failed to record event: ${error.message}`);
  }
}

/**
 * Record a node creation event
 */
export async function recordNodeCreated(
  node: SystemNode,
  source_system: SourceSystem
): Promise<Event> {
  return recordEvent(
    source_system,
    node.type,
    node.id,
    'created',
    {
      after: node,
      details: { node_name: node.name, node_type: node.type }
    },
    node.project_id
  );
}

/**
 * Record a node update event
 */
export async function recordNodeUpdated(
  before: SystemNode,
  after: SystemNode,
  source_system: SourceSystem
): Promise<Event> {
  const diff = computeDiff(before, after);
  
  return recordEvent(
    source_system,
    after.type,
    after.id,
    'updated',
    diff,
    after.project_id
  );
}

/**
 * Record a node deletion event
 */
export async function recordNodeDeleted(
  node: SystemNode,
  source_system: SourceSystem
): Promise<Event> {
  return recordEvent(
    source_system,
    node.type,
    node.id,
    'deleted',
    {
      before: node,
      details: { node_name: node.name, node_type: node.type }
    },
    node.project_id
  );
}

/**
 * Record an edge creation event (relationship linked)
 */
export async function recordEdgeCreated(
  edge: SystemEdge,
  source_system: SourceSystem
): Promise<Event> {
  return recordEvent(
    source_system,
    'SystemEdge',
    edge.id,
    'linked',
    {
      after: edge,
      details: {
        from_node: edge.from_node_id,
        to_node: edge.to_node_id,
        relation_type: edge.relation_type
      }
    },
    edge.project_id
  );
}

/**
 * Record an edge deletion event (relationship unlinked)
 */
export async function recordEdgeDeleted(
  edge: SystemEdge,
  source_system: SourceSystem
): Promise<Event> {
  return recordEvent(
    source_system,
    'SystemEdge',
    edge.id,
    'unlinked',
    {
      before: edge,
      details: {
        from_node: edge.from_node_id,
        to_node: edge.to_node_id,
        relation_type: edge.relation_type
      }
    },
    edge.project_id
  );
}

/**
 * Record a status change event
 */
export async function recordStatusChanged(
  entity_type: string,
  entity_id: string,
  old_status: string,
  new_status: string,
  project_id: string,
  source_system: SourceSystem
): Promise<Event> {
  return recordEvent(
    source_system,
    entity_type,
    entity_id,
    'status_changed',
    {
      fields_changed: ['status'],
      details: {
        old_status,
        new_status
      }
    },
    project_id
  );
}

// ============================================================================
// Event Querying
// ============================================================================

/**
 * Query events by filter criteria
 */
export async function getEventsByFilter(filters: EventFilter): Promise<Event[]> {
  try {
    let query = db('events').select('*');

    // Apply filters
    if (filters.project_id) {
      query = query.where('project_id', filters.project_id);
    }

    if (filters.source_system) {
      if (Array.isArray(filters.source_system)) {
        query = query.whereIn('source_system', filters.source_system);
      } else {
        query = query.where('source_system', filters.source_system);
      }
    }

    if (filters.entity_type) {
      if (Array.isArray(filters.entity_type)) {
        query = query.whereIn('entity_type', filters.entity_type);
      } else {
        query = query.where('entity_type', filters.entity_type);
      }
    }

    if (filters.entity_id) {
      if (Array.isArray(filters.entity_id)) {
        query = query.whereIn('entity_id', filters.entity_id);
      } else {
        query = query.where('entity_id', filters.entity_id);
      }
    }

    if (filters.event_type) {
      if (Array.isArray(filters.event_type)) {
        query = query.whereIn('event_type', filters.event_type);
      } else {
        query = query.where('event_type', filters.event_type);
      }
    }

    // Time window filter
    if (filters.start_time) {
      query = query.where('timestamp', '>=', filters.start_time);
    }

    if (filters.end_time) {
      query = query.where('timestamp', '<=', filters.end_time);
    }

    // Order by timestamp descending (most recent first)
    query = query.orderBy('timestamp', 'desc');

    // Apply pagination
    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    if (filters.offset) {
      query = query.offset(filters.offset);
    }

    const records = await query;
    return records.map(recordToEvent);
  } catch (error: any) {
    logger.error('Error querying events:', error);
    throw new Error(`Failed to query events: ${error.message}`);
  }
}

/**
 * Get events for a specific entity
 */
export async function getEntityHistory(
  entity_id: string,
  limit: number = 50
): Promise<Event[]> {
  return getEventsByFilter({
    entity_id,
    limit
  });
}

/**
 * Get recent events for a project
 */
export async function getRecentEvents(
  project_id: string,
  hours: number = 24,
  limit: number = 100
): Promise<Event[]> {
  const start_time = new Date(Date.now() - hours * 60 * 60 * 1000);
  
  return getEventsByFilter({
    project_id,
    start_time,
    limit
  });
}

/**
 * Get events in a time window
 */
export async function getEventsInWindow(
  project_id: string,
  start_time: Date,
  end_time: Date,
  limit?: number
): Promise<Event[]> {
  return getEventsByFilter({
    project_id,
    start_time,
    end_time,
    limit
  });
}

/**
 * Get event count by type for a project
 */
export async function getEventCountsByType(
  project_id: string,
  start_time?: Date,
  end_time?: Date
): Promise<Record<EventType, number>> {
  try {
    let query = db('events')
      .where({ project_id })
      .select('event_type')
      .count('* as count')
      .groupBy('event_type');

    if (start_time) {
      query = query.where('timestamp', '>=', start_time);
    }

    if (end_time) {
      query = query.where('timestamp', '<=', end_time);
    }

    const counts = await query;
    const result: any = {};
    
    for (const row of counts) {
      result[row.event_type] = parseInt(row.count as string);
    }

    return result;
  } catch (error: any) {
    logger.error('Error getting event counts:', error);
    throw new Error(`Failed to get event counts: ${error.message}`);
  }
}

/**
 * Get event count by source system
 */
export async function getEventCountsBySource(
  project_id: string,
  start_time?: Date,
  end_time?: Date
): Promise<Record<SourceSystem, number>> {
  try {
    let query = db('events')
      .where({ project_id })
      .select('source_system')
      .count('* as count')
      .groupBy('source_system');

    if (start_time) {
      query = query.where('timestamp', '>=', start_time);
    }

    if (end_time) {
      query = query.where('timestamp', '<=', end_time);
    }

    const counts = await query;
    const result: any = {};
    
    for (const row of counts) {
      result[row.source_system] = parseInt(row.count as string);
    }

    return result;
  } catch (error: any) {
    logger.error('Error getting event counts by source:', error);
    throw new Error(`Failed to get event counts by source: ${error.message}`);
  }
}

// ============================================================================
// Timeline Construction
// ============================================================================

/**
 * Build a timeline from events
 */
export async function buildTimeline(
  entity_ids: string[],
  start_time?: Date,
  end_time?: Date,
  limit?: number
): Promise<TimelineEntry[]> {
  try {
    const events = await getEventsByFilter({
      entity_id: entity_ids,
      start_time,
      end_time,
      limit
    });

    const timeline: TimelineEntry[] = events.map(event => {
      // Generate human-readable summary
      let summary = '';
      switch (event.event_type) {
        case 'created':
          summary = `Created ${event.entity_type}`;
          break;
        case 'updated':
          const changedFields = event.diff_payload.fields_changed || [];
          summary = `Updated ${changedFields.join(', ')}`;
          break;
        case 'deleted':
          summary = `Deleted ${event.entity_type}`;
          break;
        case 'linked':
          summary = `Linked to another artifact`;
          break;
        case 'unlinked':
          summary = `Unlinked from another artifact`;
          break;
        case 'status_changed':
          summary = `Status changed`;
          break;
      }

      return {
        timestamp: event.timestamp,
        entity_id: event.entity_id,
        entity_type: event.entity_type,
        event_type: event.event_type,
        summary,
        details: event.diff_payload.details
      };
    });

    return timeline;
  } catch (error: any) {
    logger.error('Error building timeline:', error);
    throw new Error(`Failed to build timeline: ${error.message}`);
  }
}

/**
 * Get activity summary for a time period
 */
export async function getActivitySummary(
  project_id: string,
  start_time: Date,
  end_time: Date
): Promise<{
  total_events: number;
  by_type: Record<EventType, number>;
  by_source: Record<SourceSystem, number>;
  by_entity_type: Record<string, number>;
}> {
  try {
    const [totalCount] = await db('events')
      .where({ project_id })
      .whereBetween('timestamp', [start_time, end_time])
      .count('* as count');

    const by_type = await getEventCountsByType(project_id, start_time, end_time);
    const by_source = await getEventCountsBySource(project_id, start_time, end_time);

    // Get counts by entity type
    const entityTypeCounts = await db('events')
      .where({ project_id })
      .whereBetween('timestamp', [start_time, end_time])
      .select('entity_type')
      .count('* as count')
      .groupBy('entity_type');

    const by_entity_type: any = {};
    for (const row of entityTypeCounts) {
      by_entity_type[row.entity_type] = parseInt(row.count as string);
    }

    return {
      total_events: parseInt(totalCount.count as string),
      by_type,
      by_source,
      by_entity_type
    };
  } catch (error: any) {
    logger.error('Error getting activity summary:', error);
    throw new Error(`Failed to get activity summary: ${error.message}`);
  }
}

/**
 * Delete old events (for archival/cleanup)
 */
export async function deleteEventsOlderThan(days: number): Promise<number> {
  try {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const deleted = await db('events')
      .where('timestamp', '<', cutoffDate)
      .del();

    logger.info(`Deleted ${deleted} events older than ${days} days`);
    return deleted;
  } catch (error: any) {
    logger.error('Error deleting old events:', error);
    throw new Error(`Failed to delete old events: ${error.message}`);
  }
}
