/**
 * OPAL_SE MCP API Client
 * 
 * Provides a TypeScript client for communicating with the OPAL_SE server
 * via the MCP (Model Context Protocol) JSON-RPC interface.
 */

export interface MCPRequest {
  jsonrpc: '2.0';
  method: string;
  params: {
    name: string;
    arguments: Record<string, any>;
  };
  id: string;
}

export interface MCPResponse<T = any> {
  jsonrpc: '2.0';
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
  id: string;
}

export interface SystemNode {
  id: string;
  project_id: string;
  type: 'Requirement' | 'Test' | 'Component' | 'Issue' | 'Interface' | 'ECN' | 'EmailMessage' | 'Note';
  name: string;
  description?: string;
  external_refs: {
    jama_id?: string;
    jira_key?: string;
    windchill_number?: string;
    outlook_id?: string;
    confluence_id?: string;
  };
  status?: string;
  owner?: string;
  subsystem?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface SystemEdge {
  id: string;
  project_id: string;
  from_node_id: string;
  to_node_id: string;
  relation_type: 'VERIFIED_BY' | 'TRACES_TO' | 'ALLOCATED_TO' | 'DEPENDS_ON' | 'BLOCKS' | 'REFERS_TO' | 'PARENT_OF' | 'CONTAINS';
  source_system?: string;
  rationale?: string;
  created_at: string;
  updated_at: string;
}

export interface RuleViolation {
  rule_id: string;
  rule_name: string;
  severity: 'error' | 'warning' | 'info';
  node_id?: string;
  node_name?: string;
  message: string;
  details?: Record<string, any>;
}

export interface VerificationMetrics {
  total_requirements: number;
  verified_requirements: number;
  unverified_requirements: number;
  verification_coverage: number;
  by_subsystem?: Record<string, {
    total: number;
    verified: number;
    coverage: number;
  }>;
}

export interface ImpactAnalysisResult {
  root_node: SystemNode;
  impacted_nodes: SystemNode[];
  impact_depth: number;
  total_impacted: number;
  edges: SystemEdge[];
}

export interface ChangeEvent {
  id: string;
  project_id: string;
  event_type: 'node_created' | 'node_updated' | 'node_deleted' | 'edge_created' | 'edge_deleted';
  node_id?: string;
  edge_id?: string;
  user_id?: string;
  timestamp: string;
  changes?: Record<string, any>;
  metadata?: Record<string, any>;
}

export class OPALClient {
  private baseUrl: string;
  private timeout: number;
  private requestId: number = 0;

  constructor(baseUrl: string = 'http://localhost:7788', timeout: number = 30000) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
  }

