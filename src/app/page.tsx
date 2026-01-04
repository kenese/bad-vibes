import Link from "next/link";
import { auth } from "~/server/auth";
import { HydrateClient } from "~/trpc/server";

export default async function Home() {
  const session = await auth();

  return (
    <HydrateClient>
      <main className="flex min-h-full flex-col items-center justify-center bg-gradient-to-b from-[#0d1117] to-[#161b22] text-[#f0f6fc]">
        <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16 text-center">
          <div className="space-y-4">
            <h1 className="text-6xl font-extrabold tracking-tight sm:text-[6rem] text-[#388bfd]">
              bad vibes
            </h1>
            <p className="text-xl text-[#8b949e] max-w-lg mx-auto leading-relaxed">
              a vibe coded dj multi tool for me to use with traktor. <br />
              <span className="italic text-[#f85149]">I wouldn&apos;t trust any of it to be honest.</span>
            </p>
          </div>

          <div className="flex flex-col items-center justify-center gap-8">
            <div className="flex flex-col items-center justify-center gap-4">
              <p className="text-center text-lg text-[#c9d1d9]">
                {session && <span>Logged in as <span className="text-[#58a6ff]">{session.user?.name}</span></span>}
              </p>
              <Link
                href={session ? "/api/auth/signout" : "/api/auth/signin"}
                className="rounded-full bg-[#21262d] border border-[#30363d] px-10 py-3 font-semibold text-[#c9d1d9] no-underline transition hover:bg-[#30363d] hover:border-[#8b949e]"
              >
                {session ? "Sign out" : "Sign in"}
              </Link>
            </div>

            {session && (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:gap-8 max-w-4xl">
                <Link
                  className="flex max-w-xs flex-col gap-4 rounded-2xl bg-[#161b22] border border-[#30363d] p-6 hover:bg-[#1c2128] hover:border-[#388bfd] transition-all"
                  href="/collection"
                >
                  <h3 className="text-2xl font-bold text-[#58a6ff]">Traktor Collection →</h3>
                  <div className="text-sm text-[#8b949e]">
                    Manage your playlists and folders. Upload your collection.nml and start vibing.
                  </div>
                </Link>
                <Link
                  className="flex max-w-xs flex-col gap-4 rounded-2xl bg-[#161b22] border border-[#30363d] p-6 hover:bg-[#1c2128] hover:border-[#388bfd] transition-all"
                  href="/playlist-tools"
                >
                  <h3 className="text-2xl font-bold text-[#58a6ff]">Playlist Tools →</h3>
                  <div className="text-sm text-[#8b949e]">
                    Create standalone tracklists via text parsing or Spotify/YouTube links.
                  </div>
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </HydrateClient>
  );
}
