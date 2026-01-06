import { randomUUID } from 'node:crypto';
import { put } from '@vercel/blob';
import { XMLBuilder, XMLParser } from 'fast-xml-parser';
import { db } from '../db';

export type SidebarTreeNode = {
  name: string;
  type: NodeKind;
  path: string;
  parentPath: string | null;
  depth: number;
  playlistSize?: number;
  children?: SidebarTreeNode[];
};

export type PlaylistTrackRow = {
  key: string;
  title: string;
  artist?: string;
  album?: string;
  bpm?: number;
  rating?: number;
};

type NodeKind = 'FOLDER' | 'PLAYLIST';
type RawNode = RawFolderNode | RawPlaylistNode;

type RawFolderNode = {
  TYPE: 'FOLDER';
  NAME?: string;
  SUBNODES?: {
    NODE?: RawNode | RawNode[];
    COUNT?: string;
  };
};

type RawPlaylistNode = {
  TYPE: 'PLAYLIST';
  NAME?: string;
  PLAYLIST?: {
    UUID?: string;
    TYPE?: string;
    ENTRIES?: string;
    ENTRY?: RawPlaylistEntry | RawPlaylistEntry[];
  };
};

type RawPlaylistEntry = {
  PRIMARYKEY?: {
    TYPE?: string;
    KEY?: string;
  };
};

type TrackEntry = {
  LOCATION?: TrackLocation;
  TITLE?: string;
  ARTIST?: string;
  ALBUM?: { TITLE?: string };
  INFO?: {
    RATING?: string;
  };
  TEMPO?: {
    BPM?: string | number;
  };
};

type TrackLocation = {
  VOLUME?: string;
  DIR?: string;
  FILE?: string;
};

type NodeReference = {
  path: string;
  type: NodeKind;
  rawNode: RawNode;
  parentPath: string | null;
  parentNode: RawNode | null;
  siblings: RawNode[] | null;
};

type NmlDocument = {
  NML?: {
    COLLECTION?: {
      ENTRY?: TrackEntry | TrackEntry[];
      ENTRIES?: string | number;
    };
    PLAYLISTS?: {
      NODE?: RawNode | RawNode[];
    };
  };
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  parseAttributeValue: true,
  allowBooleanAttributes: true
});

const compactBuilder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  format: false,
  suppressBooleanAttributes: false
});

const slugify = (value: string) => {
  try {
    return typeof value === 'string'
      ? value
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .slice(0, 40) || 'node'
      : value;
  } catch {
    return '';
  }
};

const toArray = <T>(maybe: T | T[] | undefined): T[] => {
  if (maybe == null) return [];
  return Array.isArray(maybe) ? maybe : [maybe];
};

export class CollectionService {
  private collectionPath: string;
  private readonly userId: string;
  private document: NmlDocument | null = null;
  private trackIndex = new Map<string, TrackEntry>();
  private pathIndex = new Map<string, NodeReference>();
  private treeCache: SidebarTreeNode | null = null;
  private playlistCount = 0;
  private cacheDirty = true;
  private idCounter = 0;
  private loadingPromise: Promise<void> | null = null;

  constructor(userId: string, filePath: string) {
    this.userId = userId;
    this.collectionPath = filePath;
  }

  async load(): Promise<void> {
    if (this.loadingPromise) {
      await this.loadingPromise;
      return;
    }
    this.loadingPromise = this.readDocument();
    await this.loadingPromise;
    this.loadingPromise = null;
  }

  async getSidebar() {
    await this.ensureLoaded();
    const tree = this.ensureTree();
    return {
      stats: {
        playlistCount: this.playlistCount,
        trackCount: this.trackIndex.size
      },
      tree
    };
  }

  async getXml(): Promise<string> {
    await this.ensureLoaded();
    if (!this.document) {
      throw new Error('Collection not loaded');
    }
    const xmlBody = compactBuilder.build(this.document);
    return xmlBody.startsWith('<?xml')
      ? xmlBody
      : `<?xml version="1.0" encoding="UTF-8"?>\n${xmlBody}`;
  }

