/**
 * Common error classes for OPAL tools
 */

export class ToolError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ToolError';
    
    // Maintains proper stack trace for where error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ToolError);
    }
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}

export class ValidationError extends ToolError {
  constructor(message: string, details?: any) {
    super('VALIDATION_ERROR', message, details);
    this.name = 'ValidationError';
  }
}

export class SidecarError extends ToolError {
  constructor(message: string, details?: any) {
    super('SIDECAR_ERROR', message, details);
    this.name = 'SidecarError';
  }
}

export class NotFoundError extends ToolError {
  constructor(message: string, details?: any) {
    super('NOT_FOUND', message, details);
    this.name = 'NotFoundError';
  }
}

export class TimeoutError extends ToolError {
  constructor(message: string, details?: any) {
    super('TIMEOUT', message, details);
    this.name = 'TimeoutError';
  }
}

export class NetworkError extends ToolError {
  constructor(message: string, details?: any) {
    super('NETWORK_ERROR', message, details);
    this.name = 'NetworkError';
  }
}

export class ConfigError extends ToolError {
  constructor(message: string, details?: any) {
    super('CONFIG_ERROR', message, details);
    this.name = 'ConfigError';
  }
}

export class UnauthorizedError extends ToolError {
  constructor(message: string, details?: any) {
    super('UNAUTHORIZED', message, details);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends ToolError {
  constructor(message: string, details?: any) {
    super('FORBIDDEN', message, details);
    this.name = 'ForbiddenError';
  }
}
