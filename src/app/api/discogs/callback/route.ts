import { NextRequest, NextResponse } from "next/server";
import OAuth from "oauth-1.0a";
import crypto from "crypto";
import { env } from "~/env";
import { db } from "~/server/db";
import { auth } from "~/server/auth"; // Need to get current user session to LINK account

// Helper (duplicated for now, could move to utils)
function getOAuth() {
  return new OAuth({
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
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const oauth_token = searchParams.get("oauth_token");
  const oauth_verifier = searchParams.get("oauth_verifier");
  
  const oauth_token_secret = req.cookies.get("discogs_oauth_secret")?.value;

  if (!oauth_token || !oauth_verifier || !oauth_token_secret) {
      return NextResponse.json({ error: "Missing OAuth parameters or cookie expired" }, { status: 400 });
  }

  const oauth = getOAuth();
  
  const requestData = {
    url: "https://api.discogs.com/oauth/access_token",
    method: "POST",
    data: {
        oauth_verifier: oauth_verifier,
    }
  };

  const token = {
      key: oauth_token,
      secret: oauth_token_secret,
  };

  const headers = oauth.toHeader(oauth.authorize(requestData, token));

  try {
     const response = await fetch(requestData.url, {
        method: requestData.method,
        headers: {
            ...headers,
            "User-Agent": "BadVibesApp/1.0",
        },
    });

    if (!response.ok) {
        const text = await response.text();
        console.error("Discogs Access Token Error:", text);
        return NextResponse.json({ error: "Failed to get access token", details: text }, { status: 500 });
    }

    const text = await response.text();
    const params = new URLSearchParams(text);
    const access_token = params.get("oauth_token");
    const access_token_secret = params.get("oauth_token_secret");
    
    // With OAuth 1.0a, we should also get an identity to know WHO this is.
    // But Discogs access token response doesn't strictly include user ID.
    // We can fetch identity now.
    
    if (!access_token || !access_token_secret) {
         return NextResponse.json({ error: "Invalid access token response" }, { status: 500 });
    }
    
    // Fetch Identity
    const identityUrl = "https://api.discogs.com/oauth/identity";
    const identityRequest = {
        url: identityUrl,
        method: "GET",
    };
    const finalToken = { key: access_token, secret: access_token_secret };
    const identityHeaders = oauth.toHeader(oauth.authorize(identityRequest, finalToken));
    
    const identityRes = await fetch(identityUrl, {
        headers: { ...identityHeaders, "User-Agent": "BadVibesApp/1.0" }
    });
    
    if (!identityRes.ok) {
         return NextResponse.json({ error: "Failed to fetch identity" }, { status: 500 });
    }
    
    const identityData = await identityRes.json() as { id: number, username: string, resource_url: string };
    
    // Now LINK to the current user
    const session = await auth();
    if (!session?.user?.id) {
         return NextResponse.json({ error: "You must be logged in to link Discogs" }, { status: 401 });
    }
    
    // Check if account already exists
    const existing = await db.account.findUnique({
        where: {
            provider_providerAccountId: {
                provider: "discogs",
                providerAccountId: identityData.id.toString(),
            }
        }
    });

    if (existing) {
        // Update tokens if exists (maybe re-linking)
        await db.account.update({
            where: { id: existing.id },
            data: {
                access_token: access_token,
                refresh_token: access_token_secret, // Store secret in refresh_token field as per convention/necessity
            }
        });
    } else {
        // Create new account link
        await db.account.create({
            data: {
                userId: session.user.id,
                type: "oauth",
                provider: "discogs",
                providerAccountId: identityData.id.toString(),
                access_token: access_token,
                refresh_token: access_token_secret,
            }
        });
    }
    
    // Redirect back to playlists page
    const res = NextResponse.redirect(new URL("/playlists?discogs_connected=success", req.url));
    res.cookies.delete("discogs_oauth_secret");
    return res;

  } catch (error) {
      console.error("Discogs Callback Error:", error);
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