  async getPlaylistTracks(nodePath: string) {
    await this.ensureLoaded();
    const ref = this.getNodeRef(nodePath);
    if (ref.type !== 'PLAYLIST') {
      throw new Error('Selected node is not a playlist');
    }
    const playlist = (ref.rawNode as RawPlaylistNode).PLAYLIST;
    const entries = toArray(playlist?.ENTRY);
    const tracks: PlaylistTrackRow[] = entries
      .map((entry) => entry.PRIMARYKEY?.KEY)
      .filter((key): key is string => Boolean(key))
      .map((key) => this.buildTrackRow(key));
    return {
      playlistName: ref.rawNode.NAME ?? 'Untitled Playlist',
      tracks
    };
  }

  async createFolder(input: { parentPath: string; name: string }) {
    await this.ensureLoaded();
    const parentRef = this.getNodeRef(input.parentPath);
    const folderNode = this.assertFolder(parentRef);
    const children = this.getChildrenArray(folderNode);
    const newFolder: RawFolderNode = {
      TYPE: 'FOLDER',
      NAME: input.name,
      SUBNODES: { NODE: [], COUNT: '0' }
    };
    children.unshift(newFolder);
    folderNode.SUBNODES!.COUNT = String(children.length);
    await this.persist();
    return { success: true };
  }

  async createPlaylist(input: { folderPath: string; name: string }) {
    await this.ensureLoaded();
    const parentRef = this.getNodeRef(input.folderPath);
    const folderNode = this.assertFolder(parentRef);
    const children = this.getChildrenArray(folderNode);
    const uuid = randomUUID().replace(/-/g, '');
    const newPlaylist: RawPlaylistNode = {
      TYPE: 'PLAYLIST',
      NAME: input.name,
      PLAYLIST: {
        UUID: uuid,
        TYPE: 'LIST',
        ENTRIES: '0',
        ENTRY: []
      }
    };
    children.unshift(newPlaylist);
    folderNode.SUBNODES!.COUNT = String(children.length);
    await this.persist();
    return { success: true };
  }

  async movePlaylist(input: { sourcePath: string; targetFolderPath: string }) {
    await this.ensureLoaded();
    const sourceRef = this.getNodeRef(input.sourcePath);
    if (sourceRef.type !== 'PLAYLIST') {
      throw new Error('Only playlists can be moved');
    }
    const sourceSiblings = sourceRef.siblings;
    if (!sourceSiblings) {
      throw new Error('Unable to locate playlist parent');
    }
    const sourceIndex = sourceSiblings.findIndex((node) => node === sourceRef.rawNode);
    if (sourceIndex === -1) {
      throw new Error('Playlist missing from its parent');
    }
    sourceSiblings.splice(sourceIndex, 1);
    const parentNode = this.assertFolder(this.getNodeRef(input.targetFolderPath));
    const targetChildren = this.getChildrenArray(parentNode);
    targetChildren.unshift(sourceRef.rawNode as RawPlaylistNode);
    parentNode.SUBNODES!.COUNT = String(targetChildren.length);
    if (sourceRef.parentNode && (sourceRef.parentNode as RawFolderNode).SUBNODES) {
      (sourceRef.parentNode as RawFolderNode).SUBNODES!.COUNT = String(sourceSiblings.length);
    }
    await this.persist();
    return { success: true };
  }

  async createOrphansPlaylist(input: { targetFolderPath: string; name?: string }) {
    await this.ensureLoaded();
    const parentNode = this.assertFolder(this.getNodeRef(input.targetFolderPath));
    const allTracks = new Set(this.trackIndex.keys());
    const playlistTracks = new Set<string>();
    const root = this.ensureRootNode();
    this.walkRaw(root, (node) => {
      if (node.TYPE !== 'PLAYLIST') return;
      const entries = toArray(node.PLAYLIST?.ENTRY);
      entries.forEach((entry) => {
        const key = entry.PRIMARYKEY?.KEY;
        if (key) playlistTracks.add(key);
      });
    });
    const orphans = [...allTracks].filter((key) => !playlistTracks.has(key));
    if (!orphans.length) {
      return { success: false, createdEntries: 0 };
    }
    const playlistName = input.name?.trim() ?? 'Orphans Generated';
    const playlistNode = this.buildPlaylistNode(playlistName, orphans);
    const children = this.getChildrenArray(parentNode);
    children.unshift(playlistNode);
    parentNode.SUBNODES!.COUNT = String(children.length);
    await this.persist();
    return { success: true, createdEntries: orphans.length };
  }

