/**
 * Change Set Service
 * 
 * Groups related events into change sets and computes statistics.
 * Change sets can be anchored on ECNs, time windows, or other logical groupings.
 */

import { v4 as uuidv4 } from 'uuid';
import db from '../../config/database';
import logger from '../../logger';
import {
  ChangeSet,
  ChangeSetStats,
  Event,
  EventType,
  ChangeSetRecord
} from '../../types/se';
import { getEventsByFilter, getEventsInWindow } from './eventLogService';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert database record to ChangeSet
 */
function recordToChangeSet(record: ChangeSetRecord): ChangeSet {
  return {
    ...record,
    stats: JSON.parse(record.stats || '{}')
  };
}

/**
 * Convert ChangeSet to database record
 */
function changeSetToRecord(changeSet: Partial<ChangeSet>): Partial<ChangeSetRecord> {
  const record: any = { ...changeSet };
  if (changeSet.stats) {
    record.stats = JSON.stringify(changeSet.stats);
  }
  return record;
}

/**
 * Compute statistics for a collection of events
 */
function computeStats(events: Event[]): ChangeSetStats {
  const stats: ChangeSetStats = {
    total_events: events.length,
    counts_by_type: {},
    counts_by_domain: {},
    counts_by_event_type: {} as Record<EventType, number>,
    affected_nodes: 0,
    affected_edges: 0
  };

  const uniqueNodes = new Set<string>();
  const uniqueEdges = new Set<string>();

  for (const event of events) {
    // Count by entity type
    if (!stats.counts_by_type[event.entity_type]) {
      stats.counts_by_type[event.entity_type] = 0;
    }
    stats.counts_by_type[event.entity_type]++;

    // Count by event type
    if (!stats.counts_by_event_type[event.event_type]) {
      stats.counts_by_event_type[event.event_type] = 0;
    }
    stats.counts_by_event_type[event.event_type]++;

    // Track unique nodes and edges
    if (event.entity_type === 'SystemEdge') {
      uniqueEdges.add(event.entity_id);
    } else {
      uniqueNodes.add(event.entity_id);
    }

    // Count by domain (if available in details)
    if (event.diff_payload.details?.domain) {
      const domain = event.diff_payload.details.domain;
      if (!stats.counts_by_domain[domain]) {
        stats.counts_by_domain[domain] = 0;
      }
      stats.counts_by_domain[domain]++;
    }
  }

  stats.affected_nodes = uniqueNodes.size;
  stats.affected_edges = uniqueEdges.size;

  return stats;
}

// ============================================================================
// Change Set CRUD Operations
// ============================================================================

/**
 * Create a new change set
 */
export async function createChangeSet(
  project_id: string,
  anchor: string,
  label: string,
  events: Event[]
): Promise<ChangeSet> {
  try {
    const id = uuidv4();
    const now = new Date();
    const stats = computeStats(events);

    const changeSetData = changeSetToRecord({
      id,
      project_id,
      anchor,
      label,
      stats,
      created_at: now,
      updated_at: now
    });

    // Insert change set
    const [created] = await db('change_sets')
      .insert(changeSetData)
      .returning('*');

    // Link events to change set
    if (events.length > 0) {
      const links = events.map(event => ({
        change_set_id: id,
        event_id: event.id
      }));

      await db('change_set_events').insert(links);
    }

    const result = recordToChangeSet(created);
    logger.info(`Created change set: ${id} (${events.length} events, anchor: ${anchor})`);

    return result;
  } catch (error: any) {
    logger.error('Error creating change set:', error);
    throw new Error(`Failed to create change set: ${error.message}`);
  }
}

/**
 * Get a change set by ID
 */
export async function getChangeSet(id: string): Promise<ChangeSet | null> {
  try {
    const record = await db('change_sets')
      .where({ id })
      .first();

    if (!record) {
      return null;
    }

    return recordToChangeSet(record);
  } catch (error: any) {
    logger.error(`Error getting change set ${id}:`, error);
    throw new Error(`Failed to get change set: ${error.message}`);
  }
}

/**
 * Get change sets for a project
 */
export async function getChangeSetsByProject(
  project_id: string,
  limit: number = 50,
  offset: number = 0
): Promise<ChangeSet[]> {
  try {
    const records = await db('change_sets')
      .where({ project_id })
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    return records.map(recordToChangeSet);
  } catch (error: any) {
    logger.error('Error getting change sets by project:', error);
    throw new Error(`Failed to get change sets: ${error.message}`);
  }
}

/**
 * Get change set by anchor
 */
