import { type NextRequest, NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { collectionManager } from "~/server/services/collectionManager";

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

  let xmlContent: string;

  if (user.collectionPath.startsWith('memory:')) {
    // For in-memory collections, get from the service
    if (!collectionManager.hasMemoryInstance(session.user.id)) {
      return new NextResponse("In-memory collection expired. Please upload again.", { status: 404 });
    }
    const service = collectionManager.getService(session.user.id, user.collectionPath);
    xmlContent = await service.getXml();
  } else {
    // For blob storage, fetch from URL
    const response = await fetch(user.collectionPath);
    if (!response.ok) {
      return new NextResponse("Failed to fetch collection from storage", { status: 500 });
    }
    xmlContent = await response.text();
  }

  return new NextResponse(xmlContent, {
    headers: {
      "Content-Type": "application/xml",
      "Content-Disposition": 'attachment; filename="collection.nml"',
    },
  });
}
