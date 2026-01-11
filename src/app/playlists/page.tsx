'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '~/trpc/react';
import { DiscogsImport } from './DiscogsImport';
import { PlexImport } from './PlexImport';

export default function PlaylistToolsPage() {
    const utils = api.useUtils();
    const [rawText, setRawText] = useState('');
    const [externalUrl, setExternalUrl] = useState('');
    const [playlistName, setPlaylistName] = useState('My New Playlist');
    const [parsedItems, setParsedItems] = useState<{ track: string; artist: string }[]>([]);
    const [history, setHistory] = useState<{ track: string; artist: string }[] | null>(null);
    const [isInputFocused, setIsInputFocused] = useState(false);
    const [showDiscogsModal, setShowDiscogsModal] = useState(false);
    const [showPlexModal, setShowPlexModal] = useState(false);
    const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
    
    // Keep selection in sync with items
    useEffect(() => {
        // Select all new items by default
        setSelectedIndices(new Set(parsedItems.map((_, i) => i)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [parsedItems.length]);
    const playlistsQuery = api.playlistTools.getPlaylists.useQuery();
    
    const loadPlaylistMutation = api.playlistTools.getPlaylist.useMutation({
        onSuccess: (data) => {
            setParsedItems(data.items.map(i => ({ track: i.track, artist: i.artist })));
            setPlaylistName(data.name);
        }
    });

    const fetchExternal = api.playlistTools.fetchExternal.useMutation({
        onSuccess: (data) => {
            setHistory(parsedItems);
            setParsedItems(data.tracks);
            setPlaylistName(data.name);
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
        debugger
        const lines = rawText.split('\n').filter(l => l.trim());
        const parsed = lines.map(line => {
            const clean = line.replace(/[^a-zA-Z0-9\s-]/g, "");
            const parts = clean.split('-').map(p => p.trim());
            return {
                track: parts[0] ?? 'Unknown Track',
                artist: parts[1] ?? 'Unknown Artist'
            };
        });
        setHistory(parsedItems);
        setParsedItems(parsed);
    };

    const handleSplit = (index: number) => {
        const next = [...parsedItems];
        const item = next[index];
        if (item) {
            const parts = item.track.split(/[-–—|_]/).map(p => p.trim());
            if (parts.length >= 2) {
                setHistory([...parsedItems.map(i => ({ ...i }))]);
                item.artist = parts[0]!;
                item.track = parts.slice(1).join(' - ');
                setParsedItems(next);
            }
        }
    };

    const handleClean = (index: number) => {
        const next = [...parsedItems];
        const item = next[index];
        if (item) {
            const cleanStr = (s: string) => {
                let cleaned = s.replace(/\(.*?\)/g, "");
                cleaned = cleaned.replace(/[^a-zA-Z0-9\s]/g, "");
                return cleaned.replace(/\s+/g, " ").trim();
            };
            setHistory([...parsedItems.map(i => ({ ...i }))]);
            item.track = cleanStr(item.track);
            item.artist = cleanStr(item.artist);
            setParsedItems(next);
        }
    };

    const handleRemoveRow = (index: number) => {
        setHistory([...parsedItems.map(i => ({ ...i }))]);
        const next = parsedItems.filter((_, i) => i !== index);
        setParsedItems(next);
    };

    const handleCellChange = (index: number, field: 'track' | 'artist', value: string) => {
        const next = [...parsedItems];
        if (next[index]) {
            setHistory([...parsedItems.map(i => ({ ...i }))]);
            next[index][field] = value;
            setParsedItems(next);
        }
    };

    const handleUndo = useCallback(() => {
        if (history) {
            const current = [...parsedItems];
            setParsedItems(history);
            setHistory(current);
        }
    }, [history, parsedItems]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
                e.preventDefault();
                handleUndo();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleUndo]);

    return (
        <main className="p-8 max-w-7xl mx-auto text-[#f0f6fc]">
            <header className="mb-8 border-b border-[#30363d] pb-6">
                <h1 className="text-4xl font-extrabold text-[#58a6ff] mb-2">Playlists</h1>
                <p className="text-[#8b949e]">Paste tracklists or fetch from external services.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                {/* Paste Section */}
                <div 
                    className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 shadow-sm transition-all duration-500 ease-in-out"
                    onFocus={() => setIsInputFocused(true)}
                    onBlur={(e) => {
                        // Only blur if the new focus isn't inside this container
                        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                            setIsInputFocused(false);
                        }
                    }}
                >
                    <label className="block text-sm font-medium text-[#8b949e] mb-3 uppercase tracking-wider">
                        Paste Tracklist (Track - Artist)
                    </label>
                    <textarea
                        className={`w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-4 text-[#c9d1d9] focus:ring-2 focus:ring-[#388bfd] focus:border-transparent outline-none resize-none transition-all duration-500 font-mono text-sm leading-relaxed overflow-hidden ${isInputFocused ? 'h-64' : 'h-12'}`}
                        placeholder="Song Title - Artist Name"
                        value={rawText}
                        onChange={(e) => setRawText(e.target.value)}
                    />
                    <div className={`transition-all duration-500 overflow-hidden ${isInputFocused ? 'max-h-20 opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
                        <button 
                            onClick={handleParse}
                            className="w-full bg-[#238636] hover:bg-[#2eaa42] text-white font-bold py-2.5 px-6 rounded-lg transition-colors border border-transparent shadow-md"
                        >
                            Parse Text
                        </button>
                    </div>
                </div>

                {/* Import Section */}
                <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 shadow-sm flex flex-col justify-center">
                    <label className="block text-sm font-medium text-[#8b949e] mb-3 uppercase tracking-wider">
                        Import from Link
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            className="flex-1 bg-[#0d1117] border border-[#30363d] rounded-lg p-3 text-[#c9d1d9] outline-none focus:ring-2 focus:ring-[#388bfd]"
                            placeholder="Paste Spotify/YouTube/YouTubeMusic playlist URL"
                            value={externalUrl}
                            onChange={(e) => setExternalUrl(e.target.value)}
                        />
                        <button
                            onClick={() => fetchExternal.mutate({ url: externalUrl })}
                            disabled={fetchExternal.isPending || !externalUrl}
                            className="bg-[#21262d] hover:bg-[#30363d] px-4 rounded-lg text-sm font-bold border border-[#30363d] transition-colors h-12"
                        >
                            {fetchExternal.isPending ? '...' : 'Fetch'}
                        </button>
                    </div>
                    {fetchExternal.error && (
                        <p className="mt-2 text-xs text-[#f85149]">{fetchExternal.error.message}</p>
                    )}
                    
                    <div className="mt-4 pt-4 border-t border-[#30363d] space-y-2">
                        <button
                            onClick={() => setShowDiscogsModal(true)}
                            className="w-full bg-[#1f6feb]/10 hover:bg-[#1f6feb]/20 text-[#58a6ff] border border-[#1f6feb]/30 hover:border-[#58a6ff] font-bold py-2.5 px-6 rounded-lg transition-all flex items-center justify-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 24C5.373 24 0 18.627 0 12S5.373 0 12 0s12 5.373 12 12-5.373 12-12 12zm0-2c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zm0-3a7 7 0 1 1 0-14 7 7 0 0 1 0 14zm0-2a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm3.5-5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0z"/></svg>
                            Import from Discogs Collection
                        </button>
                        <button
                            onClick={() => setShowPlexModal(true)}
                            className="w-full bg-[#e5a00d]/10 hover:bg-[#e5a00d]/20 text-[#e5a00d] border border-[#e5a00d]/30 hover:border-[#e5a00d] font-bold py-2.5 px-6 rounded-lg transition-all flex items-center justify-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                            Import from Plex Playlist
                        </button>
                    </div>
                </div>
            </div>
            
            {showDiscogsModal && (
                <DiscogsImport 
                    onClose={() => setShowDiscogsModal(false)}
                    onImport={(items) => {
                        setHistory(parsedItems);
                        setParsedItems(current => [...current, ...items]);
                        setShowDiscogsModal(false);
                    }}
                />
            )}

            {showPlexModal && (
                <PlexImport 
                    onClose={() => setShowPlexModal(false)}
                    onImport={(items, name) => {
                        setHistory(parsedItems);
                        setParsedItems(current => [...current, ...items]);
                        setPlaylistName(name);
                        setShowPlexModal(false);
                    }}
                />
            )}

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
                                <a
                                    href={`/soulseek?playlistId=${pl.id}`}
                                    onClick={(e) => e.stopPropagation()}
                                    title="Search on Soulseek"
                                    className="opacity-0 group-hover:opacity-100 p-1 text-[#58a6ff] hover:bg-[#30363d] rounded transition-all ml-1"
                                >
                                    🔍
                                </a>
                            </div>
                        ))}
                        {playlistsQuery.data?.length === 0 && (
                            <p className="text-sm text-[#8b949e] italic">No playlists yet.</p>
                        )}
                    </div>
                </div>

                {/* Preview Section */}
                <div className="lg:col-span-3">
                    <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 shadow-sm min-h-[400px]">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-[#c9d1d9]">Playlist Preview</h2>
                            {parsedItems.length > 0 && (
                                <div className="flex gap-3 items-center">
                                    <span className="text-sm text-[#8b949e]">
                                        {selectedIndices.size}/{parsedItems.length} selected
                                    </span>
                                    <input 
                                        className="bg-[#0d1117] border border-[#30363d] rounded px-3 py-1 text-sm outline-none w-40"
                                        value={playlistName}
                                        onChange={(e) => setPlaylistName(e.target.value)}
                                        placeholder="Playlist Name"
                                    />
                                    <button 
                                        onClick={() => {
                                            const selectedItems = parsedItems.filter((_, i) => selectedIndices.has(i));
                                            savePlaylist.mutate({ name: playlistName, items: selectedItems });
                                        }}
                                        disabled={savePlaylist.isPending || selectedIndices.size === 0}
                                        className="bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] border border-[#30363d] px-4 py-1 rounded text-sm transition-all disabled:opacity-50"
                                    >
                                        {savePlaylist.isPending ? 'Saving...' : `Save ${selectedIndices.size} Tracks`}
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
                                            <th className="py-3 px-2 w-10">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIndices.size === parsedItems.length && parsedItems.length > 0}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedIndices(new Set(parsedItems.map((_, i) => i)));
                                                        } else {
                                                            setSelectedIndices(new Set());
                                                        }
                                                    }}
                                                    className="w-4 h-4 accent-[#58a6ff]"
                                                />
                                            </th>
                                            <th className="py-3 px-4">Track</th>
                                            <th className="py-3 px-4">Artist</th>
                                            <th className="py-3 px-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {parsedItems.map((item, idx) => (
                                            <tr key={idx} className={`border-b border-[#21262d] hover:bg-[#1c2128] transition-colors group ${selectedIndices.has(idx) ? 'bg-[#1c2128]/50' : ''}`}>
                                                <td className="py-1 px-2 w-10">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedIndices.has(idx)}
                                                        onChange={(e) => {
                                                            const newSet = new Set(selectedIndices);
                                                            if (e.target.checked) {
                                                                newSet.add(idx);
                                                            } else {
                                                                newSet.delete(idx);
                                                            }
                                                            setSelectedIndices(newSet);
                                                        }}
                                                        className="w-4 h-4 accent-[#58a6ff]"
                                                    />
                                                </td>
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
                                                <td className="py-1 px-4 text-right">
                                                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button 
                                                            onClick={() => handleSplit(idx)}
                                                            title="Split Track into Artist - Track"
                                                            className="p-1.5 hover:bg-[#30363d] rounded text-[#8b949e] hover:text-[#58a6ff] transition-colors"
                                                        >
                                                            ✂️
                                                        </button>
                                                        <button 
                                                            onClick={() => handleClean(idx)}
                                                            title="Clean (Alpha-numeric only, remove parens)"
                                                            className="p-1.5 hover:bg-[#30363d] rounded text-[#8b949e] hover:text-[#58a6ff] transition-colors"
                                                        >
                                                            ✨
                                                        </button>
                                                        <button 
                                                            onClick={() => handleRemoveRow(idx)}
                                                            title="Remove Track"
                                                            className="p-1.5 hover:bg-[#30363d] rounded text-[#8b949e] hover:text-[#f85149] transition-colors"
                                                        >
                                                            🗑️
                                                        </button>
                                                    </div>
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
        </main>
    );
}
