/**
 * Rate Limiting Utilities
 * Provides functions for rate limiting API requests
 */

import logger from '../logger';
import { ERROR_CODES } from '../config/constants';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message: string;
}

interface RateLimitData {
  windowStart: number;
  requestCount: number;
  config: RateLimitConfig;
}

interface RateLimitError {
  code: number;
  message: string;
  data: {
    retryAfter: number;
    limit: number;
    remaining: number;
    reset: number;
  };
}

interface RateLimitHeaders {
  'X-RateLimit-Limit': number;
  'X-RateLimit-Remaining': number;
  'X-RateLimit-Reset': number;
}

interface RateLimitResult {
  exceeded?: boolean;
  headers?: RateLimitHeaders;
  code?: number;
  message?: string;
  data?: any;
}

// In-memory storage for rate limits
const rateLimits = new Map<string, RateLimitData>();

/**
 * Rate limiter configuration
 */
export const RATE_LIMIT_CONFIG: Record<string, RateLimitConfig> = {
  default: {
    windowMs: 60 * 1000,
    maxRequests: 100,
    message: 'Too many requests, please try again later'
  },
  toolExecution: {
    windowMs: 60 * 1000,
    maxRequests: 20,
    message: 'Too many tool executions, please try again later'
  },
  resourceOperations: {
    windowMs: 60 * 1000,
    maxRequests: 50,
    message: 'Too many resource operations, please try again later'
  }
};

/**
 * Clean up expired rate limit entries
 */
function cleanupRateLimits(): void {
  const now = Date.now();
  
  for (const [key, limitData] of rateLimits.entries()) {
    if (limitData.windowStart + limitData.config.windowMs < now) {
      rateLimits.delete(key);
    }
  }
}

// Set up periodic cleanup every 5 minutes
setInterval(cleanupRateLimits, 5 * 60 * 1000);

/**
 * Check if a request exceeds the rate limit
 */
export function checkRateLimit(
  userId: string,
  action: string,
  limitType: string = 'default'
): RateLimitResult {
  const now = Date.now();
  const key = `${userId}:${action}`;
  const config = RATE_LIMIT_CONFIG[limitType] || RATE_LIMIT_CONFIG.default;
  
  if (!rateLimits.has(key)) {
    rateLimits.set(key, {
      windowStart: now,
      requestCount: 0,
      config
    });
  }
  
  const limitData = rateLimits.get(key)!;
  
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
  
  const remaining = config.maxRequests - limitData.requestCount;
  
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
 */
export function applyRateLimit(
  userId: string,
  action: string,
  limitType: string = 'default'
): RateLimitHeaders {
  const result = checkRateLimit(userId, action, limitType);
  
  if (result.exceeded || result.code) {
    throw result;
  }
  
  return result.headers!;
}
