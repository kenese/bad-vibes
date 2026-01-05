'use client';

import { useState } from 'react';
import { useSmartSearch } from '~/hooks/useSmartSearch';

export default function SoulseekPage() {
  const [query, setQuery] = useState('');
  const { search, isLoading, error, lastResult } = useSmartSearch();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    await search(query);
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
            className="bg-[#238636] hover:bg-[#2ea043] disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded font-medium transition-colors"
          >
            {isLoading ? 'Searching...' : 'Search'}
          </button>
        </form>

        {error && (
          <div className="mt-4 p-3 bg-red-900/30 border border-red-800 text-red-200 rounded">
            Error: {error}
          </div>
        )}
      </div>

      {lastResult && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className={`p-4 rounded border ${lastResult.cleaned ? 'bg-blue-900/20 border-blue-800' : 'bg-[#0d1117] border-[#30363d]'}`}>
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Janitor Status</h3>
                {lastResult.cleaned ? (
                    <div>
                        <div className="text-sm text-gray-400 mb-1">Cleaned Query:</div>
                        <div className="font-mono text-lg text-[#58a6ff]">{lastResult.cleaned}</div>
                    </div>
                ) : (
                    <div className="text-gray-500 italic">No cleaning needed</div>
                )}
            </div>
            
             <div className="p-4 rounded border bg-[#0d1117] border-[#30363d]">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Search Summary</h3>
                <div className="text-2xl font-bold">{lastResult.triggered.length}</div>
                <div className="text-sm text-gray-400">Total Queries Triggered</div>
            </div>
          </div>

          <div className="bg-[#0d1117] border border-[#30363d] rounded-lg overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#161b22] border-b border-[#30363d]">
                  <th className="p-3 text-sm font-semibold text-gray-300">Triggered Query</th>
                  <th className="p-3 text-sm font-semibold text-gray-300">Type</th>
                  <th className="p-3 text-sm font-semibold text-gray-300 w-24">Status</th>
                </tr>
              </thead>
              <tbody>
                {lastResult.triggered.length === 0 ? (
                    <tr><td colSpan={3} className="p-4 text-center text-gray-500">No searches triggered</td></tr>
                ) : (
                    lastResult.triggered.map((term, i) => {
                        let type = 'Original';
                        if (term === lastResult.cleaned) type = 'Janitor';
                        // Ideally backend returns formatted objects but currently returns strings. 
                        // We infer type based on simple logic or assume backend order?
                        // Actually backend returns `triggered: string[]`. 
                        // We can match loosely:
                        
                        // Strict logic: 
                        // 0 is usually Original.
                        // If cleaned exists, and matches term, it's Janitor.
                        // Others are AI.
                        
                        if (i === 0) type = 'Original';
                        else if (term === lastResult.cleaned) type = 'Janitor (Cleaned)';
                        else type = 'AI Variation';

                        return (
                            <tr key={i} className="border-b border-[#30363d] last:border-0 hover:bg-[#161b22]/50">
                                <td className="p-3 font-mono text-blue-200">{term}</td>
                                <td className="p-3 text-sm text-gray-400">
                                    <span className={`px-2 py-0.5 rounded-full text-xs border ${
                                        type.includes('Original') ? 'bg-green-900/30 border-green-800 text-green-300' :
                                        type.includes('Janitor') ? 'bg-purple-900/30 border-purple-800 text-purple-300' :
                                        'bg-blue-900/30 border-blue-800 text-blue-300'
                                    }`}>
                                        {type}
                                    </span>
                                </td>
                                <td className="p-3">
                                    <span className="text-green-400 text-sm flex items-center gap-1">
                                        ✓ Sent
                                    </span>
                                </td>
                            </tr>
                        );
                    })
                )}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-gray-500 text-center">
            Results will appear in your Slskd client. Check the "Search" tab in Slskd.
          </p>
        </div>
      )}
    </div>
  );
}
