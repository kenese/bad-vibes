'use client';

import { useState, useCallback, useEffect } from 'react';

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

interface PlexImportProps {
  onClose: () => void;
  onImport: (items: { track: string; artist: string }[], playlistName: string) => void;
}

export function PlexImport({ onClose, onImport }: PlexImportProps) {
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
  
  // Load stored connection on mount
  useEffect(() => {
    const stored = loadStoredConnection();
    if (stored) {
      setConnection(stored);
    }
  }, []);

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
      const authRes = await fetch('/api/plex/auth', { method: 'POST' });
      if (!authRes.ok) {
        throw new Error('Failed to generate Plex PIN');
      }
      
      const { pinId, authUrl } = await authRes.json() as { 
        pinId: number; 
        authUrl: string;
      };

      setStatus('Waiting for Plex authorization...');
      const popup = window.open(
        authUrl,
        'plex_auth',
        'width=800,height=600,menubar=no,toolbar=no'
      );

      let token: string | null = null;
      const maxAttempts = 60;
      
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
        
        if (popup?.closed) {
          throw new Error('Authentication cancelled');
        }
      }

      if (!token) {
        throw new Error('Authentication timed out');
      }

      setStatus('Discovering Plex servers...');
      const serversRes = await fetch(`/api/plex/servers?token=${token}`);
      if (!serversRes.ok) {
        throw new Error('Failed to discover Plex servers');
      }
      
      const { servers } = await serversRes.json() as { servers: PlexServer[] };
      
      if (servers.length === 0) {
        throw new Error('No Plex servers found');
      }

      const newConnection: PlexConnection = {
        token,
        servers,
        selectedServer: servers[0] ?? null,
      };

      setConnection(newConnection);
      saveConnection(newConnection);
      setStatus('');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
      setStatus('');
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const handleDisconnect = useCallback(() => {
    setConnection(null);
    saveConnection(null);
    setPlaylists([]);
    setSelectedPlaylist(null);
    setTracks([]);
    setError(null);
  }, []);

  const handleServerChange = useCallback((serverId: string) => {
    if (!connection) return;
    
    const server = connection.servers.find(s => s.clientIdentifier === serverId);
    if (server) {
      const updatedConnection = { ...connection, selectedServer: server };
      setConnection(updatedConnection);
      saveConnection(updatedConnection);
      setPlaylists([]);
      setSelectedPlaylist(null);
      setTracks([]);
    }
  }, [connection]);

  const handlePlaylistChange = (ratingKey: string) => {
    const playlist = playlists.find(p => p.ratingKey === ratingKey);
    if (playlist) {
      void loadPlaylistTracks(playlist);
    }
  };

  const handleImport = () => {
    if (tracks.length === 0 || !selectedPlaylist) return;
    
    const items = tracks.map(t => ({
      track: t.title,
      artist: t.artist,
    }));
    
    onImport(items, selectedPlaylist.title);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 w-full max-w-lg shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-[#f0f6fc]">Import from Plex</h2>
          <button onClick={onClose} className="text-[#8b949e] hover:text-[#f0f6fc] text-2xl">&times;</button>
        </div>

        {!connection ? (
          <div className="text-center py-8">
            <button
              className="bg-[#e5a00d] hover:bg-[#d4940c] text-black font-bold py-3 px-6 rounded-lg transition-colors"
              onClick={handleConnect}
              disabled={isConnecting}
            >
              {isConnecting ? 'Connecting...' : 'Connect to Plex'}
            </button>
            {status && <p className="mt-3 text-[#8b949e]">{status}</p>}
            {error && <p className="mt-3 text-[#f85149]">{error}</p>}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Connected Header */}
            <div className="flex items-center justify-between bg-[#0d1117] rounded-lg p-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span className="text-[#c9d1d9]">Connected to Plex</span>
              </div>
              <button
                onClick={handleDisconnect}
                className="text-sm text-[#f85149] hover:underline"
              >
                Disconnect
              </button>
            </div>

            {/* Server Selector */}
            {connection.servers.length > 1 && (
              <div>
                <label className="block text-sm text-[#8b949e] mb-1">Server</label>
                <select
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-2 text-[#c9d1d9]"
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

            {/* Playlist Selector */}
            <div>
              <label className="block text-sm text-[#8b949e] mb-1">Playlist</label>
              {isLoadingPlaylists ? (
                <p className="text-[#58a6ff]">Loading playlists...</p>
              ) : (
                <select
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-2 text-[#c9d1d9]"
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

            {/* Track Info */}
            {selectedPlaylist && (
              <div className="bg-[#0d1117] rounded-lg p-3 text-sm">
                {isLoadingTracks ? (
                  <span className="text-[#58a6ff]">Loading tracks...</span>
                ) : (
                  <span className="text-[#c9d1d9]">
                    {tracks.length} tracks ready to import from &ldquo;{selectedPlaylist.title}&rdquo;
                  </span>
                )}
              </div>
            )}

            {/* Import Button */}
            <button
              onClick={handleImport}
              disabled={tracks.length === 0 || isLoadingTracks}
              className="w-full bg-[#238636] hover:bg-[#2eaa42] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2.5 px-6 rounded-lg transition-colors"
            >
              Import {tracks.length > 0 ? `${tracks.length} Tracks` : 'Playlist'}
            </button>

            {error && <p className="text-[#f85149] text-sm">{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
