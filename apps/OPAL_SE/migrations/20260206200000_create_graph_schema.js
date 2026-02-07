/**
 * Migration: Create Graph Schema for Network PM Core v1.0
 * 
 * Creates the core graph tables:
 * - nodes: All entities (tasks, plans, approvals, users, agents, etc.)
 * - edges: All relationships with weights
 * - node_history: Immutable audit trail for nodes
 * - edge_history: Immutable audit trail for edges
 */

exports.up = async function (knex) {
  console.log('Creating Graph Schema tables...');

  // ============================================================================
  // 1. nodes table
  // ============================================================================
  const hasNodes = await knex.schema.hasTable('nodes');
  if (!hasNodes) {
    await knex.schema.createTable('nodes', table => {
      table.string('id', 36).primary();
      table.string('node_type').notNullable();
      table.string('schema_layer').notNullable().defaultTo('pm_core');
      table.string('title').notNullable();
      table.text('description');
      table.string('status').notNullable();
      table.text('metadata'); // JSON
      table.string('created_by', 36).notNullable();
      table.string('created_at').notNullable();
      table.string('updated_at').notNullable();
      table.string('deleted_at');
      table.integer('version').notNullable().defaultTo(1);
    });
    console.log('Created nodes table');
  } else {
    console.log('Nodes table already exists, skipping');
  }

  // Create indexes (use IF NOT EXISTS for SQLite)
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_nodes_type ON nodes(node_type)');
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_nodes_type_status ON nodes(node_type, status)');
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_nodes_created_by ON nodes(created_by)');
  console.log('Ensured nodes indexes exist');

  // ============================================================================
  // 2. edges table
  // ============================================================================
  const hasEdges = await knex.schema.hasTable('edges');
  if (!hasEdges) {
    await knex.schema.createTable('edges', table => {
      table.string('id', 36).primary();
      table.string('edge_type').notNullable();
      table.string('source_node_id', 36).notNullable();
      table.string('target_node_id', 36).notNullable();
      table.string('schema_layer').notNullable().defaultTo('pm_core');
      table.float('weight').notNullable().defaultTo(1.0);
      table.text('weight_metadata'); // JSON
      table.string('directionality').notNullable().defaultTo('directed');
      table.text('metadata'); // JSON
      table.string('created_by', 36).notNullable();
      table.string('created_at').notNullable();
      table.string('updated_at').notNullable();
      table.string('deleted_at');
      table.integer('version').notNullable().defaultTo(1);

      // Foreign keys
      table.foreign('source_node_id').references('id').inTable('nodes');
      table.foreign('target_node_id').references('id').inTable('nodes');
    });
    console.log('Created edges table');
  } else {
    console.log('Edges table already exists, skipping');
  }

  // Create indexes
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_edges_source ON edges(source_node_id)');
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_edges_target ON edges(target_node_id)');
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_edges_type ON edges(edge_type)');
  console.log('Ensured edges indexes exist');

  // ============================================================================
  // 3. node_history table (append-only)
  // ============================================================================
  const hasNodeHistory = await knex.schema.hasTable('node_history');
  if (!hasNodeHistory) {
    await knex.schema.createTable('node_history', table => {
      table.string('id', 36).primary();
      table.string('node_id', 36).notNullable();
      table.integer('version').notNullable();
      table.string('operation').notNullable(); // create, update, delete
      table.string('changed_by', 36).notNullable();
      table.string('changed_at').notNullable();
      table.text('change_reason');
      table.text('before_state'); // JSON, null for create
      table.text('after_state').notNullable(); // JSON
    });
    console.log('Created node_history table');
  } else {
    console.log('node_history table already exists, skipping');
  }

  await knex.raw('CREATE INDEX IF NOT EXISTS idx_node_history_node ON node_history(node_id)');
  console.log('Ensured node_history index exists');

  // ============================================================================
  // 4. edge_history table (append-only)
  // ============================================================================
  const hasEdgeHistory = await knex.schema.hasTable('edge_history');
  if (!hasEdgeHistory) {
    await knex.schema.createTable('edge_history', table => {
      table.string('id', 36).primary();
      table.string('edge_id', 36).notNullable();
      table.integer('version').notNullable();
      table.string('operation').notNullable(); // create, update, delete
      table.string('changed_by', 36).notNullable();
      table.string('changed_at').notNullable();
      table.text('change_reason');
      table.text('before_state'); // JSON, null for create
      table.text('after_state').notNullable(); // JSON
    });
    console.log('Created edge_history table');
  } else {
    console.log('edge_history table already exists, skipping');
  }

  await knex.raw('CREATE INDEX IF NOT EXISTS idx_edge_history_edge ON edge_history(edge_id)');
  console.log('Ensured edge_history index exists');

  // ============================================================================
  // 5. Bootstrap: Create system user (only if not exists)
  // ============================================================================
  const systemUserId = '00000000-0000-0000-0000-000000000001';
  const existingSystem = await knex('nodes').where({ id: systemUserId }).first();

  if (!existingSystem) {
    const now = new Date().toISOString();

    await knex('nodes').insert({
      id: systemUserId,
      node_type: 'user',
      schema_layer: 'pm_core',
      title: 'System',
      description: 'System user for automated operations',
      status: 'active',
      metadata: JSON.stringify({
        email: 'system@local',
        role: 'system',
        authority_levels: ['system']
      }),
      created_by: systemUserId,
      created_at: now,
      updated_at: now,
      version: 1
    });

    // Record history for bootstrap
    await knex('node_history').insert({
      id: '00000000-0000-0000-0000-000000000002',
      node_id: systemUserId,
      version: 1,
      operation: 'create',
      changed_by: systemUserId,
      changed_at: now,
      change_reason: 'System bootstrap',
      before_state: null,
      after_state: JSON.stringify({
        id: systemUserId,
        node_type: 'user',
        schema_layer: 'pm_core',
        title: 'System',
        status: 'active'
      })
    });
    console.log('Created system user');
  } else {
    console.log('System user already exists, skipping');
  }

  console.log('✅ Graph Schema migration completed successfully!');
};

exports.down = async function (knex) {
  console.log('Rolling back Graph Schema tables...');

  await knex.schema.dropTableIfExists('edge_history');
  await knex.schema.dropTableIfExists('node_history');
  await knex.schema.dropTableIfExists('edges');
  await knex.schema.dropTableIfExists('nodes');

  console.log('✅ Graph Schema rollback completed');
};

