import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";

interface SpotifyTrack {
  title?: string;
  subtitle?: string;
}

interface SpotifyData {
  props?: {
    pageProps?: {
      state?: {
        data?: {
          entity?: {
            name?: string;
            trackList?: SpotifyTrack[];
          }
        }
      }
    }
  }
}

interface YTMTextRun {
  text?: string;
}

interface YTMText {
  runs?: YTMTextRun[];
}

interface YTMColumn {
  musicResponsiveListItemFlexColumnRenderer?: {
    text?: YTMText;
  }
}

interface YTMItem {
  musicResponsiveListItemRenderer?: {
    flexColumns?: YTMColumn[];
  }
}

interface YTMData {
  contents?: {
    twoColumnBrowseResultsRenderer?: {
      secondaryContents?: {
        sectionListRenderer?: {
          contents?: Array<{
            musicPlaylistShelfRenderer?: {
              contents?: YTMItem[];
            }
          }>
        }
      }
    };
    singleColumnBrowseResultsRenderer?: {
      tabs?: Array<{
        tabRenderer?: {
          content?: {
            sectionListRenderer?: {
              contents?: Array<{
                musicPlaylistShelfRenderer?: {
                  contents?: YTMItem[];
                }
              }>
            }
          }
        }
      }>
    }
  }
}

interface YTVideo {
  playlistVideoRenderer?: {
    title?: YTMText;
    shortBylineText?: YTMText;
  }
}

interface YTData {
  metadata?: {
    playlistMetadataRenderer?: {
      title?: string;
    }
  };
  contents?: {
    twoColumnBrowseResultsRenderer?: {
      tabs?: Array<{
        tabRenderer?: {
          content?: {
            sectionListRenderer?: {
              contents?: Array<{
                itemSectionRenderer?: {
                  contents?: Array<{
                    playlistVideoListRenderer?: {
                      contents?: YTVideo[];
                    }
                  }>
                }
              }>
            }
          }
        }
      }>
    }
  }
}

