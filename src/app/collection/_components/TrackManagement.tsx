'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import { api } from '~/trpc/react';
import type { FullTrackRow } from '~/server/services/collectionService';
import ManageCommentsModal from './ManageCommentsModal';
import ApplyStyleTags from './ApplyStyleTags';
import FindDuplicates from './FindDuplicates';

// Format rating for display - Traktor uses "IS ON A PLAYLIST" for tracks in playlists
const formatRating = (value: string | number | undefined): string => {
  if (!value) return '';
  const str = String(value);
  if (str === 'IS ON A PLAYLIST') return '★';
  // Could be a numeric rating (0-255 scale in Traktor)
  const num = parseInt(str, 10);
  if (!isNaN(num) && num > 0) {
    // Convert 0-255 to 0-5 stars
    const stars = Math.round((num / 255) * 5);
    return '★'.repeat(stars) + '☆'.repeat(5 - stars);
  }
  return str;
};

const COLUMN_DEFS = [
  { key: 'title' as const, label: 'Title', width: 200, editable: true },
  { key: 'artist' as const, label: 'Artist', width: 150, editable: true },
  { key: 'album' as const, label: 'Album', width: 150, editable: true },
  { key: 'bpm' as const, label: 'BPM', width: 60, editable: true },
  { key: 'musicalKey' as const, label: 'Key', width: 60, editable: true },
  { key: 'rating' as const, label: 'Rating', width: 100, editable: true },
  { key: 'comment' as const, label: 'Comment', width: 200, editable: true },
  { key: 'genre' as const, label: 'Genre', width: 120, editable: true },
  { key: 'label' as const, label: 'Label', width: 120, editable: true },
  { key: 'playcount' as const, label: 'Plays', width: 60, editable: false },
  { key: 'playtime' as const, label: 'Duration', width: 80, editable: false },
  { key: 'importDate' as const, label: 'Imported', width: 100, editable: false },
  { key: 'lastPlayed' as const, label: 'Last Played', width: 100, editable: false },
  { key: 'filepath' as const, label: 'File Path', width: 300, editable: false },
];

type ColumnKey = (typeof COLUMN_DEFS)[number]['key'];
type EditingCell = { trackKey: string; column: ColumnKey } | null;
type PendingChanges = Map<string, Partial<FullTrackRow>>;

const ROW_HEIGHT = 32;
const CONTAINER_HEIGHT = 600;
const OVERSCAN = 10;

