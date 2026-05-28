import { type NextRequest, NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { env } from "~/env";
import { createHmac } from "crypto";

function verifyState(state: string, expectedUserId: string): boolean {
  try {
    const { userId, ts, sig } = JSON.parse(
      Buffer.from(state, "base64url").toString()
    ) as { userId: string; ts: string; sig: string };

    if (userId !== expectedUserId) return false;
    // Reject states older than 10 minutes
    if (Date.now() - parseInt(ts) > 10 * 60 * 1000) return false;

    const expected = createHmac("sha256", env.AUTH_SECRET ?? "dev-secret")
      .update(`${userId}:${ts}`)
      .digest("hex");
    return sig === expected;
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error || !code || !state || !verifyState(state, session.user.id)) {
    return NextResponse.redirect(
      new URL("/playlists?youtube=error", request.url)
    );
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
    return NextResponse.redirect(new URL("/playlists?youtube=error", request.url));
  }

  const tokens = await tokenRes.json() as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope: string;
  };

  const expiresAt = Math.floor(Date.now() / 1000) + tokens.expires_in;

  // Store YouTube token in a dedicated account row so it doesn't
  // conflict with the user's main Google login session.
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

  return NextResponse.redirect(new URL("/playlists?youtube=connected", request.url));
}
