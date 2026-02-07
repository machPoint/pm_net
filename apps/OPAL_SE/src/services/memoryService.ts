/**
 * Memory Service for OPAL server
 * Handles creating, searching, and updating memories with vector embeddings
 */

import { OpenAI } from 'openai';
import db from '../config/database';
import logger from '../logger';
import { Memory } from '../types/database';

// Initialize OpenAI client for embeddings
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'sk-your-key-here'
});

/**
 * Generate embeddings for text using OpenAI's API
 */
async function generateEmbedding(text: string): Promise<number[]> {
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
    logger.warn('Using fallback random embedding');
    return Array(1536).fill(0).map(() => Math.random() * 2 - 1);
  }
}

/**
 * Create a new memory with embedded vector
 */
export async function createMemory(
  userId: number,
  title: string,
  content: string,
  metadata: Record<string, unknown> = {}
): Promise<any> {
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
  } catch (error: any) {
    logger.error('Error creating memory:', error);
    throw new Error(`Failed to create memory: ${error.message}`);
  }
}

/**
 * Search memories using vector similarity
 */
export async function searchMemories(
  userId: number,
  query: string,
  limit: number = 10,
  threshold: number = 0.7
): Promise<any[]> {
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
  } catch (error: any) {
    logger.error('Error searching memories:', error);
    throw new Error(`Failed to search memories: ${error.message}`);
  }
}

/**
 * Update an existing memory
 */
export async function updateMemory(
  memoryId: number,
  userId: number,
  updates: {
    title?: string;
    content?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<any> {
  try {
    // Check if the memory exists and belongs to the user
    const existingMemory = await db('memories')
      .where({ id: memoryId, user_id: userId })
      .first();
    
    if (!existingMemory) {
      throw new Error('Memory not found or access denied');
    }
    
    // Prepare update object
    const updateData: any = {};
    
    if (updates.title) {
      updateData.title = updates.title;
    }
    
    if (updates.content) {
      updateData.content = updates.content;
      // Re-generate embedding if content changed
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
  } catch (error: any) {
    logger.error('Error updating memory:', error);
    throw new Error(`Failed to update memory: ${error.message}`);
  }
}

/**
 * Delete a memory
 */
export async function deleteMemory(memoryId: number, userId: number): Promise<boolean> {
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
  } catch (error: any) {
    logger.error('Error deleting memory:', error);
    throw new Error(`Failed to delete memory: ${error.message}`);
  }
}

/**
 * Get all memories for a user
 */
export async function getUserMemories(
  userId: number,
  limit: number = 50,
  offset: number = 0
): Promise<any[]> {
  try {
    const memories = await db('memories')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);
    
    logger.info(`Retrieved ${memories.length} memories for user: ${userId}`);
    return memories;
  } catch (error: any) {
    logger.error('Error getting user memories:', error);
    throw new Error(`Failed to get user memories: ${error.message}`);
  }
}
