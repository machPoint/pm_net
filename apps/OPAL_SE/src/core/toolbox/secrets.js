/**
 * OPAL Core Toolbox - Secrets, Config, Storage Tools
 * 
 * This module implements secure storage tools for secrets management,
 * configuration retrieval, key-value storage, and blob storage.
 */

const crypto = require('crypto');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const logger = require('../../logger');

// In-memory storage for demo - replace with real storage backends
const kvStore = new Map();
const blobStore = new Map();
const configStore = new Map();
const secretStore = new Map();

/**
 * Initialize secrets, config, and storage tools
 */
async function initialize(configs, wss) {
  const tools = new Map();

  // Initialize demo data
  await initializeDemoData();

  // 1. Vault - Secret Management
  tools.set('vault.fetch_secret', {
    name: 'vault.fetch_secret',
    description: 'Fetch a secret from the secure vault',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Secret name' }
      },
      required: ['name']
    },
    _internal: {
      method: 'POST',
      path: '/vault/fetch_secret',
      processor: async (params) => {
        const { name } = params;
        
        if (!secretStore.has(name)) {
          throw new Error(`Secret '${name}' not found`);
        }
        
        const secret = secretStore.get(name);
        const leaseExpiry = new Date(Date.now() + 3600000).toISOString(); // 1 hour lease
        
        logger.info(`Fetched secret: ${name}`);
        
        return {
          value: secret.value,
          lease_expires_at: leaseExpiry
        };
      }
    }
  });

  // 2. Configuration Management
  tools.set('config.get', {
    name: 'config.get',
    description: 'Get configuration value',
    inputSchema: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Configuration key' }
      },
      required: ['key']
    },
    _internal: {
      method: 'POST',
      path: '/config/get',
      processor: async (params) => {
        const { key } = params;
        
        // Check environment variables first
        if (process.env[key]) {
          return { value: process.env[key] };
        }
        
        // Check config store
        if (configStore.has(key)) {
          return { value: configStore.get(key) };
        }
        
        return { value: null };
      }
    }
  });

  // 3. Key-Value Storage
  tools.set('kv.get', {
    name: 'kv.get',
    description: 'Get value from key-value store',
    inputSchema: {
      type: 'object',
      properties: {
        ns: { type: 'string', description: 'Namespace' },
        key: { type: 'string', description: 'Key name' }
      },
      required: ['ns', 'key']
    },
    _internal: {
      method: 'POST',
      path: '/kv/get',
      processor: async (params) => {
        const { ns, key } = params;
        const fullKey = `${ns}:${key}`;
        
        if (!kvStore.has(fullKey)) {
          return { value: null };
        }
        
        const entry = kvStore.get(fullKey);
        
        // Check TTL
        if (entry.expires && Date.now() > entry.expires) {
          kvStore.delete(fullKey);
          return { value: null };
        }
        
        return { value: entry.value };
      }
    }
  });

  tools.set('kv.set', {
    name: 'kv.set',
    description: 'Set value in key-value store',
    inputSchema: {
      type: 'object',
      properties: {
        ns: { type: 'string', description: 'Namespace' },
        key: { type: 'string', description: 'Key name' },
        value: { description: 'Value to store' },
        ttl_s: { type: 'integer', description: 'Time to live in seconds' }
      },
      required: ['ns', 'key', 'value']
    },
    _internal: {
      method: 'POST',
      path: '/kv/set',
      processor: async (params) => {
        const { ns, key, value, ttl_s } = params;
        const fullKey = `${ns}:${key}`;
        
        const entry = {
          value,
          created: Date.now(),
          expires: ttl_s ? Date.now() + (ttl_s * 1000) : null
        };
        
        kvStore.set(fullKey, entry);
        
        return { ok: true };
      }
    }
  });

  // 4. Blob Storage
  tools.set('blob.put', {
    name: 'blob.put',
    description: 'Store binary data in blob storage',
    inputSchema: {
      type: 'object',
      properties: {
        ns: { type: 'string', description: 'Namespace' },
        name: { type: 'string', description: 'Blob name' },
        bytes_b64: { type: 'string', description: 'Base64 encoded binary data' },
        mime: { type: 'string', description: 'MIME type' }
      },
      required: ['ns', 'name', 'bytes_b64', 'mime']
    },
    _internal: {
      method: 'POST',
      path: '/blob/put',
      processor: async (params) => {
        const { ns, name, bytes_b64, mime } = params;
        
        // Validate base64
        let buffer;
        try {
          buffer = Buffer.from(bytes_b64, 'base64');
        } catch (error) {
          throw new Error('Invalid base64 data');
        }
        
        const blobId = uuidv4();
        const uri = `blob://${ns}/${blobId}`;
        const etag = crypto.createHash('md5').update(buffer).digest('hex');
        
        const blob = {
          id: blobId,
          namespace: ns,
          name,
          data: bytes_b64,
          mime,
          size: buffer.length,
          etag,
          created: new Date().toISOString()
        };
        
        blobStore.set(uri, blob);
        
        logger.info(`Stored blob: ${name} (${buffer.length} bytes) as ${uri}`);
        
        return { uri, etag };
      }
    }
  });

  tools.set('blob.get', {
    name: 'blob.get',
    description: 'Retrieve binary data from blob storage',
    inputSchema: {
      type: 'object',
      properties: {
        uri: { type: 'string', description: 'Blob URI' }
      },
      required: ['uri']
    },
    _internal: {
      method: 'POST',
      path: '/blob/get',
      processor: async (params) => {
        const { uri } = params;
        
        if (!blobStore.has(uri)) {
          throw new Error(`Blob not found: ${uri}`);
        }
        
        const blob = blobStore.get(uri);
        
        return {
          bytes_b64: blob.data,
          mime: blob.mime,
          etag: blob.etag
        };
      }
    }
  });

  tools.set('blob.signed_url', {
    name: 'blob.signed_url',
    description: 'Generate a signed URL for blob access',
    inputSchema: {
      type: 'object',
      properties: {
        uri: { type: 'string', description: 'Blob URI' },
        ttl_s: { type: 'integer', description: 'URL expiry time in seconds' }
      },
      required: ['uri', 'ttl_s']
    },
    _internal: {
      method: 'POST',
      path: '/blob/signed_url',
      processor: async (params) => {
        const { uri, ttl_s } = params;
        
        if (!blobStore.has(uri)) {
          throw new Error(`Blob not found: ${uri}`);
        }
        
        // Generate signed URL (simplified implementation)
        const expires = Date.now() + (ttl_s * 1000);
        const signature = crypto
          .createHmac('sha256', 'blob_signing_key') // Use proper secret in production
          .update(`${uri}:${expires}`)
          .digest('hex');
        
        const signedUrl = `http://localhost:3000/api/blob/download?uri=${encodeURIComponent(uri)}&expires=${expires}&signature=${signature}`;
        
        return { url: signedUrl };
      }
    }
  });

  return tools;
}

/**
 * Initialize demo data for testing
 */
async function initializeDemoData() {
  // Demo secrets
  secretStore.set('api_key', { 
    value: 'demo-api-key-123', 
    created: Date.now() 
  });
  secretStore.set('db_password', { 
    value: 'super-secret-password', 
    created: Date.now() 
  });
  
  // Demo config
  configStore.set('app_name', 'OPAL Server');
  configStore.set('version', '1.0.0');
  configStore.set('debug_mode', 'false');
  
  // Demo KV data
  kvStore.set('app:theme', { 
    value: 'dark', 
    created: Date.now(), 
    expires: null 
  });
  kvStore.set('cache:user_123', { 
    value: { name: 'John Doe', role: 'admin' }, 
    created: Date.now(), 
    expires: Date.now() + 300000 // 5 minutes
  });
}

module.exports = { initialize };