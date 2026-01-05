'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSmartSearch } from '~/hooks/useSmartSearch';
import { api } from '~/trpc/react';
import { cleanSearchQuery } from '~/lib/search-clean';

export default function SoulseekPage() {
  const searchParams = useSearchParams();
  const playlistId = searchParams.get('playlistId');
  
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ q: string; original: string; type: string; sent: boolean }[] | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const { preview, execute, isLoading, error } = useSmartSearch();

  // Helper to process a query: Generate variations individually
  const processQuery = (main: string, secondary?: string): { q: string; original: string; type: string; sent: boolean }[] => {
    const rawMain = main;
    const items: { q: string; original: string; type: string; sent: boolean }[] = [];

    // --- Variation 1: Standard Cleaned (Full Combination) ---
    // Always generate the standard cleaned version of "Main Secondary" (or just Main)
    const combinedRaw = secondary ? `${main} ${secondary}` : main;
    const combinedCleaned = cleanSearchQuery(combinedRaw);
    
    // Always add the standard clean version
    items.push({
        q: combinedCleaned,
        original: combinedRaw,
        type: 'Cleaned',
        sent: false
    });

    // --- Variation 2: Split Logic ---
    // Check if the main part (Track) has a hyphen to split
    const mainParts = rawMain.split(/[-–—|]/).map(p => p.trim()).filter(Boolean);
    
    if (mainParts.length >= 2) {
        let splitQuery = '';
        
        if (secondary) {
            // Playlist Mode: "Track" (main) has hyphen. "Artist" (secondary) exists.
            // Rule: "When try split on track only not artist, remove artist if split is used"
            // So we take the split parts of the Track, join them, and IGNORE the Artist.
            splitQuery = mainParts.join(' '); 
        } else {
            // Manual Mode: "Artist - Track" (main) has hyphen. No secondary.
            // Standard swap logic: "Track Artist"
            // Assume input was "Artist - Track" -> Part0=Artist, Part1..=Track
            const artistPart = mainParts[0] ?? '';
            const trackPart = mainParts.slice(1).join(' ');
            splitQuery = `${trackPart} ${artistPart}`;
        }
        
        const splitCleaned = cleanSearchQuery(splitQuery);

        // Add Split variation if it resulted in a different query than the standard clean
        if (splitCleaned && splitCleaned !== combinedCleaned) {
             items.push({
                q: splitCleaned,
                original: combinedRaw, // Source is still the full original
                type: 'Split', // User said "when split label with split"
                sent: false
            });
        }
    }

    return items;
  };

  const { mutate: loadPlaylist } = api.playlistTools.getPlaylist.useMutation({
    onSuccess: (data) => {
        const allItems: { q: string; original: string; type: string; sent: boolean }[] = [];
        
        data.items.forEach(item => {
            // Pass Track as main, Artist as secondary
            const results = processQuery(item.track, item.artist);
            allItems.push(...results);
        });
        
        setResults(allItems);
    }
  });

  useEffect(() => {
    if (playlistId) {
        loadPlaylist({ id: playlistId });
    }
  }, [playlistId, loadPlaylist]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    // Clear previous results
    setResults(null);
    
    // Manual search: Pass query as main, no secondary
    const localResults = processQuery(query);
    
    const previewData = await preview(query); 
    
    let mixedResults = [...localResults];
    
    if (previewData) {
        const aiItems = previewData
            .filter(d => d.type !== 'Cleaned' && d.type !== 'Original') 
            .map(item => ({ ...item, original: query, sent: false }));
            
        mixedResults = [...mixedResults, ...aiItems];
    }
    
    setResults(mixedResults);
  };

  const handleDelete = (index: number) => {
      if (!results) return;
      const newResults = [...results];
      newResults.splice(index, 1);
      setResults(newResults);
  };

  const handleSend = async (index: number) => {
    if (!results) return;
    const item = results[index];
    if (!item) return;

    if (item.sent) return; // Already sent

    const success = await execute(item.q);
    if (success) {
        const next = [...results];
        // @ts-expect-error - we checked index existence
        next[index].sent = true;
        setResults(next);
    } else {
        alert('Failed to send search to Slskd');
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-4xl text-[#f0f6fc]">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Soulseek Smart Search</h1>
        <p className="text-gray-400">
          Intelligent search proxy with query cleaning and AI expansion.
        </p>
      </header>

      <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-6 mb-8">
        <form onSubmit={handleSearch} className="flex gap-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter artist, song, or album..."
            className="flex-1 bg-[#010409] border border-[#30363d] rounded px-4 py-2 text-white focus:outline-none focus:border-[#58a6ff]"
          />
          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="bg-[#238636] hover:bg-[#2eaa42] disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded font-medium transition-colors"
          >
            {isLoading ? 'Preview' : 'Preview'}
          </button>
        </form>
        {error && (
          <div className="mt-4 p-3 bg-red-900/30 border border-red-800 text-red-200 rounded">
            Error: {error}
          </div>
        )}
      </div>

      {/* Results Table */}
      {results && results.length > 0 && (
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden shadow-lg mb-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#0d1117] border-b border-[#30363d]">
                  <th className="p-4 text-xs font-semibold text-[#8b949e] uppercase tracking-wider w-32">
                    <div className="flex items-center gap-2">
                        Type
                        <label className="flex items-center cursor-pointer relative" title="Toggle Cleaned/Original">
                            <input 
                                type="checkbox" 
                                className="sr-only peer"
                                checked={!showOriginal}
                                onChange={(e) => setShowOriginal(!e.target.checked)}
                            />
                            <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                            <span className="ml-2 text-[10px] text-gray-500 font-normal">
                                {showOriginal ? 'Original' : 'Cleaned'}
                            </span>
                        </label>
                    </div>
                  </th>
                  <th className="p-4 text-xs font-semibold text-[#8b949e] uppercase tracking-wider w-full">Query</th>
                  <th className="p-4 text-xs font-semibold text-[#8b949e] uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {results.map((item, idx) => (
                  <tr key={`${item.q}-${idx}`} className="border-b border-[#21262d] hover:bg-[#1c2128] transition-colors group">
                    <td className="p-3 text-sm text-gray-400 whitespace-nowrap align-middle">
                        <div className="flex items-center gap-2">
                             <button
                                onClick={() => handleDelete(idx)}
                                title="Delete Row"
                                className="p-1 text-[#8b949e] hover:text-red-400 hover:bg-[#30363d] rounded transition-all opacity-0 group-hover:opacity-100"
                              >
                                🗑️
                              </button>
                            <span className={`px-2 py-0.5 rounded-full text-xs border ${
                                item.type === 'Original' ? 'bg-green-900/30 border-green-800 text-green-300' :
                                item.type === 'Cleaned' ? 'bg-purple-900/30 border-purple-800 text-purple-300' :
                                item.type === 'Split' ? 'bg-orange-900/30 border-orange-800 text-orange-300' :
                                'bg-blue-900/30 border-blue-800 text-blue-300'
                            }`}>
                                {item.type}
                            </span>
                        </div>
                    </td>
                    <td className="p-3">
                      <input
                        className={`w-full bg-transparent border-none outline-none focus:bg-[#0d1117] px-2 py-1 rounded transition-colors ${
                            showOriginal ? 'text-gray-500 italic' : 'text-[#c9d1d9]'
                        }`}
                        value={showOriginal ? item.original : item.q}
                        readOnly={showOriginal}
                        onChange={(e) => {
                            if (showOriginal) return; // Read-only in original mode
                            const newResults = [...results];
                            if (newResults[idx]) {
                                newResults[idx].q = e.target.value;
                                setResults(newResults);
                            }
                        }}
                      />
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <div className="flex justify-end gap-2 items-center">

                          <button
                            onClick={() => handleSend(idx)}
                            disabled={item.sent}
                            className={`px-3 py-1 rounded text-xs font-bold transition-all border ${
                                item.sent
                                ? 'bg-[#238636]/10 border-[#238636] text-[#238636] cursor-default'
                                : 'bg-[#21262d] border-[#30363d] text-[#c9d1d9] hover:bg-[#30363d] hover:border-[#8b949e]'
                            }`}
                          >
                            {item.sent ? '✓ Sent' : 'Send →'}
                          </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-3 flex justify-between items-center bg-[#0d1117] border-t border-[#30363d]">
            <p className="text-sm text-gray-500">
                Click &quot;Send&quot; on queries you want to trigger in Slskd.
            </p>
            <p className="text-sm text-gray-500 text-center">
                <a target="_blank" href="https://soulseek.badvibes.cc/searches" className="text-[#58a6ff] hover:underline text-sm font-medium">View Searches</a>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