export default function TrackManagement() {
  const utils = api.useUtils();
  const tracksQuery = api.collection.allTracks.useQuery();
  const updateBatchMutation = api.collection.updateTracksBatch.useMutation({
    onSuccess: () => {
      void utils.collection.allTracks.invalidate();
      setPendingChanges(new Map());
    },
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() =>
    Object.fromEntries(COLUMN_DEFS.map((c) => [c.key, c.width]))
  );
  const [columnOrder, setColumnOrder] = useState<ColumnKey[]>(() =>
    COLUMN_DEFS.map((c) => c.key)
  );
  const [editingCell, setEditingCell] = useState<EditingCell>(null);
  const [editValue, setEditValue] = useState('');
  const [pendingChanges, setPendingChanges] = useState<PendingChanges>(new Map());
  const [showManageComments, setShowManageComments] = useState(false);
  const [showApplyStyleTags, setShowApplyStyleTags] = useState(false);
  const [showFindDuplicates, setShowFindDuplicates] = useState(false);
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const [dragColumn, setDragColumn] = useState<string | null>(null);

  // Merge pending changes with original data
  const tracks = useMemo(() => {
    if (!tracksQuery.data) return [];
    return tracksQuery.data.map((track) => {
      const changes = pendingChanges.get(track.trackKey);
      return changes ? { ...track, ...changes } : track;
    });
  }, [tracksQuery.data, pendingChanges]);

  const orderedColumns = useMemo(() =>
    columnOrder.map((key) => COLUMN_DEFS.find((c) => c.key === key)!),
    [columnOrder]
  );

  const totalWidth = useMemo(() =>
    orderedColumns.reduce((sum, col) => sum + (columnWidths[col.key] ?? col.width), 0),
    [orderedColumns, columnWidths]
  );

  // Virtual scroll calculations
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const endIndex = Math.min(tracks.length, Math.ceil((scrollTop + CONTAINER_HEIGHT) / ROW_HEIGHT) + OVERSCAN);
  const visibleTracks = tracks.slice(startIndex, endIndex);
  const totalHeight = tracks.length * ROW_HEIGHT;

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const handleCellClick = useCallback((trackKey: string, column: ColumnKey) => {
    const colDef = COLUMN_DEFS.find((c) => c.key === column);
    if (!colDef?.editable) return;

    const track = tracks.find((t) => t.trackKey === trackKey);
    if (!track) return;

    const value = track[column];
    setEditingCell({ trackKey, column });
    setEditValue(value?.toString() ?? '');
  }, [tracks]);

  const handleCellBlur = useCallback(() => {
    if (!editingCell) return;
    
    const { trackKey, column } = editingCell;
    const track = tracks.find((t) => t.trackKey === trackKey);
    if (!track) {
      setEditingCell(null);
      return;
    }

    const originalValue = track[column]?.toString() ?? '';
    if (editValue !== originalValue) {
      setPendingChanges((prev) => {
        const next = new Map(prev);
        const existing = next.get(trackKey) ?? {};
        next.set(trackKey, { ...existing, [column]: editValue });
        return next;
      });
    }
    setEditingCell(null);
  }, [editingCell, editValue, tracks]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCellBlur();
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  }, [handleCellBlur]);

  const handleSave = useCallback(() => {
    const updates = Array.from(pendingChanges.entries()).map(([key, changes]) => ({
      key,
      updates: {
        title: changes.title,
        artist: changes.artist,
        album: changes.album,
        comment: changes.comment,
        genre: changes.genre,
        label: changes.label,
        rating: changes.rating,
        bpm: changes.bpm,
      },
    }));
    
    if (updates.length > 0) {
      updateBatchMutation.mutate({ updates });
    }
  }, [pendingChanges, updateBatchMutation]);

  const handleColumnDrop = useCallback((targetColumn: string) => {
    if (!dragColumn || dragColumn === targetColumn) {
      setDragColumn(null);
      return;
    }
    
    setColumnOrder((prev) => {
      const next = [...prev];
      const fromIndex = next.indexOf(dragColumn as ColumnKey);
      const toIndex = next.indexOf(targetColumn as ColumnKey);
      next.splice(fromIndex, 1);
      next.splice(toIndex, 0, dragColumn as ColumnKey);
      return next;
    });
    setDragColumn(null);
  }, [dragColumn]);

  if (tracksQuery.isLoading) {
    return <div className="loading-message">Loading tracks...</div>;
  }

  if (tracksQuery.error) {
    return <div className="error-message">Error loading tracks: {tracksQuery.error.message}</div>;
  }

  return (
    <div className="track-management">
      {/* Utilities */}
      <div className="track-utilities">
        <div className="utility-buttons">
          <button
            className="utility-button"
            onClick={() => setShowManageComments(true)}
          >
            Manage Comments
          </button>
          <button
            className="utility-button"
            onClick={() => setShowApplyStyleTags(true)}
          >
            Apply Style Tags
          </button>
          <button
            className="utility-button"
            onClick={() => setShowFindDuplicates(true)}
          >
            Find Duplicates
          </button>
        </div>
        
        {pendingChanges.size > 0 && (
          <div className="pending-changes">
            <span>{pendingChanges.size} track(s) modified</span>
            <button
              className="save-button"
              onClick={handleSave}
              disabled={updateBatchMutation.isPending}
            >
              {updateBatchMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              className="discard-button"
              onClick={() => setPendingChanges(new Map())}
            >
              Discard
            </button>
          </div>
        )}
      </div>

      {/* Track Count */}
      <div className="track-count">{tracks.length.toLocaleString()} tracks</div>

      {/* Table Header */}
      <div className="track-table-header" style={{ width: totalWidth }}>
        {orderedColumns.map((col) => {
          const width = columnWidths[col.key] ?? col.width;
          return (
            <div
              key={col.key}
              className={`header-cell ${dragColumn === col.key ? 'dragging' : ''}`}
              style={{ width, minWidth: width, maxWidth: width }}
              draggable
              onDragStart={() => setDragColumn(col.key)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleColumnDrop(col.key)}
            >
              <span className="header-text">{col.label}</span>
              <div
                className={`column-resizer ${resizingColumn === col.key ? 'active' : ''}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const startX = e.clientX;
                  const startWidth = width;
                  setResizingColumn(col.key);
                  
                  const handleMove = (moveE: MouseEvent) => {
                    setColumnWidths((prev) => ({
                      ...prev,
                      [col.key]: Math.max(50, startWidth + (moveE.clientX - startX)),
                    }));
                  };
                  
                  const handleUp = () => {
                    setResizingColumn(null);
                    document.removeEventListener('mousemove', handleMove);
                    document.removeEventListener('mouseup', handleUp);
                  };
                  
                  document.addEventListener('mousemove', handleMove);
                  document.addEventListener('mouseup', handleUp);
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Virtual Scroll Table Body */}
      <div
        ref={containerRef}
        className="track-table-container"
        style={{ height: CONTAINER_HEIGHT, overflowY: 'auto', width: totalWidth + 20 }}
        onScroll={handleScroll}
      >
        <div style={{ height: totalHeight, position: 'relative' }}>
          {visibleTracks.map((track, i) => {
            const index = startIndex + i;
            return (
              <div
                key={track.trackKey}
                className="track-row"
                style={{
                  position: 'absolute',
                  top: index * ROW_HEIGHT,
                  left: 0,
                  height: ROW_HEIGHT,
                  display: 'flex',
                  width: totalWidth,
                }}
              >
                {orderedColumns.map((col) => {
                  const isEditing = editingCell?.trackKey === track.trackKey && editingCell.column === col.key;
                  const value = track[col.key];
                  const hasChange = pendingChanges.get(track.trackKey)?.[col.key] !== undefined;
                  const width = columnWidths[col.key] ?? col.width;

                  return (
                    <div
                      key={col.key}
                      className={`track-cell ${col.editable ? 'editable' : ''} ${hasChange ? 'modified' : ''}`}
                      style={{ width, minWidth: width, maxWidth: width }}
                      onClick={() => handleCellClick(track.trackKey, col.key)}
                    >
                      {isEditing ? (
                        <input
                          className="cell-input"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={handleCellBlur}
                          onKeyDown={handleKeyDown}
                          autoFocus
                        />
                      ) : (
                        <span className="cell-text" title={value?.toString()}>
                          {col.key === 'rating' ? formatRating(value) : (value?.toString() ?? '')}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Manage Comments Modal */}
      {showManageComments && (
        <ManageCommentsModal onClose={() => setShowManageComments(false)} />
      )}

      {/* Apply Style Tags Modal */}
      {showApplyStyleTags && (
        <ApplyStyleTags onClose={() => setShowApplyStyleTags(false)} />
      )}

      {/* Find Duplicates Modal */}
      {showFindDuplicates && (
        <FindDuplicates onClose={() => setShowFindDuplicates(false)} />
      )}
    </div>
  );
}
