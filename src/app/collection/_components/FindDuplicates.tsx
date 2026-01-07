'use client';

import { useState, useMemo, useCallback } from 'react';
import { api } from '~/trpc/react';

interface FindDuplicatesProps {
  onClose: () => void;
}

type DuplicateGroup = {
  key: string; // artist + title
  displayTitle: string; // For display (preserves original case)
  tracks: {
    trackKey: string;
    title: string;
    artist: string;
    album: string;
    filepath: string;
    bitrate: string;
    filesize: string;
    playcount: number;
    cuePoints: number;
  }[];
};

export default function FindDuplicates({ onClose }: FindDuplicatesProps) {
  const tracksQuery = api.collection.allTracks.useQuery();
  const mergeMutation = api.collection.mergeDuplicates.useMutation();
  const utils = api.useUtils();
  
  const [minGroupSize, setMinGroupSize] = useState(2);
  const [matchBy, setMatchBy] = useState<'artist-title' | 'title-only'>('artist-title');
  const [selectedMasters, setSelectedMasters] = useState<Record<string, string>>({}); // groupKey -> masterTrackKey
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());

  const duplicateGroups = useMemo(() => {
    if (!tracksQuery.data) return [];

    const groups = new Map<string, { displayTitle: string; tracks: DuplicateGroup['tracks'] }>();

    for (const track of tracksQuery.data) {
      const artist = (track.artist ?? '').trim();
      const title = (track.title ?? '').trim();
      
      // Skip tracks with no meaningful identifying info
      if (!title && !artist) continue;
      
      const key = matchBy === 'artist-title'
        ? `${artist.toLowerCase()} - ${title.toLowerCase()}`
        : title.toLowerCase();
      
      const displayTitle = matchBy === 'artist-title'
        ? `${artist || '(Unknown Artist)'} - ${title || '(Unknown Title)'}`
        : title || '(Unknown Title)';

      if (!key || key.trim() === '-' || key.trim() === '') continue;

      const existing = groups.get(key);
      const trackData = {
        trackKey: track.trackKey,
        title: title,
        artist: artist,
        album: track.album ?? '',
        filepath: track.filepath ?? '',
        bitrate: track.bitrate ?? '',
        filesize: track.filesize ?? '',
        playcount: track.playcount ? parseInt(track.playcount) : 0,
        cuePoints: track.cuePoints ?? 0,
      };

      if (existing) {
        existing.tracks.push(trackData);
      } else {
        groups.set(key, { displayTitle, tracks: [trackData] });
      }
    }

    // Filter to groups with duplicates
    const duplicates: DuplicateGroup[] = [];
    groups.forEach((data, key) => {
      if (data.tracks.length >= minGroupSize) {
        duplicates.push({ key, displayTitle: data.displayTitle, tracks: data.tracks });
      }
    });

    // Sort by group size descending
    duplicates.sort((a, b) => b.tracks.length - a.tracks.length);

    return duplicates;
  }, [tracksQuery.data, minGroupSize, matchBy]);

  const totalDuplicates = useMemo(() => {
    return duplicateGroups.reduce((sum, g) => sum + g.tracks.length - 1, 0);
  }, [duplicateGroups]);

  const formatFilesize = useCallback((size: string) => {
    const kb = parseInt(size, 10);
    if (isNaN(kb) || kb === 0) return '';
    if (kb >= 1024) return `${(kb / 1024).toFixed(1)} MB`;
    return `${kb} KB`;
  }, []);

  const formatBitrate = useCallback((bitrate: string) => {
    const bps = parseInt(bitrate, 10);
    if (isNaN(bps) || bps === 0) return '';
    return `${Math.round(bps / 1000)} kbps`;
  }, []);

  const handleMasterSelect = (groupKey: string, trackKey: string) => {
    setSelectedMasters(prev => ({ ...prev, [groupKey]: trackKey }));
    
    // Auto-select the group when a master is chosen, if not already selected
    setSelectedGroups(prev => {
      if (!prev.has(groupKey)) {
        const next = new Set(prev);
        next.add(groupKey);
        return next;
      }
      return prev;
    });
  };

  const toggleGroupSelect = (groupKey: string) => {
    setSelectedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  };

  const handleMerge = async () => {
    if (selectedGroups.size === 0) return;

    const ops = Array.from(selectedGroups).map(groupKey => {
      const masterKey = selectedMasters[groupKey];
      if (!masterKey) return null;

      const group = duplicateGroups.find(g => g.key === groupKey);
      if (!group) return null;

      const redundantKeys = group.tracks
        .map(t => t.trackKey)
        .filter(k => k !== masterKey);

      return { masterKey, redundantKeys };
    }).filter((op): op is { masterKey: string; redundantKeys: string[] } => op !== null);

    if (ops.length === 0) return;

    if (confirm(`Merge ${ops.length} groups? This will update playlists and move redundant tracks to 'DUPLICATED_TO_DELETE'.`)) {
      try {
        await mergeMutation.mutateAsync({ ops });
        await utils.collection.allTracks.invalidate();
        onClose();
        alert('Merge complete!');
      } catch (error) {
        console.error('Merge failed:', error);
        alert('Merge failed. Check console for details.');
      }
    }
  };

  if (tracksQuery.isLoading) {
    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <div className="modal-header">
            <h2>Find Duplicates</h2>
            <button className="close-button" onClick={onClose}>×</button>
          </div>
          <div className="modal-body">
            <p>Loading tracks...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content find-duplicates-modal">
        <div className="modal-header">
          <h2>Find Duplicates</h2>
          <div className="header-actions">
            <button 
              className="merge-button" 
              disabled={selectedGroups.size === 0 || mergeMutation.isPending}
              onClick={handleMerge}
            >
              Merge Selected ({selectedGroups.size})
            </button>
            <button className="close-button" onClick={onClose}>×</button>
          </div>
        </div>

        <div className="modal-body">
          <div className="duplicates-controls">
            <div className="control-group">
              <label>Match by:</label>
              <select 
                value={matchBy} 
                onChange={(e) => setMatchBy(e.target.value as typeof matchBy)}
              >
                <option value="artist-title">Artist + Title</option>
                <option value="title-only">Title only</option>
              </select>
            </div>
            <div className="control-group">
              <label>Min group size:</label>
              <select 
                value={minGroupSize} 
                onChange={(e) => setMinGroupSize(parseInt(e.target.value))}
              >
                <option value="2">2+</option>
                <option value="3">3+</option>
                <option value="4">4+</option>
                <option value="5">5+</option>
              </select>
            </div>
            <div className="duplicates-summary">
              <strong>{duplicateGroups.length}</strong> groups with <strong>{totalDuplicates}</strong> potential duplicates
            </div>
          </div>

          <div className="duplicates-list">
            {duplicateGroups.length === 0 ? (
              <p className="no-duplicates">No duplicates found with current settings.</p>
            ) : (
              duplicateGroups.slice(0, 100).map((group, index) => {
                const groupKey = group.key;
                const hasMaster = !!selectedMasters[groupKey];
                const isSelected = selectedGroups.has(groupKey);

                return (
                  <div key={`${groupKey}-${index}`} className={`duplicate-group ${isSelected ? 'selected' : ''}`}>
                    <div className="group-header">
                      <div className="group-header-left">
                        <input 
                          type="checkbox"
                          checked={isSelected}
                          disabled={!hasMaster}
                          onChange={() => toggleGroupSelect(groupKey)}
                          title={!hasMaster ? "Select a master track first" : "Select group for merge"}
                        />
                        <span className="group-title">{group.displayTitle}</span>
                      </div>
                      <span className="group-count">{group.tracks.length} copies</span>
                    </div>
                    <div className="group-tracks">
                      {group.tracks.map((track, trackIndex) => {
                        const isMaster = selectedMasters[groupKey] === track.trackKey;
                        return (
                          <div key={`${track.trackKey}-${trackIndex}`} className={`duplicate-track ${isMaster ? 'is-master' : ''}`}>
                            <div className="track-select">
                              <input 
                                type="radio" 
                                name={`master-${groupKey}-${index}`}
                                checked={isMaster}
                                onChange={() => handleMasterSelect(groupKey, track.trackKey)}
                                title="Set as master track"
                              />
                            </div>
                            <div className="track-info">
                              <span className="track-album">{track.album || '(No album)'}</span>
                              <span className="track-meta">
                                {formatBitrate(track.bitrate)}
                                {formatBitrate(track.bitrate) && formatFilesize(track.filesize) ? ' • ' : ''}
                                {formatFilesize(track.filesize)}
                                {(track.playcount > 0 || track.cuePoints > 0) && (
                                  <>
                                    <span className="meta-separator">•</span>
                                    <span className="track-plays-cues">
                                      {track.playcount > 0 && `${track.playcount} plays`}
                                      {track.playcount > 0 && track.cuePoints > 0 && ', '}
                                      {track.cuePoints > 0 && `${track.cuePoints} cues`}
                                    </span>
                                  </>
                                )}
                              </span>
                            </div>
                            <div className="track-path" title={track.filepath}>
                              {track.filepath ? track.filepath.split('/').slice(-2).join('/') : '(No path)'}
                            </div>
                            {isMaster && <div className="master-badge">MASTER</div>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
            {duplicateGroups.length > 100 && (
              <p className="more-results">
                Showing first 100 of {duplicateGroups.length} groups. Adjust filters to narrow results.
              </p>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="cancel-button" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
