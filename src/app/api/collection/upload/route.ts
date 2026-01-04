import { type NextRequest, NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { collectionManager } from "~/server/services/collectionManager";
import { createWriteStream } from "fs";
import { pipeline } from "stream/promises";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const storagePath = collectionManager.getStoragePath(session.user.id);
    
    // Stream the file to disk
    const stream = file.stream();
    const writeStream = createWriteStream(storagePath);
    
    // @ts-expect-error - ReadableStream to WriteStream pipeline
    await pipeline(stream, writeStream);

    // Update user in DB
    await db.user.update({
      where: { id: session.user.id },
      data: { collectionPath: storagePath }
    });

    // Invalidate cached service instance
    collectionManager.invalidate(session.user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Upload failed:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
