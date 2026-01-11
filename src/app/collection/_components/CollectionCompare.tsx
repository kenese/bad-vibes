'use client';

import { useState, useMemo } from 'react';
import { api } from '~/trpc/react';
import type { PlexPlaylist, PlexTrack } from './PlexConnect';
import { 
  compareTracks, 
  type NormalizedTrack, 
  type ComparisonResult 
} from '~/server/services/matchingService';

interface CollectionCompareProps {
  plexPlaylist: PlexPlaylist | null;
  plexTracks: PlexTrack[];
  onClose: () => void;
}

type ViewFilter = 'all' | 'matched' | 'missing-from-target' | 'missing-from-source';

// Convert Plex rating (0-10) to Traktor rating (0-255)
// Traktor uses star levels: 0, 51, 102, 153, 204, 255 (0-5 stars)
function plexToTraktorRating(plexRating: number): string {
  if (plexRating <= 0) return '0';
  if (plexRating <= 2) return '51';   // 1 star
  if (plexRating <= 4) return '102';  // 2 stars
  if (plexRating <= 6) return '153';  // 3 stars
  if (plexRating <= 8) return '204';  // 4 stars
  return '255';                        // 5 stars
}

export default function CollectionCompare({
  plexPlaylist,
  plexTracks,
  onClose,
}: CollectionCompareProps) {
  const utils = api.useUtils();
  const [selectedTraktorPlaylist, setSelectedTraktorPlaylist] = useState<string>('');
  const [viewFilter, setViewFilter] = useState<ViewFilter>('all');
  const [matchThreshold, setMatchThreshold] = useState(70);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  
  // Get Traktor sidebar to list playlists
  const sidebarQuery = api.collection.sidebar.useQuery();
  
  // Get Traktor playlist tracks when selected
  const traktorTracksQuery = api.collection.playlistTracks.useQuery(
    { path: selectedTraktorPlaylist },
    { enabled: !!selectedTraktorPlaylist }
  );

  // Mutations
  const createPlaylistMutation = api.collection.createPlaylistWithTracks.useMutation({
    onSuccess: () => {
      void utils.collection.sidebar.invalidate();
    },
  });
  
  const updateBatchMutation = api.collection.updateTracksBatch.useMutation({
    onSuccess: () => {
      void utils.collection.allTracks.invalidate();
      void utils.collection.playlistTracks.invalidate();
    },
  });

  // Save to standalone playlists (at /playlists route)
  const saveStandalonePlaylistMutation = api.playlistTools.savePlaylist.useMutation({
    onSuccess: () => {
      void utils.playlistTools.getPlaylists.invalidate();
    },
  });

  // Flatten playlists from sidebar tree
  const traktorPlaylists = useMemo(() => {
    if (!sidebarQuery.data?.tree) return [];
    
    const playlists: { path: string; name: string; depth: number }[] = [];
    
    const walk = (node: typeof sidebarQuery.data.tree, depth = 0) => {
      if (!node) return;
      if (node.type === 'PLAYLIST') {
        playlists.push({ 
          path: node.path, 
          name: node.name,
          depth 
        });
      }
      if (node.children) {
        for (const child of node.children) {
          walk(child, depth + 1);
        }
      }
    };
    
    walk(sidebarQuery.data.tree);
    return playlists;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sidebarQuery.data?.tree]);

  // Convert Plex tracks to normalized format (with rating info)
  const normalizedPlexTracks: (NormalizedTrack & { userRating?: number })[] = useMemo(() => {
    return plexTracks.map(t => ({
      id: t.ratingKey,
      artist: t.artist,
      title: t.title,
      album: t.album,
      originalArtist: t.artist,
      originalTitle: t.title,
      userRating: t.userRating,
    }));
  }, [plexTracks]);

  // Convert Traktor tracks to normalized format
  const normalizedTraktorTracks: NormalizedTrack[] = useMemo(() => {
    if (!traktorTracksQuery.data?.tracks) return [];
    
    return traktorTracksQuery.data.tracks.map(t => ({
      id: t.key,
      artist: t.artist ?? '',
      title: t.title,
      album: t.album ?? '',
      originalArtist: t.artist ?? '',
      originalTitle: t.title,
    }));
  }, [traktorTracksQuery.data]);

  // Run comparison
  const comparison: ComparisonResult | null = useMemo(() => {
    if (normalizedPlexTracks.length === 0 || normalizedTraktorTracks.length === 0) {
      return null;
    }
    
    return compareTracks(normalizedPlexTracks, normalizedTraktorTracks, matchThreshold);
  }, [normalizedPlexTracks, normalizedTraktorTracks, matchThreshold]);

  // Get matched tracks with ratings for sync
  const matchedWithRatings = useMemo(() => {
    if (!comparison) return [];
    
    return comparison.matched
      .filter(m => {
        const plexTrack = plexTracks.find(pt => pt.ratingKey === m.sourceTrack.id);
        return plexTrack?.userRating && plexTrack.userRating > 0;
      })
      .map(m => ({
        sourceTrack: m.sourceTrack,
        targetTrack: m.targetTrack!,
        plexRating: plexTracks.find(pt => pt.ratingKey === m.sourceTrack.id)?.userRating ?? 0,
      }));
  }, [comparison, plexTracks]);

  // Filter results based on view
  const filteredResults = useMemo(() => {
    if (!comparison) return { items: [], type: 'none' as const };
    
    switch (viewFilter) {
      case 'matched':
        return { 
          items: comparison.matched.map(m => ({
            source: m.sourceTrack,
            target: m.targetTrack,
            confidence: m.confidence,
          })), 
          type: 'matched' as const 
        };
      case 'missing-from-target':
        return { 
          items: comparison.missingFromTarget.map(t => ({
            source: t,
            target: null,
            confidence: 0,
          })), 
          type: 'missing' as const 
        };
      case 'missing-from-source':
        return { 
          items: comparison.missingFromSource.map(t => ({
            source: null,
            target: t,
            confidence: 0,
          })), 
          type: 'missing' as const 
        };
      default:
        return {
          items: [
            ...comparison.matched.map(m => ({
              source: m.sourceTrack,
              target: m.targetTrack,
              confidence: m.confidence,
            })),
            ...comparison.missingFromTarget.map(t => ({
              source: t,
              target: null,
              confidence: 0,
            })),
          ],
          type: 'all' as const,
        };
    }
  }, [comparison, viewFilter]);

  // Create playlist for tracks only in Traktor (missing from Plex)
  const handleCreateOnlyInTraktorPlaylist = () => {
    if (!comparison || comparison.missingFromSource.length === 0) return;
    
    const trackKeys = comparison.missingFromSource.map(t => t.id);
    const name = `Only in Traktor (${plexPlaylist?.title ?? 'Plex'})`;
    
    createPlaylistMutation.mutate(
      { folderPath: 'root', name, trackKeys },
      {
        onSuccess: () => setActionMessage(`Created playlist "${name}" with ${trackKeys.length} tracks`),
        onError: (err) => setActionMessage(`Error: ${err.message}`),
      }
    );
  };

  // Save "Missing in Traktor" tracks to /playlists as a standalone playlist
  const handleSaveMissingInTraktor = () => {
    if (!comparison || comparison.missingFromTarget.length === 0) return;
    
    const items = comparison.missingFromTarget.map(t => ({
      track: t.originalTitle,
      artist: t.originalArtist,
    }));
    const name = `Missing in Traktor (${plexPlaylist?.title ?? 'Plex'})`;
    
    saveStandalonePlaylistMutation.mutate(
      { name, items },
      {
        onSuccess: () => setActionMessage(`✓ Saved "${name}" to Playlists (${items.length} tracks)`),
        onError: (err) => setActionMessage(`Error: ${err.message}`),
      }
    );
  };

  // Sync ratings from Plex to Traktor
  const handleSyncRatings = () => {
    if (matchedWithRatings.length === 0) return;
    
    const updates = matchedWithRatings.map(m => ({
      key: m.targetTrack.id,
      updates: {
        rating: plexToTraktorRating(m.plexRating),
      },
    }));
    
    // Batch updates to avoid UI freeze - process in chunks
    const batchSize = 20;
    let processed = 0;
    
    const processBatch = async (batch: typeof updates) => {
      return new Promise<void>((resolve, reject) => {
        updateBatchMutation.mutate(
          { updates: batch },
          {
            onSuccess: () => {
              processed += batch.length;
              setActionMessage(`Syncing ratings... ${processed}/${updates.length}`);
              resolve();
            },
            onError: (err) => {
              const errorMessage = err instanceof Error ? err.message : 'Unknown error';
              reject(new Error(errorMessage));
            },
          }
        );
      });
    };
    
    const runSync = async () => {
      setActionMessage(`Syncing ratings... 0/${updates.length}`);
      
      try {
        for (let i = 0; i < updates.length; i += batchSize) {
          const batch = updates.slice(i, i + batchSize);
          await processBatch(batch);
          // Small delay between batches to prevent UI freeze
          await new Promise(r => setTimeout(r, 50));
        }
        setActionMessage(`✓ Updated ratings for ${updates.length} tracks`);
      } catch (err) {
        setActionMessage(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    };
    
    void runSync();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content collection-compare-modal" 
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>Compare Collections</h2>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          {/* Source/Target Selection */}
          <div className="compare-selectors">
            <div className="compare-column">
              <h3>Plex Playlist</h3>
              <div className="selected-playlist">
                {plexPlaylist ? (
                  <span>{plexPlaylist.title} ({plexTracks.length} tracks)</span>
                ) : (
                  <span className="no-selection">No playlist selected</span>
                )}
              </div>
            </div>

            <div className="compare-arrow">→</div>

            <div className="compare-column">
              <h3>Traktor Playlist</h3>
              <select
                value={selectedTraktorPlaylist}
                onChange={e => setSelectedTraktorPlaylist(e.target.value)}
                className="traktor-playlist-select"
              >
                <option value="">Select a playlist...</option>
                {traktorPlaylists.map(p => (
                  <option key={p.path} value={p.path}>
                    {'  '.repeat(p.depth)}{p.name}
                  </option>
                ))}
              </select>
              {traktorTracksQuery.isLoading && (
                <span className="loading-text">Loading tracks...</span>
              )}
              {traktorTracksQuery.data && (
                <span className="track-count">
                  {traktorTracksQuery.data.tracks.length} tracks
                </span>
              )}
            </div>
          </div>

          {/* Match Settings */}
          <div className="match-settings">
            <label>
              Match Threshold: {matchThreshold}%
              <input
                type="range"
                min="50"
                max="100"
                value={matchThreshold}
                onChange={e => setMatchThreshold(Number(e.target.value))}
              />
            </label>
          </div>

          {/* Stats Summary */}
          {comparison && (
            <div className="comparison-stats">
              <div className="stat">
                <span className="stat-value">{comparison.stats.matchedCount}</span>
                <span className="stat-label">Matched</span>
              </div>
              <div className="stat missing">
                <span className="stat-value">{comparison.stats.missingFromTargetCount}</span>
                <span className="stat-label">Missing from Traktor</span>
              </div>
              <div className="stat info">
                <span className="stat-value">{comparison.stats.missingFromSourceCount}</span>
                <span className="stat-label">Only in Traktor</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {comparison && (
            <div className="compare-actions">
              <button
                className="action-button save-missing"
                onClick={handleSaveMissingInTraktor}
                disabled={comparison.missingFromTarget.length === 0 || saveStandalonePlaylistMutation.isPending}
              >
                {saveStandalonePlaylistMutation.isPending ? 'Saving...' : 
                  `Save "Missing in Traktor" to Playlists (${comparison.missingFromTarget.length})`}
              </button>

              <button
                className="action-button create-playlist"
                onClick={handleCreateOnlyInTraktorPlaylist}
                disabled={comparison.missingFromSource.length === 0 || createPlaylistMutation.isPending}
              >
                {createPlaylistMutation.isPending ? 'Creating...' : 
                  `Create "Only in Traktor" Playlist (${comparison.missingFromSource.length})`}
              </button>
              
              <button
                className="action-button sync-ratings"
                onClick={handleSyncRatings}
                disabled={matchedWithRatings.length === 0 || updateBatchMutation.isPending}
              >
                {updateBatchMutation.isPending ? 'Syncing...' : 
                  `Sync Ratings to Traktor (${matchedWithRatings.length})`}
              </button>
            </div>
          )}

          {/* Action Message */}
          {actionMessage && (
            <div className="action-message">
              {actionMessage}
            </div>
          )}

          {/* View Filter */}
          <div className="view-filter">
            <button 
              className={viewFilter === 'all' ? 'active' : ''} 
              onClick={() => setViewFilter('all')}
            >
              All
            </button>
            <button 
              className={viewFilter === 'matched' ? 'active' : ''} 
              onClick={() => setViewFilter('matched')}
            >
              Matched
            </button>
            <button 
              className={viewFilter === 'missing-from-target' ? 'active' : ''} 
              onClick={() => setViewFilter('missing-from-target')}
            >
              Missing from Traktor
            </button>
            <button 
              className={viewFilter === 'missing-from-source' ? 'active' : ''} 
              onClick={() => setViewFilter('missing-from-source')}
            >
              Only in Traktor
            </button>
          </div>

          {/* Results Table */}
          {comparison && filteredResults.items.length > 0 && (
            <div className="comparison-results">
              <table className="comparison-table">
                <thead>
                  <tr>
                    <th>Plex Track</th>
                    <th>Traktor Track</th>
                    <th>Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredResults.items.map((item, i) => (
                    <tr key={i} className={!item.target ? 'missing' : item.confidence === 100 ? 'exact' : ''}>
                      <td>
                        {item.source ? (
                          <div className="track-info">
                            <span className="track-title">{item.source.originalTitle}</span>
                            <span className="track-artist">{item.source.originalArtist}</span>
                          </div>
                        ) : (
                          <span className="no-match">—</span>
                        )}
                      </td>
                      <td>
                        {item.target ? (
                          <div className="track-info">
                            <span className="track-title">{item.target.originalTitle}</span>
                            <span className="track-artist">{item.target.originalArtist}</span>
                          </div>
                        ) : (
                          <span className="no-match">Not found</span>
                        )}
                      </td>
                      <td>
                        {item.confidence > 0 ? (
                          <span className={`confidence ${item.confidence === 100 ? 'exact' : item.confidence >= 85 ? 'high' : 'low'}`}>
                            {item.confidence}%
                          </span>
                        ) : (
                          <span className="no-match">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Empty State */}
          {selectedTraktorPlaylist && comparison && filteredResults.items.length === 0 && (
            <div className="empty-results">
              No results for this filter.
            </div>
          )}

          {!selectedTraktorPlaylist && (
            <div className="empty-results">
              Select a Traktor playlist to compare.
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="cancel-button" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
