'use client';

import { useState, useMemo, useCallback } from 'react';
import { api } from '~/trpc/react';

interface ApplyStyleTagsProps {
  onClose: () => void;
}

type Step = 'select-tags' | 'configure-apply';

type SelectedTag = {
  tag: string;
  tagToWrite: string;
  playlists: { path: string; name: string }[];
  selectedPlaylists: Set<string>;
  status: 'pending' | 'applying' | 'done' | 'error';
  result?: string;
};

type TagCounts = {
  wouldUpdate: number;
  alreadyHaveInSelection: number;
  totalInCollection: number;
};

// Hook to fetch counts for a specific tag configuration
function useTagCounts(tag: string, selectedPaths: string[], enabled: boolean): TagCounts | null {
  const { data } = api.collection.tagCountPreview.useQuery(
    { playlistPaths: selectedPaths, tag },
    { enabled: enabled && selectedPaths.length > 0 }
  );
  return data ?? null;
}

// Separate component for each tag row to manage its own count fetching
function TagConfigRow({
  tag,
  isExpanded,
  onToggleExpand,
  onUpdateTagToWrite,
  onTogglePlaylist,
  onSelectAllPlaylists,
  onDeselectAllPlaylists,
  onApply,
  isApplying,
}: {
  tag: SelectedTag;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onUpdateTagToWrite: (value: string) => void;
  onTogglePlaylist: (path: string) => void;
  onSelectAllPlaylists: () => void;
  onDeselectAllPlaylists: () => void;
  onApply: () => void;
  isApplying: boolean;
}) {
  const selectedPaths = useMemo(() => Array.from(tag.selectedPlaylists), [tag.selectedPlaylists]);
  const counts = useTagCounts(tag.tagToWrite, selectedPaths, tag.status === 'pending');
  
  const displayCount = isExpanded ? tag.playlists.length : 3;
  const hasMore = tag.playlists.length > 3;
  const selectedCount = tag.selectedPlaylists.size;

  return (
    <tr className={`tag-row status-${tag.status}`}>
      <td className="tag-original">{tag.tag}</td>
      <td className="tag-to-write">
        <input
          type="text"
          value={tag.tagToWrite}
          onChange={(e) => onUpdateTagToWrite(e.target.value)}
          disabled={tag.status !== 'pending'}
        />
      </td>
      <td className="tag-playlists">
        <div className="playlist-names">
          {tag.playlists.slice(0, displayCount).map(p => (
            <label key={p.path} className="playlist-checkbox-item">
              <input
                type="checkbox"
                checked={tag.selectedPlaylists.has(p.path)}
                onChange={() => onTogglePlaylist(p.path)}
                disabled={tag.status !== 'pending'}
              />
              <span className="playlist-name" title={p.name}>
                {p.name}
              </span>
            </label>
          ))}
          {hasMore && (
            <button 
              className="expand-playlists-btn"
              onClick={onToggleExpand}
            >
              {isExpanded 
                ? '▲ Show less' 
                : `+${tag.playlists.length - 3} more`
              }
            </button>
          )}
          {isExpanded && tag.status === 'pending' && (
            <div className="playlist-select-actions">
              <button 
                className="playlist-select-btn"
                onClick={onSelectAllPlaylists}
              >
                Select All
              </button>
              <button 
                className="playlist-select-btn"
                onClick={onDeselectAllPlaylists}
              >
                Deselect All
              </button>
            </div>
          )}
        </div>
        <span className="selected-playlists-count">
          {selectedCount}/{tag.playlists.length} playlists selected
        </span>
      </td>
      <td className="tag-counts">
        {counts && tag.status === 'pending' ? (
          <div className="counts-display">
            <span className="count-item count-would-update" title="Tracks that would be updated">
              +{counts.wouldUpdate} new
            </span>
            <span className="count-item count-already" title="Tracks in selection already have tag">
              {counts.alreadyHaveInSelection} have
            </span>
            <span className="count-item count-total" title="Total tracks in collection with this tag">
              {counts.totalInCollection} total
            </span>
          </div>
        ) : tag.status === 'pending' ? (
          <span className="counts-loading">...</span>
        ) : null}
      </td>
      <td className="tag-action">
        {tag.status === 'pending' && (
          <button 
            className="apply-btn"
            onClick={onApply}
            disabled={selectedCount === 0 || isApplying}
          >
            Apply
          </button>
        )}
        {tag.status === 'applying' && (
          <span className="applying">Applying...</span>
        )}
        {tag.status === 'done' && (
          <span className="done">{tag.result}</span>
        )}
        {tag.status === 'error' && (
          <span className="error">{tag.result}</span>
        )}
      </td>
    </tr>
  );
}

