import { useState } from 'react';

interface SmartSearchResponse {
  success: boolean;
  triggered: string[];
  cleaned?: string | null;
  error?: unknown;
}

interface UseSmartSearchResult {
  search: (query: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  lastResult: SmartSearchResponse | null;
}

export const useSmartSearch = (): UseSmartSearchResult => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<SmartSearchResponse | null>(null);

  const search = async (query: string) => {
    setIsLoading(true);
    setError(null);
    setLastResult(null);

    try {
      const res = await fetch('/api/smart-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
      });

      if (!res.ok) {
        throw new Error(`Search failed: ${res.statusText}`);
      }

      const data = await res.json() as SmartSearchResponse;
      setLastResult(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return { search, isLoading, error, lastResult };
};
