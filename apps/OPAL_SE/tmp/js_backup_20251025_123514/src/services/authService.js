/**
 * Authentication Service for OPAL server
 * Handles user authentication, JWT token generation, and validation
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const logger = require('../logger');

// Secret key for JWT signing - should be in environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'opal-server-secret-key';
const ACCESS_TOKEN_EXPIRY = '2h'; // 2 hours
const REFRESH_TOKEN_EXPIRY = '7d'; // 7 days

/**
 * Authenticate a user with username/email and password
 * @param {string} usernameOrEmail - Username or email
 * @param {string} password - User password
 * @returns {Promise<Object>} - User data and tokens
 */
async function login(usernameOrEmail, password) {
  try {
    // Find user by username or email
    const user = await db('users')
      .where({ username: usernameOrEmail })
      .orWhere({ email: usernameOrEmail })
      .first();
    
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
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    });
    
    // Remove password hash from user object
    delete user.password_hash;
    
    logger.info(`User logged in: ${user.username}`);
    return {
      user,
      accessToken,
      refreshToken
    };
  } catch (error) {
    logger.error('Authentication error:', error);
    throw new Error(`Authentication failed: ${error.message}`);
  }
}

/**
 * Register a new user
 * @param {string} username - Username
 * @param {string} email - Email address
 * @param {string} password - Password
 * @param {string} role - User role (default: 'user')
 * @returns {Promise<Object>} - Created user
 */
async function register(username, email, password, role = 'user') {
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
  } catch (error) {
    logger.error('Registration error:', error);
    throw new Error(`Registration failed: ${error.message}`);
  }
}

/**
 * Refresh access token using refresh token
 * @param {string} refreshToken - Refresh token
 * @returns {Promise<Object>} - New access token
 */
async function refreshToken(refreshToken) {
  try {
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, JWT_SECRET);
    
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
      .first(['id', 'username', 'email', 'role']);
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Generate new access token
    const accessToken = generateAccessToken(user);
    
    logger.info(`Token refreshed for user: ${user.username}`);
    return { accessToken };
  } catch (error) {
    logger.error('Token refresh error:', error);
    throw new Error(`Token refresh failed: ${error.message}`);
  }
}

/**
 * Logout user by invalidating refresh token
 * @param {string} refreshToken - Refresh token
 * @returns {Promise<boolean>} - Success status
 */
async function logout(refreshToken) {
  try {
    // Update session to inactive
    await db('sessions')
      .where({ token: refreshToken })
      .update({ is_active: false });
    
    logger.info('User logged out');
    return true;
  } catch (error) {
    logger.error('Logout error:', error);
    throw new Error(`Logout failed: ${error.message}`);
  }
}

/**
 * Generate access token for user
 * @param {Object} user - User object
 * @returns {string} - JWT access token
 */
function generateAccessToken(user) {
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
 * @param {Object} user - User object
 * @returns {string} - JWT refresh token
 */
function generateRefreshToken(user) {
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
 * @param {string} token - JWT token
 * @returns {Object|null} - Decoded token or null if invalid
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    logger.error('Token verification error:', error);
    return null;
  }
}

/**
 * Create API token for user
 * @param {string} userId - User ID
 * @param {string} name - Token name
 * @param {Object} permissions - Token permissions
 * @param {Date|null} expiresAt - Expiration date (null for no expiration)
 * @returns {Promise<Object>} - Created API token
 */
