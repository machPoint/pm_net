/**
 * Migration: Add System Graph for OPAL_SE
 * 
 * Creates tables for the systems engineering graph layer:
 * - system_nodes: Engineering artifacts (requirements, tests, components, etc.)
 * - system_edges: Relationships between artifacts
 * - events: Change log for all graph mutations
 * - change_sets: Grouped collections of related events
 * - change_set_events: Many-to-many linking events to change sets
 */

exports.up = async function(knex) {
  console.log('Creating OPAL_SE system graph tables...');

  // ============================================================================
  // system_nodes table
  // ============================================================================
  await knex.schema.createTable('system_nodes', table => {
    table.string('id', 36).primary();
    table.string('project_id', 36).notNullable().index();
    table.string('type').notNullable().index(); // Requirement, Test, Component, etc.
    table.string('name').notNullable();
    table.text('description');
    table.text('external_refs'); // JSON: {jama_id, jira_key, windchill_number, etc.}
    table.string('subsystem').index();
    table.string('status');
    table.string('owner');
    table.text('metadata'); // JSON for flexible additional fields
    table.timestamps(true, true); // created_at, updated_at
    
    // Composite indexes for common queries
    table.index(['project_id', 'type'], 'idx_nodes_project_type');
    table.index(['project_id', 'subsystem'], 'idx_nodes_project_subsystem');
    table.index(['type', 'status'], 'idx_nodes_type_status');
  });

  console.log('Created system_nodes table');

  // ============================================================================
  // system_edges table
  // ============================================================================
  await knex.schema.createTable('system_edges', table => {
    table.string('id', 36).primary();
    table.string('project_id', 36).notNullable().index();
    table.string('from_node_id', 36).notNullable();
    table.string('to_node_id', 36).notNullable();
    table.string('relation_type').notNullable(); // TRACES_TO, VERIFIED_BY, ALLOCATED_TO, etc.
    table.string('source_system'); // jama, jira, core_se, opal_se, etc.
    table.text('rationale');
    table.text('metadata'); // JSON for flexible additional fields
    table.timestamps(true, true); // created_at, updated_at
    
    // Foreign keys to system_nodes
    table.foreign('from_node_id').references('id').inTable('system_nodes').onDelete('CASCADE');
    table.foreign('to_node_id').references('id').inTable('system_nodes').onDelete('CASCADE');
    
    // Indexes for graph traversal
    table.index(['from_node_id', 'relation_type'], 'idx_edges_from_relation');
    table.index(['to_node_id', 'relation_type'], 'idx_edges_to_relation');
    table.index(['project_id', 'relation_type'], 'idx_edges_project_relation');
    
    // Index for finding all edges between two nodes
    table.index(['from_node_id', 'to_node_id'], 'idx_edges_from_to');
  });

  console.log('Created system_edges table');

  // ============================================================================
  // events table
  // ============================================================================
  await knex.schema.createTable('events', table => {
    table.string('id', 36).primary();
    table.string('project_id', 36).notNullable().index();
    table.string('source_system').notNullable().index(); // fds, jama, jira, core_se, opal_se
    table.string('entity_type').notNullable(); // Requirement, Test, SystemEdge, etc.
    table.string('entity_id', 36).notNullable().index();
    table.string('event_type').notNullable(); // created, updated, deleted, linked, unlinked, status_changed
    table.timestamp('timestamp').notNullable().index();
    table.text('diff_payload'); // JSON with before/after state
    table.timestamps(true, true); // created_at, updated_at
    
    // Composite indexes for common event queries
    table.index(['project_id', 'timestamp'], 'idx_events_project_time');
    table.index(['entity_id', 'timestamp'], 'idx_events_entity_time');
    table.index(['source_system', 'timestamp'], 'idx_events_source_time');
    table.index(['entity_type', 'event_type'], 'idx_events_entity_event_type');
  });

  console.log('Created events table');

  // ============================================================================
  // change_sets table
  // ============================================================================
  await knex.schema.createTable('change_sets', table => {
    table.string('id', 36).primary();
    table.string('project_id', 36).notNullable().index();
    table.string('anchor'); // ECN-045, time_window_2024-11-15, PR-123, etc.
    table.string('label'); // Human-readable label
    table.text('stats'); // JSON: {total_events, counts_by_type, counts_by_subsystem, etc.}
    table.timestamps(true, true); // created_at, updated_at
    
    // Indexes
    table.index(['project_id', 'anchor'], 'idx_changeset_project_anchor');
  });

  console.log('Created change_sets table');

  // ============================================================================
  // change_set_events table (many-to-many)
  // ============================================================================
  await knex.schema.createTable('change_set_events', table => {
    table.string('change_set_id', 36).notNullable();
    table.string('event_id', 36).notNullable();
    
    // Foreign keys
    table.foreign('change_set_id').references('id').inTable('change_sets').onDelete('CASCADE');
    table.foreign('event_id').references('id').inTable('events').onDelete('CASCADE');
    
    // Composite primary key
    table.primary(['change_set_id', 'event_id']);
    
    // Index for reverse lookup (events in a change set)
    table.index('change_set_id', 'idx_changeset_events_changeset');
    table.index('event_id', 'idx_changeset_events_event');
  });

  console.log('Created change_set_events table');

  console.log('✅ OPAL_SE system graph migration completed successfully!');
};

exports.down = async function(knex) {
  console.log('Rolling back OPAL_SE system graph tables...');

  // Drop tables in reverse order to respect foreign keys
  await knex.schema.dropTableIfExists('change_set_events');
  console.log('Dropped change_set_events table');
  
  await knex.schema.dropTableIfExists('change_sets');
  console.log('Dropped change_sets table');
  
  await knex.schema.dropTableIfExists('events');
  console.log('Dropped events table');
  
  await knex.schema.dropTableIfExists('system_edges');
  console.log('Dropped system_edges table');
  
  await knex.schema.dropTableIfExists('system_nodes');
  console.log('Dropped system_nodes table');

  console.log('✅ OPAL_SE system graph rollback completed');
};
