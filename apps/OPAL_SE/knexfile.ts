/**
 * Knex configuration file for OPAL server
 * Supports different environments: development, test, production
 */

import type { Knex } from 'knex';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const config: { [key: string]: Knex.Config } = {
  development: {
    client: 'sqlite3',
    connection: {
      filename: process.env.DB_FILE || './database/opal.sqlite3'
    },
    useNullAsDefault: true,
    migrations: {
      directory: './migrations',
      tableName: 'knex_migrations'
    },
    seeds: {
      directory: './seeds'
    },
    // Configure SQLite for better data persistence
    pool: {
      min: 1,
      max: 1,
      afterCreate: (conn: any, cb: Function) => {
        // Enable foreign key constraints
        conn.run('PRAGMA foreign_keys = ON', () => {
          // Set journal mode to WAL for better durability
          conn.run('PRAGMA journal_mode = WAL', () => {
            // Set synchronous mode to FULL for maximum data safety
            conn.run('PRAGMA synchronous = FULL', cb);
          });
        });
      }
    }
  },
  test: {
    client: 'pg',
    connection: {
      host: process.env.TEST_DB_HOST || 'localhost',
      port: parseInt(process.env.TEST_DB_PORT || '5432'),
      user: process.env.TEST_DB_USER || 'postgres',
      password: process.env.TEST_DB_PASSWORD || 'postgres',
      database: process.env.TEST_DB_NAME || 'opal_test'
    },
    migrations: {
      directory: './migrations',
      tableName: 'knex_migrations'
    },
    seeds: {
      directory: './seeds/test'
    }
  },
  production: {
    client: 'pg',
    connection: {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: { rejectUnauthorized: false }
    },
    migrations: {
      directory: './migrations',
      tableName: 'knex_migrations'
    },
    pool: {
      min: 2,
      max: 10
    }
  }
};

export default config;
module.exports = config;
