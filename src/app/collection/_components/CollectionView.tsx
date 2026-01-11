'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { api } from '~/trpc/react';
import Sidebar, { type FlattenedFolder } from './Sidebar';
import PlaylistTable from './PlaylistTable';
import UploadPrompt from './UploadPrompt';
import TrackManagement from './TrackManagement';
import AddTagsModal from './AddTagsModal';
import type { AppRouter } from '~/server/api/root';
import type { inferRouterOutputs } from '@trpc/server';

type TabType = 'playlist' | 'tracks';

const DEFAULT_FOLDER_PATH = 'root';

type SidebarNode = NonNullable<
  inferRouterOutputs<AppRouter>['collection']['sidebar']['tree']
>;

const CollectionView = ({ initialActivePath }: { initialActivePath?: string }) => {
  const utils = api.useUtils();
  const hasCollectionQuery = api.collection.hasCollection.useQuery();
  const stateQuery = api.preferences.getTableConfig.useQuery(
    { tableName: 'collection_view' },
    { staleTime: Infinity }
  );
  const sidebarQuery = api.collection.sidebar.useQuery(undefined, {
    enabled: !!hasCollectionQuery.data
  });

  const [activePath, setActivePath] = useState<string | null>(initialActivePath ?? null);

  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [duplicateName, setDuplicateName] = useState('');
  const [folderName, setFolderName] = useState('');
  const [playlistName, setPlaylistName] = useState('');
  const [moveTargetPath, setMoveTargetPath] = useState(DEFAULT_FOLDER_PATH);
  const [sidebarWidth, setSidebarWidth] = useState(300);
  const [isResizing, setIsResizing] = useState(false);
  const [showUtilities, setShowUtilities] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('playlist');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showAddTags, setShowAddTags] = useState(false);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    setSidebarWidth(() => {
      const next = Math.min(Math.max(event.clientX, 220), 520);
      return next;
    });
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (!isResizing) return;
    const handleMove = (event: MouseEvent) => handleMouseMove(event);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizing, handleMouseMove, stopResizing]);

  const activeNode = useMemo(() => {
    if (!sidebarQuery.data?.tree || !activePath) return null;
    const stack = [sidebarQuery.data.tree];
    while (stack.length) {
      const node = stack.pop()!;
      if (node.path === activePath) return node;
      node.children?.forEach((child) => stack.push(child));
    }
    return null;
  }, [sidebarQuery.data, activePath]);


  const playlistQuery = api.collection.playlistTracks.useQuery(
    { path: activePath ?? '' },
    { enabled: Boolean(activePath) && activeNode?.type === 'PLAYLIST' }
  );

  const folderOptions = useMemo<FlattenedFolder[]>(() => {
    if (!sidebarQuery.data?.tree) return [];
    return flattenFolders(sidebarQuery.data.tree);
  }, [sidebarQuery.data]);

  useEffect(() => {
    if (!folderOptions.length) return;
    if (!folderOptions.find((opt) => opt.path === moveTargetPath)) {
      setMoveTargetPath(folderOptions[0]!.path);
    }
  }, [folderOptions, moveTargetPath]);

  const createFolder = api.collection.createFolder.useMutation({
    onSuccess: () => void utils.collection.sidebar.invalidate()
  });
  const createPlaylist = api.collection.createPlaylist.useMutation({
    onSuccess: () => void utils.collection.sidebar.invalidate()
  });
  // Use batch move to avoid path invalidation issues between moves
  const movePlaylistBatch = api.collection.movePlaylistBatch.useMutation({
    onSuccess: () => {
      void utils.collection.sidebar.invalidate();
      setActivePath(null);
    }
  });
  const movePlaylists = movePlaylistBatch; // alias for consistency
  const createOrphans = api.collection.createOrphansPlaylist.useMutation({
    onSuccess: () => void utils.collection.sidebar.invalidate()
  });
  const duplicatePlaylist = api.collection.duplicatePlaylist.useMutation({
    onSuccess: () => void utils.collection.sidebar.invalidate()
  });
  const duplicatePlaylists = duplicatePlaylist; // alias
  const deleteNodes = api.collection.deleteNodes.useMutation({
    onSuccess: () => {
      void utils.collection.sidebar.invalidate();
      setSelectedPaths([]);
    }
  });
  const deletePlaylists = deleteNodes; // alias

  const deleteCollection = api.collection.deleteCollection.useMutation({
    onSuccess: () => {
      void utils.collection.hasCollection.invalidate();
    }
  });

  const handleDeleteCollection = () => {
    if (!confirm('Are you sure you want to delete your entire collection? This cannot be undone.')) return;
    deleteCollection.mutate();
  };

  const setStateMutation = api.preferences.setTableConfig.useMutation();
  const lastSavedPathRef = useRef<string | null>(initialActivePath ?? null);

  // Sync activePath if it's still null and queries finish on client
  useEffect(() => {
    if (!activePath && sidebarQuery.data?.tree && stateQuery.isSuccess) {
      const pathFromQuery = (stateQuery.data as { lastOpenedPath?: string })?.lastOpenedPath;
      if (pathFromQuery) {
        setActivePath(pathFromQuery);
        lastSavedPathRef.current = pathFromQuery;
      } else {
        const firstPlaylist = findFirstPlaylist(sidebarQuery.data.tree);
        const fallbackPath = firstPlaylist?.path ?? sidebarQuery.data.tree.path;
        setActivePath(fallbackPath);
        lastSavedPathRef.current = fallbackPath;
      }
    }
  }, [stateQuery.data, stateQuery.isSuccess, sidebarQuery.data, activePath]);

  useEffect(() => {
    if (activePath && activePath !== lastSavedPathRef.current) {
      lastSavedPathRef.current = activePath;
      void setStateMutation.mutate({
        tableName: 'collection_view',
        config: { lastOpenedPath: activePath }
      });
    }
  }, [activePath, setStateMutation]);

  const selectedFolderPath =
    activeNode?.type === 'FOLDER'
      ? activeNode.path
      : activeNode?.parentPath ?? DEFAULT_FOLDER_PATH;

  const handleDeleteSelected = async () => {
    if (!selectedPaths.length) return;
    if (!confirm(`Are you sure you want to delete ${selectedPaths.length} items?`)) return;
    await deleteNodes.mutateAsync({ paths: selectedPaths });
  };

  const handleDuplicateSelected = () => {
    if (!selectedPaths.length) return;
    // Duplicate each selected playlist
    selectedPaths.forEach(path => {
      duplicatePlaylist.mutate({
        sourcePath: path,
        targetFolderPath: selectedFolderPath ?? DEFAULT_FOLDER_PATH,
        name: duplicateName.trim() || undefined
      });
    });
    setDuplicateName('');
  };

  const handleMoveSelected = async () => {
    if (!selectedPaths.length) return;
    const moves = selectedPaths.map(sourcePath => ({
      sourcePath,
      targetFolderPath: moveTargetPath
    }));
    try {
      await movePlaylistBatch.mutateAsync({ moves });
    } catch (err) {
      console.error('Move failed:', err);
    }
    setSelectedPaths([]);
  };

  const clearSelection = () => {
    setSelectedPaths([]);
  };

  const toggleSelection = (path: string) => {
    setSelectedPaths((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    );
  };

  // Calculate loading state based on relevant queries only
  const isLoading = 
    hasCollectionQuery.isFetching || 
    sidebarQuery.isFetching || 
    playlistQuery.isFetching ||
    stateQuery.isFetching;

  if (hasCollectionQuery.isLoading && !hasCollectionQuery.data) return <div className="p-8 text-center text-[#8b949e]">Loading your collection status...</div>;

  if (!hasCollectionQuery.data) {
    return <UploadPrompt onUploadSuccess={() => void utils.collection.hasCollection.invalidate()} />;
  }

  return (
    <div className="collection-page">
      {/* Tab Navigation - Top Level */}
      <div className="tab-navigation">
        <button
          className={`tab-button ${activeTab === 'playlist' ? 'active' : ''}`}
          onClick={() => setActiveTab('playlist')}
        >
          Playlist Management
        </button>
        <button
          className={`tab-button ${activeTab === 'tracks' ? 'active' : ''}`}
          onClick={() => setActiveTab('tracks')}
        >
          Track Management
        </button>
      </div>

      {activeTab === 'playlist' ? (
        /* Playlist Management - includes sidebar */
        <div
          className={`app-shell ${isResizing ? 'resizing' : ''}`}
          style={{ '--sidebar-width': `${isSidebarOpen ? sidebarWidth : 48}px` } as React.CSSProperties}
        >
          <aside className={`sidebar-panel ${isSidebarOpen ? 'open' : 'collapsed'}`}>
            <header>
              <div className="flex-stack">
                <div className="flex items-center gap-3">
                  <button 
                    className="sidebar-toggle-btn"
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    aria-label="Toggle Sidebar"
                    title={isSidebarOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}
                  >
                    {isSidebarOpen ? '◀' : '▶'}
                  </button>
                  {isSidebarOpen && (
                    <h1 
                      onClick={() => setActivePath('root')} 
                      style={{ cursor: 'pointer' }}
                      title="Go to Root"
                    >
                      Traktor Collection
                    </h1>
                  )}
                </div>
                {isSidebarOpen && (
                  <div className="flex items-center gap-2">
                    {isLoading && (
                      <div 
                        className="animate-spin h-5 w-5 border-2 border-[#8b949e] border-t-[#f0f6fc] rounded-full mr-2" 
                        title="Loading..."
                      />
                    )}
                    <a 
                      href="/api/collection/download" 
                      className="download-link"
                      title="Download collection.nml"
                    >
                      ↓
                    </a>
                    <button
                      onClick={handleDeleteCollection}
                      disabled={deleteCollection.isPending}
                      className="text-[#f85149] hover:bg-[#30363d] p-2 rounded transition-colors"
                      title="Delete Collection"
                    >
                      🗑️
                    </button>
                  </div>
                )}
              </div>
              {isSidebarOpen && (
                <p className="meta">
                  {sidebarQuery.isLoading
                    ? 'Loading...'
                    : `${sidebarQuery.data?.stats.playlistCount ?? 0} playlists · ${
                        sidebarQuery.data?.stats.trackCount ?? 0
                      } tracks`}
                </p>
              )}
            </header>
            {isSidebarOpen && (
              <div className="sidebar-content visible">
                <Sidebar
                  tree={sidebarQuery.data?.tree ?? null}
                  activePath={activePath}
                  selectedPaths={selectedPaths}
                  onActiveChange={(path) => {
                    setActivePath(path);
                  }}
                  onToggleSelection={toggleSelection}
                />
              </div>
            )}
          </aside>
          {isSidebarOpen && (
            <div
              className="sidebar-resizer"
              onMouseDown={() => setIsResizing(true)}
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize sidebar"
            />
          )}
          <section className="main-panel">
            <div className="utilities-container">
              <button
                className="utilities-toggle"
                onClick={() => setShowUtilities(!showUtilities)}
                aria-expanded={showUtilities}
              >
                <span className="toggle-icon">{showUtilities ? '▾' : '▸'}</span>
                Utilities
              </button>

              {showUtilities && (
                <div className="actions">
                  {/* Selected Items Actions */}
                  {selectedPaths.length > 0 && (
                    <div className="action-group">
                      <span className="action-label">{selectedPaths.length} selected</span>
                      <button
                        className="sidebar-action-button delete-button"
                        onClick={handleDeleteSelected}
                        disabled={deletePlaylists.isPending}
                      >
                        🗑️ Delete
                      </button>
                      <button
                        className="sidebar-action-button"
                        onClick={handleDuplicateSelected}
                        disabled={duplicatePlaylists.isPending}
                      >
                        📋 Duplicate
                      </button>
                      <input
                        value={duplicateName}
                        onChange={(e) => setDuplicateName(e.target.value)}
                        placeholder="New name (optional)"
                        className="action-input"
                      />
                      <div className="move-container">
                        <select
                          className="folder-select"
                          value={moveTargetPath}
                          onChange={(e) => setMoveTargetPath(e.target.value)}
                        >
                          {folderOptions.map((opt) => (
                            <option key={opt.path} value={opt.path}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <button
                          className="sidebar-action-button"
                          onClick={handleMoveSelected}
                          disabled={movePlaylists.isPending}
                        >
                          📁 Move
                        </button>
                      </div>
                      <button
                        className="sidebar-action-button"
                        onClick={clearSelection}
                      >
                        ✕ Clear
                      </button>
                    </div>
                  )}

                  {/* Create New */}
                  <div className="action-group">
                    <span className="action-label">Create New</span>
                    <div className="create-row">
                      <input
                        value={folderName}
                        onChange={(e) => setFolderName(e.target.value)}
                        placeholder="New folder name"
                        className="action-input"
                      />
                      <button
                        className="sidebar-action-button"
                        onClick={() => {
                          if (!folderName) return;
                          createFolder.mutate({ name: folderName, parentPath: activePath ?? DEFAULT_FOLDER_PATH });
                          setFolderName('');
                        }}
                        disabled={createFolder.isPending}
                      >
                        📂 New Folder
                      </button>
                    </div>
                    <div className="create-row">
                      <input
                        value={playlistName}
                        onChange={(e) => setPlaylistName(e.target.value)}
                        placeholder="New playlist name"
                        className="action-input"
                      />
                      <button
                        className="sidebar-action-button"
                        onClick={() => {
                          if (!playlistName) return;
                          createPlaylist.mutate({ name: playlistName, folderPath: activePath ?? DEFAULT_FOLDER_PATH });
                          setPlaylistName('');
                        }}
                        disabled={createPlaylist.isPending}
                      >
                        📝 New Playlist
                      </button>
                    </div>
                    {/* Add Tags Button */}
                    <div className="create-row">
                      <button
                        className="sidebar-action-button"
                        onClick={() => setShowAddTags(true)}
                        disabled={!playlistQuery.data?.tracks?.length}
                        title={playlistQuery.data?.tracks?.length ? `Tag ${playlistQuery.data.tracks.length} tracks with AI` : 'Select a playlist first'}
                      >
                        🏷️ Add Tags (AI)
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="table-section">
              <h2>{playlistQuery.data?.playlistName ?? 'Select a playlist'}</h2>
              {playlistQuery.data?.playlistName && (<PlaylistTable
                isLoading={playlistQuery.isLoading}
                tracks={playlistQuery.data?.tracks ?? []}
              />)}
            </div>
          </section>
        </div>
      ) : (
        /* Track Management - no sidebar, full width */
        <div className="track-management-page">
          <TrackManagement />
        </div>
      )}

      {/* Add Tags Modal */}
      {showAddTags && playlistQuery.data?.tracks && (
        <AddTagsModal
          tracks={playlistQuery.data.tracks}
          onClose={() => setShowAddTags(false)}
        />
      )}
    </div>
  );
};

export default CollectionView;

function findFirstPlaylist(node: SidebarNode): SidebarNode | null {
  if (node.type === 'PLAYLIST') return node;
  for (const child of node.children ?? []) {
    const discovered = findFirstPlaylist(child);
    if (discovered) return discovered;
  }
  return null;
}

function flattenFolders(node: SidebarNode): FlattenedFolder[] {
  const rows: FlattenedFolder[] = [];
  const walk = (current: SidebarNode) => {
    if (current.type === 'FOLDER') {
      rows.push({
        path: current.path,
        label: `${'—'.repeat(current.depth)} ${current.name}`.trim()
      });
      current.children?.forEach(walk);
    }
  };
  walk(node);
  return rows;
}
