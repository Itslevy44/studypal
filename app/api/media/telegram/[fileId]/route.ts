import { NextRequest, NextResponse } from 'next/server';
import { getFilePath } from '@/lib/telegram';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params;
    if (!fileId) {
      return NextResponse.json({ error: 'Missing fileId' }, { status: 400 });
    }

    const fileUrl = await getFilePath(fileId);
    if (!fileUrl) {
      return NextResponse.json({ error: 'Media not found on Telegram' }, { status: 404 });
    }

    const response = await fetch(fileUrl);
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to retrieve media from Telegram' }, { status: 500 });
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const body = response.body;

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, must-revalidate', // cache for 1 day
      },
    });
  } catch (error: any) {
    console.error('[Media Proxy] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
