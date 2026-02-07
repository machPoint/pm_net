/**
 * Memory Service for OPAL server
 * Handles creating, searching, and updating memories with vector embeddings
 */

const { OpenAI } = require('openai');
const db = require('../config/database');
const logger = require('../logger');

// Initialize OpenAI client for embeddings
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'sk-your-key-here' // Replace with actual key in .env
});

/**
 * Generate embeddings for text using OpenAI's API
 * @param {string} text - The text to embed
 * @returns {Promise<number[]>} - The embedding vector
 */
async function generateEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
      encoding_format: "float"
    });
    
    return response.data[0].embedding;
  } catch (error) {
    logger.error('Error generating embedding:', error);
    
    // Fallback to random embedding if OpenAI is unavailable
    // This is just for development purposes
    logger.warn('Using fallback random embedding');
    return Array(1536).fill().map(() => Math.random() * 2 - 1);
  }
}

/**
 * Create a new memory with embedded vector
 * @param {string} userId - The user ID
 * @param {string} title - Memory title
 * @param {string} content - Memory content
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<Object>} - The created memory
 */
async function createMemory(userId, title, content, metadata = {}) {
  try {
    // Generate embedding for the content
    const embedding = await generateEmbedding(content);
    
    // Insert memory into database - for SQLite, store embedding as JSON string
    const [memory] = await db('memories').insert({
      user_id: userId,
      title,
      content,
      embedding: JSON.stringify(embedding),
      metadata: JSON.stringify(metadata)
    }).returning('*');
    
    logger.info(`Created memory: ${memory.id} for user: ${userId}`);
    return memory;
  } catch (error) {
    logger.error('Error creating memory:', error);
    throw new Error(`Failed to create memory: ${error.message}`);
  }
}

/**
 * Search memories using vector similarity
 * @param {string} userId - The user ID
 * @param {string} query - Search query
 * @param {number} limit - Maximum number of results
 * @param {number} threshold - Similarity threshold (0-1)
 * @returns {Promise<Array>} - Matching memories
 */
async function searchMemories(userId, query, limit = 10, threshold = 0.7) {
  try {
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);
    
    // For SQLite, use the custom vector similarity function
    const memories = await db.vectorSimilarity.findSimilar(
      queryEmbedding,
      userId,
      threshold,
      limit
    );
    
    logger.info(`Found ${memories.length} memories for query: "${query.substring(0, 20)}..."`);
    return memories;
  } catch (error) {
    logger.error('Error searching memories:', error);
    throw new Error(`Failed to search memories: ${error.message}`);
  }
}

/**
 * Update an existing memory
 * @param {string} memoryId - The memory ID
 * @param {string} userId - The user ID (for authorization)
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} - The updated memory
 */
async function updateMemory(memoryId, userId, updates) {
  try {
    // Check if the memory exists and belongs to the user
    const existingMemory = await db('memories')
      .where({ id: memoryId, user_id: userId })
      .first();
    
    if (!existingMemory) {
      throw new Error('Memory not found or access denied');
    }
    
    // Prepare update object
    const updateData = {};
    
    if (updates.title) {
      updateData.title = updates.title;
    }
    
    if (updates.content) {
      updateData.content = updates.content;
      // Re-generate embedding if content changed and store as JSON string for SQLite
      updateData.embedding = JSON.stringify(await generateEmbedding(updates.content));
    }
    
    if (updates.metadata) {
      updateData.metadata = JSON.stringify(updates.metadata);
    }
    
    // Update the memory
    const [updatedMemory] = await db('memories')
      .where({ id: memoryId })
      .update({
        ...updateData,
        updated_at: db.fn.now()
      })
      .returning('*');
    
    logger.info(`Updated memory: ${memoryId}`);
    return updatedMemory;
  } catch (error) {
    logger.error('Error updating memory:', error);
    throw new Error(`Failed to update memory: ${error.message}`);
  }
}

/**
 * Delete a memory
 * @param {string} memoryId - The memory ID
 * @param {string} userId - The user ID (for authorization)
 * @returns {Promise<boolean>} - Success status
 */
async function deleteMemory(memoryId, userId) {
  try {
    // Check if the memory exists and belongs to the user
    const existingMemory = await db('memories')
      .where({ id: memoryId, user_id: userId })
      .first();
    
    if (!existingMemory) {
      throw new Error('Memory not found or access denied');
    }
    
    // Delete the memory
    await db('memories')
      .where({ id: memoryId })
      .del();
    
    logger.info(`Deleted memory: ${memoryId}`);
    return true;
  } catch (error) {
    logger.error('Error deleting memory:', error);
    throw new Error(`Failed to delete memory: ${error.message}`);
  }
}

/**
 * Get all memories for a user
 * @param {string} userId - The user ID
 * @param {number} limit - Maximum number of results
 * @param {number} offset - Pagination offset
 * @returns {Promise<Array>} - User memories
 */
async function getUserMemories(userId, limit = 50, offset = 0) {
  try {
    const memories = await db('memories')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);
    
    logger.info(`Retrieved ${memories.length} memories for user: ${userId}`);
    return memories;
  } catch (error) {
    logger.error('Error getting user memories:', error);
    throw new Error(`Failed to get user memories: ${error.message}`);
  }
}

module.exports = {
  createMemory,
  searchMemories,
  updateMemory,
  deleteMemory,
  getUserMemories
};