async function createApiToken(userId, name, permissions = {}, expiresAt = null) {
  let trx;
  try {
    // Generate unique token with opal- prefix
    const token = `opal-${uuidv4()}`;
    
    // Generate a UUID for the token ID - ensure it's a string for SQLite
    const id = uuidv4().toString();
    
    // Ensure userId is a string for SQLite
    const user_id = userId.toString();
    
    // Use a transaction to ensure data integrity
    trx = await db.transaction();
    
    // Log the insertion for debugging
    logger.info(`Creating API token: ${name} for user: ${user_id} with id: ${id}`);
    
    // Create token in database within transaction
    const insertResult = await trx('api_tokens').insert({
      id,
      user_id,
      name,
      token,
      permissions: JSON.stringify(permissions),
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    
    logger.info(`Insert result: ${JSON.stringify(insertResult)}`);
    
    // Fetch the created token to ensure it was saved (still within transaction)
    const apiToken = await trx('api_tokens').where({ id }).first();
    
    if (!apiToken) {
      throw new Error('Failed to persist API token');
    }
    
    // Commit the transaction
    await trx.commit();
    
    // Force SQLite to synchronize with disk to ensure persistence
    if (db.client.config.client === 'sqlite3') {
      await db.raw('PRAGMA wal_checkpoint(FULL)');
      // Additional steps to ensure data is written to disk
      await db.raw('PRAGMA synchronous = FULL');
      await db.raw('PRAGMA journal_mode = WAL');
    }
    
    logger.info(`API token created successfully: ${name} for user: ${user_id}`);
    return apiToken;
  } catch (error) {
    // Rollback transaction if it exists and hasn't been committed
    if (trx && !trx.isCompleted()) {
      await trx.rollback();
    }
    logger.error('API token creation error:', error);
    throw new Error(`Failed to create API token: ${error.message}`);
  }
}

/**
 * Validate API token
 * @param {string} token - API token
 * @returns {Promise<Object|null>} - Token data or null if invalid
 */
async function validateApiToken(token) {
  try {
    // Normalize token handling - try with and without 'opal-' prefix
    let normalizedToken = token;
    let alternateToken = null;
    
    // If token starts with 'opal-', create an alternate version without it
    if (token.startsWith('opal-')) {
      alternateToken = token.substring(5); // Remove 'opal-' prefix
    } else {
      // If token doesn't start with 'opal-', create an alternate version with it
      alternateToken = `opal-${token}`;
    }
    
    logger.debug(`Validating token: ${normalizedToken.substring(0, 10)}... (also trying alternate format)`);
    
    // Find token in database - try both formats
    let apiToken = await db('api_tokens')
      .where({ token: normalizedToken })
      .first();
    
    // If not found, try the alternate format
    if (!apiToken && alternateToken) {
      apiToken = await db('api_tokens')
        .where({ token: alternateToken })
        .first();
      
      // If found with alternate token, log this for debugging
      if (apiToken) {
        logger.info(`Token found using alternate format: ${alternateToken.substring(0, 10)}...`);
      }
    }
    
    if (!apiToken) {
      logger.warn(`API token not found in database: ${normalizedToken.substring(0, 10)}...`);
      return null;
    }
    
    // Check if token is expired
    if (apiToken.expires_at && new Date(apiToken.expires_at) < new Date()) {
      logger.warn(`API token expired: ${token.substring(0, 10)}...`);
      return null;
    }
    
    // Get user
    const user = await db('users')
      .where({ id: apiToken.user_id })
      .first(['id', 'username', 'role']);
    
    if (!user) {
      logger.warn(`User not found for API token: ${token.substring(0, 10)}...`);
      return null;
    }
    
    // Parse permissions, handling potential JSON parsing errors
    let permissions = {};
    try {
      permissions = JSON.parse(apiToken.permissions);
    } catch (e) {
      logger.warn(`Failed to parse permissions for token: ${token.substring(0, 10)}...`);
    }
    
    logger.info(`API token validated successfully for user: ${user.username}`);
    
    return {
      token: apiToken,
      user,
      permissions
    };
  } catch (error) {
    logger.error('API token validation error:', error);
    return null;
  }
}

/**
 * Get API tokens for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - User's API tokens
 */
async function getUserApiTokens(userId) {
  try {
    const tokens = await db('api_tokens')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc');
    
    return tokens;
  } catch (error) {
    logger.error('Error getting user API tokens:', error);
    throw new Error(`Failed to get API tokens: ${error.message}`);
  }
}

/**
 * Delete an API token
 * @param {string} tokenId - Token ID
 * @param {string} userId - User ID (for authorization)
 * @returns {Promise<boolean>} - Success status
 */
async function deleteApiToken(tokenId, userId) {
  let trx;
  try {
    // Log the deletion attempt for debugging
    logger.info(`Attempting to delete API token: ${tokenId} by user: ${userId}`);
    
    // Ensure tokenId and userId are strings for SQLite
    const tokenIdStr = String(tokenId);
    const userIdStr = String(userId);
    
    // Use a transaction to ensure data integrity
    trx = await db.transaction();
    
    // Check if token exists and belongs to user
    const token = await trx('api_tokens')
      .where({ id: tokenIdStr })
      .first();
    
    if (!token) {
      throw new Error(`Token not found with ID: ${tokenIdStr}`);
    }
    
    // Check if user has permission to delete this token
    if (token.user_id !== userIdStr && await isAdmin(userIdStr) === false) {
      throw new Error('Access denied: You do not have permission to delete this token');
    }
    
    // Delete the token
    const deleted = await trx('api_tokens')
      .where({ id: tokenIdStr })
      .del();
    
    if (deleted === 0) {
      throw new Error(`Failed to delete token with ID: ${tokenIdStr}`);
    }
    
    // Commit the transaction
    await trx.commit();
    
    // Force SQLite to synchronize with disk to ensure persistence
    if (db.client.config.client === 'sqlite3') {
      await db.raw('PRAGMA wal_checkpoint(FULL)');
    }
    
    logger.info(`API token deleted successfully: ${tokenIdStr} by user: ${userIdStr}`);
    return true;
  } catch (error) {
    // Rollback transaction if it exists and hasn't been committed
    if (trx && !trx.isCompleted()) {
      await trx.rollback();
    }
    logger.error(`Error deleting API token ${tokenId}:`, error);
    throw new Error(`Failed to delete API token: ${error.message}`);
  }
}

/**
 * Check if a user has admin role
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} - True if user is admin
 */
async function isAdmin(userId) {
  try {
    const user = await db('users')
      .where({ id: userId })
      .select('role')
      .first();
    
    return user && user.role === 'admin';
  } catch (error) {
    logger.error('Error checking admin status:', error);
    return false;
  }
}

module.exports = {
  login,
  register,
  refreshToken,
  logout,
  verifyToken,
  createApiToken,
  validateApiToken,
  getUserApiTokens,
  deleteApiToken,
  isAdmin
};
