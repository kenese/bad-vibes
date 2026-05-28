import { type NextRequest, NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { env } from "~/env";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const origin = new URL(request.url).origin;
  const redirectUri = `${origin}/api/youtube/auth/callback`;

  const params = new URLSearchParams({
    client_id: env.AUTH_GOOGLE_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/youtube",
    access_type: "offline",
    prompt: "consent",
    // state is just the base64-encoded userId as a sanity check in the callback
    state: Buffer.from(session.user.id).toString("base64"),
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  );
}
