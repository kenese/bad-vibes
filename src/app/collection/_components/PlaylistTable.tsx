'use client';

import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { api } from '~/trpc/react';
import type { AppRouter } from '~/server/api/root';
import type { inferRouterOutputs } from '@trpc/server';

type TrackRow = inferRouterOutputs<AppRouter>['collection']['playlistTracks']['tracks'][number];
type SortKey = keyof Pick<TrackRow, 'title' | 'artist' | 'album' | 'bpm' | 'rating'> | 'originalIndex';
type SortState = { key: SortKey; direction: 'asc' | 'desc' };

const TABLE_NAME = 'playlist_tracks';
const columns: { key: SortKey; label: string; minWidth: number }[] = [
  { key: 'originalIndex', label: '#', minWidth: 50 },
  { key: 'title', label: 'Title', minWidth: 200 },
  { key: 'artist', label: 'Artist', minWidth: 150 },
  { key: 'album', label: 'Release', minWidth: 150 },
  { key: 'bpm', label: 'BPM', minWidth: 80 },
  { key: 'rating', label: 'Rating', minWidth: 80 }
];

const PlaylistTable = ({
  tracks,
  isLoading
}: {
  tracks: TrackRow[];
  isLoading: boolean;
}) => {
  const [sort, setSort] = useState<SortState>({ key: 'originalIndex', direction: 'asc' });
  const resizingRef = useRef<{ key: string; startX: number; startWidth: number } | null>(
    null
  );

  const configQuery = api.preferences.getTableConfig.useQuery(
    { tableName: TABLE_NAME },
    { staleTime: Infinity }
  );
  
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(
    (configQuery.data as Record<string, number>) ?? {}
  );

  const setConfigMutation = api.preferences.setTableConfig.useMutation();

  useEffect(() => {
    if (configQuery.data) {
      setColumnWidths(configQuery.data as Record<string, number>);
    }
  }, [configQuery.data]);

  const sortedTracks = useMemo(() => {
    const list = tracks.map((t, i) => ({ ...t, originalIndex: i + 1 }));
    list.sort((a, b) => {
      if (sort.key === 'originalIndex') {
        return sort.direction === 'asc' 
          ? a.originalIndex - b.originalIndex 
          : b.originalIndex - a.originalIndex;
      }

      const left = a[sort.key as keyof TrackRow] ?? '';
      const right = b[sort.key as keyof TrackRow] ?? '';
      if (left === right) return 0;
      if (typeof left === 'number' && typeof right === 'number') {
        return sort.direction === 'asc' ? left - right : right - left;
      }
      return sort.direction === 'asc'
        ? String(left).localeCompare(String(right))
        : String(right).localeCompare(String(left));
    });
    return list;
  }, [tracks, sort]);

  const toggleSort = (key: SortKey) => {
    setSort((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' }
    );
  };

  const handleResizeStart = (e: React.MouseEvent, key: string, currentWidth: number) => {
    e.preventDefault();
    e.stopPropagation();
    resizingRef.current = { key, startX: e.clientX, startWidth: currentWidth };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!resizingRef.current) return;
    const { key, startX, startWidth } = resizingRef.current;
    const diff = e.clientX - startX;
    const newWidth = Math.max(50, startWidth + diff);
    setColumnWidths((prev) => {
      if (prev[key] === newWidth) return prev;
      return { ...prev, [key]: newWidth };
    });
  }, []);

  const handleResizeEnd = useCallback(() => {
    if (resizingRef.current) {
      resizingRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';

      // Save to DB on resize end
      setColumnWidths((current) => {
        void setConfigMutation.mutate({
          tableName: TABLE_NAME,
          config: current
        });
        return current;
      });
    }
  }, [setConfigMutation]);

  useEffect(() => {
    window.addEventListener('mousemove', handleResizeMove);
    window.addEventListener('mouseup', handleResizeEnd);
    return () => {
      window.removeEventListener('mousemove', handleResizeMove);
      window.removeEventListener('mouseup', handleResizeEnd);
    };
  }, [handleResizeMove, handleResizeEnd]);

  const totalTableWidth = useMemo(() => {
    return columns.reduce((sum, col) => sum + (columnWidths[col.key] ?? col.minWidth), 0);
  }, [columnWidths]);

  if (isLoading && !tracks.length) return <p>Loading tracks…</p>;
  if (!isLoading && !tracks.length) return <p>No tracks in this playlist.</p>;

  return (
    <table className="tracks-table" style={{ width: totalTableWidth }}>
      <colgroup>
        {columns.map((col) => (
          <col key={col.key} style={{ width: columnWidths[col.key] ?? col.minWidth }} />
        ))}
      </colgroup>
      <thead>
        <tr>
          {columns.map((col, index) => {
            const width = columnWidths[col.key] ?? col.minWidth;
            return (
              <th
                key={col.key}
                style={{
                  zIndex: 50 - index // Ensure handles overlap next column
                }}
              >
                <div className="th-content">
                  <button onClick={() => toggleSort(col.key)} className="sort-button">
                    {col.label}
                    {sort.key === col.key ? (sort.direction === 'asc' ? ' ▲' : ' ▼') : ''}
                  </button>
                  <div
                    className="resize-handle"
                    onMouseDown={(e) => handleResizeStart(e, col.key, width)}
                  />
                </div>
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {sortedTracks.map((track) => (
          <tr key={track.key}>
            <td className="text-center text-[#8b949e]">{track.originalIndex}</td>
            <td>{track.title}</td>
            <td>{track.artist ?? '—'}</td>
            <td>{track.album ?? '—'}</td>
            <td>{track.bpm ?? '—'}</td>
            <td>{track.rating ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default PlaylistTable;
