/**
 * Migration: Add weighted graph support for agent navigation
 *
 * Adds weight and directionality columns to system_edges to enable
 * autonomous agents to make intelligent traversal decisions.
 */

exports.up = async function(knex) {
  // Add weight column to system_edges
  await knex.schema.table('system_edges', (table) => {
    table.float('weight').defaultTo(1.0).notNullable();
    table.boolean('bidirectional').defaultTo(false).notNullable();
    table.text('weight_metadata'); // JSON for weight calculation factors
  });

  // Add indexes for weighted traversal queries
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_edges_weight
    ON system_edges(weight)
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_edges_source_weight
    ON system_edges(from_node_id, weight)
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_edges_target_weight
    ON system_edges(to_node_id, weight)
  `);

  console.log('✅ Added weight, bidirectional, and weight_metadata columns to system_edges');
  console.log('✅ Added indexes for weighted graph traversal');
};

exports.down = async function(knex) {
  // Drop indexes
  await knex.raw('DROP INDEX IF EXISTS idx_edges_weight');
  await knex.raw('DROP INDEX IF EXISTS idx_edges_source_weight');
  await knex.raw('DROP INDEX IF EXISTS idx_edges_target_weight');

  // Remove columns
  await knex.schema.table('system_edges', (table) => {
    table.dropColumn('weight');
    table.dropColumn('bidirectional');
    table.dropColumn('weight_metadata');
  });

  console.log('✅ Removed weight columns and indexes from system_edges');
};
