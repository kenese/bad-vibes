import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";
import CollectionView from './_components/CollectionView';
import './../collection/collection.css';

export default async function CollectionPage() {
  const session = await auth();
  
  let lastPath: string | undefined;
  
  if (session?.user) {
    void api.collection.hasCollection.prefetch();
    const hasCollection = await api.collection.hasCollection();
    
    if (hasCollection) {
      void api.collection.sidebar.prefetch();
      
      void api.preferences.getTableConfig.prefetch({ tableName: 'collection_view' });
      void api.preferences.getTableConfig.prefetch({ tableName: 'playlist_tracks' });
      const prefs = await api.preferences.getTableConfig({ tableName: 'collection_view' });
      lastPath = prefs?.lastOpenedPath as string | undefined;
      
      if (!lastPath) {
        const tree = await api.collection.sidebar();
        lastPath = findFirstPlaylistId(tree?.tree)?.path ?? tree?.tree?.path;
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
function findFirstPlaylistId(node: any): any {
  if (!node) return null;
  if (node.type === 'PLAYLIST') return node;
  for (const child of node.children ?? []) {
    const discovered = findFirstPlaylistId(child);
    if (discovered) return discovered;
  }
  return null;
}
