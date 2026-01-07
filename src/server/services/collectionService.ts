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

type NodeKind = 'FOLDER' | 'PLAYLIST' | 'SMARTLIST';
type RawNode = RawFolderNode | RawPlaylistNode | RawSmartListNode;

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

type RawSmartListNode = {
  TYPE: 'SMARTLIST';
  NAME?: string;
  SMARTLIST?: {
    UUID?: string;
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
  ALBUM?: { 
    TITLE?: string; 
    TRACK?: string;
    OF_TRACKS?: string;
  };
  INFO?: {
    BITRATE?: string;
    GENRE?: string;
    LABEL?: string;
    COMMENT?: string;
    RATING?: string;
    KEY?: string;
    PLAYCOUNT?: string;
    PLAYTIME?: string;
    PLAYTIME_FLOAT?: string;
    IMPORT_DATE?: string;
    LAST_PLAYED?: string;
    RELEASE_DATE?: string;
    COVERARTID?: string;
    FILESIZE?: string;
    FLAGS?: string;
    PRODUCER?: string;
    KEY_LYRICS?: string;
  };
  TEMPO?: { 
    BPM?: string | number; 
    BPM_QUALITY?: string;
  };
  MUSICAL_KEY?: { VALUE?: string };
  LOUDNESS?: { 
    PEAK_DB?: string; 
    PERCEIVED_DB?: string; 
    ANALYZED_DB?: string;
  };
  MODIFICATION_INFO?: { AUTHOR_TYPE?: string };
  MODIFIED_DATE?: string;
  MODIFIED_TIME?: string;
  AUDIO_ID?: string;
  LOCK?: string;
  LOCK_MODIFICATION_TIME?: string;
};

type TrackLocation = {
  VOLUME?: string;
  DIR?: string;
  FILE?: string;
  VOLUMEID?: string;
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

// ============ Track Management Types ============

export type FullTrackRow = {
  trackKey: string;  // Unique identifier for the track (volume+dir+file)
  title: string;
  artist: string;
  album: string;
  albumTrack: string;
  bpm?: number;
  bpmQuality: string;
  rating: string;
  comment: string;
  genre: string;
  label: string;
  musicalKey: string;
  playcount: string;
  playtime: string;
  importDate: string;
  lastPlayed: string;
  releaseDate: string;
  bitrate: string;
  filesize: string;
  filepath: string;
};

export type TrackFieldUpdates = {
  title?: string;
  artist?: string;
  album?: string;
  comment?: string;
  genre?: string;
  label?: string;
  rating?: string;
  key?: string;
  bpm?: number;
};

export type CombinationComment = {
  comment: string;
  categories: string[];
};

export type CategorizedComments = {
  keyBpm: string[];
  genre: string[];
  url: string[];
  hex: string[];
  combination: CombinationComment[];
  other: string[];
};

// ============ Apply Style Tags Types ============

export type PlaylistTagInfo = {
  path: string;
  name: string;
};

export type TagWithPlaylists = {
  tag: string;
  count: number;
  playlists: PlaylistTagInfo[];
};

export type ExtractedTags = {
  tags: TagWithPlaylists[];
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  parseAttributeValue: false,  // Keep values as strings to preserve "1.0", "20", etc.
  allowBooleanAttributes: true,
  trimValues: false,           // Preserve leading/trailing whitespace in attribute values (folder names use spaces for sort order)
});

const compactBuilder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  format: true,                // Format with newlines for readability
  suppressBooleanAttributes: false,
  preserveOrder: false,        // We manage order via arrays, not preserveOrder mode
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
  private originalXml: string | null = null;  // Store original XML for unchanged downloads
  private modified = false;                    // Track if any changes were made
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
    // Return original XML if no modifications were made
    if (!this.modified && this.originalXml) {
      return this.originalXml;
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

  async movePlaylistBatch(moves: Array<{ sourcePath: string; targetFolderPath: string }>) {
    await this.ensureLoaded();
    
    const results: Array<{ sourcePath: string; success: boolean; error?: string }> = [];
    
    for (const move of moves) {
      try {
        const sourceRef = this.getNodeRef(move.sourcePath);
        if (sourceRef.type !== 'PLAYLIST') {
          results.push({ sourcePath: move.sourcePath, success: false, error: 'Only playlists can be moved' });
          continue;
        }
        const sourceSiblings = sourceRef.siblings;
        if (!sourceSiblings) {
          results.push({ sourcePath: move.sourcePath, success: false, error: 'Unable to locate playlist parent' });
          continue;
        }
        const sourceIndex = sourceSiblings.findIndex((node) => node === sourceRef.rawNode);
        if (sourceIndex === -1) {
          results.push({ sourcePath: move.sourcePath, success: false, error: 'Playlist missing from its parent' });
          continue;
        }
        
        // Move the node
        sourceSiblings.splice(sourceIndex, 1);
        const parentNode = this.assertFolder(this.getNodeRef(move.targetFolderPath));
        const targetChildren = this.getChildrenArray(parentNode);
        targetChildren.unshift(sourceRef.rawNode as RawPlaylistNode);
        parentNode.SUBNODES!.COUNT = String(targetChildren.length);
        if (sourceRef.parentNode && (sourceRef.parentNode as RawFolderNode).SUBNODES) {
          (sourceRef.parentNode as RawFolderNode).SUBNODES!.COUNT = String(sourceSiblings.length);
        }
        
        results.push({ sourcePath: move.sourcePath, success: true });
      } catch (err) {
        results.push({ 
          sourcePath: move.sourcePath, 
          success: false, 
          error: err instanceof Error ? err.message : 'Unknown error' 
        });
      }
    }
    
    // Only persist once after all moves
    await this.persist();
    
    return { results, movedCount: results.filter(r => r.success).length };
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
    this.originalXml = xml;
    this.modified = false;
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

    this.originalXml = xml;
    this.modified = false;
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

      // SMARTLIST nodes don't have children in the same way as folders
      if (node.TYPE === 'SMARTLIST') {
        return { tree: sidebarNode, playlistCount: 0 };
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

  // ============ Track Management Methods ============

  async getAllTracks(): Promise<FullTrackRow[]> {
    await this.ensureLoaded();
    const tracks: FullTrackRow[] = [];
    
    this.trackIndex.forEach((entry, key) => {
      tracks.push(this.buildFullTrackRow(key, entry));
    });
    
    return tracks;
  }

  async updateTrack(key: string, updates: TrackFieldUpdates): Promise<{ success: boolean }> {
    await this.ensureLoaded();
    const entry = this.trackIndex.get(key);
    if (!entry) {
      throw new Error(`Track not found: ${key}`);
    }
    
    this.applyTrackUpdates(entry, updates);
    await this.persist();
    return { success: true };
  }

  async updateTracksBatch(updates: Array<{ key: string; updates: TrackFieldUpdates }>): Promise<{ 
    success: boolean; 
    updatedCount: number;
    errors: Array<{ key: string; error: string }>;
  }> {
    await this.ensureLoaded();
    const errors: Array<{ key: string; error: string }> = [];
    let updatedCount = 0;

    for (const { key, updates: trackUpdates } of updates) {
      const entry = this.trackIndex.get(key);
      if (!entry) {
        errors.push({ key, error: 'Track not found' });
        continue;
      }
      
      this.applyTrackUpdates(entry, trackUpdates);
      updatedCount++;
    }

    if (updatedCount > 0) {
      await this.persist();
    }
    
    return { success: errors.length === 0, updatedCount, errors };
  }

  async getUniqueComments(): Promise<CategorizedComments> {
    await this.ensureLoaded();
    
    const comments = new Set<string>();
    this.trackIndex.forEach((entry) => {
      const comment = entry.INFO?.COMMENT;
      if (comment?.trim()) {
        comments.add(comment);
      }
    });

    return this.categorizeComments([...comments]);
  }

  async updateCommentsBatch(
    oldComments: string[], 
    newComment: string
  ): Promise<{ success: boolean; updatedCount: number }> {
    await this.ensureLoaded();
    const oldSet = new Set(oldComments);
    let updatedCount = 0;

    this.trackIndex.forEach((entry) => {
      const current = entry.INFO?.COMMENT;
      if (current && oldSet.has(current)) {
        entry.INFO ??= {};
        entry.INFO.COMMENT = newComment || undefined; // Empty string clears
        updatedCount++;
      }
    });

    if (updatedCount > 0) {
      await this.persist();
    }

    return { success: true, updatedCount };
  }

  private buildFullTrackRow(key: string, entry: TrackEntry): FullTrackRow {
    const bpmValue = entry.TEMPO?.BPM;
    return {
      trackKey: key,
      title: entry.TITLE ?? '',
      artist: entry.ARTIST ?? '',
      album: entry.ALBUM?.TITLE ?? '',
      albumTrack: entry.ALBUM?.TRACK ?? '',
      bpm: typeof bpmValue === 'number' ? bpmValue : Number(bpmValue) || undefined,
      bpmQuality: entry.TEMPO?.BPM_QUALITY ?? '',
      rating: entry.INFO?.RATING ?? '',
      comment: entry.INFO?.COMMENT ?? '',
      genre: entry.INFO?.GENRE ?? '',
      label: entry.INFO?.LABEL ?? '',
      musicalKey: entry.INFO?.KEY ?? entry.MUSICAL_KEY?.VALUE ?? '',
      playcount: entry.INFO?.PLAYCOUNT ?? '',
      playtime: entry.INFO?.PLAYTIME ?? '',
      importDate: entry.INFO?.IMPORT_DATE ?? '',
      lastPlayed: entry.INFO?.LAST_PLAYED ?? '',
      releaseDate: entry.INFO?.RELEASE_DATE ?? '',
      bitrate: entry.INFO?.BITRATE ?? '',
      filesize: entry.INFO?.FILESIZE ?? '',
      filepath: `${entry.LOCATION?.VOLUME ?? ''}${entry.LOCATION?.DIR ?? ''}${entry.LOCATION?.FILE ?? ''}`,
    };
  }

  private applyTrackUpdates(entry: TrackEntry, updates: TrackFieldUpdates): void {
    if (updates.title !== undefined) entry.TITLE = updates.title || undefined;
    if (updates.artist !== undefined) entry.ARTIST = updates.artist || undefined;
    
    if (updates.album !== undefined) {
      entry.ALBUM ??= {};
      entry.ALBUM.TITLE = updates.album || undefined;
    }
    
    if (updates.comment !== undefined || updates.genre !== undefined || 
        updates.label !== undefined || updates.rating !== undefined ||
        updates.key !== undefined) {
      entry.INFO ??= {};
      if (updates.comment !== undefined) entry.INFO.COMMENT = updates.comment || undefined;
      if (updates.genre !== undefined) entry.INFO.GENRE = updates.genre || undefined;
      if (updates.label !== undefined) entry.INFO.LABEL = updates.label || undefined;
      if (updates.rating !== undefined) entry.INFO.RATING = updates.rating || undefined;
      if (updates.key !== undefined) entry.INFO.KEY = updates.key || undefined;
    }
    
    if (updates.bpm !== undefined) {
      entry.TEMPO ??= {};
      entry.TEMPO.BPM = updates.bpm?.toString() ?? undefined;
    }
  }

  private categorizeComments(comments: string[]): CategorizedComments {
    const result: CategorizedComments = {
      keyBpm: [],
      genre: [],
      url: [],
      hex: [],
      combination: [],
      other: [],
    };

    const genres = [
      'house', 'hip hop', 'hip-hop', 'hiphop', 'rap', 'r&b', 'rnb', 'soul', 'funk',
      'jazz', 'disco', 'electronic', 'electro', 'techno', 'drum and bass', 'dnb',
      'dubstep', 'garage', 'grime', 'afrobeat', 'afrobeats', 'reggae', 'dancehall',
      'latin', 'salsa', 'cumbia', 'brazilian', 'bossa', 'downtempo', 'chillout',
      'lounge', 'ambient', 'trap', 'drill', 'boom bap', 'breaks', 'breakbeat',
      'booty', 'bass', 'nudisco', 'nu-disco', 'italo', 'boogie', 'pop', 'rock',
      'indie', 'alternative', 'world', 'afro', 'tribal', 'minimal', 'progressive',
      'trance', 'acid', 'dub', 'deep', 'soulful', 'classic', 'vocal', 'instrumental',
      'remix', 'edit', 'bootleg', 'mashup',
    ];
    const genrePattern = new RegExp(`\\b(${genres.join('|')})\\b`, 'i');
    const bracketStylePattern = /^\[.+\]\s*\[.+\]$/;  // Matches "[thing] [other]" style
    // Key/BPM patterns: "4A - 128", "128 - 4A", "4A - 1", "8A - 138 -", etc.
    const keyBpmPattern = /^[0-9]{1,2}[ABab][m]?\s*[-–]\s*[0-9]{1,3}(\s*[-–])?$|^[0-9]{1,3}\s*[-–]\s*[0-9]{1,2}[ABab][m]?$/;
    const urlPattern = /https?:\/\/|www\.|\.com|\.net|\.org|\.info|\.io|\.fm|\.me|\.co\.uk|bandcamp|soundcloud|myspace|facebook|twitter|instagram|youtube|blogspot|tumblr|beatport|whitelabel|official\.fm/i;
    const hexPattern = /^[\s0-9A-Fa-f]{40,}$/;

    for (const comment of comments) {
      const c = comment.trim();
      if (!c) continue;

      const categories: string[] = [];
      
      if (keyBpmPattern.test(c)) categories.push('keyBpm');
      if (urlPattern.test(c)) categories.push('url');
      if (hexPattern.test(c)) categories.push('hex');
      // Genre: match word patterns OR bracket style like "[House] [Deep]"
      if (!categories.includes('hex') && (genrePattern.test(c) || bracketStylePattern.test(c))) categories.push('genre');

      // Store the ORIGINAL comment (not trimmed) so it matches exactly in updateCommentsBatch
      if (categories.length === 0) {
        result.other.push(comment);
      } else if (categories.length === 1) {
        const cat = categories[0]!;
        if (cat === 'keyBpm') result.keyBpm.push(comment);
        else if (cat === 'genre') result.genre.push(comment);
        else if (cat === 'url') result.url.push(comment);
        else if (cat === 'hex') result.hex.push(comment);
        else result.other.push(comment);
      } else {
        result.combination.push({ comment, categories });
      }
    }

    // Sort all arrays
    result.keyBpm.sort();
    result.genre.sort();
    result.url.sort();
    result.hex.sort();
    result.other.sort();
    result.combination.sort((a, b) => a.comment.localeCompare(b.comment));

    return result;
  }

  private buildTrackKey(location?: TrackLocation) {
    if (!location) return null;
    return `${location.VOLUME ?? ''}${location.DIR ?? ''}${location.FILE ?? ''}`;
  }

  private async persist() {
    if (!this.document) {
      throw new Error('Collection not loaded');
    }

    // Mark as modified since we're changing something
    this.modified = true;

    if (this.collectionPath.startsWith('memory:')) {
      // In-memory collection: state is already updated in this.document
      // Clear originalXml since document has changed
      this.originalXml = null;
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
    
    // After saving, the "output" becomes our new original
    this.originalXml = output;
    this.modified = false;
    
    this.invalidateTree();
  }

  // ============ Apply Style Tags Methods ============

  async getPlaylistsWithTags(): Promise<ExtractedTags> {
    await this.ensureLoaded();
    this.ensureTree();
    
    // Helper to get all folder names in path to a playlist
    const getPathNames = (path: string): string[] => {
      const names: string[] = [];
      let currentPath: string | null = path;
      
      while (currentPath) {
        const ref = this.pathIndex.get(currentPath);
        if (!ref) break;
        
        const name = ref.rawNode.NAME;
        // Skip ROOT and add the name
        if (name && name !== 'ROOT' && name !== '$ROOT') {
          names.push(name);
        }
        currentPath = ref.parentPath;
      }
      
      return names;
    };
    
    // Collect all playlists with their names and path names
    const playlists: PlaylistTagInfo[] = [];
    this.pathIndex.forEach((ref, path) => {
      if (ref.type === 'PLAYLIST') {
        playlists.push({
          path,
          name: ref.rawNode.NAME ?? 'Untitled'
        });
      }
    });

    // Extract words from playlist AND folder names, count occurrences
    const wordToPlaylists = new Map<string, PlaylistTagInfo[]>();
    
    // Common words to exclude
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'for', 'on', 'at', 'by',
      'with', 'from', 'up', 'down', 'out', 'off', 'over', 'under', 'again',
      'new', 'old', 'best', 'top', 'all', 'my', 'your', 'our', 'their', 'his', 'her',
      'mix', 'set', 'dj', 'playlist', 'tracks', 'songs', 'music', 'vol', 'volume',
      'pt', 'part', 'ep', 'lp', 'radio', 'show', 'session', 'sessions',
      '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '2024', '2023', '2022', '2021', '2020'
    ]);

    for (const playlist of playlists) {
      // Get all names in the path (playlist + all parent folders)
      const allNames = getPathNames(playlist.path);
      
      // Extract words from all names
      const allWords = new Set<string>();
      for (const name of allNames) {
        const words = name
          .toLowerCase()
          .split(/[\s\-_/\\|,;:()[\]{}]+/)
          .map(w => w.trim())
          .filter(w => w.length >= 2 && !stopWords.has(w) && !/^\d+$/.test(w));
        
        words.forEach(w => allWords.add(w));
      }

      for (const word of allWords) {
        const existing = wordToPlaylists.get(word) ?? [];
        // Avoid duplicates for same playlist
        if (!existing.some(p => p.path === playlist.path)) {
          existing.push(playlist);
          wordToPlaylists.set(word, existing);
        }
      }
    }

    // Build result: tags that appear in 2+ playlists, sorted by count desc
    const tags: TagWithPlaylists[] = [];
    wordToPlaylists.forEach((playlistList, word) => {
      if (playlistList.length >= 2) {
        tags.push({
          tag: word,
          count: playlistList.length,
          playlists: playlistList
        });
      }
    });

    tags.sort((a, b) => b.count - a.count);

    return { tags };
  }

  async writeStyleTagToTracks(playlistPaths: string[], tag: string): Promise<{ updatedCount: number }> {
    await this.ensureLoaded();
    
    // Title case: capitalize first letter of each word
    const toTitleCase = (str: string) => 
      str.replace(/\b\w/g, char => char.toUpperCase());
    
    const formattedTag = toTitleCase(tag.startsWith('[') ? tag.slice(1, -1) : tag);
    const bracketTag = `[${formattedTag}]`;
    
    // Collect all track keys from specified playlists
    const trackKeys = new Set<string>();
    
    for (const path of playlistPaths) {
      const ref = this.pathIndex.get(path);
      if (ref?.type !== 'PLAYLIST') continue;
      
      const playlist = (ref.rawNode as RawPlaylistNode).PLAYLIST;
      const entries = toArray(playlist?.ENTRY);
      
      for (const entry of entries) {
        const key = entry.PRIMARYKEY?.KEY;
        if (key) trackKeys.add(key);
      }
    }

    // Update tracks that don't already have this tag
    let updatedCount = 0;
    const tagLower = bracketTag.toLowerCase();

    trackKeys.forEach(key => {
      const entry = this.trackIndex.get(key);
      if (!entry) return;

      const currentComment = entry.INFO?.COMMENT ?? '';
      
      // Check if tag already exists in comment (case-insensitive)
      if (currentComment.toLowerCase().includes(tagLower)) {
        return; // Skip - already has this tag
      }

      // Add the tag
      entry.INFO ??= {};
      entry.INFO.COMMENT = currentComment 
        ? `${currentComment} ${bracketTag}` 
        : bracketTag;
      
      updatedCount++;
    });

    if (updatedCount > 0) {
      this.modified = true;
      await this.persist();
    }

    return { updatedCount };
  }

  async getTagCountPreview(playlistPaths: string[], tag: string): Promise<{
    wouldUpdate: number;
    alreadyHaveInSelection: number;
    totalInCollection: number;
  }> {
    await this.ensureLoaded();
    
    const bracketTag = tag.startsWith('[') ? tag : `[${tag}]`;
    const tagLower = bracketTag.toLowerCase();
    
    // Collect track keys from specified playlists
    const trackKeysInSelection = new Set<string>();
    
    for (const path of playlistPaths) {
      const ref = this.pathIndex.get(path);
      if (ref?.type !== 'PLAYLIST') continue;
      
      const playlist = (ref.rawNode as RawPlaylistNode).PLAYLIST;
      const entries = toArray(playlist?.ENTRY);
      
      for (const entry of entries) {
        const key = entry.PRIMARYKEY?.KEY;
        if (key) trackKeysInSelection.add(key);
      }
    }

    // Count tracks in selection that would be updated vs already have tag
    let wouldUpdate = 0;
    let alreadyHaveInSelection = 0;

    trackKeysInSelection.forEach(key => {
      const entry = this.trackIndex.get(key);
      if (!entry) return;

      const currentComment = entry.INFO?.COMMENT ?? '';
      if (currentComment.toLowerCase().includes(tagLower)) {
        alreadyHaveInSelection++;
      } else {
        wouldUpdate++;
      }
    });

    // Count total tracks in collection with this tag
    let totalInCollection = 0;
    this.trackIndex.forEach(entry => {
      const currentComment = entry.INFO?.COMMENT ?? '';
      if (currentComment.toLowerCase().includes(tagLower)) {
        totalInCollection++;
      }
    });

    return { wouldUpdate, alreadyHaveInSelection, totalInCollection };
  }
}

