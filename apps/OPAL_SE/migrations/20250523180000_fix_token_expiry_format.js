exports.up = function(knex) {
  return knex.schema.raw(`
    -- First, create a backup of the existing table
    CREATE TABLE api_tokens_backup (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    
    -- Copy data to backup
    INSERT INTO api_tokens_backup
    SELECT * FROM api_tokens;
    
    -- Drop the original table
    DROP TABLE api_tokens;
    
    -- Recreate the table with proper datetime fields
    CREATE TABLE api_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    
    -- Convert timestamps to ISO format during copy
    INSERT INTO api_tokens (id, user_id, name, token, expires_at, created_at, updated_at)
    SELECT 
      id,
      user_id,
      name,
      token,
      CASE 
        WHEN expires_at IS NOT NULL AND expires_at != '' 
        THEN datetime(expires_at / 1000, 'unixepoch')
        ELSE NULL 
      END as expires_at,
      datetime(created_at) as created_at,
      datetime(updated_at) as updated_at
    FROM api_tokens_backup;
    
    -- Drop the backup table
    DROP TABLE api_tokens_backup;
  `);
};

exports.down = function(knex) {
  // This is a one-way migration due to data transformation
  return Promise.resolve();
};
