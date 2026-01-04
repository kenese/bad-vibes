'use client';

import { useState, useMemo, useEffect } from 'react';
import type { AppRouter } from '~/server/api/root';
import type { inferRouterOutputs } from '@trpc/server';

type SidebarTree = NonNullable<
  inferRouterOutputs<AppRouter>['collection']['sidebar']['tree']
>;

export type FlattenedFolder = { path: string; label: string };

type Props = {
  tree: SidebarTree | null;
  activePath: string | null;
  selectedPaths: string[];
  onActiveChange: (path: string) => void;
  onToggleSelection: (path: string) => void;
};

const Sidebar = ({
  tree,
  activePath,
  selectedPaths,
  onActiveChange,
  onToggleSelection
}: Props) => {
  const folderPaths = useMemo(() => {
    if (!tree) return [];
    const paths: string[] = [];
    const walk = (node: SidebarTree) => {
      if (node.type === 'FOLDER') {
        paths.push(node.path);
        node.children?.forEach(walk);
      }
    };
    tree.children?.forEach(walk);
    return paths;
  }, [tree]);

  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set(folderPaths));

  useEffect(() => {
    setCollapsed(new Set(folderPaths));
  }, [folderPaths]);

  const toggleFolder = (path: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const visibleTree = useMemo(() => tree, [tree]);
  if (!visibleTree) return <p className="tree-empty">No playlists found.</p>;
  const childNodes = visibleTree.children ?? [];
  return (
    <nav className="tree" aria-label="Playlists">
      {childNodes.length === 0 ? (
        <p className="tree-empty">No playlists found.</p>
      ) : (
        childNodes.map((child) => (
          <TreeNode
            key={child.path}
            node={child}
            activePath={activePath}
            selectedPaths={selectedPaths}
            onActiveChange={onActiveChange}
            onToggleSelection={onToggleSelection}
            collapsed={collapsed}
            onToggle={toggleFolder}
          />
        ))
      )}
    </nav>
  );
};

const TreeNode = ({
  node,
  activePath,
  selectedPaths,
  onActiveChange,
  onToggleSelection,
  collapsed,
  onToggle
}: {
  node: SidebarTree;
  activePath: string | null;
  selectedPaths: string[];
  onActiveChange: (path: string) => void;
  onToggleSelection: (path: string) => void;
  collapsed: Set<string>;
  onToggle: (path: string) => void;
}) => {
  const isActive = activePath === node.path;
  const isFolder = node.type === 'FOLDER';
  const isCollapsed = isFolder && collapsed.has(node.path);
  const hasChildren = Boolean(node.children?.length);
  const isChecked = !isFolder && selectedPaths.includes(node.path);
  return (
    <div className={`tree-node depth-${node.depth}`}>
      <div className="tree-node-row">
        {isFolder && hasChildren && (
          <button
            className="tree-toggle"
            aria-label={isCollapsed ? 'Expand folder' : 'Collapse folder'}
            onClick={() => onToggle(node.path)}
          >
            {isCollapsed ? '▸' : '▾'}
          </button>
        )}
        <button
          className={`tree-button ${isActive ? 'selected' : ''}`}
          onClick={() => onActiveChange(node.path)}
        >
          {!isFolder && (
            <input
              type="checkbox"
              className="tree-checkbox"
              checked={isChecked}
              onChange={(evt) => {
                evt.stopPropagation();
                onToggleSelection(node.path);
              }}
              onClick={(evt) => evt.stopPropagation()}
            />
          )}
          <span className="tree-icon" aria-hidden="true">
            {isFolder ? '📁' : '🎵'}
          </span>
          <span className="tree-label">{node.name}</span>
          {node.type === 'PLAYLIST' && (
            <span className="badge">{node.playlistSize ?? 0}</span>
          )}
        </button>
      </div>
      {hasChildren && !isCollapsed && (
        <div className="tree-children">
          {node.children!.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              activePath={activePath}
              selectedPaths={selectedPaths}
              onActiveChange={onActiveChange}
              onToggleSelection={onToggleSelection}
              collapsed={collapsed}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Sidebar;
