/**
 * Database connection configuration for OPAL server
 * Uses Knex.js to connect to SQLite for development
 */

const knex = require('knex');
const knexConfig = require('../../knexfile');
const logger = require('../logger');

// Determine environment
const environment = process.env.NODE_ENV || 'development';

// Initialize knex with the appropriate configuration
const db = knex(knexConfig[environment]);

// For SQLite in development, we need to implement vector similarity ourselves
// since SQLite doesn't have native vector support like pgvector

/**
 * Calculate cosine similarity between two vectors
 * @param {Array} vec1 - First vector
 * @param {Array} vec2 - Second vector
 * @returns {number} - Cosine similarity (-1 to 1)
 */
function cosineSimilarity(vec1, vec2) {
  if (!vec1 || !vec2 || vec1.length !== vec2.length) {
    return 0;
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    normA += vec1[i] * vec1[i];
    normB += vec2[i] * vec2[i];
  }
  
  if (normA === 0 || normB === 0) {
    return 0;
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Add vector similarity functions to the db object
db.vectorSimilarity = {
  // Calculate similarity between two vectors
  similarity: cosineSimilarity,
  
  // Find similar vectors in memory table
  async findSimilar(queryEmbedding, userId, threshold = 0.7, limit = 10) {
    // For SQLite, we need to load all memories and calculate similarity in JS
    // This is not efficient for large datasets but works for development
    const memories = await db('memories')
      .where({ user_id: userId })
      .select('*');
    
    // Calculate similarity for each memory
    const results = memories
      .map(memory => {
        // Parse the embedding JSON string
        const embedding = JSON.parse(memory.embedding || '[]');
        const similarity = cosineSimilarity(queryEmbedding, embedding);
        
        return {
          ...memory,
          similarity
        };
      })
      .filter(memory => memory.similarity > threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
    
    return results;
  }
};

// Log successful connection
db.raw('SELECT 1')
  .then(() => {
    logger.info(`Connected to ${environment} database`);
  })
  .catch((err) => {
    logger.error('Database connection error:', err);
  });

module.exports = db;
