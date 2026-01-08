'use client';

import { useState, useMemo, useCallback, useRef, useEffect, Fragment } from 'react';
import { api } from '~/trpc/react';
import type { FullTrackRow } from '~/server/services/collectionService';
import ManageCommentsModal from './ManageCommentsModal';
import ApplyStyleTags from './ApplyStyleTags';
import FindDuplicates from './FindDuplicates';


const COLUMN_DEFS = [
  { key: 'title' as const, label: 'Title', width: 200, editable: true },
  { key: 'artist' as const, label: 'Artist', width: 150, editable: true },
  { key: 'album' as const, label: 'Album', width: 150, editable: true },
  { key: 'bpm' as const, label: 'BPM', width: 60, editable: true },
  { key: 'musicalKey' as const, label: 'Key', width: 60, editable: true },
  { key: 'comment' as const, label: 'Comment', width: 200, editable: true },
  { key: 'genre' as const, label: 'Genre', width: 120, editable: true },
  { key: 'label' as const, label: 'Label', width: 120, editable: true },
  { key: 'playcount' as const, label: 'Plays', width: 60, editable: false },
  { key: 'playtime' as const, label: 'Duration', width: 80, editable: false },
  { key: 'filepath' as const, label: 'Path', width: 300, editable: false },
];

// Open Key Notation keys (1-12 with m/d suffix)
const OPEN_KEYS = [
  '1m', '2m', '3m', '4m', '5m', '6m', '7m', '8m', '9m', '10m', '11m', '12m',
  '1d', '2d', '3d', '4d', '5d', '6d', '7d', '8d', '9d', '10d', '11d', '12d',
];

// Get harmonically adjacent keys for a given Open Key
function getAdjacentKeys(key: string): string[] {
  const regex = /^(\d{1,2})([md])$/i;
  const match = regex.exec(key);
  if (!match) return [key];
  
  const numStr = match[1];
  const modeStr = match[2];
  if (!numStr || !modeStr) return [key];
  
  const num = parseInt(numStr);
  const mode = modeStr.toLowerCase();
  if (num < 1 || num > 12) return [key];
  
  const adjacent: string[] = [key]; // Always include the exact key
  
  // Same key number, opposite mode (relative major/minor)
  adjacent.push(`${num}${mode === 'm' ? 'd' : 'm'}`);
  
  // Adjacent numbers within same mode (clockwise/counter-clockwise on wheel)
  const prev = num === 1 ? 12 : num - 1;
  const next = num === 12 ? 1 : num + 1;
  adjacent.push(`${prev}${mode}`);
  adjacent.push(`${next}${mode}`);
  
  return adjacent;
}

// Extract style tags from comment in format [Style1] [Style2]
function extractStyles(comment: string | null | undefined): string[] {
  if (!comment) return [];
  const regex = /\[([^\]]+)\]/g;
  const styles: string[] = [];
  let match;
  while ((match = regex.exec(comment)) !== null) {
    if (match[1]) styles.push(match[1].trim());
  }
  return styles;
}

type ColumnKey = (typeof COLUMN_DEFS)[number]['key'];
type EditingCell = { trackKey: string; column: ColumnKey } | null;
type PendingChanges = Map<string, Partial<FullTrackRow>>;

