/**
 * Express.js Type Extensions
 */

import { Request } from 'express';
import { User, ApiToken } from './database';

// ============================================================================
// Extend Express Request Interface
// ============================================================================

declare global {
  namespace Express {
    interface Request {
      user?: Partial<User>;
      token?: ApiToken;
      apiToken?: any;
      permissions?: Record<string, boolean>;
      sessionId?: string;
    }
  }
}

// ============================================================================
// Custom Request Types
// ============================================================================

export interface AuthenticatedRequest extends Request {
  user: User;
  token: ApiToken;
}

export interface WebSocketRequest extends Request {
  ws?: () => Promise<WebSocket>;
}
