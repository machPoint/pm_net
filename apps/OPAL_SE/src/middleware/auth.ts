/**
 * Authentication middleware for OPAL server
 * Validates JWT tokens and API tokens
 */

import { verifyToken, validateApiToken } from '../services/authService';
import logger from '../logger';
import { Request, Response, NextFunction } from 'express';
import { WebSocket } from 'ws';
import { IncomingMessage } from 'http';

/**
 * Middleware to authenticate requests using JWT
 */
export function authenticateJWT(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    res.status(401).json({ error: 'Authorization header missing' });
    return;
  }
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    res.status(401).json({ error: 'Invalid authorization format' });
    return;
  }
  
  const token = parts[1];
  
  const decoded = verifyToken(token);
  if (!decoded) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }
  
  req.user = {
    id: decoded.userId,
    username: decoded.username,
    role: decoded.role as any
  };
  
  next();
}

/**
 * Middleware to authenticate requests using API token
 */
export async function authenticateApiToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = req.headers['x-api-token'] as string || req.query.api_token as string;
  
  if (!token) {
    res.status(401).json({ error: 'API token missing' });
    return;
  }
  
  const tokenData = await validateApiToken(token);
  if (!tokenData) {
    res.status(401).json({ error: 'Invalid or expired API token' });
    return;
  }
  
  req.user = tokenData.user;
  req.apiToken = tokenData.token;
  req.permissions = tokenData.permissions as Record<string, boolean>;
  
  next();
}

/**
 * Middleware to require specific roles
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    
    if (!roles.includes(req.user.role as string)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    
    next();
  };
}

/**
 * Middleware to require specific API token permissions
 */
export function requirePermission(...requiredPermissions: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.permissions) {
      res.status(401).json({ error: 'API token authentication required' });
      return;
    }
    
    const hasPermissions = requiredPermissions.every(
      permission => req.permissions![permission] === true
    );
    
    if (!hasPermissions) {
      res.status(403).json({ error: 'Insufficient API token permissions' });
      return;
    }
    
    next();
  };
}

/**
 * Middleware to authenticate WebSocket connections
 */
export async function authenticateWs(
  ws: WebSocket & { user?: any; apiToken?: any; permissions?: any },
  req: IncomingMessage,
  next: () => void
): Promise<void> {
  const token = req.url && req.url.includes('?') 
    ? new URLSearchParams(req.url.split('?')[1]).get('token')
    : null;
  
  if (!token) {
    ws.close(4001, 'Authentication required');
    return;
  }
  
  try {
    const decoded = verifyToken(token);
    if (decoded) {
      ws.user = {
        id: decoded.userId,
        username: decoded.username,
        role: decoded.role
      };
      
      logger.info(`Authenticated WebSocket connection for user: ${ws.user.username} using JWT`);
      next();
      return;
    }
    
    const apiTokenData = await validateApiToken(token);
    if (apiTokenData) {
      ws.user = apiTokenData.user;
      ws.apiToken = apiTokenData.token;
      ws.permissions = apiTokenData.permissions;
      
      logger.info(`Authenticated WebSocket connection for user: ${ws.user.username} using API token`);
      next();
      return;
    }
    
    ws.close(4003, 'Invalid or expired token');
  } catch (error: any) {
    logger.error('WebSocket authentication error:', error);
    ws.close(4003, 'Authentication error');
  }
}
