/**
 * Audit Service for OPAL server
 * Tracks tool executions and provides audit logs
 */

import db from '../config/database';
import logger from '../logger';

interface AuditStats {
  totalCount: number;
  averageDuration: number;
  statusBreakdown: Record<string, number>;
  toolBreakdown: Record<string, number>;
}

/**
 * Log a tool execution
 */
export async function logToolExecution(
  userId: number | null,
  toolName: string,
  parameters: Record<string, unknown>,
  result: unknown = null,
  status: string = 'completed',
  durationMs: number | null = null
): Promise<any | null> {
  try {
    const [logEntry] = await db('tool_runs').insert({
      user_id: userId,
      tool_name: toolName,
      parameters: JSON.stringify(parameters),
      result: result ? JSON.stringify(result) : null,
      status,
      duration_ms: durationMs,
      executed_at: db.fn.now()
    }).returning('*');
    
    logger.info(`Logged tool execution: ${toolName} by user: ${userId || 'anonymous'}`);
    return logEntry;
  } catch (error: any) {
    logger.error('Error logging tool execution:', error);
    // Don't throw - audit logging should not break the main flow
    return null;
  }
}

/**
 * Get audit logs for a user
 */
export async function getUserAuditLogs(
  userId: number,
  limit: number = 50,
  offset: number = 0
): Promise<any[]> {
  try {
    const logs = await db('tool_runs')
      .where({ user_id: userId })
      .orderBy('executed_at', 'desc')
      .limit(limit)
      .offset(offset);
    
    return logs;
  } catch (error: any) {
    logger.error('Error getting user audit logs:', error);
    throw new Error(`Failed to get audit logs: ${error.message}`);
  }
}

/**
 * Get audit logs for a specific tool
 */
export async function getToolAuditLogs(
  toolName: string,
  limit: number = 50,
  offset: number = 0
): Promise<any[]> {
  try {
    const logs = await db('tool_runs')
      .where({ tool_name: toolName })
      .orderBy('executed_at', 'desc')
      .limit(limit)
      .offset(offset);
    
    return logs;
  } catch (error: any) {
    logger.error('Error getting tool audit logs:', error);
    throw new Error(`Failed to get audit logs: ${error.message}`);
  }
}

/**
 * Get audit log statistics
 */
export async function getAuditStats(
  userId: number | null = null,
  toolName: string | null = null,
  startDate: Date | null = null,
  endDate: Date | null = null
): Promise<AuditStats> {
  try {
    let query = db('tool_runs');
    
    if (userId) {
      query = query.where({ user_id: userId });
    }
    
    if (toolName) {
      query = query.where({ tool_name: toolName });
    }
    
    if (startDate) {
      query = query.where('executed_at', '>=', startDate);
    }
    
    if (endDate) {
      query = query.where('executed_at', '<=', endDate);
    }
    
    const [{ count }] = await query.count('id as count');
    const [{ avg_duration }] = await query.avg('duration_ms as avg_duration');
    
    const statusBreakdown = await query
      .select('status')
      .count('id as count')
      .groupBy('status');
    
    let toolBreakdown: any[] = [];
    if (!toolName) {
      toolBreakdown = await query
        .select('tool_name')
        .count('id as count')
        .groupBy('tool_name')
        .orderBy('count', 'desc')
        .limit(10);
    }
    
    return {
      totalCount: parseInt(count as string, 10),
      averageDuration: parseFloat(avg_duration as string) || 0,
      statusBreakdown: statusBreakdown.reduce((acc: Record<string, number>, item: any) => {
        acc[item.status] = parseInt(item.count, 10);
        return acc;
      }, {}),
      toolBreakdown: toolBreakdown.reduce((acc: Record<string, number>, item: any) => {
        acc[item.tool_name] = parseInt(item.count, 10);
        return acc;
      }, {})
    };
  } catch (error: any) {
    logger.error('Error getting audit statistics:', error);
    throw new Error(`Failed to get audit statistics: ${error.message}`);
  }
}
