'use client';

import { useState, useCallback, useEffect } from 'react';
import CollectionCompare from './CollectionCompare';

interface PlexServer {
  name: string;
  clientIdentifier: string;
  uri: string;
  localUri?: string;
}

interface PlexPlaylist {
  ratingKey: string;
  title: string;
  trackCount: number;
}

interface PlexTrack {
  ratingKey: string;
  title: string;
  artist: string;
  album: string;
  userRating?: number;
}

interface PlexConnection {
  token: string;
  servers: PlexServer[];
  selectedServer: PlexServer | null;
}

// Local storage key for persisting Plex connection
const PLEX_STORAGE_KEY = 'plex_connection';

function loadStoredConnection(): PlexConnection | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(PLEX_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as PlexConnection;
    }
  } catch (e) {
    console.error('Failed to load Plex connection:', e);
  }
  return null;
}

function saveConnection(connection: PlexConnection | null) {
  if (typeof window === 'undefined') return;
  try {
    if (connection) {
      localStorage.setItem(PLEX_STORAGE_KEY, JSON.stringify(connection));
    } else {
      localStorage.removeItem(PLEX_STORAGE_KEY);
    }
  } catch (e) {
    console.error('Failed to save Plex connection:', e);
  }
}

interface PlexConnectProps {
  onConnectionChange?: (connection: PlexConnection | null) => void;
  onPlaylistSelect?: (playlist: PlexPlaylist | null, tracks: PlexTrack[]) => void;
}

