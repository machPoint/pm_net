/**
 * OPAL Core Toolbox - Safety, Redaction, Formatting Tools
 */

async function initialize(configs, wss) {
  const tools = new Map();

  tools.set('pii.redact', {
    name: 'pii.redact',
    description: 'Redact PII from text',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string' },
        ruleset: { type: 'string', default: 'default' }
      },
      required: ['text']
    },
    _internal: {
      method: 'POST',
      path: '/pii/redact',
      processor: async (params) => {
        // Simple PII redaction patterns
        let text = params.text;
        const redactions = [];
        
        // Email addresses
        const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
        text = text.replace(emailRegex, (match) => {
          redactions.push({ type: 'email', original: match });
          return '[EMAIL_REDACTED]';
        });
        
        // Phone numbers (simple pattern)
        const phoneRegex = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g;
        text = text.replace(phoneRegex, (match) => {
          redactions.push({ type: 'phone', original: match });
          return '[PHONE_REDACTED]';
        });
        
        return { text, redactions };
      }
    }
  });

  tools.set('content.moderate', {
    name: 'content.moderate',
    description: 'Moderate content for safety',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string' }
      },
      required: ['text']
    },
    _internal: {
      method: 'POST',
      path: '/content/moderate',
      processor: async (params) => {
        // Simple content moderation
        const flags = [];
        const text = params.text.toLowerCase();
        
        // Check for potential issues
        if (text.includes('password') || text.includes('secret')) {
          flags.push('potential_credential');
        }
        
        if (text.length > 10000) {
          flags.push('very_long_content');
        }
        
        return { ok: flags.length === 0, flags };
      }
    }
  });

  tools.set('format.ticket', {
    name: 'format.ticket',
    description: 'Format data as a ticket',
    inputSchema: {
      type: 'object',
      properties: {
        artifact: { type: 'object' }
      },
      required: ['artifact']
    },
    _internal: {
      method: 'POST',
      path: '/format/ticket',
      processor: async (params) => {
        const { artifact } = params;
        
        const markdown = `# ${artifact.title || 'Untitled'}

**ID:** ${artifact.id || 'N/A'}
**Status:** ${artifact.status || 'Unknown'}
**Priority:** ${artifact.priority || 'Normal'}

## Description
${artifact.description || 'No description provided.'}

## Details
${Object.entries(artifact).map(([key, value]) => 
  `- **${key}:** ${value}`
).join('\n')}

---
*Generated: ${new Date().toISOString()}*`;

        return { markdown };
      }
    }
  });

  return tools;
}

module.exports = { initialize };