/**
 * OPAL MCP Utility Tools
 * 
 * This script creates utility tools for the OPAL server that can be used by other applications,
 * such as a Node.js and React app, to integrate with the OPAL system.
 */

const toolCreator = require('../utils/toolCreator');
const fs = require('fs');
const path = require('path');

/**
 * Create MCP utility tools for OPAL
 * @param {Object} configs - Configuration object
 * @param {Object} wss - WebSocket server instance
 */
function createUtilityTools(configs, wss) {
  console.log('Creating utility MCP tools...');

  // 1. Data Transformation Tool
  toolCreator.createTextTool(
    configs,
    wss,
    'transform_data',
    'Transforms data between different formats (JSON, XML, CSV)',
    (params) => {
      try {
        const { inputData, sourceFormat, targetFormat } = params;
        
        if (!inputData || !sourceFormat || !targetFormat) {
          return { 
            error: 'Missing required parameters: inputData, sourceFormat, and targetFormat are required' 
          };
        }

        // Parse the input data based on source format
        let parsedData;
        switch (sourceFormat.toLowerCase()) {
          case 'json':
            parsedData = JSON.parse(inputData);
            break;
          case 'xml':
            // Simple XML to JSON conversion (for demo purposes)
            // In production, use a proper XML parser library
            parsedData = convertXmlToJson(inputData);
            break;
          case 'csv':
            parsedData = convertCsvToJson(inputData);
            break;
          default:
            return { error: `Unsupported source format: ${sourceFormat}` };
        }

        // Transform to target format
        let result;
        switch (targetFormat.toLowerCase()) {
          case 'json':
            result = JSON.stringify(parsedData, null, 2);
            break;
          case 'xml':
            // Simple JSON to XML conversion (for demo purposes)
            result = convertJsonToXml(parsedData);
            break;
          case 'csv':
            result = convertJsonToCsv(parsedData);
            break;
          default:
            return { error: `Unsupported target format: ${targetFormat}` };
        }

        return { result };
      } catch (error) {
        return { error: `Transformation error: ${error.message}` };
      }
    },
    {
      inputSchema: {
        type: 'object',
        properties: {
          inputData: { type: 'string', description: 'Data to transform' },
          sourceFormat: { type: 'string', enum: ['json', 'xml', 'csv'], description: 'Source data format' },
          targetFormat: { type: 'string', enum: ['json', 'xml', 'csv'], description: 'Target data format' }
        },
        required: ['inputData', 'sourceFormat', 'targetFormat']
      }
    }
  );

  // 2. Data Validation Tool
  toolCreator.createTextTool(
    configs,
    wss,
    'validate_data',
    'Validates data against a schema or set of rules',
    (params) => {
      try {
        const { data, schema, dataType } = params;
        
        if (!data || !schema || !dataType) {
          return { 
            error: 'Missing required parameters: data, schema, and dataType are required' 
          };
        }

        let parsedData, parsedSchema;
        
        // Parse data based on type
        try {
          if (dataType === 'json') {
            parsedData = typeof data === 'string' ? JSON.parse(data) : data;
            parsedSchema = typeof schema === 'string' ? JSON.parse(schema) : schema;
          } else {
            return { error: `Unsupported data type: ${dataType}` };
          }
        } catch (error) {
          return { error: `Error parsing input: ${error.message}` };
        }

        // Perform validation
        const validationResult = validateJsonAgainstSchema(parsedData, parsedSchema);
        
        return {
          result: {
            isValid: validationResult.valid,
            errors: validationResult.errors
          }
        };
      } catch (error) {
        return { error: `Validation error: ${error.message}` };
      }
    },
    {
      inputSchema: {
        type: 'object',
        properties: {
          data: { type: 'string', description: 'Data to validate' },
          schema: { type: 'string', description: 'Schema to validate against' },
          dataType: { type: 'string', enum: ['json'], description: 'Type of data' }
        },
        required: ['data', 'schema', 'dataType']
      }
    }
  );

  // 3. File Operations Tool
  toolCreator.createTextTool(
    configs,
    wss,
    'file_operations',
    'Performs file operations like reading, writing, and listing files',
    (params) => {
      try {
        const { operation, filePath, content, directory } = params;
        
        if (!operation) {
          return { error: 'Missing required parameter: operation' };
        }

        // Ensure the operation is limited to a specific directory for security
        const safeBasePath = path.resolve(process.cwd(), 'data');
        
        switch (operation) {
          case 'read':
            if (!filePath) {
              return { error: 'Missing required parameter: filePath' };
            }
            
            const safePath = ensureSafePath(filePath, safeBasePath);
            if (!safePath) {
              return { error: 'Invalid file path: Access denied' };
            }
            
            if (!fs.existsSync(safePath)) {
              return { error: 'File not found' };
            }
            
            const fileContent = fs.readFileSync(safePath, 'utf8');
            return { result: fileContent };
            
          case 'write':
            if (!filePath || content === undefined) {
              return { error: 'Missing required parameters: filePath and content' };
            }
            
            const safeWritePath = ensureSafePath(filePath, safeBasePath);
            if (!safeWritePath) {
              return { error: 'Invalid file path: Access denied' };
            }
            
            // Ensure directory exists
            const dirPath = path.dirname(safeWritePath);
            if (!fs.existsSync(dirPath)) {
              fs.mkdirSync(dirPath, { recursive: true });
            }
            
            fs.writeFileSync(safeWritePath, content);
            return { result: 'File written successfully' };
            
          case 'list':
            if (!directory) {
              return { error: 'Missing required parameter: directory' };
            }
            
            const safeDir = ensureSafePath(directory, safeBasePath);
            if (!safeDir) {
              return { error: 'Invalid directory path: Access denied' };
            }
            
            if (!fs.existsSync(safeDir)) {
              return { error: 'Directory not found' };
            }
            
            const files = fs.readdirSync(safeDir);
            return { result: files };
            
          default:
            return { error: `Unsupported operation: ${operation}` };
        }
      } catch (error) {
        return { error: `File operation error: ${error.message}` };
      }
    },
    {
      inputSchema: {
        type: 'object',
        properties: {
          operation: { type: 'string', enum: ['read', 'write', 'list'], description: 'File operation to perform' },
          filePath: { type: 'string', description: 'Path to the file' },
          content: { type: 'string', description: 'Content to write to the file' },
          directory: { type: 'string', description: 'Directory to list files from' }
        },
        required: ['operation']
      }
    }
  );

  // 4. System Information Tool
  toolCreator.createTextTool(
    configs,
    wss,
    'system_info',
    'Provides information about the OPAL system',
    (params) => {
      try {
        const { infoType } = params;
        
        if (!infoType) {
          return { error: 'Missing required parameter: infoType' };
        }
        
        switch (infoType) {
          case 'version':
            // Read package.json to get version
            const packagePath = path.resolve(process.cwd(), 'package.json');
            if (fs.existsSync(packagePath)) {
              const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
              return { result: { version: packageJson.version } };
            }
            return { result: { version: 'unknown' } };
            
          case 'status':
            // Return system status
            return { 
              result: { 
                status: 'online',
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                timestamp: new Date().toISOString()
              } 
            };
            
          case 'config':
            // Return non-sensitive configuration
            return { 
              result: {
                environment: process.env.NODE_ENV || 'development',
                platform: process.platform,
                nodeVersion: process.version,
                features: {
                  mcp: true,
                  darkMode: true,
                  utilities: true
                }
              } 
            };
            
          default:
            return { error: `Unsupported info type: ${infoType}` };
        }
      } catch (error) {
        return { error: `System info error: ${error.message}` };
      }
    },
    {
      inputSchema: {
        type: 'object',
        properties: {
          infoType: { type: 'string', enum: ['version', 'status', 'config'], description: 'Type of system information to retrieve' }
        },
        required: ['infoType']
      }
    }
  );

  console.log('Utility MCP tools created successfully!');
}

