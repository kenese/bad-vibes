import { type NextRequest, NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { env } from "~/env";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error || !code) {
    console.error("[youtube/callback] OAuth error or missing code:", error);
    return NextResponse.redirect(new URL("/playlists?youtube=error", request.url));
  }

  // Sanity check: state should be base64(userId)
  if (state) {
    try {
      const stateUserId = Buffer.from(state, "base64").toString();
      if (stateUserId !== session.user.id) {
        console.error("[youtube/callback] State userId mismatch");
        return NextResponse.redirect(new URL("/playlists?youtube=error", request.url));
      }
    } catch {
      // Non-fatal — log and continue since we trust the session
      console.warn("[youtube/callback] Could not decode state, continuing anyway");
    }
  }

  const redirectUri = `${origin}/api/youtube/auth/callback`;
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.AUTH_GOOGLE_ID,
      client_secret: env.AUTH_GOOGLE_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    console.error("[youtube/callback] Token exchange failed:", errText);
    return NextResponse.redirect(new URL("/playlists?youtube=error", request.url));
  }

  const tokens = await tokenRes.json() as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope: string;
  };

  if (!tokens.access_token) {
    console.error("[youtube/callback] No access_token in response");
    return NextResponse.redirect(new URL("/playlists?youtube=error", request.url));
  }

  const expiresAt = Math.floor(Date.now() / 1000) + tokens.expires_in;

  const existing = await db.account.findFirst({
    where: { userId: session.user.id, provider: "youtube" },
  });

  if (existing) {
    await db.account.update({
      where: { id: existing.id },
      data: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? existing.refresh_token,
        expires_at: expiresAt,
        scope: tokens.scope,
      },
    });
  } else {
    await db.account.create({
      data: {
        userId: session.user.id,
        type: "oauth",
        provider: "youtube",
        providerAccountId: session.user.id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: expiresAt,
        scope: tokens.scope,
        token_type: "Bearer",
      },
    });
  }

  console.log("[youtube/callback] Token stored successfully for user", session.user.id);
  return NextResponse.redirect(new URL("/playlists?youtube=connected", request.url));
}
