/**
 * Backup Service for OPAL server
 * Handles database backup and restore operations
 */

import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import db from '../config/database';
import logger from '../logger';

const execPromise = promisify(exec);

const BACKUP_DIR = process.env.BACKUP_DIR || path.join(__dirname, '../../backups');

interface BackupInfo {
  name?: string;
  filename: string;
  path: string;
  timestamp: string;
  size: number;
}

/**
 * Create a database backup
 */
export async function createBackup(name: string = ''): Promise<BackupInfo> {
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
    const dbFilePath = (connection as any).filename;
    
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
  } catch (error: any) {
    logger.error('Backup creation error:', error);
    throw new Error(`Failed to create backup: ${error.message}`);
  }
}

/**
 * Restore database from backup
 */
export async function restoreBackup(backupPath: string): Promise<boolean> {
  try {
    // Check if backup file exists
    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup file not found: ${backupPath}`);
    }
    
    // Get database connection info from knex config
    const { connection } = db.client.config;
    const dbFilePath = (connection as any).filename;
    
    logger.info(`Restoring database from backup: ${backupPath}`);
    
    // Destroy the current Knex connection pool
    await db.destroy();
    
    // Copy the backup file to the database file location
    fs.copyFileSync(backupPath, dbFilePath);
    
    logger.info('Database restored successfully');
    
    return true;
  } catch (error: any) {
    logger.error('Backup restoration error:', error);
    throw new Error(`Failed to restore backup: ${error.message}`);
  }
}

/**
 * List available backups
 */
export async function listBackups(): Promise<BackupInfo[]> {
  try {
    // Ensure backup directory exists
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
      return [];
    }
    
    // Get list of backup files
    const files = fs.readdirSync(BACKUP_DIR).filter(file => file.endsWith('.sqlite'));
    
    // Get details for each backup
    const backups: BackupInfo[] = files.map(filename => {
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
    backups.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    return backups;
  } catch (error: any) {
    logger.error('Error listing backups:', error);
    throw new Error(`Failed to list backups: ${error.message}`);
  }
}

/**
 * Delete a backup
 */
export async function deleteBackup(filename: string): Promise<boolean> {
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
  } catch (error: any) {
    logger.error('Backup deletion error:', error);
    throw new Error(`Failed to delete backup: ${error.message}`);
  }
}
