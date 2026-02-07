/**
 * Authentication middleware for OPAL server
 * Validates JWT tokens and API tokens
 */

const { verifyToken, validateApiToken } = require('../services/authService');
const logger = require('../logger');

/**
 * Middleware to authenticate requests using JWT
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 */
function authenticateJWT(req, res, next) {
  // Get authorization header
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ error: 'Authorization header missing' });
  }
  
  // Extract token
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ error: 'Invalid authorization format' });
  }
  
  const token = parts[1];
  
  // Verify token
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  
  // Attach user to request
  req.user = {
    id: decoded.userId,
    username: decoded.username,
    role: decoded.role
  };
  
  next();
}

/**
 * Middleware to authenticate requests using API token
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 */
async function authenticateApiToken(req, res, next) {
  // Get API token from header or query parameter
  const token = req.headers['x-api-token'] || req.query.api_token;
  
  if (!token) {
    return res.status(401).json({ error: 'API token missing' });
  }
  
  // Validate token
  const tokenData = await validateApiToken(token);
  if (!tokenData) {
    return res.status(401).json({ error: 'Invalid or expired API token' });
  }
  
  // Attach user and permissions to request
  req.user = tokenData.user;
  req.apiToken = tokenData.token;
  req.permissions = tokenData.permissions;
  
  next();
}

/**
 * Middleware to require specific roles
 * @param {...string} roles - Required roles
 * @returns {Function} - Middleware function
 */
function requireRole(...roles) {
  return (req, res, next) => {
    // Check if user exists and has required role
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
}

/**
 * Middleware to require specific API token permissions
 * @param {...string} requiredPermissions - Required permissions
 * @returns {Function} - Middleware function
 */
function requirePermission(...requiredPermissions) {
  return (req, res, next) => {
    // Check if permissions exist
    if (!req.permissions) {
      return res.status(401).json({ error: 'API token authentication required' });
    }
    
    // Check if token has all required permissions
    const hasPermissions = requiredPermissions.every(
      permission => req.permissions[permission] === true
    );
    
    if (!hasPermissions) {
      return res.status(403).json({ error: 'Insufficient API token permissions' });
    }
    
    next();
  };
}

/**
 * Middleware to authenticate WebSocket connections
 * @param {Object} ws - WebSocket connection
 * @param {Object} req - HTTP request
 * @param {Function} next - Next middleware
 */
async function authenticateWs(ws, req, next) {
  // Get token from query parameter
  const token = req.url.includes('?') 
    ? new URLSearchParams(req.url.split('?')[1]).get('token')
    : null;
  
  if (!token) {
    ws.close(4001, 'Authentication required');
    return;
  }
  
  try {
    // First try to validate as a JWT token
    const decoded = verifyToken(token);
    if (decoded) {
      // Attach user to WebSocket
      ws.user = {
        id: decoded.userId,
        username: decoded.username,
        role: decoded.role
      };
      
      logger.info(`Authenticated WebSocket connection for user: ${ws.user.username} using JWT`);
      next();
      return;
    }
    
    // If not a valid JWT, try as an API token
    const apiTokenData = await validateApiToken(token);
    if (apiTokenData) {
      // Attach user and permissions to WebSocket
      ws.user = apiTokenData.user;
      ws.apiToken = apiTokenData.token;
      ws.permissions = apiTokenData.permissions;
      
      logger.info(`Authenticated WebSocket connection for user: ${ws.user.username} using API token`);
      next();
      return;
    }
    
    // If we get here, neither authentication method worked
    ws.close(4003, 'Invalid or expired token');
  } catch (error) {
    logger.error('WebSocket authentication error:', error);
    ws.close(4003, 'Authentication error');
  }
}

module.exports = {
  authenticateJWT,
  authenticateApiToken,
  requireRole,
  requirePermission,
  authenticateWs
};
