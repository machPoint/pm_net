/**
 * Migration: Create Chelex Governance Schema (DEPRECATED)
 * 
 * This migration file is a no-op stub. The original schema has been
 * replaced by the new graph schema in 20260206200000_create_graph_schema.js
 * 
 * This stub exists to maintain knex migration history integrity.
 */

exports.up = async function (knex) {
	console.log('Chelex schema migration - skipped (deprecated, replaced by graph schema)');
};

exports.down = async function (knex) {
	console.log('Chelex schema rollback - skipped (deprecated)');
};
