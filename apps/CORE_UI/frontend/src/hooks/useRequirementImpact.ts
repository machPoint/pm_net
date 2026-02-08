import { useState, useEffect, useCallback } from 'react';

interface RequirementTrace {
  id: string;
  name: string;
  type: string; // 'requirement' | 'design' | 'code' | 'test' | 'component' | 'jira' | 'jama' | 'risk' | 'task' | 'decision'...
  status: string;
  description?: string;
  metadata: Record<string, any>;
  connections: {
    id: string;
    type: 'traces_to' | 'verified_by' | 'implemented_by' | 'tested_by' | 'depends_on';
    target: string;
  }[];
}

interface RequirementImpactData {
  requirement: RequirementTrace;
  impactTree: RequirementTrace[];
  analytics: {
    totalArtifacts: number;
    coveragePercentage: number;
    testCoverage: number;
    designCoverage: number;
    implementationCoverage: number;
    traceabilityScore: number;
  };
}

interface UseRequirementImpactResult {
  data: RequirementImpactData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

// Use environment variable or default to OPAL server port
const OPAL_BASE_URL = process.env.NEXT_PUBLIC_OPAL_URL || 'http://localhost:7788';

export function useRequirementImpact(requirementId: string | null): UseRequirementImpactResult {
  const [data, setData] = useState<RequirementImpactData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchImpact = useCallback(async () => {
    if (!requirementId) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log(`🔍 Fetching impact data for requirement: ${requirementId}`);

      const response = await fetch(`${OPAL_BASE_URL}/api/requirements/impact?id=${encodeURIComponent(requirementId)}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const impactData = await response.json();
      setData(impactData);
      console.log(`✅ Successfully fetched impact data:`, impactData.analytics);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch requirement impact';
      console.error('❌ Error fetching requirement impact:', errorMessage);
      setError(errorMessage);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [requirementId]);

  useEffect(() => {
    fetchImpact();
  }, [fetchImpact]);

  const refetch = useCallback(() => {
    fetchImpact();
  }, [fetchImpact]);

  return {
    data,
    loading,
    error,
    refetch
  };
}

// Hook for batch requirement impact fetching
interface UseBatchRequirementImpactResult {
  data: RequirementImpactData[] | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  summary: {
    total: number;
    successful: number;
    failed: number;
  } | null;
}

export function useBatchRequirementImpact(requirementIds: string[]): UseBatchRequirementImpactResult {
  const [data, setData] = useState<RequirementImpactData[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<{ total: number; successful: number; failed: number } | null>(null);

  const fetchBatchImpact = useCallback(async () => {
    if (!requirementIds || requirementIds.length === 0) {
      setData(null);
      setError(null);
      setSummary(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log(`🔍 Fetching batch impact data for ${requirementIds.length} requirements`);

      const response = await fetch(`${OPAL_BASE_URL}/api/requirements/impact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requirementIds }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const batchData = await response.json();
      const successfulResults = batchData.results.filter((result: any) => !result.error);

      setData(successfulResults);
      setSummary(batchData.summary);
      console.log(`✅ Successfully fetched batch impact data:`, batchData.summary);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch batch requirement impact';
      console.error('❌ Error fetching batch requirement impact:', errorMessage);
      setError(errorMessage);
      setData(null);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [requirementIds]);

  useEffect(() => {
    fetchBatchImpact();
  }, [fetchBatchImpact]);

  const refetch = useCallback(() => {
    fetchBatchImpact();
  }, [fetchBatchImpact]);

  return {
    data,
    loading,
    error,
    refetch,
    summary
  };
}

// Utility functions for working with impact data
export const impactUtils = {
  // Find a specific node in the impact tree
  findNode: (impactTree: RequirementTrace[], nodeId: string): RequirementTrace | null => {
    return impactTree.find(node => node.id === nodeId) || null;
  },

  // Get all nodes of a specific type
  getNodesByType: (impactTree: RequirementTrace[], type: RequirementTrace['type']): RequirementTrace[] => {
    return impactTree.filter(node => node.type === type);
  },

  // Get all connections from a specific node
  getConnectionsFromNode: (node: RequirementTrace): RequirementTrace['connections'] => {
    return node.connections || [];
  },

  // Calculate the depth of traceability (how many levels deep the tree goes)
  calculateTraceDepth: (impactTree: RequirementTrace[]): number => {
    // This is a simplified calculation - in a real implementation, you'd need to traverse the tree
    const connectionCounts = impactTree.map(node => node.connections.length);
    return Math.max(...connectionCounts, 0);
  },

  // Get coverage status text based on percentage
  getCoverageStatus: (percentage: number): { status: string; color: string } => {
    if (percentage >= 80) return { status: 'Excellent', color: 'text-green-600' };
    if (percentage >= 60) return { status: 'Good', color: 'text-blue-600' };
    if (percentage >= 40) return { status: 'Fair', color: 'text-yellow-600' };
    return { status: 'Poor', color: 'text-red-600' };
  },

  // Format metadata for display
  formatMetadata: (metadata: Record<string, any>): Array<{ key: string; value: string }> => {
    return Object.entries(metadata)
      .filter(([_, value]) => value !== null && value !== undefined)
      .map(([key, value]) => ({
        key: key.charAt(0).toUpperCase() + key.slice(1),
        value: typeof value === 'object' ? JSON.stringify(value) : String(value)
      }));
  }
};