export const playlistToolsRouter = createTRPCRouter({
  parseText: protectedProcedure
    .input(z.object({ text: z.string() }))
    .query(({ input }) => {
      const lines = input.text.split("\n").filter(line => line.trim().length > 0);
      const parsed = lines.map(line => {
        // Format: "Track - Artist"
        // Remove non-alphanumeric but keep spaces
        const clean = line.replace(/[^a-zA-Z0-9\s-]/g, "");
        const parts = clean.split("-").map(p => p.trim());
        
        return {
          track: parts[0] ?? "Unknown Track",
          artist: parts[1] ?? "Unknown Artist"
        };
      });
      return parsed;
    }),

  fetchExternal: protectedProcedure
    .input(z.object({ url: z.string().url() }))
    .mutation(async ({ input }) => {
      const response = await fetch(input.url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      });
      if (!response.ok) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Could not fetch URL: ${response.statusText}`
        });
      }
      const html = await response.text();
      console.log(`[fetchExternal] URL: ${input.url}, HTML Length: ${html.length}`);
      
      // Check for common error pages
      if (html.includes("consent.google.com")) {
        console.warn("[fetchExternal] Redirected to Google Consent page");
      }
      const tracks: { track: string; artist: string }[] = [];

      let playlistName = "My New Playlist";

      if (input.url.includes("spotify.com")) {
        // Use the embed URL for easier parsing
        const embedUrl = input.url.includes("/embed/") 
          ? input.url 
          : input.url.replace("open.spotify.com/", "open.spotify.com/embed/");
          
        const embedResponse = await fetch(embedUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          }
        });

        if (embedResponse.ok) {
          const embedHtml = await embedResponse.text();
          const start = embedHtml.indexOf('id="__NEXT_DATA__"');
          const contentStart = embedHtml.indexOf('>', start) + 1;
          const contentEnd = embedHtml.indexOf('</script>', contentStart);
          
          if (start !== -1 && contentEnd > contentStart) {
            try {
              const jsonStr = embedHtml.slice(contentStart, contentEnd);
              const data = JSON.parse(jsonStr) as SpotifyData;
              const entity = data.props?.pageProps?.state?.data?.entity;
              
              if (entity) {
                playlistName = entity.name ?? playlistName;
                const items = entity.trackList;
                if (items && Array.isArray(items)) {
                  items.forEach((item) => {
                    tracks.push({
                      track: item.title ?? "Unknown Track",
                      artist: item.subtitle ?? "Unknown Artist"
                    });
                  });
                }
              }
            } catch (e) {
              console.error("Spotify JSON parse error:", e);
            }
          }
        }

        // Fallback to original regex if no tracks found yet
        if (tracks.length === 0) {
          const trackPattern = /"name":"([^"]+)","trackNumber":(\d+),"duration_ms":(\d+),"artistName":"([^"]+)"/g;
          let match;
          while ((match = trackPattern.exec(html)) !== null) {
            tracks.push({
              track: match[1]!,
              artist: match[4]!
            });
          }
        }
      } else if (input.url.includes("music.youtube.com")) {
        const titleRegex = /<title>([^<]+)<\/title>/i;
        const titleMatch = titleRegex.exec(html);
        if (titleMatch?.[1]) {
            playlistName = titleMatch[1].replace(" - YouTube Music", "").trim();
        }

        // Try hydration blocks first
        const blocks = html.split('initialData.push(');
        const correctBlock = blocks.find(b => b.includes('musicPlaylistShelfRenderer'));
        
        let jsonData: YTMData | null = null;

        if (correctBlock) {
          console.log("[fetchExternal] Found initialData block with musicPlaylistShelfRenderer");
          const dataRegex = /data:\s*'([^']+)'/;
          const dataMatch = dataRegex.exec(correctBlock);
          if (dataMatch?.[1]) {
            try {
              const decodedData = dataMatch[1].replace(/\\x([0-9a-fA-F]{2})/g, (_, hex: string) => 
                 String.fromCharCode(parseInt(hex, 16))
              );
              jsonData = JSON.parse(decodedData) as YTMData;
            } catch (e) {
              console.error("[fetchExternal] YTM JSON parse error (block):", e);
            }
          }
        }

        // Fallback to ytInitialData if hydration blocks didn't work
        if (!jsonData) {
          const ytDataStart = html.indexOf("ytInitialData = ");
          if (ytDataStart !== -1) {
             const start = ytDataStart + "ytInitialData = ".length;
             const end = html.indexOf(";</script>", start);
             if (end > start) {
                try {
                  jsonData = JSON.parse(html.slice(start, end)) as YTMData;
                  console.log("[fetchExternal] Found YTM data via ytInitialData fallback");
                } catch (e) {
                  console.error("[fetchExternal] YTM JSON parse error (fallback):", e);
                }
             }
          }
        }
        
        if (jsonData) {
          // The structure can be content or secondaryContents
          const shelf = 
            jsonData.contents?.twoColumnBrowseResultsRenderer?.secondaryContents?.sectionListRenderer?.contents?.[0]?.musicPlaylistShelfRenderer ??
            jsonData.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents?.[0]?.musicPlaylistShelfRenderer;
          
          const items = shelf?.contents ?? [];
          console.log(`[fetchExternal] YTM tracks found: ${items.length}`);
          
          items.forEach((item) => {
            const r = item.musicResponsiveListItemRenderer;
            if (r) {
              const title = r.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text;
              const artist = r.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text;
              if (title) {
                tracks.push({
                  track: title,
                  artist: artist ?? "Unknown Artist"
                });
              }
            }
          });
        }

        if (tracks.length === 0) {
           console.warn(`[fetchExternal] YTM Extraction failed. HTML Length: ${html.length}, Start snippet: ${html.slice(0, 500)}`);
        }
      } else if (input.url.includes("youtube.com") || input.url.includes("youtu.be")) {
        const start = html.indexOf("ytInitialData = ") + "ytInitialData = ".length;
        const end = html.indexOf(";</script>", start);
        
        if (start > "ytInitialData = ".length && end > start) {
          try {
            const jsonStr = html.slice(start, end);
            const data = JSON.parse(jsonStr) as YTData;
            
            playlistName = data.metadata?.playlistMetadataRenderer?.title ?? playlistName;

            const contents = data.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents?.[0]?.playlistVideoListRenderer?.contents;
            
            if (contents && Array.isArray(contents)) {
              contents.forEach((c) => {
                const v = c.playlistVideoRenderer;
                if (!v) return;

                const fullTitle = v.title?.runs?.[0]?.text ?? "";
                const channel = v.shortBylineText?.runs?.[0]?.text ?? "";
                
                const splitters = [" - ", " – ", " — ", " | "];
                let track = fullTitle;
                let artist = channel;

                for (const s of splitters) {
                  if (fullTitle.includes(s)) {
                    const parts = fullTitle.split(s);
                    artist = parts[0]?.trim() ?? channel;
                    track = parts[1]?.trim() ?? fullTitle;
                    break;
                  }
                }

                tracks.push({ track, artist });
              });
            }
          } catch (e) {
            console.error("YouTube parse error:", e);
          }
        }
      } else {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Unsupported URL. Please provide a public Spotify, YouTube, or YouTube Music playlist link."
        });
      }

      if (tracks.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No tracks found in the provided link. Please ensure the playlist is public."
        });
      }

      return { name: playlistName, tracks };
    }),

  savePlaylist: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      items: z.array(z.object({
        track: z.string(),
        artist: z.string()
      }))
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.standalonePlaylist.create({
        data: {
          name: input.name,
          userId: ctx.session.user.id,
          items: {
            create: input.items.map((item, index) => ({
              track: item.track,
              artist: item.artist,
              order: index
            }))
          }
        },
        include: { items: true }
      });
    }),

  getPlaylists: protectedProcedure.query(({ ctx }) => {
    return ctx.db.standalonePlaylist.findMany({
      where: { userId: ctx.session.user.id },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { items: true } } }
    });
  }),

  getPlaylist: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => { // Changed to mutation for easier client-side trigger
      const playlist = await ctx.db.standalonePlaylist.findUnique({
        where: { id: input.id },
        include: { items: { orderBy: { order: "asc" } } }
      });

      if (!playlist || playlist.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return playlist;
    }),

  updateItem: protectedProcedure
    .input(z.object({
      itemId: z.string(),
      track: z.string().optional(),
      artist: z.string().optional()
    }))
    .mutation(({ ctx, input }) => {
      return ctx.db.playlistItem.update({
        where: { id: input.itemId },
        data: {
          track: input.track,
          artist: input.artist
        }
      });
    }),

  deletePlaylist: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
        const playlist = await ctx.db.standalonePlaylist.findUnique({
            where: { id: input.id }
        });
        if (playlist?.userId !== ctx.session.user.id) {
            throw new TRPCError({ code: "NOT_FOUND" });
        }
        return ctx.db.standalonePlaylist.delete({ where: { id: input.id } });
    })
});
