'use client';

import { useState } from 'react';
import { useSmartSearch } from '~/hooks/useSmartSearch';

export default function SoulseekPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ q: string; type: string; sent: boolean }[] | null>(null);
  const { preview, execute, isLoading, error } = useSmartSearch();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    // Clear previous results
    setResults(null);
    
    const data = await preview(query);
    if (data) {
        setResults(data.map(item => ({ ...item, sent: false })));
    }
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

  const handleEdit = (index: number, val: string) => {
    if (!results) return;
    const next = [...results];
     // @ts-expect-error - we checked index existence
    next[index].q = val;
    setResults(next);
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
            {isLoading ? 'Preview' : 'Preview'}
          </button>
        </form>

        {error && (
          <div className="mt-4 p-3 bg-red-900/30 border border-red-800 text-red-200 rounded">
            Error: {error}
          </div>
        )}
      </div>

      {results && (
        <div className="space-y-6">
          <div className="bg-[#0d1117] border border-[#30363d] rounded-lg overflow-hidden">
            <div className="p-4 border-b border-[#30363d] bg-[#161b22]">
                <h3 className="text-sm font-semibold text-gray-300">Searches ({results.length})</h3>
            </div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#161b22] border-b border-[#30363d]">
                  <th className="p-3 text-sm font-semibold text-gray-300">Query (Editable)</th>
                  <th className="p-3 text-sm font-semibold text-gray-300">Type</th>
                  <th className="p-3 text-sm font-semibold text-gray-300 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {results.length === 0 ? (
                    <tr><td colSpan={3} className="p-4 text-center text-gray-500">No results generated</td></tr>
                ) : (
                    results.map((item, i) => (
                        <tr key={i} className="border-b border-[#30363d] last:border-0 hover:bg-[#161b22]/50">
                            <td className="p-2">
                                <input 
                                    className="w-full bg-transparent border border-transparent focus:border-[#30363d] hover:border-[#30363d] rounded px-2 py-1 outline-none font-mono text-blue-200"
                                    value={item.q}
                                    onChange={(e) => handleEdit(i, e.target.value)}
                                />
                            </td>
                            <td className="p-3 text-sm text-gray-400">
                                <span className={`px-2 py-0.5 rounded-full text-xs border ${
                                    item.type === 'Original' ? 'bg-green-900/30 border-green-800 text-green-300' :
                                    item.type === 'Cleaned' ? 'bg-purple-900/30 border-purple-800 text-purple-300' :
                                    'bg-blue-900/30 border-blue-800 text-blue-300'
                                }`}>
                                    {item.type}
                                </span>
                            </td>
                            <td className="p-3 text-right">
                                {item.sent ? (
                                    <span className="text-green-400 text-sm font-bold flex items-center justify-end gap-1">
                                        ✓ Sent
                                    </span>
                                ) : (
                                    <button 
                                        onClick={() => handleSend(i)}
                                        className="text-[#58a6ff] hover:underline text-sm font-medium"
                                    >
                                        Send →
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-gray-500 text-center">
            Click &quot;Send&quot; on queries you want to trigger in Slskd.
          </p>
          <p className="text-sm text-gray-500 text-center">
            <a target="_blank" href="https://soulseek.badvibes.cc/searches" className="text-[#58a6ff] hover:underline text-sm font-medium">View Searches</a>
          </p>
        </div>
      )}
    </div>
  );
}
