import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';
import { auth } from "~/server/auth";
import { db } from "~/server/db";

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname) => {
       
        debugger;
        const session = await auth();
        if (!session?.user) {
          throw new Error('Unauthorized');
        }

        return {
          allowedContentTypes: ['text/xml', 'application/xml', 'application/vnd.enliven', 'application/octet-stream'],
          tokenPayload: JSON.stringify({
            userId: session.user.id,
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // Get the userId from the token payload
        const { userId } = JSON.parse(tokenPayload!) as { userId: string };

        try {
          // Update the user's collectionPath in the database
          await db.user.update({
            where: { id: userId },
            data: { collectionPath: blob.url },
          });
        } catch (_error) {
          throw new Error('Could not update user');
        }
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 },
    );
  }
}