  async duplicatePlaylist(input: {
    sourcePath: string;
    targetFolderPath: string;
    name?: string;
  }) {
    await this.ensureLoaded();
    const sourceRef = this.getNodeRef(input.sourcePath);
    if (sourceRef.type !== 'PLAYLIST') {
      throw new Error('Source must be a playlist');
    }
    const entries = toArray((sourceRef.rawNode as RawPlaylistNode).PLAYLIST?.ENTRY);
    const keys = entries
      .map((entry) => entry.PRIMARYKEY?.KEY)
      .filter((key): key is string => Boolean(key));
    const parentNode = this.assertFolder(this.getNodeRef(input.targetFolderPath));
    const playlistName = input.name?.trim() ?? `${sourceRef.rawNode.NAME ?? 'Playlist'} Copy`;
    const playlistNode = this.buildPlaylistNode(playlistName, keys);
    const children = this.getChildrenArray(parentNode);
    children.unshift(playlistNode);
    parentNode.SUBNODES!.COUNT = String(children.length);
    await this.persist();
    return { success: true, createdEntries: keys.length };
  }

  async renamePlaylist(input: { path: string; name: string }) {
    await this.ensureLoaded();
    const ref = this.getNodeRef(input.path);
    if (ref.type !== 'PLAYLIST') {
      throw new Error('Only playlists can be renamed');
    }
    ref.rawNode.NAME = input.name;
    await this.persist();
    return { success: true };
  }

  async deleteNodes(paths: string[]) {
    await this.ensureLoaded();
    for (const nodePath of paths) {
      try {
        const ref = this.getNodeRef(nodePath);
        const siblings = ref.siblings;
        if (!siblings) continue;

        const index = siblings.findIndex((node) => node === ref.rawNode);
        if (index !== -1) {
          siblings.splice(index, 1);
          if (ref.parentNode && (ref.parentNode as RawFolderNode).SUBNODES) {
            (ref.parentNode as RawFolderNode).SUBNODES!.COUNT = String(siblings.length);
          }
        }
      } catch (e) {
        console.error(`Failed to delete node at ${nodePath}:`, e);
      }
    }
    await this.persist();
    return { success: true };
  }

  async loadFromXml(xml: string) {
    this.document = parser.parse(xml) as NmlDocument;
    this.refreshTrackIndex();
    this.invalidateTree();
    this.loadingPromise = null;
  }

  private async readDocument() {
    let xml: string;

    if (this.collectionPath.startsWith('memory:')) {
      if (this.document) {
        // Already loaded in memory
        return;
      }
      throw new Error('Session Expired: In-memory collection lost. Please upload again.');
    }

    try {
      if (this.collectionPath.startsWith('http')) {
        console.log(`[CollectionService] Fetching remote collection from: ${this.collectionPath}`);
        const response = await fetch(this.collectionPath);
        console.log(`[CollectionService] Fetch status: ${response.status} ${response.statusText}`);
        
        if (!response.ok) {
          console.error(`Collection file missing or error at ${this.collectionPath}. Status: ${response.status}`);
          return;
        }
        xml = await response.text();
        console.log(`[CollectionService] Fetched ${xml.length} bytes`);
      } else {
        // Local file path - use Node.js fs
        const fs = await import('node:fs/promises');
        xml = await fs.readFile(this.collectionPath, 'utf-8');
      }
    } catch (error) {
      console.error('[CollectionService] Error reading document:', error);
      if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
        console.warn(`Collection file missing at ${this.collectionPath}. Clearing stale path.`);
        return;
      }
      throw error;
    }

