'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { api } from '~/trpc/react';
import Sidebar, { type FlattenedFolder } from './Sidebar';
import PlaylistTable from './PlaylistTable';
import type { AppRouter } from '~/server/api/root';
import type { inferRouterOutputs } from '@trpc/server';

const DEFAULT_FOLDER_PATH = 'root';

type SidebarNode = NonNullable<
  inferRouterOutputs<AppRouter>['collection']['sidebar']['tree']
>;

const CollectionView = () => {
  const utils = api.useUtils();
  const sidebarQuery = api.collection.sidebar.useQuery();
  const [activePath, setActivePath] = useState<string | null>(null);
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [companionName, setCompanionName] = useState('');
  const [folderName, setFolderName] = useState('');
  const [playlistName, setPlaylistName] = useState('');
  const [moveTargetPath, setMoveTargetPath] = useState(DEFAULT_FOLDER_PATH);
  const [sidebarWidth, setSidebarWidth] = useState(300);
  const [isResizing, setIsResizing] = useState(false);
  const [showUtilities, setShowUtilities] = useState(false);

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

  useEffect(() => {
    if (!activePath && sidebarQuery.data?.tree) {
      const firstPlaylist = findFirstPlaylist(sidebarQuery.data.tree);
      setActivePath(firstPlaylist?.path ?? sidebarQuery.data.tree.path);
    }
  }, [sidebarQuery.data, activePath]);

  const playlistQuery = api.collection.playlistTracks.useQuery(
    { path: activePath ?? '' },
    { enabled: Boolean(activePath) }
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
  const movePlaylist = api.collection.movePlaylist.useMutation({
    onSuccess: () => void utils.collection.sidebar.invalidate()
  });
  const createOrphans = api.collection.createOrphansPlaylist.useMutation({
    onSuccess: () => void utils.collection.sidebar.invalidate()
  });
  const createReleaseCompanion = api.collection.createReleaseCompanionPlaylist.useMutation({
    onSuccess: () => void utils.collection.sidebar.invalidate()
  });
  const deleteNodes = api.collection.deleteNodes.useMutation({
    onSuccess: () => {
      void utils.collection.sidebar.invalidate();
      setSelectedPaths([]);
    }
  });

  const selectedFolderPath =
    activeNode?.type === 'FOLDER'
      ? activeNode.path
      : activeNode?.parentPath ?? DEFAULT_FOLDER_PATH;

  const handleCreateFolder = (evt: React.FormEvent) => {
    evt.preventDefault();
    if (!folderName.trim()) return;
    createFolder.mutate({
      parentPath: selectedFolderPath ?? DEFAULT_FOLDER_PATH,
      name: folderName.trim()
    });
    setFolderName('');
  };

  const handleCreatePlaylist = (evt: React.FormEvent) => {
    evt.preventDefault();
    if (!playlistName.trim()) return;
    createPlaylist.mutate({
      folderPath: selectedFolderPath ?? DEFAULT_FOLDER_PATH,
      name: playlistName.trim()
    });
    setPlaylistName('');
  };

  const handleMovePlaylists = async (evt: React.FormEvent) => {
    evt.preventDefault();
    if (!selectedPaths.length) return;
    await Promise.all(
      selectedPaths.map((sourcePath) =>
        movePlaylist.mutateAsync({ sourcePath, targetFolderPath: moveTargetPath })
      )
    );
    setSelectedPaths([]);
  };

  const handleCreateOrphans = () => {
    createOrphans.mutate({
      targetFolderPath: selectedFolderPath ?? DEFAULT_FOLDER_PATH
    });
  };

  const handleCreateReleaseCompanion = () => {
    if (activeNode?.type !== 'PLAYLIST') return;
    createReleaseCompanion.mutate({
      sourcePath: activeNode.path,
      targetFolderPath: selectedFolderPath ?? DEFAULT_FOLDER_PATH,
      name: companionName.trim() || undefined
    });
    setCompanionName('');
  };
  const handleDeleteSelected = async () => {
    if (!selectedPaths.length) return;
    if (!confirm(`Are you sure you want to delete ${selectedPaths.length} items?`)) return;
    await deleteNodes.mutateAsync({ paths: selectedPaths });
  };

  const toggleSelection = (path: string) => {
    setSelectedPaths((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    );
  };

  return (
    <div
      className={`app-shell ${isResizing ? 'resizing' : ''}`}
      style={{ gridTemplateColumns: `${sidebarWidth}px 6px 1fr` }}
    >
      <aside className="sidebar-panel">
        <header>
          <h1>Traktor Collection</h1>
          <p className="meta">
            {sidebarQuery.isLoading
              ? 'Loading...'
              : `${sidebarQuery.data?.stats.playlistCount ?? 0} playlists · ${
                  sidebarQuery.data?.stats.trackCount ?? 0
                } tracks`}
          </p>
        </header>
        <Sidebar
          tree={sidebarQuery.data?.tree ?? null}
          activePath={activePath}
          selectedPaths={selectedPaths}
          onActiveChange={setActivePath}
          onToggleSelection={toggleSelection}
        />
      </aside>
      <div
        className="sidebar-resizer"
        onMouseDown={() => setIsResizing(true)}
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize sidebar"
      />
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
              <form onSubmit={handleCreateFolder}>
                <label>Create folder under current selection</label>
                <div className="row">
                  <input
                    value={folderName}
                    onChange={(e) => setFolderName(e.target.value)}
                    placeholder="Folder name"
                  />
                  <button type="submit" disabled={createFolder.isPending}>
                    {createFolder.isPending ? 'Creating…' : 'Create'}
                  </button>
                </div>
              </form>

              <form onSubmit={handleCreatePlaylist}>
                <label>Create empty playlist in current folder</label>
                <div className="row">
                  <input
                    value={playlistName}
                    onChange={(e) => setPlaylistName(e.target.value)}
                    placeholder="Playlist name"
                  />
                  <button type="submit" disabled={createPlaylist.isPending}>
                    {createPlaylist.isPending ? 'Creating…' : 'Create'}
                  </button>
                </div>
              </form>

              <form onSubmit={handleMovePlaylists}>
                <label>
                  Move selected playlists
                  {selectedPaths.length > 0 && ` (${selectedPaths.length})`}
                </label>
                <div className="row">
                  <select
                    value={moveTargetPath}
                    onChange={(e) => setMoveTargetPath(e.target.value)}
                  >
                    {folderOptions.map((folder) => (
                      <option key={folder.path} value={folder.path}>
                        {folder.label}
                      </option>
                    ))}
                  </select>
                  <button type="submit" disabled={!selectedPaths.length || movePlaylist.isPending}>
                    {movePlaylist.isPending ? 'Moving…' : 'Move'}
                  </button>
                </div>
              </form>

              <div className="row stack">
                <button onClick={handleCreateOrphans} disabled={createOrphans.isPending}>
                  {createOrphans.isPending ? 'Working…' : 'Create Orphans Playlist'}
                </button>
                <div className="companion">
                  <input
                    value={companionName}
                    onChange={(e) => setCompanionName(e.target.value)}
                    placeholder="Companion playlist name (optional)"
                  />
                  <button
                    onClick={handleCreateReleaseCompanion}
                    disabled={activeNode?.type !== 'PLAYLIST' || createReleaseCompanion.isPending}
                  >
                    {createReleaseCompanion.isPending ? 'Working…' : 'Create Release Companion'}
                  </button>
                </div>
              </div>
              <div className="row stack">
                <label>Dangerous Actions</label>
                <button
                  className="delete-button"
                  onClick={handleDeleteSelected}
                  disabled={!selectedPaths.length || deleteNodes.isPending}
                >
                  {deleteNodes.isPending
                    ? 'Deleting…'
                    : `Delete Selected (${selectedPaths.length})`}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="table-section">
          <h2>{playlistQuery.data?.playlistName ?? 'Select a playlist'}</h2>
          <PlaylistTable
            isLoading={playlistQuery.isLoading}
            tracks={playlistQuery.data?.tracks ?? []}
          />
        </div>
      </section>
    </div>
  );
};

export default CollectionView;

const findFirstPlaylist = (node: SidebarNode): SidebarNode | null => {
  if (node.type === 'PLAYLIST') return node;
  for (const child of node.children ?? []) {
    const discovered = findFirstPlaylist(child);
    if (discovered) return discovered;
  }
  return null;
};

const flattenFolders = (node: SidebarNode): FlattenedFolder[] => {
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
};
