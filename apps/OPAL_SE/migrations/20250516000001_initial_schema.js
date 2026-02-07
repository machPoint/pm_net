/**
 * Initial database schema for OPAL server
 * Creates tables for users, sessions, memories, api_tokens, and tool_runs
 * Adapted for SQLite in development
 */

exports.up = async function(knex) {
  // Create users table
  await knex.schema.createTable('users', table => {
    // For SQLite, use string type for UUID to ensure compatibility
    table.string('id', 36).primary(); 
    table.string('username').notNullable().unique();
    table.string('email').unique();
    table.string('password_hash').notNullable();
    table.string('role').defaultTo('user');
    table.text('settings').defaultTo('{}');
    table.timestamps(true, true);
  });

  // Create sessions table
  await knex.schema.createTable('sessions', table => {
    table.string('id', 36).primary(); // Use string for UUID in SQLite
    table.string('user_id', 36).references('id').inTable('users').onDelete('CASCADE');
    table.string('token').notNullable().unique();
    table.boolean('is_active').defaultTo(true);
    table.timestamp('expires_at').notNullable();
    table.timestamps(true, true);
  });

  // Create memories table with text-based embedding storage for SQLite
  await knex.schema.createTable('memories', table => {
    table.string('id', 36).primary(); // Use string for UUID in SQLite
    table.string('user_id', 36).references('id').inTable('users').onDelete('CASCADE');
    table.string('title').notNullable();
    table.text('content').notNullable();
    table.text('embedding').notNullable(); // Store embedding as JSON string in SQLite
    table.text('metadata').defaultTo('{}');
    table.timestamps(true, true);
  });

  // Create api_tokens table
  await knex.schema.createTable('api_tokens', table => {
    table.string('id', 36).primary(); // Use string for UUID in SQLite
    table.string('user_id', 36).references('id').inTable('users').onDelete('CASCADE');
    table.string('name').notNullable();
    table.string('token').notNullable().unique();
    table.text('permissions').defaultTo('{}');
    table.timestamp('expires_at').nullable();
    table.timestamps(true, true);
  });

  // Create tool_runs table for auditing
  await knex.schema.createTable('tool_runs', table => {
    table.string('id', 36).primary(); // Use string for UUID in SQLite
    table.string('user_id', 36).references('id').inTable('users').onDelete('SET NULL');
    table.string('tool_name').notNullable();
    table.text('parameters').defaultTo('{}');
    table.text('result').nullable();
    table.string('status').defaultTo('completed');
    table.integer('duration_ms').nullable();
    table.timestamp('executed_at').defaultTo(knex.fn.now());
    table.timestamps(true, true);
  });
  
  // SQLite PRAGMA settings will be set after migrations
};

exports.down = async function(knex) {
  // Drop tables in reverse order
  await knex.schema.dropTableIfExists('tool_runs');
  await knex.schema.dropTableIfExists('api_tokens');
  await knex.schema.dropTableIfExists('memories');
  await knex.schema.dropTableIfExists('sessions');
  await knex.schema.dropTableIfExists('users');
};
