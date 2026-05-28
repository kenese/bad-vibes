import { type NextRequest, NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { env } from "~/env";
import { createHmac } from "crypto";

function makeState(userId: string): string {
  const ts = Date.now().toString();
  const sig = createHmac("sha256", env.AUTH_SECRET ?? "dev-secret")
    .update(`${userId}:${ts}`)
    .digest("hex");
  return Buffer.from(JSON.stringify({ userId, ts, sig })).toString("base64url");
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const redirectUri = `${new URL(request.url).origin}/api/youtube/auth/callback`;
  const state = makeState(session.user.id);

  const params = new URLSearchParams({
    client_id: env.AUTH_GOOGLE_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/youtube",
    access_type: "offline",
    prompt: "consent",
    state,
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  );
}
