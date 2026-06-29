import { NextRequest, NextResponse } from 'next/server';
import { getPaperById, checkPaperAccess, updatePaper } from '@/lib/dataStore';
import { verifyRequestToken } from '@/lib/auth';
import { getFilePath, getFileFromTelegram } from '@/lib/telegram';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verify token
    const authHeader = request.headers.get('Authorization');
    const tokenData = verifyRequestToken(authHeader);

    if (!tokenData) {
      return NextResponse.json(
        { error: 'Unauthorized. Please login.' },
        { status: 401 }
      );
    }

    const paper = await getPaperById(id);
    if (!paper) {
      return NextResponse.json(
        { error: 'Paper not found' },
        { status: 404 }
      );
    }

    // Check if user has access to this paper (free OR purchased subscription)
    const hasAccess = paper.cost === 0 || await checkPaperAccess(tokenData.userId, id);

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied. Please purchase this paper to download it.' },
        { status: 403 }
      );
    }

    // If paper has a telegramMessageId or fileId, stream the file from Telegram
    let telegramFileId = paper.telegramFileId || paper.fileId;
    const telegramMessageId = paper.telegramMessageId;

    if (!telegramFileId && telegramMessageId) {
      console.log(`[Download] Missing telegramFileId for paper ${id}, fetching dynamically from message ${telegramMessageId}`);
      const fileInfo = await getFileFromTelegram(telegramMessageId);
      if (fileInfo?.fileId) {
        telegramFileId = fileInfo.fileId;
        // Cache/persist it so subsequent downloads are faster
        try {
          await updatePaper(id, { telegramFileId });
          console.log(`[Download] Successfully cached telegramFileId for paper ${id}`);
        } catch (e) {
          console.warn('[Download] Could not update paper with telegramFileId:', e);
        }
      }
    }

    if (telegramFileId) {
      // Get file URL from Telegram
      const fileUrl = await getFilePath(telegramFileId);

      if (!fileUrl) {
        return NextResponse.json(
          { error: 'File not available. Please contact support.' },
          { status: 404 }
        );
      }

      // Stream the file from Telegram through our server
      const telegramResponse = await fetch(fileUrl);

      if (!telegramResponse.ok) {
        return NextResponse.json(
          { error: 'Failed to retrieve file.' },
          { status: 500 }
        );
      }

      // Increment download count
      const currentDownloads = paper.totalDownloads || 0;
      try {
        await updatePaper(id, { totalDownloads: currentDownloads + 1 });
      } catch (e) {
        // Non-critical — don't fail the download
        console.warn('[Download] Could not update download count:', e);
      }

      // Determine file extension and name
      const fileExt = paper.fileType || 'pdf';
      const safeTitle = (paper.title || paper.course || 'paper')
        .replace(/[^a-zA-Z0-9\s-]/g, '')
        .replace(/\s+/g, '_')
        .substring(0, 60);
      const filename = `${safeTitle}_${paper.examPeriod || ''}.${fileExt}`
        .replace(/_{2,}/g, '_')
        .replace(/_\./g, '.');

      const contentType = telegramResponse.headers.get('content-type') || 'application/pdf';
      const body = telegramResponse.body;

      return new NextResponse(body, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-store',
        },
      });
    }

    // Fallback: return metadata with download info
    return NextResponse.json({
      success: true,
      message: 'Paper accessible',
      paper: {
        id: paper.id,
        title: paper.title,
        course: paper.course,
        examPeriod: paper.examPeriod,
        yearOfStudy: paper.yearOfStudy,
      },
    });

  } catch (error: any) {
    console.error('[Download] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Download failed' },
      { status: 500 }
    );
  }
}
