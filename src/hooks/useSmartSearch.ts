import { useState } from 'react';

interface SearchResultItem {
  q: string;
  type: 'Original' | 'Cleaned' | 'AI';
  sent?: boolean; // Client-side state
}

interface SmartSearchResponse {
  success: boolean;
  results: SearchResultItem[];
}

interface UseSmartSearchResult {
  preview: (query: string) => Promise<SearchResultItem[] | null>;
  execute: (query: string) => Promise<boolean>;
  isLoading: boolean;
  error: string | null;
}

export const useSmartSearch = (): UseSmartSearchResult => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preview = async (query: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/smart-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, action: 'preview' })
      });

      if (!res.ok) throw new Error(`Preview failed: ${res.statusText}`);

      const data = await res.json() as SmartSearchResponse;
      return data.results;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const execute = async (query: string) => {
    // We don't necessarily need global loading for singular execute buttons,
    // but we can track it if we want. For now let's not block global UI options.
    try {
        const res = await fetch('/api/smart-search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, action: 'execute' })
        });
        return res.ok;
    } catch (e) {
        console.error(e);
        return false;
    }
  };

  return { preview, execute, isLoading, error };
};
