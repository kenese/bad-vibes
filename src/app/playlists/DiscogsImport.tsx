'use client';

import { useState, useEffect, useMemo } from 'react';
import { api } from '~/trpc/react';
import { useSession } from 'next-auth/react';

interface DiscogsImportProps {
    onImport: (items: { track: string; artist: string }[]) => void;
    onClose: () => void;
}

// Plex Types & Helpers
interface PlexConnection {
    token: string;
    servers: {
        name: string;
        clientIdentifier: string;
        uri: string;
    }[];
    selectedServer: {
        name: string;
        clientIdentifier: string;
        uri: string;
    } | null;
}

const PLEX_STORAGE_KEY = 'plex_connection';

function loadStoredPlexConnection(): PlexConnection | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(PLEX_STORAGE_KEY);
    return stored ? JSON.parse(stored) as PlexConnection : null;
  } catch (e) {
    return null;
  }
}

interface PlexPlaylist {
  ratingKey: string;
  title: string;
}

interface PlexTrack {
  title: string;
  artist: string;
  album: string;
}

interface DiscogsItem {
    id: number;
    track: string;
    artist: string;
    added_at: string;
    formats: { name: string; descriptions?: string[] }[];
}



export function DiscogsImport({ onImport, onClose }: DiscogsImportProps) {
    const { data: session } = useSession();
    const [addedAfter, setAddedAfter] = useState('');
    const [page, setPage] = useState(1);
    
    // In development mode, tRPC uses a mock user, so we don't need session check there
    const isDev = process.env.NODE_ENV === 'development';
    
    const [selectedItems, setSelectedItems] = useState<Map<number, DiscogsItem>>(new Map());

    const collectionQuery = api.discogs.getCollection.useQuery({
        page, 
        per_page: 50,
        added_after: addedAfter ? new Date(addedAfter).toISOString() : undefined
    }, {
        // Enable query in dev mode (tRPC mock auth) or when session exists in prod
        enabled: isDev || !!session?.user,
        retry: false
    });




    // Plex Integration State
    const [plexConnection, setPlexConnection] = useState<PlexConnection | null>(null);
    const [plexPlaylists, setPlexPlaylists] = useState<PlexPlaylist[]>([]);
    const [selectedPlexPlaylist, setSelectedPlexPlaylist] = useState<string>('');
    const [filterMode, setFilterMode] = useState<'added_after' | 'not_in_plex'>('added_after');
    const [missingReleases, setMissingReleases] = useState<DiscogsItem[]>([]); 
    const [isComparing, setIsComparing] = useState(false);
    const [comparisonProgress, setComparisonProgress] = useState('');
    const [formatFilter, setFormatFilter] = useState<'all' | 'albums' | 'no_albums'>('all');
    const [mediaFilter, setMediaFilter] = useState<'all' | 'vinyl' | 'cd' | 'digital'>('all');
    const [isFiltersOpen, setIsFiltersOpen] = useState(true);

    const filteredItems = useMemo(() => {
        const sourceItems = filterMode === 'not_in_plex' ? missingReleases : collectionQuery.data?.items;
        return sourceItems?.filter(item => 
            matchesFormatFilter(item, formatFilter) && 
            matchesMediaFilter(item, mediaFilter)
        ) ?? [];
    }, [filterMode, missingReleases, collectionQuery.data?.items, formatFilter, mediaFilter]);

    const toggleItem = (item: DiscogsItem) => {
        const newSelected = new Map(selectedItems);
        if (newSelected.has(item.id)) {
            newSelected.delete(item.id);
        } else {
             newSelected.set(item.id, { 
                 track: item.track, 
                 artist: item.artist, 
                 id: item.id,
                 added_at: item.added_at,
                 formats: item.formats
             });
        }
        setSelectedItems(newSelected);
    };

    const toggleAllPage = () => {
        if (filteredItems.length === 0) return;
        
        const newSelected = new Map(selectedItems);
        const allSelected = filteredItems.every((item: DiscogsItem) => newSelected.has(item.id));
        
        if (allSelected) {
            filteredItems.forEach((item: DiscogsItem) => newSelected.delete(item.id));
        } else {
            filteredItems.forEach((item: DiscogsItem) => newSelected.set(item.id, { 
                track: item.track, 
                artist: item.artist, 
                id: item.id,
                added_at: item.added_at,
                formats: item.formats
            }));
        }
        setSelectedItems(newSelected);
    };

    const handleImport = () => {
        if (selectedItems.size > 0) {
            onImport(Array.from(selectedItems.values()));
            onClose();
        }
    };


    useEffect(() => {
        const conn = loadStoredPlexConnection();
        if (conn) {
            setPlexConnection(conn);
            // Load playlists
            fetch(`/api/plex/playlists?serverUrl=${encodeURIComponent(conn.selectedServer?.uri ?? '')}&token=${conn.token}`)
                .then(res => res.json())
                .then((data: { playlists: PlexPlaylist[] }) => setPlexPlaylists(data.playlists))
                .catch(err => console.error("Failed to load Plex playlists", err));
        }
    }, []);

    const runComparison = async (playlistKey: string) => {
        if (!plexConnection || !playlistKey) return;
        setIsComparing(true);
        setComparisonProgress('Fetching Plex tracks...');
        
        try {


            
            const plexRes = await fetch(`/api/plex/playlists/${playlistKey}/tracks?serverUrl=${encodeURIComponent(plexConnection.selectedServer?.uri ?? '')}&token=${plexConnection.token}`);
            const plexData = await plexRes.json() as { tracks: PlexTrack[], totalSize?: number };
            
            setComparisonProgress('Fetching Discogs collection...');
            const firstPage = await utils.discogs.getCollection.fetch({ page: 1, per_page: 50 });
            let allReleases = [...firstPage.items];
            const totalPages = firstPage.pagination.pages;
            
            for (let p = 2; p <= totalPages; p++) {
                setComparisonProgress(`Fetching Discogs page ${p}/${totalPages}...`);
                const pageData = await utils.discogs.getCollection.fetch({ page: p, per_page: 50 });
                allReleases = [...allReleases, ...pageData.items];
                // Rate limit guard
                await new Promise(r => setTimeout(r, 600)); 
            }
            
            // 3. Compare
            setComparisonProgress('Comparing...');
            
            // Debug Logging for "Lyn Christopher"
            console.log("--- DEBUG: Lyn Christopher ---");
            const discogsLyn = allReleases.filter(r => r.artist.includes("Lyn Christopher"));
            console.log("Discogs Entries:", discogsLyn.map(r => ({
                original: `${r.artist} - ${r.track}`,
                normArtist: normalizeString(r.artist),
                normTitle: normalizeString(r.track)
            })));

            const plexLyn = plexData.tracks.filter(t => t.artist.includes("Christopher") || t.album.includes("Christopher"));
            console.log("Plex Candidates:", plexLyn.map(t => ({
                original: `${t.artist} - ${t.album}`,
                normArtist: normalizeString(t.artist),
                normTitle: normalizeString(t.album)
            })));
            console.log("------------------------------");

            // Build optimized lookup for Plex Albums
            // Map<NormalizedArtist, Array<{original: PlexTrack, normTitle: string}>>
            const plexLookup = new Map<string, { artist: string; album: string; normTitle: string }[]>();
            
            plexData.tracks.forEach(t => {
                const normArtist = normalizeString(t.artist);
                const normTitle = normalizeString(t.album);
                const entry = { artist: t.artist, album: t.album, normTitle };
                
                if (!plexLookup.has(normArtist)) {
                    plexLookup.set(normArtist, []);
                }
                plexLookup.get(normArtist)?.push(entry);
            });

            const missing = allReleases.filter(r => {
                const normArtist = normalizeString(r.artist);
                const normTitle = normalizeString(r.track); // Discogs release title

                // 1. Try finding artist candidates
                const candidates = plexLookup.get(normArtist);
                
                // If no exact artist match after normalization, try fuzzy artist match among all keys? 
                // (Expensive, maybe skip for now or do limited scan for similar keys)
                if (!candidates) {
                    return true; // Artist not found -> Missing in Plex
                }
                
                // 2. Check for Album Title match among candidates
                // We consider it a match if any candidate title is > 85% similar
                const bestMatch = candidates.find(c => {
                    return similarity(normTitle, c.normTitle) >= 85;
                });
                
                // If matched, it's NOT missing. If not matched, it IS missing.
                return !bestMatch;
            });
            
            setMissingReleases(missing);
            
        } catch (e) {
            console.error("Comparison failed", e);
            alert("Comparison failed. Check console.");
        } finally {
            setIsComparing(false);
            setComparisonProgress('');
        }
    };

    // Utils for import all
    const [isImportingAll, setIsImportingAll] = useState(false);
    const [importProgress, setImportProgress] = useState<{ current: number; total: number; stage: string }>({ current: 0, total: 0, stage: '' });
    const utils = api.useUtils();
    const getReleaseMutation = api.discogs.getRelease.useMutation();

    const handleImportAll = async () => {
        if (!collectionQuery.data?.pagination) return;
        
        setIsImportingAll(true);
        const totalItems = collectionQuery.data.pagination.items;
        setImportProgress({ current: 0, total: totalItems, stage: 'Initializing...' });

        try {
            const allTracks: { track: string; artist: string }[] = [];
            const totalPages = collectionQuery.data.pagination.pages;

            // 1. Determine source items
            let itemsToProcess = [];
            
            if (filterMode === 'not_in_plex') {
                // Use the already fetched missing releases
                itemsToProcess = missingReleases;
            } else {
                // Fetch all pages fresh
                const totalPages = collectionQuery.data.pagination.pages;
                for (let p = 1; p <= totalPages; p++) {
                    setImportProgress(prev => ({ ...prev, stage: `Fetching page ${p} of ${totalPages}...` }));
                    const pageData = await utils.discogs.getCollection.fetch({
                        page: p,
                        per_page: 50,
                        added_after: addedAfter ? new Date(addedAfter).toISOString() : undefined
                    });
                    itemsToProcess.push(...pageData.items);
                }
            }
            
            setImportProgress({ current: 0, total: itemsToProcess.length, stage: 'Expanding tracks...' });

            // 2. Process items (Expand to tracks)
            for (const [index, release] of itemsToProcess.entries()) {
                setImportProgress({ 
                    current: allTracks.length, 
                    total: itemsToProcess.length, // Total releases
                    stage: `Processing "${release.track}" (${index + 1}/${itemsToProcess.length})`
                });

                try {
                    // Rate limit prevention
                    await new Promise(resolve => setTimeout(resolve, 1100));

                    const details = await getReleaseMutation.mutateAsync({ release_id: release.id });
                    
                    if (details.tracklist && details.tracklist.length > 0) {
                         details.tracklist.forEach(t => {
                             if (t.title) {
                                 allTracks.push({
                                     track: t.title,
                                     artist: details.artists[0]?.name ?? "Unknown Artist"
                                 });
                             }
                         });
                    } else {
                        allTracks.push({
                            track: details.title,
                            artist: details.artists[0]?.name ?? "Unknown Artist"
                        });
                    }

                } catch (e) {
                     console.error(`Failed to fetch release ${release.id}`, e);
                     allTracks.push({
                         track: release.track,
                         artist: release.artist
                     });
                }
            }

            onImport(allTracks);
            onClose();

        } catch (error) {
            console.error("Import All Failed", error);
            alert("Failed to import all items. Check console.");
        } finally {
            setIsImportingAll(false);
        }
    };

    if (collectionQuery.error?.data?.code === 'UNAUTHORIZED') {
        return (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 max-w-md w-full text-center">
                    <h2 className="text-xl font-bold text-[#c9d1d9] mb-4">Connect Discogs</h2>
                    <p className="text-[#8b949e] mb-6">Link your Discogs account to import your collection.</p>
                    <div className="flex gap-3 justify-center">
                        <button 
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg text-[#8b949e] hover:text-[#c9d1d9] transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={() => window.location.href = '/api/discogs/auth'}
                            className="bg-[#388bfd] hover:bg-[#4396fd] text-white font-bold py-2 px-6 rounded-lg transition-colors"
                        >
                            Connect with Discogs
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 md:p-6 p-0">
            <div className="bg-[#161b22] border border-[#30363d] md:rounded-xl p-4 md:p-6 w-full h-full md:h-auto md:max-w-6xl md:max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center mb-6 border-b border-[#30363d] pb-4">
                    <h2 className="text-xl font-bold text-[#c9d1d9]">Import from Discogs</h2>
                    <button onClick={onClose} disabled={isImportingAll} className="text-[#8b949e] hover:text-[#c9d1d9] disabled:opacity-50">✕</button>
                </div>
                
                {isImportingAll ? (
                    <div className="flex flex-col items-center justify-center py-12 space-y-4">
                        <div className="w-full max-w-md bg-[#0d1117] rounded-full h-2.5 overflow-hidden">
                            <div 
                              className="bg-[#238636] h-full transition-all duration-300 relative" 
                              style={{ width: `${Math.min(100, (importProgress.current / (importProgress.total || 1)) * 100)}%` }}
                            >
                                <div className="absolute inset-0 bg-white/20 animate-[shimmer_1s_infinite] border-t-transparent border-l-transparent border-r-transparent" style={{ backgroundImage: 'linear-gradient(45deg,rgba(255,255,255,.15) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.15) 50%,rgba(255,255,255,.15) 75%,transparent 75%,transparent)', backgroundSize: '1rem 1rem' }}></div>
                            </div>
                        </div>
                        <p className="text-[#c9d1d9] font-mono text-sm">{importProgress.stage}</p>
                        <p className="text-[#8b949e] text-xs">Importing tracks... found {importProgress.current} so far</p>
                    </div>
                ) : (
                    <>

                        <div className="flex flex-col mb-6 bg-[#0d1117] rounded-lg border border-[#30363d] transition-all">
                            {/* Filter Header / Toggle */}
                            <div 
                                className="flex justify-between items-center p-4 cursor-pointer hover:bg-[#161b22] rounded-t-lg select-none"
                                onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                            >
                                <div className="flex items-center gap-2">
                                    <h3 className="text-sm font-bold text-[#c9d1d9]">Import Options & Filters</h3>
                                    {!isFiltersOpen && (
                                        <span className="text-xs text-[#8b949e] font-normal">
                                            ({filterMode === 'added_after' ? 'Added Date' : 'Plex Compare'}, 
                                            {formatFilter !== 'all' ? ` ${formatFilter}` : ' All Formats'},
                                            {mediaFilter !== 'all' ? ` ${mediaFilter}` : ''})
                                        </span>
                                    )}
                                </div>
                                <button className="text-[#8b949e] hover:text-[#c9d1d9]">
                                    {isFiltersOpen ? 'Collapse ▲' : 'Expand ▼'}
                                </button>
                            </div>

                            {isFiltersOpen && (
                            <div className="flex flex-col gap-4 p-4 pt-0 border-t border-[#30363d] mt-2">
                            <div className="flex gap-4 border-b border-[#30363d] pb-4 mb-2">
                                <label className={`cursor-pointer pb-2 -mb-4 ${filterMode === 'added_after' ? 'text-[#388bfd] border-b-2 border-[#388bfd]' : 'text-[#8b949e]'}`}>
                                    <input 
                                        type="radio" 
                                        className="hidden" 
                                        checked={filterMode === 'added_after'} 
                                        onChange={() => setFilterMode('added_after')}
                                    />
                                    Added After
                                </label>
                                <label className={`cursor-pointer pb-2 -mb-4 ${filterMode === 'not_in_plex' ? 'text-[#388bfd] border-b-2 border-[#388bfd]' : 'text-[#8b949e]'}`}>
                                    <input 
                                        type="radio" 
                                        className="hidden" 
                                        checked={filterMode === 'not_in_plex'} 
                                        onChange={() => setFilterMode('not_in_plex')}
                                    />
                                    Compare vs Plex
                                </label>
                            </div>

                            {filterMode === 'added_after' ? (
                                <div className="flex items-end justify-between">
                                    <div className="flex-1 max-w-xs">
                                        <label className="block text-xs font-semibold text-[#8b949e] uppercase mb-1">Added After</label>
                                        <input 
                                            type="date" 
                                            className="w-full bg-[#161b22] border border-[#30363d] rounded px-3 py-2 text-[#c9d1d9] outline-none focus:border-[#388bfd] scheme-dark"
                                            value={addedAfter}
                                            onChange={(e) => setAddedAfter(e.target.value)}
                                        />
                                    </div>
                                    <div className="text-xs text-[#8b949e] pb-2 text-right">
                                        <div>
                                            {collectionQuery.isLoading ? 'Loading...' : 
                                            collectionQuery.isError ? <span className="text-[#f85149]">Error loading collection</span> :
                                            `${collectionQuery.data?.pagination.items ?? 0} total releases`}
                                        </div>
                                        {formatFilter !== 'all' && (
                                            <div className="text-[#388bfd] font-semibold mt-1">
                                                Showing {filteredItems.length} on this page
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    {!plexConnection ? (
                                        <div className="text-[#e5a00d] text-sm">
                                            Plex not connected. Please connect in the main menu (Plex Import) first.
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex gap-4 items-end">
                                                <div className="flex-1">
                                                    <label className="block text-xs font-semibold text-[#8b949e] uppercase mb-1">
                                                        Compare against Plex Playlist
                                                    </label>
                                                    <select
                                                        className="w-full bg-[#161b22] border border-[#30363d] rounded px-3 py-2 text-[#c9d1d9] outline-none focus:border-[#388bfd]"
                                                        value={selectedPlexPlaylist}
                                                        onChange={(e) => {
                                                            setSelectedPlexPlaylist(e.target.value);
                                                            void runComparison(e.target.value);
                                                        }}
                                                    >
                                                        <option value="">Select Plex Playlist...</option>
                                                        {plexPlaylists.map(p => (
                                                            <option key={p.ratingKey} value={p.ratingKey}>{p.title}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                            {isComparing ? (
                                                <div className="text-sm text-[#58a6ff] animate-pulse">
                                                    {comparisonProgress}
                                                </div>
                                            ) : selectedPlexPlaylist && (
                                                <div className="flex flex-col gap-1">
                                                    <div className="text-sm text-[#8b949e]">
                                                        Found <span className="text-[#c9d1d9] font-bold">{missingReleases.length}</span> releases missing from Plex.
                                                    </div>
                                                    {formatFilter !== 'all' && (
                                                        <div className="text-sm text-[#388bfd]">
                                                            <span className="font-bold">{filteredItems.length}</span> matching format filter.
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                            
                            {/* Format Filter */}
                            <div className="flex flex-col gap-3 border-t border-[#30363d] pt-4 mt-2">
                                {/* Release Type */}
                                <div className="flex justify-between items-center">
                                    <div className="flex gap-4">
                                        <span className="text-xs font-semibold text-[#8b949e] uppercase py-1 w-16">Format:</span>
                                        <label className={`cursor-pointer text-sm ${formatFilter === 'all' ? 'text-[#388bfd]' : 'text-[#8b949e]'}`}>
                                            <input type="radio" name="formatFilter" className="hidden" checked={formatFilter === 'all'} onChange={() => setFormatFilter('all')} />
                                            All
                                        </label>
                                        <label className={`cursor-pointer text-sm ${formatFilter === 'albums' ? 'text-[#388bfd]' : 'text-[#8b949e]'}`}>
                                            <input type="radio" name="formatFilter" className="hidden" checked={formatFilter === 'albums'} onChange={() => setFormatFilter('albums')} />
                                            Only Albums
                                        </label>
                                        <label className={`cursor-pointer text-sm ${formatFilter === 'no_albums' ? 'text-[#388bfd]' : 'text-[#8b949e]'}`}>
                                            <input type="radio" name="formatFilter" className="hidden" checked={formatFilter === 'no_albums'} onChange={() => setFormatFilter('no_albums')} />
                                            Exclude Albums
                                        </label>
                                    </div>
                                </div>
                                
                                {/* Media Type */}
                                <div className="flex justify-between items-center">
                                    <div className="flex gap-4">
                                        <span className="text-xs font-semibold text-[#8b949e] uppercase py-1 w-16">Media:</span>
                                        <label className={`cursor-pointer text-sm ${mediaFilter === 'all' ? 'text-[#388bfd]' : 'text-[#8b949e]'}`}>
                                            <input type="radio" name="mediaFilter" className="hidden" checked={mediaFilter === 'all'} onChange={() => setMediaFilter('all')} />
                                            All
                                        </label>
                                        <label className={`cursor-pointer text-sm ${mediaFilter === 'vinyl' ? 'text-[#388bfd]' : 'text-[#8b949e]'}`}>
                                            <input type="radio" name="mediaFilter" className="hidden" checked={mediaFilter === 'vinyl'} onChange={() => setMediaFilter('vinyl')} />
                                            Vinyl
                                        </label>
                                        <label className={`cursor-pointer text-sm ${mediaFilter === 'cd' ? 'text-[#388bfd]' : 'text-[#8b949e]'}`}>
                                            <input type="radio" name="mediaFilter" className="hidden" checked={mediaFilter === 'cd'} onChange={() => setMediaFilter('cd')} />
                                            CD
                                        </label>
                                        <label className={`cursor-pointer text-sm ${mediaFilter === 'digital' ? 'text-[#388bfd]' : 'text-[#8b949e]'}`}>
                                            <input type="radio" name="mediaFilter" className="hidden" checked={mediaFilter === 'digital'} onChange={() => setMediaFilter('digital')} />
                                            Digital
                                        </label>
                                    </div>
                                </div>
                            </div>
                            </div>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto min-h-[200px] border border-[#30363d] rounded-lg mb-6 bg-[#0d1117]">
                            {(filterMode === 'added_after' ? collectionQuery.isLoading : isComparing) ? (
                                 <div className="flex items-center justify-center h-full text-[#8b949e]">
                                     {isComparing ? 'Comparing...' : 'Loading collection...'}
                                 </div>
                            ) : filteredItems.length === 0 ? (
                                 <div className="flex items-center justify-center h-full text-[#8b949e]">No items found matching filters.</div>
                            ) : (
                                <table className="w-full text-left text-sm">
                                    <thead className="sticky top-0 bg-[#161b22] text-[#8b949e] font-semibold uppercase text-xs z-10">
                                        <tr>
                                            <th className="py-2 px-4 border-b border-[#30363d] w-10">
                                                <input 
                                                    type="checkbox" 
                                                    className="rounded border-[#30363d] bg-[#0d1117] checked:bg-[#1f6feb] focus:ring-0 focus:ring-offset-0"
                                                    onChange={toggleAllPage}
                                                    checked={filteredItems.length > 0 && filteredItems.every((item: DiscogsItem) => selectedItems.has(item.id))}
                                                />
                                            </th>
                                            <th className="py-2 px-4 border-b border-[#30363d]">Title</th>
                                            <th className="py-2 px-4 border-b border-[#30363d]">Artist</th>
                                            <th className="py-2 px-4 border-b border-[#30363d] text-right">Added</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                        {filteredItems.map((item: DiscogsItem) => (
                                            <tr 
                                                key={item.id} 
                                                className={`border-b border-[#21262d] hover:bg-[#1c2128] cursor-pointer ${selectedItems.has(item.id) ? 'bg-[#1f6feb]/10' : ''}`}
                                                onClick={() => toggleItem(item)}
                                            >
                                                <td className="py-2 px-4 text-[#c9d1d9]">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={selectedItems.has(item.id)}
                                                        readOnly
                                                        className="rounded border-[#30363d] bg-[#0d1117] checked:bg-[#1f6feb]"
                                                    />
                                                </td>
                                                <td className="py-2 px-4 text-[#c9d1d9]">
                                                    {item.track}
                                                    {/* Show Format Badge */}
                                                    {item.formats?.[0]?.descriptions?.includes('Album') && (
                                                        <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-[#388bfd]/20 text-[#388bfd] rounded border border-[#388bfd]/30">Album</span>
                                                    )}
                                                </td>
                                                <td className="py-2 px-4 text-[#c9d1d9] opacity-80">{item.artist}</td>
                                                <td className="py-2 px-4 text-[#8b949e] text-right font-mono text-xs">
                                                    {new Date(item.added_at).toLocaleDateString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        <div className="flex justify-between items-center">
                            {filterMode === 'added_after' ? (
                                <div className="flex gap-2">
                                    <button 
                                        disabled={page <= 1}
                                        onClick={() => setPage(p => p - 1)}
                                        className="bg-[#21262d] hover:bg-[#30363d] disabled:opacity-50 px-3 py-1.5 rounded text-sm text-[#c9d1d9] border border-[#30363d]"
                                    >
                                        &larr; Prev
                                    </button>
                                    <span className="flex items-center text-sm text-[#8b949e] px-2">Page {page}</span>
                                    <button 
                                        disabled={page >= (collectionQuery.data?.pagination.pages ?? 1)}
                                        onClick={() => setPage(p => p + 1)}
                                        className="bg-[#21262d] hover:bg-[#30363d] disabled:opacity-50 px-3 py-1.5 rounded text-sm text-[#c9d1d9] border border-[#30363d]"
                                    >
                                        Next &rarr;
                                    </button>
                                </div>
                            ) : (
                                <div /> /* Spacer */
                            )}

                            <div className="flex gap-3">
                                 <button 
                                    onClick={onClose}
                                    className="px-4 py-2 rounded-lg text-[#8b949e] hover:text-[#c9d1d9] transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleImportAll}
                                    disabled={!collectionQuery.data}
                                    className="bg-[#e5a00d] hover:bg-[#d4940c] text-black font-bold py-2 px-6 rounded-lg transition-colors border border-transparent shadow-md"
                                >
                                    Import All (Deep Scan)
                                </button>
                                <button 
                                    onClick={handleImport}
                                    disabled={selectedItems.size === 0}
                                    className="bg-[#238636] hover:bg-[#2eaa42] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 px-6 rounded-lg transition-colors border border-transparent shadow-md"
                                >
                                    Import {selectedItems.size} Selected
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

// Matching Helpers
function normalizeString(str: string): string {
  if (!str) return '';
  let s = str.toLowerCase();
  
  // Strip accents
  s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  // Replace & with and
  s = s.replace(/&/g, 'and');
  
  // Remove common feature markers
  s = s.replace(/\b(feat|ft|featuring)\b/g, '');
  
  // Normalize "Various Artists" to "Various"
  s = s.replace(/\bvarious artists\b/g, 'various');

  // Remove content in brackets repeatedly to handle nesting
  // e.g. "Title (Subtitle (Remix))"
  let prev;
  do {
      prev = s;
      s = s.replace(/\s*\([^)]*\)/g, '').replace(/\s*\[[^\]]*\]/g, '');
  } while (s !== prev);

  return s
    .replace(/\b(the|a|an)\b/g, '') // Remove articles
    .replace(/[^\w\s]/g, '') // Remove remaining punctuation
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0]![j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i]![j] = matrix[i - 1]![j - 1]!;
      } else {
        matrix[i]![j] = Math.min(
          matrix[i - 1]![j - 1]! + 1,
          matrix[i]![j - 1]! + 1, 
          matrix[i - 1]![j]! + 1
        );
      }
    }
  }
  return matrix[b.length]![a.length]!;
}

function similarity(a: string, b: string): number {
  if (a === b) return 100;
  if (a.length === 0 || b.length === 0) return 0;
  const distance = levenshteinDistance(a, b);
  const maxLength = Math.max(a.length, b.length);
  return Math.round((1 - distance / maxLength) * 100);
}

function matchesFormatFilter(item: DiscogsItem, filter: 'all' | 'albums' | 'no_albums'): boolean {
    if (filter === 'all') return true;
    
    // Check if any format description is "Album" or "LP"
    // Also "Mini-Album" might be considered Album? sticking to strict Album/LP for now.
    const isAlbum = item.formats?.some(f => 
        f.descriptions?.some(d => d === 'Album' || d === 'LP')
    );
    
    if (filter === 'albums') return !!isAlbum;
    if (filter === 'no_albums') return !isAlbum;
    return true;
}

function matchesMediaFilter(item: DiscogsItem, filter: 'all' | 'vinyl' | 'cd' | 'digital'): boolean {
    if (filter === 'all') return true;
    
    return item.formats?.some(f => {
        const name = f.name.toLowerCase();
        const descs = f.descriptions?.map(d => d.toLowerCase()) ?? [];
        
        if (filter === 'vinyl') {
            return name.includes('vinyl') || name === 'lathe cut' || name === 'shellac' || descs.includes('lp') || descs.includes('7"') || descs.includes('10"') || descs.includes('12"');
        }
        if (filter === 'cd') {
            return name.includes('cd') || name === 'hybrid' || name === 'dualdisc';
        }
        if (filter === 'digital') {
            return name.includes('file') || name.includes('memory stick') || name.includes('dat') || name === 'minidisc';
        }
        return false;
    }) ?? false;
}