    this.document = parser.parse(xml) as NmlDocument;
    this.refreshTrackIndex();
    this.invalidateTree();
  }

  private async ensureLoaded() {
    // If it's a memory path and no document, load() will call readDocument which throws
    if (!this.document) {
      await this.load();
    }
  }

  private invalidateTree() {
    this.cacheDirty = true;
    this.treeCache = null;
    this.pathIndex.clear();
    this.idCounter = 0;
  }

  private ensureTree(): SidebarTreeNode | null {
    if (!this.document) {
      return null;
    }
    if (!this.cacheDirty && this.treeCache) {
      return this.treeCache;
    }
    const root = this.ensureRootNode();
    const { tree, playlistCount } = this.buildSidebar(root);
    this.playlistCount = playlistCount;
    this.treeCache = tree;
    this.cacheDirty = false;
    return tree;
  }

  private ensureRootNode(): RawFolderNode {
    const doc = this.document;
    if (!doc?.NML?.PLAYLISTS) {
      throw new Error('PLAYLISTS section missing from collection');
    }
    const playlists = doc.NML.PLAYLISTS;
    const nodes = toArray(playlists.NODE);
    if (!nodes.length) {
      const emptyRoot: RawFolderNode = {
        TYPE: 'FOLDER',
        NAME: 'ROOT',
        SUBNODES: { NODE: [], COUNT: '0' }
      };
      playlists.NODE = emptyRoot;
      return emptyRoot;
    }
    const rootCandidate = nodes.find(
      (node) => node.TYPE === 'FOLDER' && (node.NAME === 'ROOT' || node.NAME === '$ROOT')
    );
    if (rootCandidate?.TYPE === 'FOLDER') {
      return rootCandidate;
    }
    const newRoot: RawFolderNode = {
      TYPE: 'FOLDER',
      NAME: 'ROOT',
      SUBNODES: {
        NODE: nodes,
        COUNT: String(nodes.length)
      }
    };
    playlists.NODE = newRoot;
    return newRoot;
  }

  private buildSidebar(root: RawFolderNode) {
    this.pathIndex.clear();
    this.idCounter = 0;
    const walk = (
      node: RawNode,
      meta: {
        path: string;
        parentPath: string | null;
        depth: number;
        parentNode: RawNode | null;
        siblings: RawNode[] | null;
      }
    ): { tree: SidebarTreeNode; playlistCount: number } => {
      const reference: NodeReference = {
        path: meta.path,
        type: node.TYPE,
        rawNode: node,
        parentNode: meta.parentNode,
        parentPath: meta.parentPath,
        siblings: meta.siblings
      };
      this.pathIndex.set(meta.path, reference);

      const sidebarNode: SidebarTreeNode = {
        name: node.NAME ?? 'Untitled',
        type: node.TYPE,
        path: meta.path,
        parentPath: meta.parentPath,
        depth: meta.depth
      };

      if (node.TYPE === 'PLAYLIST') {
        const entryCount = toArray(node.PLAYLIST?.ENTRY).length;
        sidebarNode.playlistSize = entryCount;
        return { tree: sidebarNode, playlistCount: 1 };
      }

      const childrenArray = this.getChildrenArray(node);
      const children: SidebarTreeNode[] = [];
      let playlistCount = 0;
      childrenArray.forEach((child) => {
        const childPath = this.composeChildPath(meta.path, child);
        const result = walk(child, {
          path: childPath,
          parentPath: meta.path,
          depth: meta.depth + 1,
          parentNode: node,
          siblings: childrenArray
        });
        children.push(result.tree);
        playlistCount += result.playlistCount;
      });
      if (children.length) {
        sidebarNode.children = children;
      }
      return { tree: sidebarNode, playlistCount };
    };

    if (!root) {
      return { tree: null, playlistCount: 0 } as unknown as {
        tree: SidebarTreeNode;
        playlistCount: number;
      };
    }

    return walk(root, {
      path: 'root',
      parentPath: null,
      depth: 0,
      parentNode: null,
      siblings: null
    });
  }

  private composeChildPath(parentPath: string, node: RawNode) {
    const segment = slugify(node.NAME ?? `${node.TYPE.toLowerCase()}-${this.idCounter}`);
    this.idCounter += 1;
    return `${parentPath}/${segment}-${this.idCounter}`;
  }

  private getNodeRef(nodePath: string): NodeReference {
    this.ensureTree();
    const ref = this.pathIndex.get(nodePath);
    if (!ref) {
      throw new Error(`Unable to find node for path: ${nodePath}`);
    }
    return ref;
  }

  private assertFolder(ref: NodeReference): RawFolderNode {
    if (ref.type !== 'FOLDER') {
      throw new Error('Target node is not a folder');
    }
    return ref.rawNode as RawFolderNode;
  }

  private getChildrenArray(node: RawFolderNode): RawNode[] {
    if (!node.SUBNODES) {
      const nodes: RawNode[] = [];
      node.SUBNODES = { NODE: nodes, COUNT: '0' };
      return nodes;
    }
    if (!node.SUBNODES.NODE) {
      const nodes: RawNode[] = [];
      node.SUBNODES.NODE = nodes;
      node.SUBNODES.COUNT = '0';
      return nodes;
    }
    if (Array.isArray(node.SUBNODES.NODE)) {
      return node.SUBNODES.NODE;
    }
    const nodes = [node.SUBNODES.NODE];
    node.SUBNODES.NODE = nodes;
    node.SUBNODES.COUNT = String(nodes.length);
    return nodes;
  }

  private buildTrackRow(key: string): PlaylistTrackRow {
    const entry = this.trackIndex.get(key);
    if (!entry) {
      return {
        key,
        title: 'Missing Track'
      };
    }
    const bpmValue = entry.TEMPO?.BPM;
    const bpm = typeof bpmValue === 'number' ? bpmValue : Number(bpmValue ?? '') || undefined;
    const ratingValue = entry.INFO?.RATING;
    const rating = Number(ratingValue ?? '') || undefined;
    return {
      key,
      title: entry.TITLE ?? 'Untitled',
      artist: entry.ARTIST ?? undefined,
      album: entry.ALBUM?.TITLE ?? undefined,
      bpm,
      rating
    };
  }

  private buildPlaylistNode(name: string, keys: string[]): RawPlaylistNode {
    return {
      TYPE: 'PLAYLIST',
      NAME: name,
      PLAYLIST: {
        UUID: randomUUID().replace(/-/g, ''),
        TYPE: 'LIST',
        ENTRIES: String(keys.length),
        ENTRY: keys.map((key) => ({
          PRIMARYKEY: {
            TYPE: 'TRACK',
            KEY: key
          }
        }))
      }
    };
  }

  private walkRaw(node: RawNode, visitor: (node: RawNode) => void) {
    visitor(node);
    if (node.TYPE === 'FOLDER') {
      const children = this.getChildrenArray(node);
      children.forEach((child) => this.walkRaw(child, visitor));
    }
  }

  private refreshTrackIndex() {
    const entries = toArray(this.document?.NML?.COLLECTION?.ENTRY);
    this.trackIndex.clear();
    entries.forEach((entry) => {
      const key = this.buildTrackKey(entry.LOCATION);
      if (key) {
        this.trackIndex.set(key, entry);
      }
    });
  }

  private buildTrackKey(location?: TrackLocation) {
    if (!location) return null;
    return `${location.VOLUME ?? ''}${location.DIR ?? ''}${location.FILE ?? ''}`;
  }

  private async persist() {
    if (!this.document) {
      throw new Error('Collection not loaded');
    }

    if (this.collectionPath.startsWith('memory:')) {
      // In-memory collection: state is already updated in this.document
      // No persistence to disk or blob needed.
      // We might want to invalidate tree cache though if we want to force re-render logic,
      // but invalidating tree happens in operations usually.
      this.invalidateTree();
      return;
    }

    const xmlBody = compactBuilder.build(this.document);
    const output = xmlBody.startsWith('<?xml')
      ? xmlBody
      : `<?xml version="1.0" encoding="UTF-8"?>\n${xmlBody}`;

    // Store in Vercel Blob
    const { url } = await put(`collections/${this.userId}/collection.nml`, output, {
      access: 'public',
      contentType: 'text/xml',
      addRandomSuffix: false // Overwrite existing file
    });

    // Update the database with the new URL
    await db.user.update({
      where: { id: this.userId },
      data: { collectionPath: url }
    });

    // Update local reference to the new URL
    this.collectionPath = url;
    
    this.invalidateTree();
  }
}

