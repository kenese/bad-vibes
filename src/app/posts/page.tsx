import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";
import { PostList } from "./_components/post-list";

export default async function PostsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/api/auth/signin");
  }

  void api.post.getAll.prefetch();

  return (
    <HydrateClient>
      <main className="flex min-h-screen flex-col items-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
        <div className="container flex flex-col items-center gap-8 px-4 py-16">
          <div className="flex w-full max-w-2xl items-center justify-between">
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
              Your <span className="text-[hsl(280,100%,70%)]">Posts</span>
            </h1>
            <Link
              href="/"
              className="rounded-full bg-white/10 px-6 py-2 font-semibold no-underline transition hover:bg-white/20"
            >
              ← Back
            </Link>
          </div>

          <div className="w-full max-w-2xl">
            <PostList />
          </div>
        </div>
      </main>
    </HydrateClient>
  );
}
