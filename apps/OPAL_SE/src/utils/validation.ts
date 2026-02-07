/**
 * Validation Utilities
 * Provides functions for validating input parameters for MCP endpoints
 */

import logger from '../logger';
import { ERROR_CODES } from '../config/constants';

interface ValidationError {
  code: number;
  message: string;
}

interface ValidationSchema {
  required?: string[];
  types?: Record<string, string>;
  uris?: string[];
}

/**
 * Validate that required parameters are present
 */
export function validateRequiredParams(
  params: any,
  requiredParams: string[],
  methodName: string
): void {
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
 */
export function validateParamType(
  params: any,
  paramName: string,
  expectedType: string,
  methodName: string
): void {
  if (params[paramName] === undefined) {
    return;
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
 */
export function validateUri(uri: string, methodName: string): void {
  if (typeof uri !== 'string') {
    throw {
      code: ERROR_CODES.INVALID_PARAMS,
      message: `URI must be a string for ${methodName}`
    };
  }

  if (uri.length === 0) {
    throw {
      code: ERROR_CODES.INVALID_PARAMS,
      message: `URI cannot be empty for ${methodName}`
    };
  }

  if (/[\s<>{}|\^`"]/.test(uri)) {
    throw {
      code: ERROR_CODES.INVALID_PARAMS,
      message: `URI contains invalid characters for ${methodName}`
    };
  }
}

/**
 * Sanitize a string to prevent injection attacks
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return input;
  }
  
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Recursively sanitize an object's string properties
 */
export function sanitizeObject(obj: any): any {
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
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = sanitizeObject(value);
    }
    return result;
  }
  
  return obj;
}

/**
 * Validate and sanitize request parameters
 */
export function validateAndSanitize(
  params: any,
  schema: ValidationSchema,
  methodName: string
): any {
  if (schema.required && schema.required.length > 0) {
    validateRequiredParams(params, schema.required, methodName);
  }
  
  if (schema.types) {
    for (const [paramName, expectedType] of Object.entries(schema.types)) {
      validateParamType(params, paramName, expectedType, methodName);
    }
  }
  
  if (schema.uris && schema.uris.length > 0) {
    for (const uriParam of schema.uris) {
      if (params[uriParam]) {
        validateUri(params[uriParam], methodName);
      }
    }
  }
  
  return sanitizeObject(params);
}
