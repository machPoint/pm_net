import { buildApiUrl } from '@/lib/apiConfig';
import { useEffect, useState, useCallback } from 'react';

// Custom hook for fetching data
export function useDataFetch<T>(
  url: string,
  options?: RequestInit
): { data: T | null; loading: boolean; error: Error | null; refetch: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [url, options]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// Custom hook for pulse feed (SSE-only)
export function usePulseFeed() {
  const [pulseItems, setPulseItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error] = useState<Error | null>(null);

  return { pulseItems, loading, error };
}

// Hook for requirements from graph DB
export function useRequirements() {
  const [requirements, setRequirements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRequirements = async () => {
      setLoading(true);
      try {
        const response = await fetch(buildApiUrl('/api/nodes?node_type=task&limit=50'));
        if (response.ok) {
          const data = await response.json();
          setRequirements(data.nodes || []);
        } else {
          setRequirements([]);
        }
      } catch (error) {
        console.error('Error fetching requirements:', error);
        setRequirements([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRequirements();
  }, []);

  return { requirements, loading };
}
