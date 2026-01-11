import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { env } from "~/env";
import OAuth from "oauth-1.0a";
import crypto from "crypto";

// Discogs API Definitions
interface DiscogsRelease {
  id: number;
  instance_id: number;
  date_added: string;
  basic_information: {
    title: string;
    artists: { name: string }[];
    formats: { name: string; descriptions?: string[] }[];
  };
}

interface DiscogsCollectionResponse {
  pagination: {
    page: number;
    pages: number;
    items: number;
  };
  releases: DiscogsRelease[];
}

export const discogsRouter = createTRPCRouter({
  getCollection: protectedProcedure
    .input(z.object({
      page: z.number().min(1).default(1),
      per_page: z.number().min(1).max(100).default(50),
      folder_id: z.number().default(0), // 0 is usually "All"
      added_after: z.string().optional(), // ISO Date string
    }))
    .query(async ({ ctx, input }) => {
      // 1. Get User's Discogs Account
      console.log(`[DiscogsRouter] Finding account for user: ${ctx.session.user.id}`);
      const account = await ctx.db.account.findFirst({
        where: {
          userId: ctx.session.user.id,
          provider: "discogs",
        },
      });
      console.log(`[DiscogsRouter] Found account:`, account ? 'YES' : 'NO');

      if (!account?.access_token || !account.refresh_token) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Discogs account not linked or missing tokens.",
        });
      }

      // Discogs uses OAuth 1.0a. 
      // In NextAuth for OAuth 1.0a:
      // access_token -> oauth_token
      // refresh_token -> oauth_token_secret (Usually, NextAuth maps secret to refresh_token field for 1.0a)
      
      const oauth = new OAuth({
        consumer: {
          key: env.DISCOGS_CLIENT_ID,
          secret: env.DISCOGS_CLIENT_SECRET,
        },
        signature_method: "HMAC-SHA1",
        hash_function(base_string, key) {
          return crypto
            .createHmac("sha1", key)
            .update(base_string)
            .digest("base64");
        },
      });

      const token = {
        key: account.access_token,
        secret: account.refresh_token,
      };

      // 2. Fetch Collection
      // Endpoint: https://api.discogs.com/users/{username}/collection/folders/{folder_id}/releases
      // We need the username. It's usually in `account.providerAccountId` (User ID in Discogs, usually numeric)
      // Wait, Discogs implementation in NextAuth might set providerAccountId to the ID (int). 
      // But resource URL requires username.
      // We can fetch Identity first OR assume we stored username. 
      // Let's check Identity if we don't have username.
      // But typically we can just use the endpoint `/users/{username}`.
      // Actually, Discogs API allows `/users/{username}`.
      // If we don't know the username, we can't build the URL.
      // However, we can use the `identity` endpoint to retrieve it again.
      
      const identityUrl = "https://api.discogs.com/oauth/identity";
      const identityRequestData = {
        url: identityUrl,
        method: "GET",
      };
      
      const identityHeaders = oauth.toHeader(oauth.authorize(identityRequestData, token));
      
      const identityRes = await fetch(identityUrl, {
        headers: {
          ...identityHeaders,
          "User-Agent": "BadVibesApp/1.0",
        },
      });
      
      if (!identityRes.ok) {
         throw new TRPCError({
           code: "BAD_REQUEST",
           message: "Failed to fetch Discogs identity",
         });
      }
      
      const identityData = await identityRes.json() as { username: string };
      const username = identityData.username;

      // 3. Fetch Releases
      const url = `https://api.discogs.com/users/${username}/collection/folders/${input.folder_id}/releases?page=${input.page}&per_page=${input.per_page}&sort=added&sort_order=desc`;
      
      const requestData = {
        url,
        method: "GET",
      };

      const headers = oauth.toHeader(oauth.authorize(requestData, token));

      const res = await fetch(url, {
        headers: {
          ...headers,
          "User-Agent": "BadVibesApp/1.0",
        },
      });

      if (!res.ok) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Discogs API Error: ${res.statusText}`,
        });
      }

      const data = await res.json() as DiscogsCollectionResponse;
      
      // Filter by date if requested
      let releases = data.releases;
      if (input.added_after) {
        const afterDate = new Date(input.added_after);
        releases = releases.filter(r => new Date(r.date_added) >= afterDate);
      }

      // Map to simple track format
      const items = releases.map(r => ({
        track: r.basic_information.title,
        artist: r.basic_information.artists[0]?.name ?? "Unknown Artist",
        added_at: r.date_added,
        id: r.id,
        formats: r.basic_information.formats ?? [],
      }));

      return {
        items,
        pagination: data.pagination,
      };
    }),

    
  getRelease: protectedProcedure
    .input(z.object({
      release_id: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      // 1. Get User's Discogs Account
      const account = await ctx.db.account.findFirst({
        where: {
          userId: ctx.session.user.id,
          provider: "discogs",
        },
      });

      if (!account?.access_token || !account.refresh_token) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Discogs account not linked or missing tokens.",
        });
      }

      const oauth = new OAuth({
        consumer: {
          key: env.DISCOGS_CLIENT_ID,
          secret: env.DISCOGS_CLIENT_SECRET,
        },
        signature_method: "HMAC-SHA1",
        hash_function(base_string, key) {
          return crypto
            .createHmac("sha1", key)
            .update(base_string)
            .digest("base64");
        },
      });

      const token = {
        key: account.access_token,
        secret: account.refresh_token,
      };

      // 2. Fetch Release
      const url = `https://api.discogs.com/releases/${input.release_id}`;
      
      const requestData = {
        url,
        method: "GET",
      };

      const headers = oauth.toHeader(oauth.authorize(requestData, token));

      const res = await fetch(url, {
        headers: {
          ...headers,
          "User-Agent": "BadVibesApp/1.0",
        },
      });

      if (!res.ok) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Discogs API Error: ${res.statusText}`,
        });
      }

      const data = await res.json() as {
        id: number;
        title: string;
        artists: { name: string }[];
        tracklist?: { position: string; title: string; duration?: string }[];
      };

      return {
        id: data.id,
        title: data.title,
        artists: data.artists,
        tracklist: data.tracklist ?? [],
      };
    }),
});
