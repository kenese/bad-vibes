"use client";

import { api } from "~/trpc/react";

export function PostList() {
  const [posts] = api.post.getAll.useSuspenseQuery();

  if (posts.length === 0) {
    return (
      <div className="rounded-xl bg-white/10 p-8 text-center">
        <p className="text-lg text-white/70">You haven&apos;t created any posts yet.</p>
        <p className="mt-2 text-sm text-white/50">
          Go back to the home page to create your first post!
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {posts.map((post) => (
        <article
          key={post.id}
          className="rounded-xl bg-white/10 p-6 transition hover:bg-white/15"
        >
          <h2 className="text-xl font-bold">{post.name}</h2>
          <time
            className="mt-2 block text-sm text-white/50"
            dateTime={post.createdAt.toISOString()}
          >
            {post.createdAt.toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </time>
        </article>
      ))}
    </div>
  );
}
