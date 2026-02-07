/**
 * Rate Limiting Utilities
 * Provides functions for rate limiting API requests
 */

const logger = require('../logger');
const { ERROR_CODES } = require('../config/constants');

// In-memory storage for rate limits (would be replaced with Redis or similar in production)
const rateLimits = new Map();

/**
 * Rate limiter configuration
 * Different limits for different endpoint types
 */
const RATE_LIMIT_CONFIG = {
  // Default rate limit: 100 requests per minute
  default: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    message: 'Too many requests, please try again later'
  },
  // Tool execution: 20 requests per minute
  toolExecution: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20,
    message: 'Too many tool executions, please try again later'
  },
  // Resource operations: 50 requests per minute
  resourceOperations: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 50,
    message: 'Too many resource operations, please try again later'
  }
};

/**
 * Clean up expired rate limit entries
 * This should be called periodically to prevent memory leaks
 */
function cleanupRateLimits() {
  const now = Date.now();
  
  for (const [key, limitData] of rateLimits.entries()) {
    // Remove entries where all windows have expired
    if (limitData.windowStart + limitData.config.windowMs < now) {
      rateLimits.delete(key);
    }
  }
}

// Set up periodic cleanup every 5 minutes
setInterval(cleanupRateLimits, 5 * 60 * 1000);

/**
 * Check if a request exceeds the rate limit
 * 
 * @param {string} userId - The user ID or IP address
 * @param {string} action - The action being performed (e.g., 'tools/call', 'resources/set')
 * @param {string} limitType - The type of rate limit to apply ('default', 'toolExecution', 'resourceOperations')
 * @returns {Object|null} Rate limit error object if limit exceeded, null otherwise
 */
function checkRateLimit(userId, action, limitType = 'default') {
  const now = Date.now();
  const key = `${userId}:${action}`;
  const config = RATE_LIMIT_CONFIG[limitType] || RATE_LIMIT_CONFIG.default;
  
  // Initialize or get the rate limit data for this key
  if (!rateLimits.has(key)) {
    rateLimits.set(key, {
      windowStart: now,
      requestCount: 0,
      config
    });
  }
  
  const limitData = rateLimits.get(key);
  
  // Reset window if it has expired
  if (limitData.windowStart + config.windowMs < now) {
    limitData.windowStart = now;
    limitData.requestCount = 0;
  }
  
  // Increment request count
  limitData.requestCount++;
  
  // Check if the limit has been exceeded
  if (limitData.requestCount > config.maxRequests) {
    logger.warn(`Rate limit exceeded for ${userId} on action ${action}`);
    
    // Calculate reset time
    const resetTime = limitData.windowStart + config.windowMs;
    const timeToReset = Math.ceil((resetTime - now) / 1000);
    
    return {
      code: ERROR_CODES.TOO_MANY_REQUESTS,
      message: config.message,
      data: {
        retryAfter: timeToReset,
        limit: config.maxRequests,
        remaining: 0,
        reset: resetTime
      }
    };
  }
  
  // Update the remaining count
  const remaining = config.maxRequests - limitData.requestCount;
  
  // Add rate limit headers to the response if available
  return {
    exceeded: false,
    headers: {
      'X-RateLimit-Limit': config.maxRequests,
      'X-RateLimit-Remaining': remaining,
      'X-RateLimit-Reset': Math.ceil((limitData.windowStart + config.windowMs) / 1000)
    }
  };
}

/**
 * Apply rate limiting to a request
 * 
 * @param {string} userId - The user ID or IP address
 * @param {string} action - The action being performed (e.g., 'tools/call', 'resources/set')
 * @param {string} limitType - The type of rate limit to apply ('default', 'toolExecution', 'resourceOperations')
 * @throws {Object} Error object with code and message if rate limit exceeded
 * @returns {Object} Rate limit headers
 */
function applyRateLimit(userId, action, limitType = 'default') {
  const result = checkRateLimit(userId, action, limitType);
  
  if (result.exceeded) {
    throw result;
  }
  
  return result.headers;
}

module.exports = {
  checkRateLimit,
  applyRateLimit,
  RATE_LIMIT_CONFIG
};
