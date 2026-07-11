/**
 * GET /api/admin/index-status
 *
 * Returns the current live TELEGRAM_INDEX_FILE_ID from the running process.
 * Use this after any write operation to see if the index file_id has changed.
 *
 * Important: In serverless (Vercel), the in-process value resets on each cold start.
 * Always keep TELEGRAM_INDEX_FILE_ID in Vercel env vars up to date.
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyRequestToken } from '@/lib/auth';
import { getIndexFileId } from '@/lib/dataStore';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const tokenData = verifyRequestToken(authHeader);
    if (!tokenData || tokenData.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      );
    }

    const fileId = getIndexFileId();
    const envFileId = process.env.TELEGRAM_INDEX_FILE_ID || null;

    return NextResponse.json({
      currentIndexFileId: fileId,
      envIndexFileId: envFileId,
      inSync: fileId === envFileId,
      warning:
        fileId !== envFileId
          ? `⚠️ Index file_id has changed! Update TELEGRAM_INDEX_FILE_ID to: ${fileId}`
          : null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to get index status';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
