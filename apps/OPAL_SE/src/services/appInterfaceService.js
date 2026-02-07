/**
 * App Interface Service for OPAL server
 * Provides simplified methods for external applications to interact with OPAL
 */

const memoryService = require('./memoryService');
const auditService = require('./auditService');
const summarizationService = require('./summarizationService');
const logger = require('../logger');

/**
 * Get memories formatted for UI display
 * @param {string} userId - User ID
 * @param {number} limit - Maximum number of results
 * @param {number} page - Page number (1-based)
 * @returns {Promise<Object>} - Formatted memories with pagination info
 */
async function listMemoriesForUi(userId, limit = 10, page = 1) {
  try {
    // Calculate offset
    const offset = (page - 1) * limit;
    
    // Get memories
    const memories = await memoryService.getUserMemories(userId, limit, offset);
    
    // Format memories for UI
    const formattedMemories = memories.map(memory => ({
      id: memory.id,
      title: memory.title,
      content: memory.content.length > 100 
        ? `${memory.content.substring(0, 100)}...` 
        : memory.content,
      contentFull: memory.content,
      createdAt: memory.created_at,
      updatedAt: memory.updated_at,
      metadata: JSON.parse(memory.metadata || '{}')
    }));
    
    // Get total count for pagination
    const [{ count }] = await memoryService.getMemoryCount(userId);
    
    return {
      memories: formattedMemories,
      pagination: {
        total: parseInt(count, 10),
        page,
        limit,
        totalPages: Math.ceil(parseInt(count, 10) / limit)
      }
    };
  } catch (error) {
    logger.error('Error listing memories for UI:', error);
    throw new Error(`Failed to list memories: ${error.message}`);
  }
}

/**
 * Get a single memory formatted for UI display
 * @param {string} userId - User ID
 * @param {string} memoryId - Memory ID
 * @returns {Promise<Object>} - Formatted memory
 */
async function getMemoryForUi(userId, memoryId) {
  try {
    const memory = await memoryService.getMemoryById(userId, memoryId);
    
    if (!memory) {
      throw new Error('Memory not found');
    }
    
    return {
      id: memory.id,
      title: memory.title,
      content: memory.content,
      createdAt: memory.created_at,
      updatedAt: memory.updated_at,
      metadata: JSON.parse(memory.metadata || '{}')
    };
  } catch (error) {
    logger.error('Error getting memory for UI:', error);
    throw new Error(`Failed to get memory: ${error.message}`);
  }
}

/**
 * Search memories with UI-friendly formatting
 * @param {string} userId - User ID
 * @param {string} query - Search query
 * @param {number} limit - Maximum number of results
 * @returns {Promise<Object>} - Search results
 */
async function searchMemoriesForUi(userId, query, limit = 10) {
  try {
    const memories = await memoryService.searchMemories(userId, query, limit);
    
    // Format memories for UI
    const formattedMemories = memories.map(memory => ({
      id: memory.id,
      title: memory.title,
      content: memory.content.length > 100 
        ? `${memory.content.substring(0, 100)}...` 
        : memory.content,
      contentFull: memory.content,
      createdAt: memory.created_at,
      updatedAt: memory.updated_at,
      similarity: memory.similarity,
      metadata: JSON.parse(memory.metadata || '{}')
    }));
    
    return {
      query,
      results: formattedMemories,
      count: formattedMemories.length
    };
  } catch (error) {
    logger.error('Error searching memories for UI:', error);
    throw new Error(`Failed to search memories: ${error.message}`);
  }
}

/**
 * Get tool runs formatted for UI display
 * @param {string} userId - User ID
 * @param {number} limit - Maximum number of results
 * @param {number} page - Page number (1-based)
 * @returns {Promise<Object>} - Formatted tool runs with pagination info
 */
async function listToolRunsForUi(userId, limit = 10, page = 1) {
  try {
    // Calculate offset
    const offset = (page - 1) * limit;
    
    // Get tool runs
    const toolRuns = await auditService.getUserAuditLogs(userId, limit, offset);
    
    // Format tool runs for UI
    const formattedToolRuns = toolRuns.map(run => ({
      id: run.id,
      toolName: run.tool_name,
      status: run.status,
      durationMs: run.duration_ms,
      executedAt: run.executed_at,
      parameters: JSON.parse(run.parameters || '{}'),
      // Only include result summary to avoid large payloads
      resultSummary: run.result ? summarizeResult(JSON.parse(run.result)) : null
    }));
    
    // Get total count for pagination
    const [{ count }] = await auditService.getToolRunCount(userId);
    
    return {
      toolRuns: formattedToolRuns,
      pagination: {
        total: parseInt(count, 10),
        page,
        limit,
        totalPages: Math.ceil(parseInt(count, 10) / limit)
      }
    };
  } catch (error) {
    logger.error('Error listing tool runs for UI:', error);
    throw new Error(`Failed to list tool runs: ${error.message}`);
  }
}

/**
 * Get tool run statistics formatted for UI display
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Formatted statistics
 */
async function getToolRunStatsForUi(userId) {
  try {
    const stats = await auditService.getAuditStats(userId);
    
    // Format stats for UI
    return {
      totalRuns: stats.totalCount,
      averageDuration: Math.round(stats.averageDuration),
      statusBreakdown: stats.statusBreakdown,
      topTools: Object.entries(stats.toolBreakdown)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }))
    };
  } catch (error) {
    logger.error('Error getting tool run stats for UI:', error);
    throw new Error(`Failed to get tool run stats: ${error.message}`);
  }
}

/**
 * Generate a summary for UI display
 * @param {string} content - Content to summarize
 * @param {string} type - Summary type (headline, paragraph, full)
 * @returns {Promise<Object>} - Generated summary
 */
async function generateSummaryForUi(content, type = 'paragraph') {
  try {
    const summary = await summarizationService.summarizeContent(content, type);
    
    return {
      originalLength: content.length,
      summaryLength: summary.summary.length,
      summary: summary.summary,
      type
    };
  } catch (error) {
    logger.error('Error generating summary for UI:', error);
    throw new Error(`Failed to generate summary: ${error.message}`);
  }
}

/**
 * Helper function to summarize result object for UI
 * @param {Object} result - Result object
 * @returns {Object} - Summarized result
 */
function summarizeResult(result) {
  if (!result) return null;
  
  // If result is an array, return length and first few items
  if (Array.isArray(result)) {
    return {
      type: 'array',
      length: result.length,
      preview: result.slice(0, 3)
    };
  }
  
  // If result is an object, return keys and preview
  if (typeof result === 'object') {
    const keys = Object.keys(result);
    const preview = {};
    
    // Take first 3 keys for preview
    keys.slice(0, 3).forEach(key => {
      preview[key] = result[key];
    });
    
    return {
      type: 'object',
      keys: keys,
      keyCount: keys.length,
      preview
    };
  }
  
  // For primitive values, return as is
  return {
    type: typeof result,
    value: result
  };
}

// Add missing methods to services
memoryService.getMemoryCount = async function(userId) {
  return db('memories')
    .where({ user_id: userId })
    .count('id as count');
};

memoryService.getMemoryById = async function(userId, memoryId) {
  return db('memories')
    .where({ id: memoryId, user_id: userId })
    .first();
};

auditService.getToolRunCount = async function(userId) {
  return db('tool_runs')
    .where({ user_id: userId })
    .count('id as count');
};

module.exports = {
  listMemoriesForUi,
  getMemoryForUi,
  searchMemoriesForUi,
  listToolRunsForUi,
  getToolRunStatsForUi,
  generateSummaryForUi
};
