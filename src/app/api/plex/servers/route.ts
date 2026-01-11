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

interface PlexConnection {
  protocol: string;
  address: string;
  port: number;
  uri: string;
  local: boolean;
}

interface PlexResource {
  name: string;
  clientIdentifier: string;
  provides: string;
  connections: PlexConnection[];
}

export interface PlexServer {
  name: string;
  clientIdentifier: string;
  uri: string;
  localUri?: string;
}

/**
 * GET /api/plex/servers?token=xxx
 * Discover user's Plex servers after authentication
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token');
    
    if (!token) {
      return NextResponse.json(
        { error: 'Missing token parameter' },
        { status: 400 }
      );
    }

    // Get the user's resources (servers, players, etc.)
    const response = await fetch('https://plex.tv/api/v2/resources', {
      method: 'GET',
      headers: getPlexHeaders(token),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Plex Servers] Failed to get resources:', errorText);
      return NextResponse.json(
        { error: 'Failed to get Plex servers' },
        { status: response.status }
      );
    }

    const resources = await response.json() as PlexResource[];
    
    // Filter to only Plex Media Servers (provides: "server")
    const servers: PlexServer[] = resources
      .filter(r => r.provides.includes('server'))
      .map(r => {
        // Prefer non-local (remote) connections, but keep local as fallback
        const remoteConnection = r.connections.find(c => !c.local);
        const localConnection = r.connections.find(c => c.local);
        
        return {
          name: r.name,
          clientIdentifier: r.clientIdentifier,
          uri: remoteConnection?.uri ?? localConnection?.uri ?? '',
          localUri: localConnection?.uri,
        };
      })
      .filter(s => s.uri); // Only include servers with valid URIs

    return NextResponse.json({ servers });
  } catch (error) {
    console.error('[Plex Servers] Error:', error);
    return NextResponse.json(
      { error: 'Failed to discover Plex servers' },
      { status: 500 }
    );
  }
}
