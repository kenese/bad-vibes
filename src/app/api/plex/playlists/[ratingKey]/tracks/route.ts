import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Plex API constants
const PLEX_CLIENT_IDENTIFIER = 'bad-vibes-app';
const PLEX_PRODUCT = 'Bad Vibes';
const PLEX_DEVICE = 'Web';
const PLEX_VERSION = '1.0.0';

function getPlexHeaders(token: string): Record<string, string> {
  return {
    'Accept': 'application/json',
    'X-Plex-Client-Identifier': PLEX_CLIENT_IDENTIFIER,
    'X-Plex-Product': PLEX_PRODUCT,
    'X-Plex-Device': PLEX_DEVICE,
    'X-Plex-Version': PLEX_VERSION,
    'X-Plex-Token': token,
  };
}

interface PlexTrackMetadata {
  ratingKey: string;
  title: string;
  grandparentTitle?: string; // Artist
  parentTitle?: string; // Album
  userRating?: number; // 0-10 scale
  duration?: number;
}

interface PlexMediaContainer {
  Metadata?: PlexTrackMetadata[];
  totalSize?: number;
}

interface PlexTracksResponse {
  MediaContainer: PlexMediaContainer;
}

export interface PlexTrack {
  ratingKey: string;
  title: string;
  artist: string;
  album: string;
  userRating?: number;
  duration?: number;
}

/**
 * GET /api/plex/playlists/[ratingKey]/tracks?serverUrl=xxx&token=xxx
 * Get tracks from a specific Plex playlist
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ ratingKey: string }> }
) {
  try {
    const params = await context.params;
    const ratingKey = params.ratingKey;
    const serverUrl = request.nextUrl.searchParams.get('serverUrl');
    const token = request.nextUrl.searchParams.get('token');
    
    if (!serverUrl || !token) {
      return NextResponse.json(
        { error: 'Missing serverUrl or token parameter' },
        { status: 400 }
      );
    }

    // Get playlist items - Loop to fetch ALL
    const PAGE_SIZE = 1000; // Request large chunks
    let allTracks: PlexTrackMetadata[] = [];
    let offset = 0;
    let totalSize = 0;
    
    // Initial Fetch
    do {
      const url = `${serverUrl}/playlists/${ratingKey}/items?X-Plex-Container-Start=${offset}&X-Plex-Container-Size=${PAGE_SIZE}`;
      console.log(`[Plex Tracks] Fetching offset ${offset}...`);
      
      const headers = getPlexHeaders(token);
      headers['X-Plex-Container-Start'] = offset.toString();
      headers['X-Plex-Container-Size'] = PAGE_SIZE.toString();

      const response = await fetch(url, { headers });
      if (!response.ok) {
         console.error('[Plex Tracks] Failed fetch:', await response.text());
         break;
      }
      
      const data = await response.json() as PlexTracksResponse;
      const meta = data.MediaContainer;
      totalSize = meta.totalSize ?? 0;
      
      const pageItems = meta.Metadata ?? [];
      allTracks = [...allTracks, ...pageItems];
      
      if (pageItems.length === 0) break; // Safety break
      offset += pageItems.length;
      
    } while (allTracks.length < totalSize);

    console.log(`[Plex Tracks] Total Fetched: ${allTracks.length} / ${totalSize}`);

    // Map to our track format
    const tracks: PlexTrack[] = allTracks.map(t => ({
      ratingKey: t.ratingKey,
      title: t.title,
      artist: t.grandparentTitle ?? 'Unknown Artist',
      album: t.parentTitle ?? 'Unknown Album',
      userRating: t.userRating,
      duration: t.duration,
    }));

    return NextResponse.json({ tracks, totalSize });
  } catch (error) {
    console.error('[Plex Tracks] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get playlist tracks' },
      { status: 500 }
    );
  }
}
