import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";

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
          track: parts[0] || "Unknown Track",
          artist: parts[1] || "Unknown Artist"
        };
      });
      return parsed;
    }),

  fetchExternal: protectedProcedure
    .input(z.object({ url: z.string().url() }))
    .mutation(async ({ input }) => {
      const response = await fetch(input.url);
      if (!response.ok) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Could not fetch URL: ${response.statusText}`
        });
      }
      const html = await response.text();
      const tracks: { track: string; artist: string }[] = [];

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
              const data = JSON.parse(jsonStr);
              const items = data.props?.pageProps?.state?.data?.entity?.trackList;
              
              if (items && Array.isArray(items)) {
                items.forEach((item: any) => {
                  tracks.push({
                    track: item.title || "Unknown Track",
                    artist: item.subtitle || "Unknown Artist"
                  });
                });
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
        
        if (tracks.length === 0) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "No tracks found in Spotify link. Is it a public playlist?"
            });
        }
      } else if (input.url.includes("youtube.com") || input.url.includes("youtu.be")) {
        const start = html.indexOf("ytInitialData = ") + "ytInitialData = ".length;
        const end = html.indexOf(";</script>", start);
        
        if (start > "ytInitialData = ".length && end > start) {
          try {
            const jsonStr = html.slice(start, end);
            const data = JSON.parse(jsonStr);
            const contents = data.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents?.[0]?.playlistVideoListRenderer?.contents;
            
            if (contents && Array.isArray(contents)) {
              contents.forEach((c: any) => {
                const v = c.playlistVideoRenderer;
                if (!v) return;

                const fullTitle = v.title?.runs?.[0]?.text || "";
                const channel = v.shortBylineText?.runs?.[0]?.text || "";
                
                // YouTube music titles are usually Artist - Track
                const splitters = [" - ", " – ", " — ", " | "];
                let track = fullTitle;
                let artist = channel;

                for (const s of splitters) {
                  if (fullTitle.includes(s)) {
                    const parts = fullTitle.split(s);
                    artist = parts[0]?.trim() || channel;
                    track = parts[1]?.trim() || fullTitle;
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
        
        if (tracks.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "No tracks found in YouTube link. Is it a public playlist?"
          });
        }
      } else {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Unsupported URL. Only Spotify and YouTube links are supported."
        });
      }

      return tracks;
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
        if (!playlist || playlist.userId !== ctx.session.user.id) {
            throw new TRPCError({ code: "NOT_FOUND" });
        }
        return ctx.db.standalonePlaylist.delete({ where: { id: input.id } });
    })
});
