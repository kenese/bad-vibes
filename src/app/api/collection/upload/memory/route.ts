import { NextResponse } from 'next/server';
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { collectionManager } from '~/server/services/collectionManager';

// Maximum file size (50MB)
const MAX_SIZE = 50 * 1024 * 1024;

export async function POST(request: Request): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large (max 50MB)' }, { status: 400 });
    }

    console.log(`[MemoryUpload] Receiving ${file.size} bytes for user ${session.user.id}`);
    const xmlContent = await file.text();

    const memoryPath = `memory:${session.user.id}`;

    // Update database to point to memory
    await db.user.update({
      where: { id: session.user.id },
      data: { collectionPath: memoryPath }
    });

    // Load into manager
    await collectionManager.setFromMemory(session.user.id, xmlContent);

    return NextResponse.json({ 
      success: true,
      url: memoryPath
    });

  } catch (error) {
    console.error('Memory upload failed:', error);
    return NextResponse.json(
      { error: 'Failed to process upload' },
      { status: 500 }
    );
  }
}
