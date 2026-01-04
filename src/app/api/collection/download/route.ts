import { type NextRequest, NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import fs from "fs";

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { collectionPath: true }
  });

  if (!user?.collectionPath || !fs.existsSync(user.collectionPath)) {
    return new NextResponse("Collection not found", { status: 404 });
  }

  const fileStream = fs.createReadStream(user.collectionPath);
  // @ts-expect-error - ReadableStream to BodyInit
  return new NextResponse(fileStream, {
    headers: {
      "Content-Type": "application/xml",
      "Content-Disposition": 'attachment; filename="collection.nml"',
    },
  });
}
