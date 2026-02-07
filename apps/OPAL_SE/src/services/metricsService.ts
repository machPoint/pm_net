/**
 * Metrics Service for OPAL Server
 * Tracks API usage, performance metrics, and server health
 */

import os from 'os';
import fs from 'fs/promises';
import path from 'path';
import logger from '../logger';
import { Request } from 'express';

interface RequestHistoryEntry {
  timestamp: number;
  method: string;
  ip: string;
  userAgent?: string;
}

interface ResponseTimeEntry {
  timestamp: number;
  method: string;
  responseTime: number;
  isError: boolean;
}

interface ErrorEntry {
  timestamp: number;
  method: string;
  message: string;
}

interface DiskUsage {
  total: number;
  free: number;
  used: number;
  percentage: number;
}

interface HealthMetrics {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  version: string;
  nodejs: string;
  cpuUsage: number;
  memoryUsage: {
    total: number;
    free: number;
    used: number;
    percentage: number;
  };
  diskUsage: DiskUsage;
  apiStats: {
    totalRequests: number;
    requestsPerMinute: number;
    averageResponseTime: number;
    activeSessions: number;
  };
  database: {
    size: number;
    status: string;
    lastBackup: string | null;
  };
  recentErrors: ErrorEntry[];
}

class MetricsService {
  private metrics: {
    totalRequests: number;
    requestsPerMinute: number;
    requestHistory: RequestHistoryEntry[];
    errors: ErrorEntry[];
    maxStoredErrors: number;
    responseTimeHistory: ResponseTimeEntry[];
    maxStoredResponseTimes: number;
    startTime: number;
  };

  constructor() {
    // Initialize metrics storage
    this.metrics = {
      // API request tracking
      totalRequests: 0,
      requestsPerMinute: 0,
      requestHistory: [], // Stores timestamps for calculating requests per minute
      
      // Error tracking
      errors: [],
      maxStoredErrors: 50,
      
      // Performance metrics
      responseTimeHistory: [], // Stores response times for calculating average
      maxStoredResponseTimes: 1000,
      
      // Server start time
      startTime: Date.now()
    };
    
    // Set up periodic cleanup and calculation
    this.setupPeriodicTasks();
  }
  
  /**
   * Set up periodic tasks for metrics maintenance
   */
  private setupPeriodicTasks(): void {
    // Clean up old request history entries every minute
    setInterval(() => {
      this.cleanupRequestHistory();
      this.calculateRequestsPerMinute();
    }, 60000); // Every minute
    
    // Clean up old response time history entries every 5 minutes
    setInterval(() => {
      this.cleanupResponseTimeHistory();
    }, 300000); // Every 5 minutes
  }
  
  /**
   * Track an API request
   * @param req - Express request object
   * @param method - MCP method name
   */
  trackRequest(req: Request, method: string): void {
    // Increment total requests counter
    this.metrics.totalRequests++;
    
    // Add request timestamp to history
    this.metrics.requestHistory.push({
      timestamp: Date.now(),
      method: method,
      ip: req.ip || 'unknown',
      userAgent: req.headers['user-agent']
    });
  }
  
  /**
   * Track an API response
   * @param responseTime - Response time in milliseconds
   * @param method - MCP method name
   * @param isError - Whether the response was an error
   * @param errorMessage - Error message if applicable
   */
  trackResponse(responseTime: number, method: string, isError: boolean = false, errorMessage: string | null = null): void {
    // Add response time to history
    this.metrics.responseTimeHistory.push({
      timestamp: Date.now(),
      method: method,
      responseTime: responseTime,
      isError: isError
    });
    
    // Track error if applicable
    if (isError && errorMessage) {
      this.trackError(method, errorMessage);
    }
  }
  
  /**
   * Track an error
   * @param method - MCP method name
   * @param message - Error message
   */
  trackError(method: string, message: string): void {
    // Add error to history
    this.metrics.errors.unshift({
      timestamp: Date.now(),
      method: method,
      message: message
    });
    
    // Limit the number of stored errors
    if (this.metrics.errors.length > this.metrics.maxStoredErrors) {
      this.metrics.errors = this.metrics.errors.slice(0, this.metrics.maxStoredErrors);
    }
  }
  
  /**
   * Clean up old request history entries
   */
  private cleanupRequestHistory(): void {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Remove entries older than 1 minute
    this.metrics.requestHistory = this.metrics.requestHistory.filter(
      entry => entry.timestamp >= oneMinuteAgo
    );
  }
  
  /**
   * Clean up old response time history entries
   */
  private cleanupResponseTimeHistory(): void {
    // Limit the number of stored response times
    if (this.metrics.responseTimeHistory.length > this.metrics.maxStoredResponseTimes) {
      this.metrics.responseTimeHistory = this.metrics.responseTimeHistory.slice(
        -this.metrics.maxStoredResponseTimes
      );
    }
  }
  
