/**
 * Migration: Add Provenance Fields to Graph Schema
 * 
 * Adds provenance tracking to nodes and edges:
 * - source: system that created the record (e.g., 'ui', 'agent', 'import', 'api')
 * - source_ref: external reference ID from the originating system
 * - as_of: timestamp when the source data was current (may differ from created_at)
 * - confidence: 0.0-1.0 confidence score (1.0 = human-verified, lower = agent-inferred)
 */

exports.up = async function (knex) {
  console.log('Adding provenance fields to graph schema...');

  // ============================================================================
  // 1. Add provenance columns to nodes
  // ============================================================================
  const nodeColumns = await knex.raw("PRAGMA table_info('nodes')");
  const nodeColumnNames = nodeColumns.map(c => c.name);

  if (!nodeColumnNames.includes('source')) {
    await knex.schema.alterTable('nodes', table => {
      table.string('source').defaultTo('ui');           // originating system
      table.string('source_ref');                        // external reference ID
      table.string('as_of');                             // source data currency timestamp
      table.float('confidence').defaultTo(1.0);          // 0.0-1.0 confidence score
    });
    console.log('Added provenance columns to nodes table');
  } else {
    console.log('Provenance columns already exist on nodes, skipping');
  }

  // ============================================================================
  // 2. Add provenance columns to edges
  // ============================================================================
  const edgeColumns = await knex.raw("PRAGMA table_info('edges')");
  const edgeColumnNames = edgeColumns.map(c => c.name);

  if (!edgeColumnNames.includes('source')) {
    await knex.schema.alterTable('edges', table => {
      table.string('source').defaultTo('ui');           // originating system
      table.string('source_ref');                        // external reference ID
      table.string('as_of');                             // source data currency timestamp
      table.float('confidence').defaultTo(1.0);          // 0.0-1.0 confidence score
    });
    console.log('Added provenance columns to edges table');
  } else {
    console.log('Provenance columns already exist on edges, skipping');
  }

  // ============================================================================
  // 3. Add indexes for provenance queries
  // ============================================================================
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_nodes_source ON nodes(source)');
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_edges_source ON edges(source)');
  console.log('Ensured provenance indexes exist');

  console.log('✅ Provenance migration completed successfully!');
};

exports.down = async function (knex) {
  console.log('Rolling back provenance fields...');

  // SQLite doesn't support DROP COLUMN before 3.35.0
  // For safety, we just log a warning
  console.log('⚠️  SQLite may not support dropping columns. Manual intervention may be needed.');
  console.log('✅ Provenance rollback completed (no-op for SQLite)');
};
