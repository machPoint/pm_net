/**
 * OPAL Core Toolbox - Document and Diagram Tools
 */

async function initialize(configs, wss) {
  const tools = new Map();

  tools.set('markdown.render', {
    name: 'markdown.render',
    description: 'Render markdown to HTML',
    inputSchema: {
      type: 'object',
      properties: {
        markdown: { type: 'string' }
      },
      required: ['markdown']
    },
    _internal: {
      method: 'POST',
      path: '/markdown/render',
      processor: async (params) => {
        // Simple markdown to HTML conversion (placeholder)
        const html = params.markdown
          .replace(/^# (.+)$/gm, '<h1>$1</h1>')
          .replace(/^## (.+)$/gm, '<h2>$1</h2>')
          .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.+?)\*/g, '<em>$1</em>');
        return { html };
      }
    }
  });

  tools.set('table.detect', {
    name: 'table.detect',
    description: 'Detect tables in text',
    inputSchema: {
      type: 'object',
      properties: {
        markdown_or_text: { type: 'string' }
      },
      required: ['markdown_or_text']
    },
    _internal: {
      method: 'POST',
      path: '/table/detect',
      processor: async (params) => {
        // Simple table detection
        const lines = params.markdown_or_text.split('\n');
        const tableLines = lines.filter(line => line.includes('|'));
        
        if (tableLines.length > 0) {
          return {
            rows: tableLines.map(line => 
              line.split('|').map(cell => cell.trim()).filter(cell => cell)
            )
          };
        }
        
        return { rows: [] };
      }
    }
  });

  return tools;
}

module.exports = { initialize };