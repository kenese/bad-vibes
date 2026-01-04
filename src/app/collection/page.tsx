import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";
import CollectionView from './_components/CollectionView';
import { type SidebarTreeNode } from '~/server/services/collectionService';
import './../collection/collection.css';

export default async function CollectionPage() {
  const session = await auth();
  
  let lastPath: string | undefined;
  
  if (session?.user) {
    void api.collection.hasCollection.prefetch();
    const hasCollection = await api.collection.hasCollection();
    
    if (hasCollection) {
      void api.collection.sidebar.prefetch();
      const tree = await api.collection.sidebar(); // Fetch tree here
      
      void api.preferences.getTableConfig.prefetch({ tableName: 'collection_view' });
      void api.preferences.getTableConfig.prefetch({ tableName: 'playlist_tracks' });
      const prefs = await api.preferences.getTableConfig({ tableName: 'collection_view' });
      lastPath = (prefs as { lastOpenedPath?: string })?.lastOpenedPath;
      
      if (!lastPath) {
        const root = tree?.tree;
        lastPath = findFirstPlaylistId(root)?.path ?? root?.path;
      }

      if (lastPath) {
        void api.collection.playlistTracks.prefetch({ path: lastPath });
      }
    }
  }

  return (
    <HydrateClient>
      <CollectionView initialActivePath={lastPath} />
    </HydrateClient>
  );
}

// Minimal helper for server-side path resolution
function findFirstPlaylistId(node: SidebarTreeNode | null): SidebarTreeNode | null {
  if (!node) return null;
  if (node.type === 'PLAYLIST') return node;
  for (const child of node.children ?? []) {
    const discovered = findFirstPlaylistId(child);
    if (discovered) return discovered;
  }
  return null;
}