export default function PlexConnect({ onConnectionChange, onPlaylistSelect }: PlexConnectProps) {
  const [connection, setConnection] = useState<PlexConnection | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');
  
  // Playlist state
  const [playlists, setPlaylists] = useState<PlexPlaylist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<PlexPlaylist | null>(null);
  const [tracks, setTracks] = useState<PlexTrack[]>([]);
  const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(false);
  const [isLoadingTracks, setIsLoadingTracks] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  
  // Load stored connection on mount
  useEffect(() => {
    const stored = loadStoredConnection();
    if (stored) {
      setConnection(stored);
      onConnectionChange?.(stored);
    }
  }, [onConnectionChange]);

  // Load playlists when connected
  useEffect(() => {
    if (connection?.selectedServer && connection.token) {
      void loadPlaylists();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connection?.selectedServer?.uri, connection?.token]);

  const loadPlaylists = async () => {
    if (!connection?.selectedServer || !connection.token) return;
    
    setIsLoadingPlaylists(true);
    setError(null);
    
    try {
      const res = await fetch(
        `/api/plex/playlists?serverUrl=${encodeURIComponent(connection.selectedServer.uri)}&token=${connection.token}`
      );
      
      if (!res.ok) {
        throw new Error('Failed to load playlists');
      }
      
      const data = await res.json() as { playlists: PlexPlaylist[] };
      setPlaylists(data.playlists);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load playlists');
    } finally {
      setIsLoadingPlaylists(false);
    }
  };

  const loadPlaylistTracks = async (playlist: PlexPlaylist) => {
    if (!connection?.selectedServer || !connection.token) return;
    
    setIsLoadingTracks(true);
    setSelectedPlaylist(playlist);
    setTracks([]);
    
    try {
      const res = await fetch(
        `/api/plex/playlists/${playlist.ratingKey}/tracks?serverUrl=${encodeURIComponent(connection.selectedServer.uri)}&token=${connection.token}`
      );
      
      if (!res.ok) {
        throw new Error('Failed to load tracks');
      }
      
      const data = await res.json() as { tracks: PlexTrack[] };
      setTracks(data.tracks);
      onPlaylistSelect?.(playlist, data.tracks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tracks');
    } finally {
      setIsLoadingTracks(false);
    }
  };

  const handleConnect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    setStatus('Generating PIN...');

    try {
      // Step 1: Generate PIN
      const authRes = await fetch('/api/plex/auth', { method: 'POST' });
      if (!authRes.ok) {
        throw new Error('Failed to generate Plex PIN');
      }
      
      const { pinId, authUrl } = await authRes.json() as { 
        pinId: number; 
        authUrl: string;
      };

      // Step 2: Open auth URL in popup
      setStatus('Waiting for Plex authorization...');
      const popup = window.open(
        authUrl,
        'plex_auth',
        'width=800,height=600,menubar=no,toolbar=no'
      );

      // Step 3: Poll for authentication
      let token: string | null = null;
      const maxAttempts = 60; // 2 minutes max
      
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const callbackRes = await fetch(`/api/plex/auth/callback?pinId=${pinId}`);
        const callbackData = await callbackRes.json() as { 
          authenticated: boolean; 
          token?: string;
        };
        
        if (callbackData.authenticated && callbackData.token) {
          token = callbackData.token;
          popup?.close();
          break;
        }
        
        // Check if popup was closed
        if (popup?.closed) {
          throw new Error('Authentication cancelled');
        }
      }

      if (!token) {
        throw new Error('Authentication timed out');
      }

      // Step 4: Discover servers
      setStatus('Discovering Plex servers...');
      const serversRes = await fetch(`/api/plex/servers?token=${token}`);
      if (!serversRes.ok) {
        throw new Error('Failed to discover Plex servers');
      }
      
      const { servers } = await serversRes.json() as { servers: PlexServer[] };
      
      if (servers.length === 0) {
        throw new Error('No Plex servers found');
      }

      // Create connection with first server selected by default
      const newConnection: PlexConnection = {
        token,
        servers,
        selectedServer: servers[0] ?? null,
      };

      setConnection(newConnection);
      saveConnection(newConnection);
      onConnectionChange?.(newConnection);
      setStatus('');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
      setStatus('');
    } finally {
      setIsConnecting(false);
    }
  }, [onConnectionChange]);

  const handleDisconnect = useCallback(() => {
    setConnection(null);
    saveConnection(null);
    setPlaylists([]);
    setSelectedPlaylist(null);
    setTracks([]);
    onConnectionChange?.(null);
    onPlaylistSelect?.(null, []);
    setError(null);
  }, [onConnectionChange, onPlaylistSelect]);

  const handleServerChange = useCallback((serverId: string) => {
    if (!connection) return;
    
    const server = connection.servers.find(s => s.clientIdentifier === serverId);
    if (server) {
      const updatedConnection = { ...connection, selectedServer: server };
      setConnection(updatedConnection);
      saveConnection(updatedConnection);
      onConnectionChange?.(updatedConnection);
      // Reset playlists when server changes
      setPlaylists([]);
      setSelectedPlaylist(null);
      setTracks([]);
    }
  }, [connection, onConnectionChange]);

  const handlePlaylistChange = (ratingKey: string) => {
    const playlist = playlists.find(p => p.ratingKey === ratingKey);
    if (playlist) {
      void loadPlaylistTracks(playlist);
    }
  };

  // Render connected state
  if (connection) {
    return (
      <div className="plex-connect connected">
        <div className="plex-header">
          <div className="plex-status">
            <span className="status-indicator connected" />
            <span>Connected to Plex</span>
          </div>
          <button 
            className="disconnect-button"
            onClick={handleDisconnect}
          >
            Disconnect
          </button>
        </div>
        
        {connection.servers.length > 1 && (
          <div className="server-selector">
            <label htmlFor="plex-server">Server:</label>
            <select
              id="plex-server"
              value={connection.selectedServer?.clientIdentifier ?? ''}
              onChange={(e) => handleServerChange(e.target.value)}
            >
              {connection.servers.map(server => (
                <option key={server.clientIdentifier} value={server.clientIdentifier}>
                  {server.name}
                </option>
              ))}
            </select>
          </div>
        )}
        
        {connection.servers.length === 1 && connection.selectedServer && (
          <div className="server-info">
            <span>Server: {connection.selectedServer.name}</span>
          </div>
        )}

        {/* Playlist Selector */}
        <div className="playlist-selector">
          <label htmlFor="plex-playlist">Playlist:</label>
          {isLoadingPlaylists ? (
            <span className="loading-text">Loading playlists...</span>
          ) : (
            <select
              id="plex-playlist"
              value={selectedPlaylist?.ratingKey ?? ''}
              onChange={(e) => handlePlaylistChange(e.target.value)}
              disabled={playlists.length === 0}
            >
              <option value="">Select a playlist...</option>
              {playlists.map(playlist => (
                <option key={playlist.ratingKey} value={playlist.ratingKey}>
                  {playlist.title} ({playlist.trackCount} tracks)
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Track Count */}
        {selectedPlaylist && (
          <div className="plex-tracks-info">
            {isLoadingTracks ? (
              <span className="loading-text">Loading tracks...</span>
            ) : (
              <span>{tracks.length} tracks loaded from &ldquo;{selectedPlaylist.title}&rdquo;</span>
            )}
          </div>
        )}

        {/* Track Preview Table */}
        {tracks.length > 0 && (
          <div className="plex-tracks-preview">
            <table className="plex-tracks-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Artist</th>
                  <th>Album</th>
                  <th>Rating</th>
                </tr>
              </thead>
              <tbody>
                {tracks.slice(0, 10).map(track => (
                  <tr key={track.ratingKey}>
                    <td>{track.title}</td>
                    <td>{track.artist}</td>
                    <td>{track.album}</td>
                    <td>{track.userRating ? `${track.userRating}/10` : '—'}</td>
                  </tr>
                ))}
                {tracks.length > 10 && (
                  <tr className="more-tracks">
                    <td colSpan={4}>...and {tracks.length - 10} more tracks</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Compare Button */}
        {selectedPlaylist && tracks.length > 0 && (
          <button 
            className="compare-button"
            onClick={() => setShowCompare(true)}
          >
            Compare with Traktor
          </button>
        )}

        {error && <p className="error-message">{error}</p>}

        {/* Comparison Modal */}
        {showCompare && (
          <CollectionCompare
            plexPlaylist={selectedPlaylist}
            plexTracks={tracks}
            onClose={() => setShowCompare(false)}
          />
        )}
      </div>
    );
  }

  // Render disconnected state
  return (
    <div className="plex-connect disconnected">
      <button
        className="connect-button"
        onClick={handleConnect}
        disabled={isConnecting}
      >
        {isConnecting ? 'Connecting...' : 'Connect to Plex'}
      </button>
      
      {status && <p className="status-message">{status}</p>}
      {error && <p className="error-message">{error}</p>}
    </div>
  );
}

export type { PlexConnection, PlexServer, PlexPlaylist, PlexTrack };
