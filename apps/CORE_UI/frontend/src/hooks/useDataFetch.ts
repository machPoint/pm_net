import { useDataMode } from '@/contexts/DataModeContext';
import { API_BASE_URL, buildApiUrl } from '@/lib/apiConfig';
import { 
  generateFakeJamaItems, 
  generateFakeJiraIssues, 
  generateFakeWindchillParts, 
  generateFakePulseItems,
  FakePulseItem,
  StreamingDataGenerator
} from '@/lib/fakeDataGenerators';
import { useEffect, useState, useCallback } from 'react';

// Custom hook for fetching data that respects the data mode
export function useDataFetch<T>(
  url: string,
  options?: RequestInit
): { data: T | null; loading: boolean; error: Error | null; refetch: () => void } {
  const { dataMode, isUsingFakeData } = useDataMode();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (isUsingFakeData) {
        // Use fake data based on the URL pattern
        const fakeData = getFakeDataForUrl(url);
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 300));
        setData(fakeData as T);
      } else {
        // Real API call
        const response = await fetch(url, options);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        setData(result);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [url, options, isUsingFakeData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// Helper function to generate fake data based on URL pattern
function getFakeDataForUrl(url: string): any {
  // Parse the URL to determine what type of data to return
  if (url.includes('/mock/jama/items') || url.includes('/jama/items')) {
    return generateFakeJamaItems(50);
  } else if (url.includes('/mock/jira/issues') || url.includes('/jira/issues')) {
    return generateFakeJiraIssues(25);
  } else if (url.includes('/mock/windchill/parts') || url.includes('/windchill/parts')) {
    return generateFakeWindchillParts(20);
  } else if (url.includes('/mock/pulse') || url.includes('/pulse')) {
    return generateFakePulseItems(30);
  }
  
  // Default empty response
  return [];
}

// Custom hook for pulse feed with streaming support
export function usePulseFeed() {
  const { dataMode, isStreaming } = useDataMode();
  const [pulseItems, setPulseItems] = useState<FakePulseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (dataMode === 'real') {
      // Fetch from real API
      const fetchPulse = async () => {
        try {
          setLoading(true);
          const response = await fetch(buildApiUrl('/pulse'));
          if (!response.ok) throw new Error('Failed to fetch pulse');
          const data = await response.json();
          setPulseItems(data);
        } catch (err) {
          setError(err instanceof Error ? err : new Error('Unknown error'));
        } finally {
          setLoading(false);
        }
      };
      fetchPulse();
    } else if (dataMode === 'fake-static') {
      // Use static fake data
      setPulseItems(generateFakePulseItems(30));
      setLoading(false);
    } else if (dataMode === 'fake-streaming') {
      // Use streaming fake data
      const initialItems = generateFakePulseItems(30);
      setPulseItems(initialItems);
      setLoading(false);

      const streamGenerator = new StreamingDataGenerator();
      streamGenerator.start((newItem) => {
        setPulseItems((prev) => [newItem, ...prev].slice(0, 50)); // Keep last 50 items
      }, 5000); // New item every 5 seconds

      return () => {
        streamGenerator.stop();
      };
    }
  }, [dataMode, isStreaming]);

  return { pulseItems, loading, error };
}

// Example usage hook for requirements
export function useRequirements() {
  const { dataMode } = useDataMode();
  const [requirements, setRequirements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRequirements = async () => {
      setLoading(true);
      try {
        if (dataMode === 'real') {
          const response = await fetch(buildApiUrl('/mock/jama/items'));
          const data = await response.json();
          setRequirements(data);
        } else {
          // Use fake data for both static and streaming modes
          setRequirements(generateFakeJamaItems(50));
        }
      } catch (error) {
        console.error('Error fetching requirements:', error);
        // Fallback to fake data on error
        setRequirements(generateFakeJamaItems(50));
      } finally {
        setLoading(false);
      }
    };

    fetchRequirements();
  }, [dataMode]);

  return { requirements, loading };
}
