import { NextRequest, NextResponse } from "next/server";
import OAuth from "oauth-1.0a";
import crypto from "crypto";
import { env } from "~/env";

// Helper to create OAuth instance
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
  const oauth = getOAuth();
  const requestData = {
    url: "https://api.discogs.com/oauth/request_token",
    method: "POST",
    data: {
      oauth_callback: `${req.nextUrl.origin}/api/discogs/callback`, // Dynamic callback URL
    },
  };

  const headers = oauth.toHeader(oauth.authorize(requestData));

  // Discogs requires User-Agent
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
        console.error("Discogs Request Token Error:", text);
        return NextResponse.json({ error: "Failed to get request token", details: text }, { status: 500 });
    }

    const text = await response.text();
    const params = new URLSearchParams(text);
    const oauth_token = params.get("oauth_token");
    const oauth_token_secret = params.get("oauth_token_secret");

    if (!oauth_token || !oauth_token_secret) {
         return NextResponse.json({ error: "Invalid response from Discogs" }, { status: 500 });
    }

    // Set cookie with secret so we can verify later? 
    // Or just stateless redirect... But we need SECRET to exchange for access token.
    // OAuth 1.0 requires storing the secret associated with the request token.
    // We can store it in a HttpOnly cookie.
    
    const redirectUrl = `https://www.discogs.com/oauth/authorize?oauth_token=${oauth_token}`;
    
    const res = NextResponse.redirect(redirectUrl);
    
    // Cookie format: discogs_oauth_secret
    res.cookies.set("discogs_oauth_secret", oauth_token_secret, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 10, // 10 minutes
    });

    return res;

  } catch (error) {
      console.error("Discogs Auth Error:", error);
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
