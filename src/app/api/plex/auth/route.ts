import { NextResponse } from 'next/server';

// Plex API constants
const PLEX_CLIENT_IDENTIFIER = 'bad-vibes-app';
const PLEX_PRODUCT = 'Bad Vibes';
const PLEX_DEVICE = 'Web';
const PLEX_VERSION = '1.0.0';

// Common headers for Plex API requests
function getPlexHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/x-www-form-urlencoded',
    'X-Plex-Client-Identifier': PLEX_CLIENT_IDENTIFIER,
    'X-Plex-Product': PLEX_PRODUCT,
    'X-Plex-Device': PLEX_DEVICE,
    'X-Plex-Version': PLEX_VERSION,
  };
  
  if (token) {
    headers['X-Plex-Token'] = token;
  }
  
  return headers;
}

interface PlexPinResponse {
  id: number;
  code: string;
  authToken: string | null;
}

/**
 * POST /api/plex/auth
 * Generate a new Plex PIN for authentication
 */
export async function POST() {
  try {
    // Generate a PIN from Plex
    const response = await fetch('https://plex.tv/api/v2/pins', {
      method: 'POST',
      headers: getPlexHeaders(),
      body: new URLSearchParams({
        strong: 'true',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Plex Auth] Failed to generate PIN:', errorText);
      return NextResponse.json(
        { error: 'Failed to generate Plex PIN' },
        { status: response.status }
      );
    }

    const data = await response.json() as PlexPinResponse;
    
    // Construct the auth URL for the user to visit
    const authUrl = new URL('https://app.plex.tv/auth');
    authUrl.hash = `#?clientID=${PLEX_CLIENT_IDENTIFIER}&code=${data.code}&context[device][product]=${encodeURIComponent(PLEX_PRODUCT)}`;

    return NextResponse.json({
      pinId: data.id,
      code: data.code,
      authUrl: authUrl.toString(),
    });
  } catch (error) {
    console.error('[Plex Auth] Error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Plex authentication' },
      { status: 500 }
    );
  }
}
