/**
 * Migration to fix the api_tokens table schema
 */

exports.up = async function(knex) {
  // Check if we need to modify the expires_at column
  const hasColumn = await knex.schema.hasColumn('api_tokens', 'expires_at');
  
  if (hasColumn) {
    // Convert existing timestamp values to proper SQLite timestamps
    await knex.raw(`
      UPDATE api_tokens 
      SET expires_at = datetime(expires_at / 1000, 'unixepoch')
      WHERE expires_at IS NOT NULL AND typeof(expires_at) = 'integer';
    `);
    
    // Change the column type to datetime
    await knex.schema.alterTable('api_tokens', table => {
      table.datetime('expires_at').nullable().alter();
    });
  }
};

exports.down = async function(knex) {
  // This is a one-way migration - we can't easily convert timestamps back to Unix timestamps
  console.warn('Cannot automatically revert timestamp conversion');
};