  /**
   * Calculate requests per minute based on recent history
   */
  private calculateRequestsPerMinute(): void {
    // Count requests in the last minute
    const requestCount = this.metrics.requestHistory.length;
    
    // Calculate requests per minute
    this.metrics.requestsPerMinute = requestCount;
  }
  
  /**
   * Get average response time
   * @returns Average response time in milliseconds
   */
  getAverageResponseTime(): number {
    if (this.metrics.responseTimeHistory.length === 0) {
      return 0;
    }
    
    const sum = this.metrics.responseTimeHistory.reduce(
      (total, entry) => total + entry.responseTime, 
      0
    );
    
    return sum / this.metrics.responseTimeHistory.length;
  }
  
  /**
   * Get server uptime in milliseconds
   * @returns Server uptime in milliseconds
   */
  getUptime(): number {
    return Date.now() - this.metrics.startTime;
  }
  
  /**
   * Get recent errors
   * @param limit - Maximum number of errors to return
   * @returns Recent errors
   */
  getRecentErrors(limit: number = 10): ErrorEntry[] {
    return this.metrics.errors.slice(0, limit);
  }
  
  /**
   * Get comprehensive health metrics
   * @returns Health metrics
   */
  async getHealthMetrics(): Promise<HealthMetrics> {
    try {
      const constants = require('../config/constants');
      
      // Get database file path
      const dbFilePath = process.env.DB_FILE || path.join(__dirname, '../../database/opal.sqlite3');
      
      // Get CPU usage (average load over 1 minute)
      const cpuCount = os.cpus().length;
      const loadAvg = os.loadavg()[0]; // 1 minute average
      const cpuUsage = (loadAvg / cpuCount) * 100; // Convert to percentage
      
      // Get memory usage
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;
      const memoryUsagePercentage = (usedMemory / totalMemory) * 100;
      
      // Get disk usage (simplified)
      let diskUsage: DiskUsage = { total: 0, free: 0, used: 0, percentage: 0 };
      try {
        const stats = await fs.stat(dbFilePath);
        // This is a simplified placeholder - in a real implementation,
        // you would use a platform-specific approach to get actual disk usage
        diskUsage = {
          total: 1000000000, // Placeholder 1GB
          free: 500000000,  // Placeholder 500MB
          used: stats.size,
          percentage: 50     // Placeholder 50%
        };
      } catch (diskError) {
        logger.warn('Error getting disk usage:', diskError);
      }
      
      // Get database size and status
      let dbSize = 0;
      let dbStatus = 'Unknown';
      try {
        const dbStats = await fs.stat(dbFilePath);
        dbSize = dbStats.size;
        dbStatus = 'Connected';
      } catch (dbError) {
        logger.error('Error getting database stats:', dbError);
        dbStatus = 'Error';
      }
      
      // Get last backup time
      let lastBackup: string | null = null;
      try {
        const backupDir = path.dirname(dbFilePath);
        const files = await fs.readdir(backupDir);
        const backupFiles = files.filter(file => file.includes('backup') && file.endsWith('.sqlite3'));
        
        if (backupFiles.length > 0) {
          // Sort by modification time (newest first)
          const backupStats = await Promise.all(
            backupFiles.map(async file => {
              const filePath = path.join(backupDir, file);
              const stats = await fs.stat(filePath);
              return { file, mtime: stats.mtime };
            })
          );
          
          backupStats.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
          lastBackup = backupStats[0].mtime.toISOString();
        }
      } catch (backupError) {
        logger.warn('Error getting backup information:', backupError);
      }
      
      // Get MCP API statistics
      const sessions = (global as any).sessions || new Map();
      const activeSessions = sessions.size;
      
      // Determine overall server health status
      let serverStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      if (cpuUsage > 90 || memoryUsagePercentage > 90 || diskUsage.percentage > 90) {
        serverStatus = 'unhealthy';
      } else if (cpuUsage > 70 || memoryUsagePercentage > 70 || diskUsage.percentage > 70) {
        serverStatus = 'degraded';
      }
      
      // Compile all metrics
      return {
        status: serverStatus,
        uptime: this.getUptime(),
        version: constants.SERVER_INFO.version || '1.0.0',
        nodejs: process.version,
        cpuUsage: cpuUsage,
        memoryUsage: {
          total: totalMemory,
          free: freeMemory,
          used: usedMemory,
          percentage: memoryUsagePercentage
        },
        diskUsage: diskUsage,
        apiStats: {
          totalRequests: this.metrics.totalRequests,
          requestsPerMinute: this.metrics.requestsPerMinute,
          averageResponseTime: this.getAverageResponseTime(),
          activeSessions: activeSessions
        },
        database: {
          size: dbSize,
          status: dbStatus,
          lastBackup: lastBackup
        },
        recentErrors: this.getRecentErrors()
      };
    } catch (error: any) {
      logger.error('Error compiling health metrics:', error);
      throw error;
    }
  }
}

// Create and export a singleton instance
const metricsService = new MetricsService();
export default metricsService;
export { MetricsService, HealthMetrics };
