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
      onBeforeGenerateToken: async (pathname) => {
        const session = await auth();
        let userId = session?.user?.id;

        // Allow dev bypass
        if (!userId && process.env.NODE_ENV === 'development') {
          console.log('[BlobUpload] Using dev bypass for auth');
          userId = 'dev-user-001';
        }

        if (!userId) {
          throw new Error('Unauthorized');
        }

        const { searchParams } = new URL(request.url);
        const isTemp = searchParams.get('temp') === 'true';

        return {
          allowedContentTypes: ['text/xml', 'application/xml', 'application/vnd.enliven', 'application/octet-stream', 'application/gzip', 'application/x-gzip'],
          allowOverwrite: true,
          addRandomSuffix: false,
          tokenPayload: JSON.stringify({
            userId,
            isTemp,
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // Get the userId from the token payload
        const { userId, isTemp } = JSON.parse(tokenPayload!) as { userId: string, isTemp?: boolean };

        if (isTemp) {
          console.log(`[BlobUpload] Temporary upload completed for user ${userId}. Skipping DB update.`);
          return;
        }

        // Skip DB update for dev user
        if (userId === 'dev-user-001') {
           console.log('[BlobUpload] Skipping DB update for dev user');
           return;
        }

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