export default function ApplyStyleTags({ onClose }: ApplyStyleTagsProps) {
  const utils = api.useUtils();
  const tagsQuery = api.collection.playlistTags.useQuery();
  const writeTagMutation = api.collection.writeStyleTag.useMutation({
    onSuccess: () => {
      void utils.collection.allTracks.invalidate();
    },
  });

  const [step, setStep] = useState<Step>('select-tags');
  const [selectedTagWords, setSelectedTagWords] = useState<Set<string>>(new Set());
  const [configuredTags, setConfiguredTags] = useState<SelectedTag[]>([]);
  const [expandedPlaylists, setExpandedPlaylists] = useState<Set<string>>(new Set());

  const availableTags = useMemo(() => {
    if (!tagsQuery.data) return [];
    return tagsQuery.data.tags;
  }, [tagsQuery.data]);

  const toggleTag = useCallback((tag: string) => {
    setSelectedTagWords(prev => {
      const next = new Set(prev);
      if (next.has(tag)) {
        next.delete(tag);
      } else {
        next.add(tag);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedTagWords(new Set(availableTags.map(t => t.tag)));
  }, [availableTags]);

  const deselectAll = useCallback(() => {
    setSelectedTagWords(new Set());
  }, []);

  const proceedToConfiguration = useCallback(() => {
    const tags: SelectedTag[] = Array.from(selectedTagWords).map(tagWord => {
      const tagData = availableTags.find(t => t.tag === tagWord);
      const playlists = tagData?.playlists ?? [];
      return {
        tag: tagWord,
        tagToWrite: tagWord,
        playlists,
        selectedPlaylists: new Set(playlists.map(p => p.path)),
        status: 'pending' as const,
      };
    });
    setConfiguredTags(tags);
    setExpandedPlaylists(new Set());
    setStep('configure-apply');
  }, [selectedTagWords, availableTags]);

  const updateTagToWrite = useCallback((index: number, value: string) => {
    setConfiguredTags(prev => {
      const next = [...prev];
      const item = next[index];
      if (item) {
        next[index] = { ...item, tagToWrite: value };
      }
      return next;
    });
  }, []);

  const togglePlaylistExpanded = useCallback((tag: string) => {
    setExpandedPlaylists(prev => {
      const next = new Set(prev);
      if (next.has(tag)) {
        next.delete(tag);
      } else {
        next.add(tag);
      }
      return next;
    });
  }, []);

  const togglePlaylistSelected = useCallback((tagIndex: number, playlistPath: string) => {
    setConfiguredTags(prev => {
      const next = [...prev];
      const item = next[tagIndex];
      if (item) {
        const newSelected = new Set(item.selectedPlaylists);
        if (newSelected.has(playlistPath)) {
          newSelected.delete(playlistPath);
        } else {
          newSelected.add(playlistPath);
        }
        next[tagIndex] = { ...item, selectedPlaylists: newSelected };
      }
      return next;
    });
  }, []);

  const selectAllPlaylistsForTag = useCallback((tagIndex: number) => {
    setConfiguredTags(prev => {
      const next = [...prev];
      const item = next[tagIndex];
      if (item) {
        next[tagIndex] = { 
          ...item, 
          selectedPlaylists: new Set(item.playlists.map(p => p.path)) 
        };
      }
      return next;
    });
  }, []);

  const deselectAllPlaylistsForTag = useCallback((tagIndex: number) => {
    setConfiguredTags(prev => {
      const next = [...prev];
      const item = next[tagIndex];
      if (item) {
        next[tagIndex] = { ...item, selectedPlaylists: new Set() };
      }
      return next;
    });
  }, []);

  const applyTag = useCallback(async (index: number) => {
    const tag = configuredTags[index];
    if (!tag || tag.selectedPlaylists.size === 0) return;

    setConfiguredTags(prev => {
      const next = [...prev];
      const item = next[index];
      if (item) {
        next[index] = { ...item, status: 'applying' };
      }
      return next;
    });

    try {
      const result = await writeTagMutation.mutateAsync({
        playlistPaths: Array.from(tag.selectedPlaylists),
        tag: tag.tagToWrite,
      });

      setConfiguredTags(prev => {
        const next = [...prev];
        const item = next[index];
        if (item) {
          next[index] = { 
            ...item, 
            status: 'done',
            result: `Updated ${result.updatedCount} track(s)`
          };
        }
        return next;
      });
    } catch {
      setConfiguredTags(prev => {
        const next = [...prev];
        const item = next[index];
        if (item) {
          next[index] = { ...item, status: 'error', result: 'Failed to apply' };
        }
        return next;
      });
    }
  }, [configuredTags, writeTagMutation]);

  const goBack = useCallback(() => {
    setStep('select-tags');
  }, []);

  if (tagsQuery.isLoading) {
    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <div className="modal-header">
            <h2>Apply Style Tags</h2>
            <button className="close-button" onClick={onClose}>×</button>
          </div>
          <div className="modal-body">
            <p>Analyzing playlist names...</p>
          </div>
        </div>
      </div>
    );
  }

  if (tagsQuery.error) {
    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <div className="modal-header">
            <h2>Apply Style Tags</h2>
            <button className="close-button" onClick={onClose}>×</button>
          </div>
          <div className="modal-body">
            <p className="error">Error: {tagsQuery.error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content apply-style-tags-modal">
        <div className="modal-header">
          <h2>Apply Style Tags {step === 'configure-apply' && '- Configure'}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {step === 'select-tags' && (
            <>
              <p className="step-description">
                Select tags extracted from your playlist names. Tags appearing in 2+ playlists are shown.
              </p>

              <div className="tag-selection-actions">
                <button className="select-all-btn" onClick={selectAll}>Select All</button>
                <button className="select-all-btn" onClick={deselectAll}>Deselect All</button>
                <span className="selected-count">{selectedTagWords.size} selected</span>
              </div>

              <div className="tags-grid">
                {availableTags.map(tagInfo => (
                  <label key={tagInfo.tag} className="tag-item">
                    <input
                      type="checkbox"
                      checked={selectedTagWords.has(tagInfo.tag)}
                      onChange={() => toggleTag(tagInfo.tag)}
                    />
                    <span className="tag-name">{tagInfo.tag}</span>
                    <span className="tag-count">({tagInfo.count})</span>
                  </label>
                ))}
              </div>

              {availableTags.length === 0 && (
                <p className="no-tags-message">
                  No common tags found in playlist names. Tags must appear in at least 2 playlists.
                </p>
              )}
            </>
          )}

          {step === 'configure-apply' && (
            <>
              <p className="step-description">
                Configure how each tag will be written to track comments, then apply.
              </p>

              <table className="configure-tags-table">
                <thead>
                  <tr>
                    <th>Tag</th>
                    <th>Tag to Write</th>
                    <th>Playlists</th>
                    <th>Track Counts</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {configuredTags.map((tag, index) => (
                    <TagConfigRow
                      key={tag.tag}
                      tag={tag}
                      isExpanded={expandedPlaylists.has(tag.tag)}
                      onToggleExpand={() => togglePlaylistExpanded(tag.tag)}
                      onUpdateTagToWrite={(value) => updateTagToWrite(index, value)}
                      onTogglePlaylist={(path) => togglePlaylistSelected(index, path)}
                      onSelectAllPlaylists={() => selectAllPlaylistsForTag(index)}
                      onDeselectAllPlaylists={() => deselectAllPlaylistsForTag(index)}
                      onApply={() => void applyTag(index)}
                      isApplying={writeTagMutation.isPending}
                    />
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>

        <div className="modal-footer">
          {step === 'select-tags' && (
            <>
              <button className="cancel-button" onClick={onClose}>Cancel</button>
              <button 
                className="proceed-button"
                onClick={proceedToConfiguration}
                disabled={selectedTagWords.size === 0}
              >
                Use These Tags ({selectedTagWords.size})
              </button>
            </>
          )}
          {step === 'configure-apply' && (
            <>
              <button className="back-button" onClick={goBack}>← Back</button>
              <button className="cancel-button" onClick={onClose}>Close</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
