/**
 * Development seed data for OPAL server
 * Creates a test user and some sample memories
 */

const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

exports.seed = async function(knex) {
  // Clear existing data
  await knex('tool_runs').del();
  await knex('api_tokens').del();
  await knex('memories').del();
  await knex('sessions').del();
  await knex('users').del();

  // Create test admin user
  const adminId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'; // Fixed UUID for consistency
  const passwordHash = await bcrypt.hash('admin123', 10);
  
  await knex('users').insert({
    id: adminId,
    username: 'admin',
    email: 'admin@example.com',
    password_hash: passwordHash,
    role: 'admin',
    settings: JSON.stringify({
      theme: 'light',
      notifications: true
    })
  });

  // Create test regular user
  const userId = '550e8400-e29b-41d4-a716-446655440000'; // Fixed UUID for consistency
  const userPasswordHash = await bcrypt.hash('user123', 10);
  
  await knex('users').insert({
    id: userId,
    username: 'user',
    email: 'user@example.com',
    password_hash: userPasswordHash,
    role: 'user',
    settings: JSON.stringify({
      theme: 'dark',
      notifications: false
    })
  });

  // Create API token for admin
  await knex('api_tokens').insert({
    id: uuidv4(),
    user_id: adminId,
    name: 'Admin API Token',
    token: 'admin-api-token-12345',
    permissions: JSON.stringify({
      read: true,
      write: true,
      admin: true
    }),
    expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
  });

  // Create API token for user
  await knex('api_tokens').insert({
    id: uuidv4(),
    user_id: userId,
    name: 'User API Token',
    token: 'user-api-token-67890',
    permissions: JSON.stringify({
      read: true,
      write: true,
      admin: false
    }),
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
  });

  // Create sample memories for admin
  await knex('memories').insert([
    {
      id: uuidv4(),
      user_id: adminId,
      title: 'OPAL Server Architecture',
      content: 'OPAL servers are containerized MCP implementations that provide API access and tool execution.',
      embedding: JSON.stringify(Array(384).fill(0)), // Placeholder embedding
      metadata: JSON.stringify({
        tags: ['architecture', 'documentation'],
        importance: 'high'
      })
    },
    {
      id: uuidv4(),
      user_id: adminId,
      title: 'API Integration Guide',
      content: 'To integrate a new API, add the configuration to the environment variables with the MCP_API prefix.',
      embedding: JSON.stringify(Array(384).fill(0)), // Placeholder embedding
      metadata: JSON.stringify({
        tags: ['api', 'configuration'],
        importance: 'medium'
      })
    }
  ]);

  // Create sample memories for user
  await knex('memories').insert([
    {
      id: uuidv4(),
      user_id: userId,
      title: 'Personal Note',
      content: 'Remember to update the documentation for the new features.',
      embedding: JSON.stringify(Array(384).fill(0)), // Placeholder embedding
      metadata: JSON.stringify({
        tags: ['personal', 'todo'],
        importance: 'medium'
      })
    }
  ]);

  // Create sample tool runs for audit log
  await knex('tool_runs').insert([
    {
      id: uuidv4(),
      user_id: adminId,
      tool_name: 'summarizeContent',
      parameters: JSON.stringify({
        content: 'Long article about AI',
        type: 'headline'
      }),
      result: JSON.stringify({
        summary: 'AI Advances in 2025'
      }),
      status: 'completed',
      duration_ms: 1200,
      executed_at: new Date()
    },
    {
      id: uuidv4(),
      user_id: userId,
      tool_name: 'fakestore_get_products',
      parameters: JSON.stringify({
        category: 'electronics'
      }),
      result: JSON.stringify({
        products: [
          { id: 1, name: 'Laptop', price: 999 },
          { id: 2, name: 'Smartphone', price: 699 }
        ]
      }),
      status: 'completed',
      duration_ms: 350,
      executed_at: new Date()
    }
  ]);
};
