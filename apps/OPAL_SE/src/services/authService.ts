/**
 * Authentication Service for OPAL server
 * Handles user authentication, JWT token generation, and validation
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/database';
import logger from '../logger';
import { User, ApiToken } from '../types/database';

// Secret key for JWT signing
const JWT_SECRET = process.env.JWT_SECRET || 'opal-server-secret-key';
const ACCESS_TOKEN_EXPIRY = '2h';
const REFRESH_TOKEN_EXPIRY = '7d';

interface LoginResult {
  user: Partial<User>;
  accessToken: string;
  refreshToken: string;
}

interface TokenPayload {
  userId: number;
  username: string;
  role: string;
}

interface RefreshTokenPayload {
  userId: number;
  tokenId: string;
}

interface ApiTokenValidationResult {
  token: ApiToken;
  user: Partial<User>;
  permissions: Record<string, unknown>;
}

/**
 * Authenticate a user with username/email and password
 */
export async function login(usernameOrEmail: string, password: string): Promise<LoginResult> {
  try {
    // Find user by username or email
    const user = await db('users')
      .where({ username: usernameOrEmail })
      .orWhere({ email: usernameOrEmail })
      .first<User>();
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      throw new Error('Invalid password');
    }
    
    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    
    // Store refresh token in sessions table
    await db('sessions').insert({
      user_id: user.id,
      token: refreshToken,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });
    
    // Remove password hash from user object
    const { password_hash, ...userWithoutPassword } = user;
    
    logger.info(`User logged in: ${user.username}`);
    return {
      user: userWithoutPassword,
      accessToken,
      refreshToken
    };
  } catch (error: any) {
    logger.error('Authentication error:', error);
    throw new Error(`Authentication failed: ${error.message}`);
  }
}

/**
 * Register a new user
 */
export async function register(
  username: string,
  email: string,
  password: string,
  role: 'admin' | 'user' = 'user'
): Promise<Partial<User>> {
  try {
    // Check if username or email already exists
    const existingUser = await db('users')
      .where({ username })
      .orWhere({ email })
      .first();
    
    if (existingUser) {
      throw new Error('Username or email already exists');
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Create user
    const [user] = await db('users').insert({
      username,
      email,
      password_hash: passwordHash,
      role
    }).returning(['id', 'username', 'email', 'role', 'created_at']);
    
    logger.info(`User registered: ${username}`);
    return user;
  } catch (error: any) {
    logger.error('Registration error:', error);
    throw new Error(`Registration failed: ${error.message}`);
  }
}

/**
 * Refresh access token using refresh token
 */
export async function refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
  try {
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, JWT_SECRET) as RefreshTokenPayload;
    
    // Check if token exists in sessions table
    const session = await db('sessions')
      .where({ token: refreshToken, is_active: true })
      .first();
    
    if (!session) {
      throw new Error('Invalid refresh token');
    }
    
    // Check if token is expired
    if (new Date(session.expires_at) < new Date()) {
      await db('sessions')
        .where({ id: session.id })
        .update({ is_active: false });
      throw new Error('Refresh token expired');
    }
    
    // Get user
    const user = await db('users')
      .where({ id: decoded.userId })
      .first<User>(['id', 'username', 'email', 'role']);
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Generate new access token
    const accessToken = generateAccessToken(user);
    
    logger.info(`Token refreshed for user: ${user.username}`);
    return { accessToken };
  } catch (error: any) {
    logger.error('Token refresh error:', error);
    throw new Error(`Token refresh failed: ${error.message}`);
  }
}

/**
 * Logout user by invalidating refresh token
 */
export async function logout(refreshToken: string): Promise<boolean> {
  try {
    await db('sessions')
      .where({ token: refreshToken })
      .update({ is_active: false });
    
    logger.info('User logged out');
    return true;
  } catch (error: any) {
    logger.error('Logout error:', error);
    throw new Error(`Logout failed: ${error.message}`);
  }
}

/**
 * Generate access token for user
 */