  /**
   * Make a JSON-RPC MCP request to OPAL_SE
   */
  private async mcpRequest<T = any>(
    toolName: string,
    args: Record<string, any>
  ): Promise<T> {
    const requestId = `req-${++this.requestId}-${Date.now()}`;
    
    const request: MCPRequest = {
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args
      },
      id: requestId
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseUrl}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'MCP-Protocol-Version': '2025-06-18'
        },
        body: JSON.stringify(request),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: MCPResponse<T> = await response.json();

      if (result.error) {
        throw new Error(`MCP Error [${result.error.code}]: ${result.error.message}`);
      }

      if (!result.result) {
        throw new Error('No result in MCP response');
      }

      return result.result;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.timeout}ms`);
      }
      throw error;
    }
  }

  /**
   * Check if OPAL_SE server is reachable
   */
  async healthCheck(): Promise<{ status: string; version?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/health`, {
        signal: AbortSignal.timeout(5000)
      });
      if (response.ok) {
        return await response.json();
      }
      throw new Error(`Health check failed: ${response.status}`);
    } catch (error: any) {
      throw new Error(`OPAL_SE server unreachable: ${error.message}`);
    }
  }

  // ============================================================================
  // SE MCP Tool Methods
  // ============================================================================

  /**
   * Query the system model (graph database)
   */
  async querySystemModel(params: {
    project_id: string;
    node_type?: string;
    subsystem?: string;
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ nodes: SystemNode[]; total: number }> {
    return this.mcpRequest('querySystemModel', params);
  }

  /**
   * Get a bounded subgraph (slice) of the system
   */
  async getSystemSlice(params: {
    project_id: string;
    root_node_id: string;
    depth?: number;
    relation_types?: string[];
  }): Promise<{ nodes: SystemNode[]; edges: SystemEdge[] }> {
    return this.mcpRequest('getSystemSlice', params);
  }

  /**
   * Trace downstream impact from a node
   */
  async traceDownstreamImpact(params: {
    project_id: string;
    node_id: string;
    max_depth?: number;
  }): Promise<ImpactAnalysisResult> {
    return this.mcpRequest('traceDownstreamImpact', params);
  }

  /**
   * Trace upstream rationale to a node
   */
  async traceUpstreamRationale(params: {
    project_id: string;
    node_id: string;
    max_depth?: number;
  }): Promise<{ nodes: SystemNode[]; edges: SystemEdge[] }> {
    return this.mcpRequest('traceUpstreamRationale', params);
  }

  /**
   * Find verification gaps (requirements without tests)
   */
  async findVerificationGaps(params: {
    project_id: string;
    subsystem?: string;
  }): Promise<{ unverified_requirements: SystemNode[] }> {
    return this.mcpRequest('findVerificationGaps', params);
  }

  /**
   * Check allocation consistency (requirements without components)
   */
  async checkAllocationConsistency(params: {
    project_id: string;
  }): Promise<{ unallocated_requirements: SystemNode[] }> {
    return this.mcpRequest('checkAllocationConsistency', params);
  }

  /**
   * Get verification coverage metrics
   */
  async getVerificationCoverageMetrics(params: {
    project_id: string;
    subsystem?: string;
  }): Promise<VerificationMetrics> {
    return this.mcpRequest('getVerificationCoverageMetrics', params);
  }

  /**
   * Get history of changes for a node
   */
  async getHistory(params: {
    project_id: string;
    node_id?: string;
    limit?: number;
    since?: string;
  }): Promise<{ events: ChangeEvent[] }> {
    return this.mcpRequest('getHistory', params);
  }

  /**
   * Find similar past changes
   */
  async findSimilarPastChanges(params: {
    project_id: string;
    reference_change_id: string;
    limit?: number;
  }): Promise<{ similar_changes: ChangeEvent[] }> {
    return this.mcpRequest('findSimilarPastChanges', params);
  }

  /**
   * Run consistency checks (rule engine)
   */
  async runConsistencyChecks(params: {
    project_id: string;
    rule_ids?: string[];
  }): Promise<{ violations: RuleViolation[]; total_violations: number }> {
    return this.mcpRequest('runConsistencyChecks', params);
  }

  // ============================================================================
  // FDS Ingestion Methods (Direct HTTP API)
  // ============================================================================

  /**
   * Trigger FDS data ingestion
   */
  async ingestFromFDS(params: {
    source: 'jama' | 'jira' | 'windchill';
    items: any[];
  }): Promise<{ successful: number; failed: number; errors: string[] }> {
    const response = await fetch(`${this.baseUrl}/api/fds/ingest/${params.source}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(
        params.source === 'jama' ? { requirements: params.items } :
        params.source === 'jira' ? { issues: params.items } :
        { items: params.items, type: 'part' }
      )
    });

    if (!response.ok) {
      throw new Error(`Ingestion failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get FDS sidecar status
   */
  async getFDSSidecarStatus(): Promise<{
    sidecars: Array<{
      name: string;
      url: string;
      polling: boolean;
      last_poll?: string;
      stats: {
        total_polls: number;
        total_events_received: number;
        total_events_processed: number;
        total_errors: number;
      };
    }>;
  }> {
    const response = await fetch(`${this.baseUrl}/api/fds/admin/sidecars`, {
      headers: {
        'Authorization': 'Bearer test-token'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get FDS status: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Start FDS sidecar polling
   */
  async startFDSPolling(): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/fds/admin/start-all`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer test-token'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to start FDS polling: ${response.status}`);
    }
  }

  /**
   * Stop FDS sidecar polling
   */
  async stopFDSPolling(): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/fds/admin/stop-all`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer test-token'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to stop FDS polling: ${response.status}`);
    }
  }
}

// Export singleton instance
export const opalClient = new OPALClient();

// Export helper function to create custom instances
export function createOPALClient(baseUrl?: string, timeout?: number): OPALClient {
  return new OPALClient(baseUrl, timeout);
}