export async function getChangeSetByAnchor(
  project_id: string,
  anchor: string
): Promise<ChangeSet | null> {
  try {
    const record = await db('change_sets')
      .where({ project_id, anchor })
      .first();

    if (!record) {
      return null;
    }

    return recordToChangeSet(record);
  } catch (error: any) {
    logger.error(`Error getting change set by anchor ${anchor}:`, error);
    throw new Error(`Failed to get change set by anchor: ${error.message}`);
  }
}

/**
 * Delete a change set
 */
export async function deleteChangeSet(id: string): Promise<boolean> {
  try {
    const deleted = await db('change_sets')
      .where({ id })
      .del();

    if (deleted > 0) {
      logger.info(`Deleted change set: ${id}`);
      return true;
    }

    return false;
  } catch (error: any) {
    logger.error(`Error deleting change set ${id}:`, error);
    throw new Error(`Failed to delete change set: ${error.message}`);
  }
}

// ============================================================================
// Change Set Event Management
// ============================================================================

/**
 * Get events belonging to a change set
 */
export async function getChangeSetEvents(change_set_id: string): Promise<Event[]> {
  try {
    const eventIds = await db('change_set_events')
      .where({ change_set_id })
      .select('event_id');

    if (eventIds.length === 0) {
      return [];
    }

    const ids = eventIds.map(row => row.event_id);
    return getEventsByFilter({ ids });
  } catch (error: any) {
    logger.error(`Error getting change set events for ${change_set_id}:`, error);
    throw new Error(`Failed to get change set events: ${error.message}`);
  }
}

/**
 * Add an event to a change set
 */
export async function attachEventToChangeSet(
  change_set_id: string,
  event_id: string
): Promise<void> {
  try {
    // Check if already attached
    const existing = await db('change_set_events')
      .where({ change_set_id, event_id })
      .first();

    if (existing) {
      return; // Already attached
    }

    await db('change_set_events').insert({
      change_set_id,
      event_id
    });

    logger.info(`Attached event ${event_id} to change set ${change_set_id}`);

    // Recompute stats
    await recomputeChangeSetStats(change_set_id);
  } catch (error: any) {
    logger.error(`Error attaching event to change set:`, error);
    throw new Error(`Failed to attach event to change set: ${error.message}`);
  }
}

/**
 * Remove an event from a change set
 */
export async function detachEventFromChangeSet(
  change_set_id: string,
  event_id: string
): Promise<void> {
  try {
    await db('change_set_events')
      .where({ change_set_id, event_id })
      .del();

    logger.info(`Detached event ${event_id} from change set ${change_set_id}`);

    // Recompute stats
    await recomputeChangeSetStats(change_set_id);
  } catch (error: any) {
    logger.error(`Error detaching event from change set:`, error);
    throw new Error(`Failed to detach event from change set: ${error.message}`);
  }
}

/**
 * Recompute statistics for a change set
 */
export async function recomputeChangeSetStats(change_set_id: string): Promise<void> {
  try {
    const events = await getChangeSetEvents(change_set_id);
    const stats = computeStats(events);

    await db('change_sets')
      .where({ id: change_set_id })
      .update({
        stats: JSON.stringify(stats),
        updated_at: new Date()
      });

    logger.info(`Recomputed stats for change set ${change_set_id}`);
  } catch (error: any) {
    logger.error(`Error recomputing change set stats:`, error);
    throw new Error(`Failed to recompute change set stats: ${error.message}`);
  }
}

// ============================================================================
// Change Set Construction
// ============================================================================

/**
 * Build a change set for a time window
 */
export async function buildChangeSetForWindow(
  project_id: string,
  start_time: Date,
  end_time: Date,
  label?: string
): Promise<ChangeSet> {
  try {
    // Get events in window
    const events = await getEventsInWindow(project_id, start_time, end_time);

    if (events.length === 0) {
      logger.warn(`No events found in window for project ${project_id}`);
    }

    // Generate anchor
    const startStr = start_time.toISOString().split('T')[0];
    const endStr = end_time.toISOString().split('T')[0];
    const anchor = `time_window_${startStr}_to_${endStr}`;

    // Generate label if not provided
    if (!label) {
      label = `Changes from ${startStr} to ${endStr}`;
    }

    // Check if change set already exists
    const existing = await getChangeSetByAnchor(project_id, anchor);
    if (existing) {
      logger.info(`Change set already exists for anchor ${anchor}`);
      return existing;
    }

    // Create change set
    return createChangeSet(project_id, anchor, label, events);
  } catch (error: any) {
    logger.error('Error building change set for window:', error);
    throw new Error(`Failed to build change set for window: ${error.message}`);
  }
}

/**
 * Build a change set for the last N hours
 */
