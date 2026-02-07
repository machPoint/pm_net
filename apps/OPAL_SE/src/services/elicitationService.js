/**
 * Elicitation Service
 * Handles server-initiated user input requests (MCP 2025-06-18)
 */

const logger = require('../logger');
const Ajv = require('ajv');
const ajv = new Ajv({ allErrors: true });

/**
 * Create an elicitation request
 * 
 * @param {string} message - Message to display to the user
 * @param {Object} requestedSchema - JSON Schema for the expected response
 * @param {Object} options - Additional options
 * @returns {Object} Elicitation request object
 */
function createElicitationRequest(message, requestedSchema, options = {}) {
  const request = {
    message,
    requestedSchema
  };
  
  // Add optional fields
  if (options.title) request.title = options.title;
  if (options.description) request.description = options.description;
  if (options.defaultValue) request.defaultValue = options.defaultValue;
  
  return request;
}

/**
 * Validate an elicitation response
 * 
 * @param {Object} response - The response from the client
 * @param {Object} requestedSchema - The schema that was requested
 * @returns {Object} Validation result with success flag and errors
 */
function validateElicitationResponse(response, requestedSchema) {
  // Check response structure
  if (!response || typeof response !== 'object') {
    return {
      success: false,
      errors: ['Response must be an object']
    };
  }
  
  // Check action field
  const validActions = ['accept', 'decline', 'cancel'];
  if (!response.action || !validActions.includes(response.action)) {
    return {
      success: false,
      errors: [`Action must be one of: ${validActions.join(', ')}`]
    };
  }
  
  // If action is accept, validate content against schema
  if (response.action === 'accept') {
    if (!response.content) {
      return {
        success: false,
        errors: ['Content is required when action is accept']
      };
    }
    
    // Validate content against requested schema
    if (requestedSchema) {
      const validate = ajv.compile(requestedSchema);
      const valid = validate(response.content);
      
      if (!valid) {
        return {
          success: false,
          errors: validate.errors.map(err => `${err.instancePath} ${err.message}`)
        };
      }
    }
  }
  
  return {
    success: true,
    errors: []
  };
}

/**
 * Process an elicitation response
 * 
 * @param {Object} response - The response from the client
 * @param {Function} callback - Callback to execute with the response
 * @returns {Promise<Object>} Processing result
 */
async function processElicitationResponse(response, callback) {
  try {
    if (response.action === 'accept' && callback) {
      const result = await callback(response.content);
      return {
        success: true,
        result
      };
    } else if (response.action === 'decline') {
      return {
        success: false,
        reason: 'User declined the request'
      };
    } else if (response.action === 'cancel') {
      return {
        success: false,
        reason: 'User cancelled the request'
      };
    }
    
    return {
      success: false,
      reason: 'Unknown action'
    };
  } catch (error) {
    logger.error('Error processing elicitation response:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Create a simple text input elicitation
 * 
 * @param {string} message - Message to display
 * @param {Object} options - Additional options
 * @returns {Object} Elicitation request
 */
function createTextInputElicitation(message, options = {}) {
  const schema = {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description: options.description || 'Text input',
        ...(options.minLength ? { minLength: options.minLength } : {}),
        ...(options.maxLength ? { maxLength: options.maxLength } : {})
      }
    },
    required: ['text']
  };
  
  return createElicitationRequest(message, schema, options);
}

/**
 * Create a choice selection elicitation
 * 
 * @param {string} message - Message to display
 * @param {Array<string>} choices - Available choices
 * @param {Object} options - Additional options
 * @returns {Object} Elicitation request
 */
function createChoiceElicitation(message, choices, options = {}) {
  const schema = {
    type: 'object',
    properties: {
      choice: {
        type: 'string',
        enum: choices,
        description: options.description || 'Selected choice'
      }
    },
    required: ['choice']
  };
  
  return createElicitationRequest(message, schema, options);
}

/**
 * Create a confirmation elicitation
 * 
 * @param {string} message - Message to display
 * @param {Object} options - Additional options
 * @returns {Object} Elicitation request
 */
function createConfirmationElicitation(message, options = {}) {
  const schema = {
    type: 'object',
    properties: {
      confirmed: {
        type: 'boolean',
        description: options.description || 'Confirmation status'
      }
    },
    required: ['confirmed']
  };
  
  return createElicitationRequest(message, schema, options);
}

module.exports = {
  createElicitationRequest,
  validateElicitationResponse,
  processElicitationResponse,
  createTextInputElicitation,
  createChoiceElicitation,
  createConfirmationElicitation
};
