/**
 * Audit Service for OPAL server
 * Tracks tool executions and provides audit logs
 */

const db = require('../config/database');
const logger = require('../logger');

/**
 * Log a tool execution
 * @param {string|null} userId - User ID (null for unauthenticated requests)
 * @param {string} toolName - Name of the tool
 * @param {Object} parameters - Tool parameters
 * @param {Object|null} result - Tool execution result
 * @param {string} status - Execution status (completed, failed, etc.)
 * @param {number} durationMs - Execution duration in milliseconds
 * @returns {Promise<Object>} - Created audit log entry
 */
async function logToolExecution(userId, toolName, parameters, result = null, status = 'completed', durationMs = null) {
  try {
    // Insert audit log
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
  } catch (error) {
    logger.error('Error logging tool execution:', error);
    // Don't throw - audit logging should not break the main flow
    return null;
  }
}

/**
 * Get audit logs for a user
 * @param {string} userId - User ID
 * @param {number} limit - Maximum number of results
 * @param {number} offset - Pagination offset
 * @returns {Promise<Array>} - Audit logs
 */
async function getUserAuditLogs(userId, limit = 50, offset = 0) {
  try {
    const logs = await db('tool_runs')
      .where({ user_id: userId })
      .orderBy('executed_at', 'desc')
      .limit(limit)
      .offset(offset);
    
    return logs;
  } catch (error) {
    logger.error('Error getting user audit logs:', error);
    throw new Error(`Failed to get audit logs: ${error.message}`);
  }
}

/**
 * Get audit logs for a specific tool
 * @param {string} toolName - Tool name
 * @param {number} limit - Maximum number of results
 * @param {number} offset - Pagination offset
 * @returns {Promise<Array>} - Audit logs
 */
async function getToolAuditLogs(toolName, limit = 50, offset = 0) {
  try {
    const logs = await db('tool_runs')
      .where({ tool_name: toolName })
      .orderBy('executed_at', 'desc')
      .limit(limit)
      .offset(offset);
    
    return logs;
  } catch (error) {
    logger.error('Error getting tool audit logs:', error);
    throw new Error(`Failed to get audit logs: ${error.message}`);
  }
}

/**
 * Get audit log statistics
 * @param {string|null} userId - User ID (optional)
 * @param {string|null} toolName - Tool name (optional)
 * @param {Date|null} startDate - Start date (optional)
 * @param {Date|null} endDate - End date (optional)
 * @returns {Promise<Object>} - Statistics
 */
async function getAuditStats(userId = null, toolName = null, startDate = null, endDate = null) {
  try {
    // Build query
    let query = db('tool_runs');
    
    // Apply filters
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
    
    // Get count and average duration
    const [{ count }] = await query.count('id as count');
    const [{ avg_duration }] = await query.avg('duration_ms as avg_duration');
    
    // Get status breakdown
    const statusBreakdown = await query
      .select('status')
      .count('id as count')
      .groupBy('status');
    
    // Get tool breakdown if not filtered by tool
    let toolBreakdown = [];
    if (!toolName) {
      toolBreakdown = await query
        .select('tool_name')
        .count('id as count')
        .groupBy('tool_name')
        .orderBy('count', 'desc')
        .limit(10);
    }
    
    return {
      totalCount: parseInt(count, 10),
      averageDuration: parseFloat(avg_duration) || 0,
      statusBreakdown: statusBreakdown.reduce((acc, item) => {
        acc[item.status] = parseInt(item.count, 10);
        return acc;
      }, {}),
      toolBreakdown: toolBreakdown.reduce((acc, item) => {
        acc[item.tool_name] = parseInt(item.count, 10);
        return acc;
      }, {})
    };
  } catch (error) {
    logger.error('Error getting audit statistics:', error);
    throw new Error(`Failed to get audit statistics: ${error.message}`);
  }
}

module.exports = {
  logToolExecution,
  getUserAuditLogs,
  getToolAuditLogs,
  getAuditStats
};