/**
 * Helper function to ensure a path is within a safe base directory
 * @param {string} requestedPath - The path requested by the client
 * @param {string} safeBasePath - The base path that is considered safe
 * @returns {string|null} - The safe absolute path or null if unsafe
 */
function ensureSafePath(requestedPath, safeBasePath) {
  const normalizedPath = path.normalize(requestedPath);
  const absolutePath = path.isAbsolute(normalizedPath) 
    ? normalizedPath 
    : path.join(safeBasePath, normalizedPath);
  
  // Check if the path is within the safe base path
  if (!absolutePath.startsWith(safeBasePath)) {
    return null;
  }
  
  return absolutePath;
}

/**
 * Simple XML to JSON converter (for demo purposes)
 * @param {string} xml - XML string
 * @returns {Object} - JSON object
 */
function convertXmlToJson(xml) {
  // This is a simplified demo implementation
  // In production, use a proper XML parser library
  const result = {};
  const matches = xml.match(/<([^>]+)>([^<]+)<\/[^>]+>/g);
  
  if (matches) {
    matches.forEach(match => {
      const tagMatch = match.match(/<([^>]+)>([^<]+)<\/[^>]+>/);
      if (tagMatch) {
        const [, tag, value] = tagMatch;
        result[tag] = value;
      }
    });
  }
  
  return result;
}

