'use client';

import { useState } from 'react';
import { api } from '~/trpc/react';

export default function PlaylistToolsPage() {
    const utils = api.useUtils();
    const [rawText, setRawText] = useState('');
    const [externalUrl, setExternalUrl] = useState('');
    const [playlistName, setPlaylistName] = useState('My New Playlist');
    const [parsedItems, setParsedItems] = useState<{ track: string; artist: string }[]>([]);
    
    const playlistsQuery = api.playlistTools.getPlaylists.useQuery();
    
    const loadPlaylistMutation = api.playlistTools.getPlaylist.useMutation({
        onSuccess: (data) => {
            setParsedItems(data.items.map(i => ({ track: i.track, artist: i.artist })));
            setPlaylistName(data.name);
        }
    });

    const fetchExternal = api.playlistTools.fetchExternal.useMutation({
        onSuccess: (data) => {
            setParsedItems(data);
            setExternalUrl('');
        }
    });

    const savePlaylist = api.playlistTools.savePlaylist.useMutation({
        onSuccess: () => {
            void utils.playlistTools.getPlaylists.invalidate();
            setParsedItems([]);
            setRawText('');
            setPlaylistName('My New Playlist');
        }
    });

    const deletePlaylist = api.playlistTools.deletePlaylist.useMutation({
        onSuccess: () => void utils.playlistTools.getPlaylists.invalidate()
    });

    const handleParse = () => {
        const lines = rawText.split('\n').filter(l => l.trim());
        const parsed = lines.map(line => {
            const clean = line.replace(/[^a-zA-Z0-9\s-]/g, "");
            const parts = clean.split('-').map(p => p.trim());
            return {
                track: parts[0] || 'Unknown Track',
                artist: parts[1] || 'Unknown Artist'
            };
        });
        setParsedItems(parsed);
    };

    const handleCellChange = (index: number, field: 'track' | 'artist', value: string) => {
        const next = [...parsedItems];
        if (next[index]) {
            next[index][field] = value;
            setParsedItems(next);
        }
    };

    return (
        <main className="p-8 max-w-7xl mx-auto text-[#f0f6fc]">
            <header className="mb-8 border-b border-[#30363d] pb-6">
                <h1 className="text-4xl font-extrabold text-[#58a6ff] mb-2">Playlist Tools</h1>
                <p className="text-[#8b949e]">Paste tracklists or fetch from external services.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Side List */}
                <div className="lg:col-span-1 space-y-4">
                    <h2 className="text-sm font-semibold text-[#8b949e] uppercase tracking-wider mb-2">Saved Playlists</h2>
                    <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                        {playlistsQuery.data?.map(pl => (
                            <div 
                                key={pl.id} 
                                onClick={() => loadPlaylistMutation.mutate({ id: pl.id })}
                                className="group flex justify-between items-center p-3 bg-[#161b22] border border-[#30363d] rounded-lg hover:border-[#388bfd] transition-colors cursor-pointer"
                            >
                                <div className="overflow-hidden">
                                    <div className="text-sm font-medium text-[#c9d1d9] truncate group-hover:text-[#58a6ff]">
                                        {loadPlaylistMutation.isPending && loadPlaylistMutation.variables?.id === pl.id ? '⌛ ' : ''}
                                        {pl.name}
                                    </div>
                                    <div className="text-xs text-[#8b949e]">{pl._count.items} tracks</div>
                                </div>
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (confirm('Delete this playlist?')) deletePlaylist.mutate({ id: pl.id });
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-1 text-[#f85149] hover:bg-[#30363d] rounded transition-all"
                                >
                                    🗑️
                                </button>
                            </div>
                        ))}
                        {playlistsQuery.data?.length === 0 && (
                            <p className="text-sm text-[#8b949e] italic">No playlists yet.</p>
                        )}
                    </div>
                </div>

                {/* Main Workspace */}
                <div className="lg:col-span-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Input Section */}
                        <div className="space-y-6">
                            <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 shadow-sm">
                                <label className="block text-sm font-medium text-[#8b949e] mb-3 uppercase tracking-wider">
                                    Paste Tracklist (Track - Artist)
                                </label>
                                <textarea
                                    className="w-full h-64 bg-[#0d1117] border border-[#30363d] rounded-lg p-4 text-[#c9d1d9] focus:ring-2 focus:ring-[#388bfd] focus:border-transparent outline-none resize-none transition-all font-mono text-sm leading-relaxed"
                                    placeholder="Song Title - Artist Name&#10;Another Banger - DJ Vibes"
                                    value={rawText}
                                    onChange={(e) => setRawText(e.target.value)}
                                />
                                <button 
                                    onClick={handleParse}
                                    className="mt-4 w-full bg-[#238636] hover:bg-[#2eaa42] text-white font-bold py-3 px-6 rounded-lg transition-colors border border-transparent shadow-md"
                                >
                                    Parse Text
                                </button>
                            </div>

                        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 shadow-sm">
                            <label className="block text-sm font-medium text-[#8b949e] mb-3 uppercase tracking-wider">
                                Import from Link (Spotify/YT)
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    className="flex-1 bg-[#0d1117] border border-[#30363d] rounded-lg p-3 text-[#c9d1d9] outline-none focus:ring-2 focus:ring-[#388bfd]"
                                    placeholder="Paste Spotify/YouTube playlist URL"
                                    value={externalUrl}
                                    onChange={(e) => setExternalUrl(e.target.value)}
                                />
                                <button
                                    onClick={() => fetchExternal.mutate({ url: externalUrl })}
                                    disabled={fetchExternal.isPending || !externalUrl}
                                    className="bg-[#21262d] hover:bg-[#30363d] px-4 rounded-lg text-sm font-bold border border-[#30363d] transition-colors"
                                >
                                    {fetchExternal.isPending ? '...' : 'Fetch'}
                                </button>
                            </div>
                            {fetchExternal.error && (
                                <p className="mt-2 text-xs text-[#f85149]">{fetchExternal.error.message}</p>
                            )}
                        </div>
                    </div>

                        {/* Preview/Editor Section */}
                        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 shadow-sm min-h-[400px]">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold text-[#c9d1d9]">Playlist Preview</h2>
                                {parsedItems.length > 0 && (
                                    <div className="flex gap-3">
                                        <input 
                                            className="bg-[#0d1117] border border-[#30363d] rounded px-3 py-1 text-sm outline-none w-40"
                                            value={playlistName}
                                            onChange={(e) => setPlaylistName(e.target.value)}
                                            placeholder="Playlist Name"
                                        />
                                        <button 
                                            onClick={() => savePlaylist.mutate({ name: playlistName, items: parsedItems })}
                                            disabled={savePlaylist.isPending}
                                            className="bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] border border-[#30363d] px-4 py-1 rounded text-sm transition-all"
                                        >
                                            {savePlaylist.isPending ? 'Saving...' : 'Save Playlist'}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {parsedItems.length === 0 ? (
                                <div className="flex flex-col items-center justify-center min-h-[300px] text-[#8b949e] italic border-2 border-dashed border-[#30363d] rounded-lg">
                                    Parsed tracks will appear here
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-[#30363d] text-[#8b949e] text-xs font-semibold uppercase tracking-wider">
                                                <th className="py-3 px-4">Track</th>
                                                <th className="py-3 px-4">Artist</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {parsedItems.map((item, idx) => (
                                                <tr key={idx} className="border-b border-[#21262d] hover:bg-[#1c2128] transition-colors group">
                                                    <td className="py-1 px-2">
                                                        <input
                                                            className="w-full bg-transparent border-none outline-none text-[#c9d1d9] focus:bg-[#0d1117] px-2 py-1 rounded text-sm"
                                                            value={item.track}
                                                            onChange={(e) => handleCellChange(idx, 'track', e.target.value)}
                                                        />
                                                    </td>
                                                    <td className="py-1 px-2">
                                                        <input
                                                            className="w-full bg-transparent border-none outline-none text-[#c9d1d9] focus:bg-[#0d1117] px-2 py-1 rounded text-sm"
                                                            value={item.artist}
                                                            onChange={(e) => handleCellChange(idx, 'artist', e.target.value)}
                                                        />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
