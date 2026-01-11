import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Plex API constants - must match the ones used in auth generation
const PLEX_CLIENT_IDENTIFIER = 'bad-vibes-app';
const PLEX_PRODUCT = 'Bad Vibes';
const PLEX_DEVICE = 'Web';
const PLEX_VERSION = '1.0.0';

function getPlexHeaders(): Record<string, string> {
  return {
    'Accept': 'application/json',
    'X-Plex-Client-Identifier': PLEX_CLIENT_IDENTIFIER,
    'X-Plex-Product': PLEX_PRODUCT,
    'X-Plex-Device': PLEX_DEVICE,
    'X-Plex-Version': PLEX_VERSION,
  };
}

interface PlexPinResponse {
  id: number;
  code: string;
  authToken: string | null;
}

/**
 * GET /api/plex/auth/callback?pinId=xxx
 * Check if the PIN has been claimed and return the auth token
 */
export async function GET(request: NextRequest) {
  try {
    const pinId = request.nextUrl.searchParams.get('pinId');
    
    if (!pinId) {
      return NextResponse.json(
        { error: 'Missing pinId parameter' },
        { status: 400 }
      );
    }

    // Check the PIN status
    const response = await fetch(`https://plex.tv/api/v2/pins/${pinId}`, {
      method: 'GET',
      headers: getPlexHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Plex Callback] Failed to check PIN:', errorText);
      return NextResponse.json(
        { error: 'Failed to check PIN status', authenticated: false },
        { status: response.status }
      );
    }

    const data = await response.json() as PlexPinResponse;
    
    if (data.authToken) {
      // PIN was claimed, user authenticated successfully
      return NextResponse.json({
        authenticated: true,
        token: data.authToken,
      });
    } else {
      // PIN not yet claimed
      return NextResponse.json({
        authenticated: false,
      });
    }
  } catch (error) {
    console.error('[Plex Callback] Error:', error);
    return NextResponse.json(
      { error: 'Failed to check authentication status', authenticated: false },
      { status: 500 }
    );
  }
}