/**
 * Simple JSON to XML converter (for demo purposes)
 * @param {Object} json - JSON object
 * @returns {string} - XML string
 */
function convertJsonToXml(json) {
  // This is a simplified demo implementation
  // In production, use a proper XML generator library
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<root>\n';
  
  for (const key in json) {
    if (json.hasOwnProperty(key)) {
      const value = json[key];
      if (typeof value === 'object' && value !== null) {
        xml += `  <${key}>${JSON.stringify(value)}</${key}>\n`;
      } else {
        xml += `  <${key}>${value}</${key}>\n`;
      }
    }
  }
  
  xml += '</root>';
  return xml;
}

/**
 * CSV to JSON converter
 * @param {string} csv - CSV string
 * @returns {Array} - Array of objects
 */
function convertCsvToJson(csv) {
  const lines = csv.split('\n');
  const headers = lines[0].split(',').map(header => header.trim());
  const result = [];
  
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '') continue;
    
    const values = lines[i].split(',').map(value => value.trim());
    const obj = {};
    
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = values[j];
    }
    
    result.push(obj);
  }
  
  return result;
}

/**
 * JSON to CSV converter
 * @param {Array|Object} json - JSON array or object
 * @returns {string} - CSV string
 */
function convertJsonToCsv(json) {
  if (!Array.isArray(json)) {
    json = [json];
  }
  
  if (json.length === 0) {
    return '';
  }
  
  const headers = Object.keys(json[0]);
  let csv = headers.join(',') + '\n';
  
  json.forEach(item => {
    const values = headers.map(header => {
      const value = item[header];
      // Handle values with commas by wrapping in quotes
      if (typeof value === 'string' && value.includes(',')) {
        return `"${value}"`;
      }
      return value;
    });
    
    csv += values.join(',') + '\n';
  });
  
  return csv;
}

/**
 * Validate JSON data against a schema
 * @param {Object} data - The data to validate
 * @param {Object} schema - The schema to validate against
 * @returns {Object} - Validation result
 */
function validateJsonAgainstSchema(data, schema) {
  // This is a simplified validation implementation
  // In production, use a proper JSON schema validator
  const errors = [];
  
  // Check required properties
  if (schema.required && Array.isArray(schema.required)) {
    schema.required.forEach(prop => {
      if (data[prop] === undefined) {
        errors.push(`Missing required property: ${prop}`);
      }
    });
  }
  
  // Check property types
  if (schema.properties) {
    Object.keys(schema.properties).forEach(prop => {
      if (data[prop] !== undefined) {
        const propSchema = schema.properties[prop];
        const propType = propSchema.type;
        
        if (propType && typeof data[prop] !== getJsType(propType)) {
          errors.push(`Property ${prop} should be of type ${propType}`);
        }
        
        // Check enum values
        if (propSchema.enum && !propSchema.enum.includes(data[prop])) {
          errors.push(`Property ${prop} should be one of: ${propSchema.enum.join(', ')}`);
        }
      }
    });
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Convert JSON Schema type to JavaScript type
 * @param {string} jsonSchemaType - JSON Schema type
 * @returns {string} - JavaScript type
 */
function getJsType(jsonSchemaType) {
  const typeMap = {
    'string': 'string',
    'number': 'number',
    'integer': 'number',
    'boolean': 'boolean',
    'object': 'object',
    'array': 'object' // Arrays are objects in JavaScript
  };
  
  return typeMap[jsonSchemaType] || 'undefined';
}

module.exports = createUtilityTools;
