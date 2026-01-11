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

interface PlexPlaylistMetadata {
  ratingKey: string;
  title: string;
  leafCount: number;
  playlistType: string;
  duration?: number;
}

interface PlexMediaContainer {
  Metadata?: PlexPlaylistMetadata[];
}

interface PlexPlaylistsResponse {
  MediaContainer: PlexMediaContainer;
}

export interface PlexPlaylist {
  ratingKey: string;
  title: string;
  trackCount: number;
}

/**
 * GET /api/plex/playlists?serverUrl=xxx&token=xxx
 * Get audio playlists from a Plex server
 */
export async function GET(request: NextRequest) {
  try {
    const serverUrl = request.nextUrl.searchParams.get('serverUrl');
    const token = request.nextUrl.searchParams.get('token');
    
    if (!serverUrl || !token) {
      return NextResponse.json(
        { error: 'Missing serverUrl or token parameter' },
        { status: 400 }
      );
    }

    // Get all playlists from the server
    // type=15 gives us a flat list of playlists
    const url = `${serverUrl}/playlists?type=15`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: getPlexHeaders(token),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Plex Playlists] Failed to get playlists:', errorText);
      return NextResponse.json(
        { error: 'Failed to get Plex playlists' },
        { status: response.status }
      );
    }

    const data = await response.json() as PlexPlaylistsResponse;
    
    // Filter to only audio playlists and map to our format
    const playlists: PlexPlaylist[] = (data.MediaContainer.Metadata ?? [])
      .filter(p => p.playlistType === 'audio')
      .map(p => ({
        ratingKey: p.ratingKey,
        title: p.title,
        trackCount: p.leafCount,
      }));

    return NextResponse.json({ playlists });
  } catch (error) {
    console.error('[Plex Playlists] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get Plex playlists' },
      { status: 500 }
    );
  }
}
