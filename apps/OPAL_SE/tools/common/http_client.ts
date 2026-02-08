/**
 * HTTP client for calling sidecars
 * 
 * Provides a thin wrapper around fetch with:
 * - Base URL management
 * - Standard error handling
 * - Timeout management
 * - Logging
 */

import { ToolError } from './errors';

export interface HttpClientConfig {
  baseUrl: string;
  timeout?: number;
  headers?: Record<string, string>;
}

export interface HttpRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
}

export class HttpClient {
  private baseUrl: string;
  private defaultTimeout: number;
  private defaultHeaders: Record<string, string>;

  constructor(config: HttpClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.defaultTimeout = config.timeout || 30000; // 30 seconds default
    this.defaultHeaders = config.headers || {
      'Content-Type': 'application/json',
    };
  }

  /**
   * Make an HTTP request to a sidecar
   */
  async request<T>(path: string, options: HttpRequestOptions = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const timeout = options.timeout || this.defaultTimeout;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers: {
          ...this.defaultHeaders,
          ...options.headers,
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new ToolError(
          'SIDECAR_ERROR',
          `Sidecar request failed: ${response.status} ${response.statusText}`,
          {
            url,
            status: response.status,
            statusText: response.statusText,
            body: errorText,
          }
        );
      }

      const data = await response.json();
      return data as T;
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new ToolError(
          'TIMEOUT',
          `Request to ${url} timed out after ${timeout}ms`,
          { url, timeout }
        );
      }

      if (error instanceof ToolError) {
        throw error;
      }

      throw new ToolError(
        'NETWORK_ERROR',
        `Network error calling ${url}: ${error.message}`,
        { url, originalError: error.message }
      );
    }
  }

  /**
   * GET request
   */
  async get<T>(path: string, options: Omit<HttpRequestOptions, 'method' | 'body'> = {}): Promise<T> {
    return this.request<T>(path, { ...options, method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T>(path: string, body: any, options: Omit<HttpRequestOptions, 'method' | 'body'> = {}): Promise<T> {
    return this.request<T>(path, { ...options, method: 'POST', body });
  }

  /**
   * PUT request
   */
  async put<T>(path: string, body: any, options: Omit<HttpRequestOptions, 'method' | 'body'> = {}): Promise<T> {
    return this.request<T>(path, { ...options, method: 'PUT', body });
  }

  /**
   * DELETE request
   */
  async delete<T>(path: string, options: Omit<HttpRequestOptions, 'method' | 'body'> = {}): Promise<T> {
    return this.request<T>(path, { ...options, method: 'DELETE' });
  }

  /**
   * PATCH request
   */
  async patch<T>(path: string, body: any, options: Omit<HttpRequestOptions, 'method' | 'body'> = {}): Promise<T> {
    return this.request<T>(path, { ...options, method: 'PATCH', body });
  }
}

/**
 * Create HTTP clients for sidecars
 */
export function createSidecarClient(sidecarId: string): HttpClient {
  // Get base URL from environment or config
  const baseUrl = getSidecarBaseUrl(sidecarId);
  
  return new HttpClient({
    baseUrl,
    timeout: 30000,
  });
}

/**
 * Get base URL for a sidecar from environment variables
 */
function getSidecarBaseUrl(sidecarId: string): string {
  // Map sidecar IDs to environment variable names
  const envVarMap: Record<string, string> = {
    'lessons-service': 'LESSONS_SERVICE_URL',
    'workload-service': 'WORKLOAD_SERVICE_URL',
    'outlook-connector': 'OUTLOOK_CONNECTOR_URL',
    'jira-connector': 'JIRA_CONNECTOR_URL',
    'jama-connector': 'JAMA_CONNECTOR_URL',
    'windchill-connector': 'WINDCHILL_CONNECTOR_URL',
    'ms-tasks-connector': 'MSTASKS_CONNECTOR_URL',
    'ims-connector': 'IMS_CONNECTOR_URL',
    'stem-python-sidecar': 'STEM_PYTHON_URL',
  };

  const envVar = envVarMap[sidecarId];
  if (!envVar) {
    throw new ToolError(
      'INVALID_SIDECAR',
      `Unknown sidecar ID: ${sidecarId}`,
      { sidecarId }
    );
  }

  const baseUrl = process.env[envVar];
  if (!baseUrl) {
    throw new ToolError(
      'MISSING_CONFIG',
      `Environment variable ${envVar} not set for sidecar ${sidecarId}`,
      { sidecarId, envVar }
    );
  }

  return baseUrl;
}