const ROW_HEIGHT = 32;
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
  const headerRef = useRef<HTMLDivElement>(null);
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
  const [isUtilitiesExpanded, setIsUtilitiesExpanded] = useState(false);

  // Merge pending changes with original data
  const [sort, setSort] = useState<{ key: ColumnKey; direction: 'asc' | 'desc' } | null>(null);
  const [searchFilters, setSearchFilters] = useState<Array<{ id: string; column: string; value: string; bpmRange?: number; selectedStyles?: string[] }>>([
    { id: '1', column: 'all', value: '', bpmRange: 4, selectedStyles: [] }
  ]);

  // Extract all unique styles from all tracks
  const allUniqueStyles = useMemo(() => {
    if (!tracksQuery.data) return [];
    const styleSet = new Set<string>();
    tracksQuery.data.forEach(track => {
      extractStyles(track.comment).forEach(style => styleSet.add(style));
    });
    return Array.from(styleSet).sort();
  }, [tracksQuery.data]);

  // Merge pending changes with original data, then filter and sort
  const tracks = useMemo(() => {
    if (!tracksQuery.data) return [];
    
    // 1. Merge changes
    let data = tracksQuery.data.map((track) => {
      const changes = pendingChanges.get(track.trackKey);
      return changes ? { ...track, ...changes } : track;
    });

    // 2. Filter
    data = data.filter(track => {
      return searchFilters.every(filter => {
        // Special handling for Style: match if track has ANY of the selected styles (OR)
        // Check this BEFORE the empty value check since style uses selectedStyles, not value
        if (filter.column === 'style') {
          const selectedStyles = filter.selectedStyles ?? [];
          if (selectedStyles.length === 0) return true;
          const trackStyles = extractStyles(track.comment);
          // OR logic: track matches if it has at least one of the selected styles
          return selectedStyles.some(style => trackStyles.includes(style));
        }

        // Vinyl filter: no input needed, just checks for [Vinyl] in comment
        if (filter.column === 'vinyl') {
          const comment = track.comment ?? '';
          return comment.includes('[Vinyl]');
        }

        if (!filter.value) return true;
        
        const term = filter.value.toLowerCase();
        
        if (filter.column === 'all') {
          return COLUMN_DEFS.some(col => {
            const val = track[col.key];
            return val && String(val).toLowerCase().includes(term);
          });
        }
        
        // Special handling for BPM: configurable +/- range
        if (filter.column === 'bpm') {
          const searchVal = parseFloat(filter.value);
          if (!isNaN(searchVal)) {
            const trackVal = Number(track.bpm);
            const range = filter.bpmRange ?? 4;
            return !isNaN(trackVal) && Math.abs(trackVal - searchVal) <= range;
          }
          return true; // Ignore filter if not a number
        }

        // Special handling for Key: match adjacent harmonically compatible keys
        if (filter.column === 'musicalKey') {
          if (!filter.value) return true;
          const trackKey = String(track.musicalKey ?? '').toLowerCase().trim();
          const searchKey = filter.value.toLowerCase().trim();
          const adjacentKeys = getAdjacentKeys(searchKey).map(k => k.toLowerCase());
          // Use exact match, not includes, to avoid "12m" matching "2m"
          return adjacentKeys.some(adjKey => trackKey === adjKey);
        }

        const val = track[filter.column as ColumnKey];
        return val && String(val).toLowerCase().includes(term);
      });
    });

    // 3. Sort
    if (sort) {
      data.sort((a, b) => {
        const valA = a[sort.key];
        const valB = b[sort.key];
        
        if (valA === valB) return 0;
        
        // Handle undefined/null (push to bottom)
        if (valA === undefined || valA === null) return 1;
        if (valB === undefined || valB === null) return -1;
        
        // Handle numbers
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sort.direction === 'asc' ? valA - valB : valB - valA;
        }

        // Handle generic strings
        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();
        return sort.direction === 'asc' 
          ? strA.localeCompare(strB) 
          : strB.localeCompare(strA);
      });
    }

    return data;
  }, [tracksQuery.data, pendingChanges, searchFilters, sort]);

  // Helper functions for Search & Sort
  const handleSort = (key: ColumnKey) => {
    setSort(prev => {
      if (prev?.key === key) {
        return prev.direction === 'asc' 
          ? { key, direction: 'desc' }
          : null; 
      }
      return { key, direction: 'asc' };
    });
  };

  const addSearchRow = () => {
    setSearchFilters(prev => [
      ...prev,
      { id: Math.random().toString(36).substr(2, 9), column: 'all', value: '' }
    ]);
  };

  const removeSearchRow = (id: string) => {
    setSearchFilters(prev => prev.filter(f => f.id !== id));
  };

  const updateSearchRow = (id: string, field: 'column' | 'value', newValue: string) => {
    setSearchFilters(prev => prev.map(f => 
      f.id === id ? { ...f, [field]: newValue } : f
    ));
  };

  /* DYNAMIC HEIGHT LOGIC */
  const [containerHeight, setContainerHeight] = useState(600);
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

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
  const endIndex = Math.min(tracks.length, Math.ceil((scrollTop + containerHeight) / ROW_HEIGHT) + OVERSCAN);
  const visibleTracks = tracks.slice(startIndex, endIndex);
  const totalHeight = tracks.length * ROW_HEIGHT;

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
    if (headerRef.current) {
      headerRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
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
      {/* Advanced Search Builder */}
      <div className="search-builder">
        {searchFilters.map((filter, index) => (
          <div key={filter.id} className="search-row">
            <select
              value={filter.column}
              onChange={(e) => updateSearchRow(filter.id, 'column', e.target.value)}
              className="search-select"
            >
              <option value="all">All</option>
              {COLUMN_DEFS.filter(col => col.key !== 'comment').map(col => (
                <Fragment key={col.key}>
                  <option value={col.key}>{col.label}</option>
                  {col.key === 'musicalKey' && (
                    <>
                      <option value="style">Style</option>
                      <option value="vinyl">Vinyl</option>
                    </>
                  )}
                </Fragment>
              ))}
            </select>
            {filter.column === 'bpm' ? (
              <>
                <input
                  type="number"
                  value={filter.value}
                  onChange={(e) => updateSearchRow(filter.id, 'value', e.target.value)}
                  placeholder="BPM..."
                  className="search-input bpm-input"
                />
                <span className="bpm-range-label">±</span>
                <input
                  type="number"
                  value={filter.bpmRange ?? 4}
                  onChange={(e) => {
                    const range = parseInt(e.target.value) || 0;
                    setSearchFilters(prev => prev.map(f => 
                      f.id === filter.id ? { ...f, bpmRange: range } : f
                    ));
                  }}
                  className="search-input bpm-range-input"
                  min="0"
                  max="50"
                />
              </>
            ) : filter.column === 'musicalKey' ? (
              <select
                value={filter.value}
                onChange={(e) => updateSearchRow(filter.id, 'value', e.target.value)}
                className="search-select key-select"
              >
                <option value="">Select key...</option>
                {OPEN_KEYS.map(key => (
                  <option key={key} value={key}>{key}</option>
                ))}
              </select>
            ) : filter.column === 'style' ? (
              <div className="style-multiselect-container">
                <details className="style-details">
                  <summary className="style-summary">
                    {(filter.selectedStyles ?? []).length > 0 
                      ? (filter.selectedStyles ?? []).join(', ')
                      : 'Select styles...'}
                  </summary>
                  <div className="style-dropdown">
                    {allUniqueStyles.length === 0 ? (
                      <span className="no-styles">No styles found</span>
                    ) : (
                      <div className="style-options">
                        {allUniqueStyles.map(style => (
                          <label key={style} className="style-option">
                            <input
                              type="checkbox"
                              checked={(filter.selectedStyles ?? []).includes(style)}
                              onChange={(e) => {
                                const currentStyles = filter.selectedStyles ?? [];
                                const newStyles = e.target.checked
                                  ? [...currentStyles, style]
                                  : currentStyles.filter(s => s !== style);
                                setSearchFilters(prev => prev.map(f =>
                                  f.id === filter.id ? { ...f, selectedStyles: newStyles } : f
                                ));
                              }}
                            />
                            <span>{style}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </details>
              </div>
            ) : filter.column === 'vinyl' ? (
              <span className="vinyl-filter-label">Vinyl Only</span>
            ) : (
              <input
                type="text"
                value={filter.value}
                onChange={(e) => updateSearchRow(filter.id, 'value', e.target.value)}
                placeholder="Search term..."
                className="search-input"
              />
            )}
            {index === searchFilters.length - 1 ? (
              <button 
                onClick={addSearchRow} 
                className="search-action-btn add"
                title="Add search criteria (AND)"
              >
                +
              </button>
            ) : (
             <button 
                onClick={() => removeSearchRow(filter.id)} 
                className="search-action-btn remove"
                title="Remove criteria"
              >
                −
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Track Count + Utilities Toggle (inline) */}
      <div className="track-info-bar">
        <span className="track-count">{tracks.length.toLocaleString()} tracks</span>
        <button
          className="utilities-toggle-inline"
          onClick={() => setIsUtilitiesExpanded(!isUtilitiesExpanded)}
          aria-expanded={isUtilitiesExpanded}
        >
          <span className="toggle-icon">{isUtilitiesExpanded ? '▾' : '▸'}</span>
          Utilities
        </button>
        {pendingChanges.size > 0 && (
          <div className="pending-changes-inline">
            <span>{pendingChanges.size} modified</span>
            <button
              className="save-button"
              onClick={handleSave}
              disabled={updateBatchMutation.isPending}
            >
              {updateBatchMutation.isPending ? 'Saving...' : 'Save'}
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

      {/* Expanded Utilities (between track count and table header) */}
      {isUtilitiesExpanded && (
        <div className="utility-buttons-expanded">
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
      )}

      {/* Table Header */}
      <div 
        ref={headerRef} 
        style={{ width: '100%', overflow: 'hidden' }}
      >
        <div className="track-table-header" style={{ width: totalWidth, display: 'flex' }}>
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
              <div 
                className="header-text clickable"
                onClick={() => handleSort(col.key)}
              >
                {col.label}
                {sort?.key === col.key && (
                  <span className="sort-indicator">
                    {sort.direction === 'asc' ? ' ▲' : ' ▼'}
                  </span>
                )}
              </div>
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
      </div>

      {/* Virtual Scroll Table Body */}
      <div
        className="track-table-container"
        ref={containerRef}
        style={{ overflow: 'auto', width: '100%' }}
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
                          {col.key === 'bpm' && typeof value === 'number'
                            ? value.toFixed(2)
                            : (value?.toString() ?? '')
                          }
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
