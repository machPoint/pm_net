/**
 * Database shutdown handler for OPAL server
 * Ensures proper cleanup of database connections during server shutdown
 */

import type { Knex } from 'knex';
import logger from '../logger';

/**
 * Safely close database connection
 * @param db - Knex database instance
 * @returns Success status
 */
export async function safelyCloseDatabase(db: Knex | null | undefined): Promise<boolean> {
  if (!db) {
    logger.warn('No database connection to close');
    return true;
  }

  try {
    logger.info('Synchronizing SQLite database to disk...');
    
    // For SQLite, ensure all data is written to disk before closing
    if (db.client && (db.client as any).config && (db.client as any).config.client === 'sqlite3') {
      try {
        // Attempt to checkpoint the WAL file
        await db.raw('PRAGMA wal_checkpoint(FULL)').timeout(2000);
      } catch (checkpointError: any) {
        // Log but continue if checkpoint fails
        logger.warn(`WAL checkpoint failed: ${checkpointError.message}`);
      }
    }
    
    // Close the connection pool
    await db.destroy();
    logger.info('Database connection closed successfully');
    return true;
  } catch (error) {
    logger.error('Error closing database connection:', error);
    return false;
  }
}