function generateAccessToken(user: Partial<User>): string {
  return jwt.sign(
    {
      userId: user.id,
      username: user.username,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

/**
 * Generate refresh token for user
 */
function generateRefreshToken(user: Partial<User>): string {
  return jwt.sign(
    {
      userId: user.id,
      tokenId: uuidv4()
    },
    JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    logger.error('Token verification error:', error);
    return null;
  }
}

/**
 * Create API token for user
 */
export async function createApiToken(
  userId: number,
  name: string,
  permissions: Record<string, unknown> = {},
  expiresAt: Date | null = null
): Promise<ApiToken> {
  let trx;
  try {
    const token = `opal-${uuidv4()}`;
    const id = uuidv4();
    
    logger.info(`Creating API token: ${name} for user: ${userId} with id: ${id}`);
    
    trx = await db.transaction();
    
    await trx('api_tokens').insert({
      id,
      user_id: userId,
      name,
      token,
      permissions: JSON.stringify(permissions),
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    
    const apiToken = await trx('api_tokens').where({ id }).first<ApiToken>();
    
    if (!apiToken) {
      throw new Error('Failed to persist API token');
    }
    
    await trx.commit();
    
    // Force SQLite to synchronize
    if (db.client.config.client === 'sqlite3') {
      await db.raw('PRAGMA wal_checkpoint(FULL)');
      await db.raw('PRAGMA synchronous = FULL');
      await db.raw('PRAGMA journal_mode = WAL');
    }
    
    logger.info(`API token created successfully: ${name} for user: ${userId}`);
    return apiToken;
  } catch (error: any) {
    if (trx && !trx.isCompleted()) {
      await trx.rollback();
    }
    logger.error('API token creation error:', error);
    throw new Error(`Failed to create API token: ${error.message}`);
  }
}

/**
 * Validate API token
 */
export async function validateApiToken(token: string): Promise<ApiTokenValidationResult | null> {
  try {
    let normalizedToken = token;
    let alternateToken: string | null = null;
    
    if (token.startsWith('opal-')) {
      alternateToken = token.substring(5);
    } else {
      alternateToken = `opal-${token}`;
    }
    
    logger.debug(`Validating token: ${normalizedToken.substring(0, 10)}...`);
    
    let apiToken = await db('api_tokens')
      .where({ token: normalizedToken })
      .first<ApiToken>();
    
    if (!apiToken && alternateToken) {
      apiToken = await db('api_tokens')
        .where({ token: alternateToken })
        .first<ApiToken>();
      
      if (apiToken) {
        logger.info(`Token found using alternate format: ${alternateToken.substring(0, 10)}...`);
      }
    }
    
    if (!apiToken) {
      logger.warn(`API token not found in database: ${normalizedToken.substring(0, 10)}...`);
      return null;
    }
    
    if (apiToken.expires_at && new Date(apiToken.expires_at) < new Date()) {
      logger.warn(`API token expired: ${token.substring(0, 10)}...`);
      return null;
    }
    
    const user = await db('users')
      .where({ id: apiToken.user_id })
      .first<User>(['id', 'username', 'role']);
    
    if (!user) {
      logger.warn(`User not found for API token: ${token.substring(0, 10)}...`);
      return null;
    }
    
    let permissions: Record<string, unknown> = {};
    try {
      permissions = JSON.parse(apiToken.permissions as any);
    } catch (e) {
      logger.warn(`Failed to parse permissions for token: ${token.substring(0, 10)}...`);
    }
    
    logger.info(`API token validated successfully for user: ${user.username}`);
    
    return {
      token: apiToken,
      user,
      permissions
    };
  } catch (error: any) {
    logger.error('API token validation error:', error);
    return null;
  }
}

/**
 * Get API tokens for a user
 */
export async function getUserApiTokens(userId: number): Promise<ApiToken[]> {
  try {
    const tokens = await db('api_tokens')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc');
    
    return tokens;
  } catch (error: any) {
    logger.error('Error getting user API tokens:', error);
    throw new Error(`Failed to get API tokens: ${error.message}`);
  }
}

/**
 * Delete an API token
 */
export async function deleteApiToken(tokenId: string, userId: number): Promise<boolean> {
  let trx;
  try {
    logger.info(`Attempting to delete API token: ${tokenId} by user: ${userId}`);
    
    trx = await db.transaction();
    
    const token = await trx('api_tokens')
      .where({ id: tokenId })
      .first<ApiToken>();
    
    if (!token) {
      throw new Error(`Token not found with ID: ${tokenId}`);
    }
    
    if (token.user_id !== userId && !(await isAdmin(userId))) {
      throw new Error('Access denied: You do not have permission to delete this token');
    }
    
    const deleted = await trx('api_tokens')
      .where({ id: tokenId })
      .del();
    
    if (deleted === 0) {
      throw new Error(`Failed to delete token with ID: ${tokenId}`);
    }
    
    await trx.commit();
    
    if (db.client.config.client === 'sqlite3') {
      await db.raw('PRAGMA wal_checkpoint(FULL)');
    }
    
    logger.info(`API token deleted successfully: ${tokenId} by user: ${userId}`);
    return true;
  } catch (error: any) {
    if (trx && !trx.isCompleted()) {
      await trx.rollback();
    }
    logger.error(`Error deleting API token ${tokenId}:`, error);
    throw new Error(`Failed to delete API token: ${error.message}`);
  }
}

/**
 * Check if a user has admin role
 */
export async function isAdmin(userId: number): Promise<boolean> {
  try {
    const user = await db('users')
      .where({ id: userId })
      .select('role')
      .first<User>();
    
    return user?.role === 'admin';
  } catch (error: any) {
    logger.error('Error checking admin status:', error);
    return false;
  }
}
