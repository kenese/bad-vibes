import { type NextRequest, NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { collectionPath: true }
  });

  if (!user?.collectionPath) {
    return new NextResponse("Collection not found", { status: 404 });
  }

  const response = await fetch(user.collectionPath);
  if (!response.ok) {
    return new NextResponse("Failed to fetch collection from storage", { status: 500 });
  }

  return new NextResponse(response.body, {
    headers: {
      "Content-Type": "application/xml",
      "Content-Disposition": 'attachment; filename="collection.nml"',
    },
  });
}
