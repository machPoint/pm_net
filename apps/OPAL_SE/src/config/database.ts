/**
 * Database connection configuration for OPAL server
 * Uses Knex.js to connect to SQLite for development
 */

import knex, { Knex } from 'knex';
import knexConfig from '../../knexfile';
import logger from '../logger';

// Determine environment
const environment = (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test';

// Initialize knex with the appropriate configuration
const db: Knex = knex(knexConfig[environment]);

// For SQLite in development, we need to implement vector similarity ourselves
// since SQLite doesn't have native vector support like pgvector

/**
 * Calculate cosine similarity between two vectors
 * @param vec1 - First vector
 * @param vec2 - Second vector
 * @returns Cosine similarity (-1 to 1)
 */
function cosineSimilarity(vec1: number[], vec2: number[]): number {
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

// Interface for memory records with similarity
interface MemoryWithSimilarity {
  id: number;
  user_id: number;
  title: string;
  content: string;
  embedding: string;
  metadata: string;
  created_at: Date;
  updated_at: Date;
  similarity: number;
}

// Add vector similarity functions to the db object
export interface DatabaseWithVectorSupport extends Knex {
  vectorSimilarity: {
    similarity: typeof cosineSimilarity;
    findSimilar: (
      queryEmbedding: number[],
      userId: number,
      threshold?: number,
      limit?: number
    ) => Promise<MemoryWithSimilarity[]>;
  };
}

const dbWithVectorSupport = db as DatabaseWithVectorSupport;

dbWithVectorSupport.vectorSimilarity = {
  // Calculate similarity between two vectors
  similarity: cosineSimilarity,
  
  // Find similar vectors in memory table
  async findSimilar(
    queryEmbedding: number[],
    userId: number,
    threshold: number = 0.7,
    limit: number = 10
  ): Promise<MemoryWithSimilarity[]> {
    // For SQLite, we need to load all memories and calculate similarity in JS
    // This is not efficient for large datasets but works for development
    const memories = await db('memories')
      .where({ user_id: userId })
      .select('*');
    
    // Calculate similarity for each memory
    const results = memories
      .map((memory: any) => {
        // Parse the embedding JSON string
        const embedding = JSON.parse(memory.embedding || '[]') as number[];
        const similarity = cosineSimilarity(queryEmbedding, embedding);
        
        return {
          ...memory,
          similarity,
        };
      })
      .filter((memory: MemoryWithSimilarity) => memory.similarity > threshold)
      .sort((a: MemoryWithSimilarity, b: MemoryWithSimilarity) => b.similarity - a.similarity)
      .slice(0, limit);
    
    return results;
  },
};

// Log successful connection
db.raw('SELECT 1')
  .then(() => {
    logger.info(`Connected to ${environment} database`);
  })
  .catch((err: Error) => {
    logger.error('Database connection error:', err);
  });

export default dbWithVectorSupport;
export { Knex };
