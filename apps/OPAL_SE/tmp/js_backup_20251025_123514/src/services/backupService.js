/**
 * Backup Service for OPAL server
 * Handles database backup and restore operations
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');
const db = require('../config/database');
const logger = require('../logger');

// Promisify exec
const execPromise = util.promisify(exec);

// Backup directory
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(__dirname, '../../backups');

/**
 * Create a database backup
 * @param {string} name - Backup name (optional)
 * @returns {Promise<Object>} - Backup information
 */
async function createBackup(name = '') {
  try {
    // Ensure backup directory exists
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
    
    // Generate backup filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = name ? `${name}_${timestamp}` : timestamp;
    const filename = `${backupName}.sqlite`;
    const backupPath = path.join(BACKUP_DIR, filename);
    
    // Get database connection info from knex config
    const { connection } = db.client.config;
    const dbFilePath = connection.filename;
    
    // For SQLite, we can just copy the database file
    logger.info(`Creating SQLite database backup: ${backupPath}`);
    
    // Copy the SQLite database file
    fs.copyFileSync(dbFilePath, backupPath);
    
    // Get file size
    const stats = fs.statSync(backupPath);
    const fileSizeInBytes = stats.size;
    const fileSizeInMB = fileSizeInBytes / (1024 * 1024);
    
    logger.info(`Backup created successfully: ${backupPath} (${fileSizeInMB.toFixed(2)} MB)`);
    
    return {
      name: backupName,
      filename,
      path: backupPath,
      timestamp: new Date().toISOString(),
      size: fileSizeInBytes
    };
  } catch (error) {
    logger.error('Backup creation error:', error);
    throw new Error(`Failed to create backup: ${error.message}`);
  }
}

/**
 * Restore database from backup
 * @param {string} backupPath - Path to backup file
 * @returns {Promise<boolean>} - Success status
 */
async function restoreBackup(backupPath) {
  try {
    // Check if backup file exists
    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup file not found: ${backupPath}`);
    }
    
    // Get database connection info from knex config
    const { connection } = db.client.config;
    const dbFilePath = connection.filename;
    
    // For SQLite, we need to close the database connection first
    logger.info(`Restoring database from backup: ${backupPath}`);
    
    // Destroy the current Knex connection pool
    await db.destroy();
    
    // Copy the backup file to the database file location
    fs.copyFileSync(backupPath, dbFilePath);
    
    // Reinitialize the database connection
    const knexConfig = require('../../knexfile');
    const environment = process.env.NODE_ENV || 'development';
    Object.assign(db, knex(knexConfig[environment]));
    
    logger.info('Database restored successfully');
    
    return true;
  } catch (error) {
    logger.error('Backup restoration error:', error);
    throw new Error(`Failed to restore backup: ${error.message}`);
  }
}

/**
 * List available backups
 * @returns {Promise<Array>} - List of backups
 */
async function listBackups() {
  try {
    // Ensure backup directory exists
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
      return [];
    }
    
    // Get list of backup files
    const files = fs.readdirSync(BACKUP_DIR).filter(file => file.endsWith('.sqlite'));
    
    // Get details for each backup
    const backups = files.map(filename => {
      const backupPath = path.join(BACKUP_DIR, filename);
      const stats = fs.statSync(backupPath);
      
      return {
        filename,
        path: backupPath,
        timestamp: stats.mtime.toISOString(),
        size: stats.size
      };
    });
    
    // Sort by timestamp (newest first)
    backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    return backups;
  } catch (error) {
    logger.error('Error listing backups:', error);
    throw new Error(`Failed to list backups: ${error.message}`);
  }
}

/**
 * Delete a backup
 * @param {string} filename - Backup filename
 * @returns {Promise<boolean>} - Success status
 */
async function deleteBackup(filename) {
  try {
    const backupPath = path.join(BACKUP_DIR, filename);
    
    // Check if backup file exists
    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup file not found: ${filename}`);
    }
    
    // Delete file
    fs.unlinkSync(backupPath);
    
    logger.info(`Backup deleted: ${filename}`);
    
    return true;
  } catch (error) {
    logger.error('Backup deletion error:', error);
    throw new Error(`Failed to delete backup: ${error.message}`);
  }
}

module.exports = {
  createBackup,
  restoreBackup,
  listBackups,
  deleteBackup
};
