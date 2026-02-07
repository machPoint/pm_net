/**
 * OPAL Core Toolbox - Parse, Transform, Validate Tools
 */

const Ajv = require('ajv');
const ajv = new Ajv();

async function initialize(configs, wss) {
  const tools = new Map();

  tools.set('json.validate', {
    name: 'json.validate',
    description: 'Validate JSON data against schema',
    inputSchema: {
      type: 'object',
      properties: {
        schema: { type: 'object' },
        data: {}
      },
      required: ['schema', 'data']
    },
    _internal: {
      method: 'POST',
      path: '/json/validate',
      processor: async (params) => {
        try {
          const validate = ajv.compile(params.schema);
          const valid = validate(params.data);
          return { valid, errors: validate.errors || [] };
        } catch (error) {
          return { valid: false, errors: [error.message] };
        }
      }
    }
  });

  tools.set('text.extract', {
    name: 'text.extract',
    description: 'Extract text using regex patterns',
    inputSchema: {
      type: 'object',
      properties: {
        pattern: { type: 'string' },
        text: { type: 'string' }
      },
      required: ['pattern', 'text']
    },
    _internal: {
      method: 'POST',
      path: '/text/extract',
      processor: async (params) => {
        const regex = new RegExp(params.pattern, 'g');
        const matches = Array.from(params.text.matchAll(regex));
        return { matches: matches.map(m => m[0]) };
      }
    }
  });

  return tools;
}

module.exports = { initialize };