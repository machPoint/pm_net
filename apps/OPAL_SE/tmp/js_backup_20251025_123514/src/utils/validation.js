/**
 * Validation Utilities
 * Provides functions for validating input parameters for MCP endpoints
 */

const logger = require('../logger');
const { ERROR_CODES } = require('../config/constants');

/**
 * Validate that required parameters are present
 * 
 * @param {Object} params - The parameters to validate
 * @param {Array<string>} requiredParams - List of required parameter names
 * @param {string} methodName - The name of the method being validated (for logging)
 * @throws {Object} Error object with code and message if validation fails
 */
function validateRequiredParams(params, requiredParams, methodName) {
  if (!params) {
    throw {
      code: ERROR_CODES.INVALID_PARAMS,
      message: `No parameters provided for ${methodName}`
    };
  }

  for (const param of requiredParams) {
    if (params[param] === undefined) {
      throw {
        code: ERROR_CODES.INVALID_PARAMS,
        message: `Missing required parameter: ${param} for ${methodName}`
      };
    }
  }
}

/**
 * Validate that a parameter matches a specific type
 * 
 * @param {Object} params - The parameters to validate
 * @param {string} paramName - The name of the parameter to validate
 * @param {string} expectedType - The expected type ('string', 'number', 'boolean', 'object', 'array')
 * @param {string} methodName - The name of the method being validated (for logging)
 * @throws {Object} Error object with code and message if validation fails
 */
function validateParamType(params, paramName, expectedType, methodName) {
  if (params[paramName] === undefined) {
    return; // Skip validation for undefined parameters (use validateRequiredParams for required ones)
  }

  let isValid = false;
  
  switch (expectedType) {
    case 'string':
      isValid = typeof params[paramName] === 'string';
      break;
    case 'number':
      isValid = typeof params[paramName] === 'number';
      break;
    case 'boolean':
      isValid = typeof params[paramName] === 'boolean';
      break;
    case 'object':
      isValid = typeof params[paramName] === 'object' && !Array.isArray(params[paramName]) && params[paramName] !== null;
      break;
    case 'array':
      isValid = Array.isArray(params[paramName]);
      break;
    default:
      throw new Error(`Unknown expected type: ${expectedType}`);
  }

  if (!isValid) {
    throw {
      code: ERROR_CODES.INVALID_PARAMS,
      message: `Parameter ${paramName} must be of type ${expectedType} for ${methodName}`
    };
  }
}

/**
 * Validate a URI string
 * 
 * @param {string} uri - The URI to validate
 * @param {string} methodName - The name of the method being validated (for logging)
 * @throws {Object} Error object with code and message if validation fails
 */
function validateUri(uri, methodName) {
  if (typeof uri !== 'string') {
    throw {
      code: ERROR_CODES.INVALID_PARAMS,
      message: `URI must be a string for ${methodName}`
    };
  }

  // Basic URI validation - can be extended with more specific rules
  if (uri.length === 0) {
    throw {
      code: ERROR_CODES.INVALID_PARAMS,
      message: `URI cannot be empty for ${methodName}`
    };
  }

  // Check for invalid characters
  if (/[\s<>{}|\^`"]/.test(uri)) {
    throw {
      code: ERROR_CODES.INVALID_PARAMS,
      message: `URI contains invalid characters for ${methodName}`
    };
  }
}

/**
 * Sanitize a string to prevent injection attacks
 * 
 * @param {string} input - The string to sanitize
 * @returns {string} The sanitized string
 */
function sanitizeString(input) {
  if (typeof input !== 'string') {
    return input;
  }
  
  // Replace potentially dangerous characters
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Recursively sanitize an object's string properties
 * 
 * @param {any} obj - The object to sanitize
 * @returns {any} The sanitized object
 */
function sanitizeObject(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  if (typeof obj === 'object') {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = sanitizeObject(value);
    }
    return result;
  }
  
  return obj;
}

/**
 * Validate and sanitize request parameters
 * 
 * @param {Object} params - The parameters to validate and sanitize
 * @param {Object} schema - The validation schema
 * @param {string} methodName - The name of the method being validated (for logging)
 * @returns {Object} The sanitized parameters
 * @throws {Object} Error object with code and message if validation fails
 */
function validateAndSanitize(params, schema, methodName) {
  // Validate required parameters
  if (schema.required && schema.required.length > 0) {
    validateRequiredParams(params, schema.required, methodName);
  }
  
  // Validate parameter types
  if (schema.types) {
    for (const [paramName, expectedType] of Object.entries(schema.types)) {
      validateParamType(params, paramName, expectedType, methodName);
    }
  }
  
  // Validate URIs
  if (schema.uris && schema.uris.length > 0) {
    for (const uriParam of schema.uris) {
      if (params[uriParam]) {
        validateUri(params[uriParam], methodName);
      }
    }
  }
  
  // Sanitize the parameters
  return sanitizeObject(params);
}

module.exports = {
  validateRequiredParams,
  validateParamType,
  validateUri,
  sanitizeString,
  sanitizeObject,
  validateAndSanitize
};