export async function buildChangeSetForLastHours(
  project_id: string,
  hours: number,
  label?: string
): Promise<ChangeSet> {
  const end_time = new Date();
  const start_time = new Date(Date.now() - hours * 60 * 60 * 1000);

  if (!label) {
    label = `Changes in last ${hours} hours`;
  }

  return buildChangeSetForWindow(project_id, start_time, end_time, label);
}

/**
 * Build a change set for yesterday
 */
export async function buildChangeSetForYesterday(project_id: string): Promise<ChangeSet> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  return buildChangeSetForWindow(
    project_id,
    yesterday,
    today,
    `Changes on ${yesterday.toISOString().split('T')[0]}`
  );
}

/**
 * Build a change set for a specific anchor (e.g., ECN, PR)
 */
export async function buildChangeSetForAnchor(
  project_id: string,
  anchor: string,
  label: string,
  event_ids: string[]
): Promise<ChangeSet> {
  try {
    // Check if change set already exists
    const existing = await getChangeSetByAnchor(project_id, anchor);
    if (existing) {
      logger.info(`Change set already exists for anchor ${anchor}`);
      return existing;
    }

    // Get events
    const events = await getEventsByFilter({ ids: event_ids });

    // Create change set
    return createChangeSet(project_id, anchor, label, events);
  } catch (error: any) {
    logger.error('Error building change set for anchor:', error);
    throw new Error(`Failed to build change set for anchor: ${error.message}`);
  }
}

// ============================================================================
// Change Set Analysis
// ============================================================================

/**
 * Get summary statistics for all change sets in a project
 */
export async function getProjectChangeSummary(project_id: string): Promise<{
  total_change_sets: number;
  total_events: number;
  most_active_domains: Array<{ domain: string; count: number }>;
  most_common_event_types: Array<{ event_type: EventType; count: number }>;
}> {
  try {
    const changeSets = await getChangeSetsByProject(project_id, 1000);

    let totalEvents = 0;
    const domainCounts: Record<string, number> = {};
    const eventTypeCounts: Record<EventType, number> = {} as any;

    for (const changeSet of changeSets) {
      totalEvents += changeSet.stats.total_events;

      // Aggregate domain counts
      for (const [domain, count] of Object.entries(changeSet.stats.counts_by_domain)) {
        domainCounts[domain] = (domainCounts[domain] || 0) + count;
      }

      // Aggregate event type counts
      for (const [eventType, count] of Object.entries(changeSet.stats.counts_by_event_type)) {
        eventTypeCounts[eventType as EventType] = (eventTypeCounts[eventType as EventType] || 0) + count;
      }
    }

    // Sort and get top domains
    const mostActiveDomains = Object.entries(domainCounts)
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Sort and get most common event types
    const mostCommonEventTypes = Object.entries(eventTypeCounts)
      .map(([event_type, count]) => ({ event_type: event_type as EventType, count }))
      .sort((a, b) => b.count - a.count);

    return {
      total_change_sets: changeSets.length,
      total_events: totalEvents,
      most_active_domains: mostActiveDomains,
      most_common_event_types: mostCommonEventTypes
    };
  } catch (error: any) {
    logger.error('Error getting project change summary:', error);
    throw new Error(`Failed to get project change summary: ${error.message}`);
  }
}

/**
 * Compare two change sets
 */
export async function compareChangeSets(
  changeSet1Id: string,
  changeSet2Id: string
): Promise<{
  common_entities: number;
  unique_to_first: number;
  unique_to_second: number;
  similar_patterns: string[];
}> {
  try {
    const [events1, events2] = await Promise.all([
      getChangeSetEvents(changeSet1Id),
      getChangeSetEvents(changeSet2Id)
    ]);

    const entities1 = new Set(events1.map(e => e.entity_id));
    const entities2 = new Set(events2.map(e => e.entity_id));

    const common = new Set([...entities1].filter(id => entities2.has(id)));
    const uniqueToFirst = new Set([...entities1].filter(id => !entities2.has(id)));
    const uniqueToSecond = new Set([...entities2].filter(id => !entities1.has(id)));

    // Identify similar patterns
    const patterns: string[] = [];
    const types1 = new Set(events1.map(e => e.entity_type));
    const types2 = new Set(events2.map(e => e.entity_type));
    const commonTypes = [...types1].filter(t => types2.has(t));

    if (commonTypes.length > 0) {
      patterns.push(`Both affect: ${commonTypes.join(', ')}`);
    }

    return {
      common_entities: common.size,
      unique_to_first: uniqueToFirst.size,
      unique_to_second: uniqueToSecond.size,
      similar_patterns: patterns
    };
  } catch (error: any) {
    logger.error('Error comparing change sets:', error);
    throw new Error(`Failed to compare change sets: ${error.message}`);
  }
}
