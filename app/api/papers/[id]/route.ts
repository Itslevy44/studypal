import { NextRequest, NextResponse } from 'next/server';
import { getPaperById, checkPaperAccess } from '@/lib/dataStore';
import { verifyRequestToken } from '@/lib/auth';
import { getFilePath, downloadFromTelegram } from '@/lib/telegram';

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

    // Check if user has access to this paper
    const hasAccess = paper.cost === 0 || await checkPaperAccess(tokenData.userId, id);
    
    if (!hasAccess) {
      return NextResponse.json(
        { 
          error: 'Access denied. Please purchase to download.',
          paper: {
            id: paper.id,
            title: paper.title,
            course: paper.course,
            examPeriod: paper.examPeriod,
            yearOfStudy: paper.yearOfStudy,
            cost: paper.cost,
            accessDuration: paper.accessDuration,
            description: paper.description,
            totalDownloads: paper.totalDownloads,
          }
        },
        { status: 403 }
      );
    }

    // Return paper details with download link
    return NextResponse.json({
      success: true,
      paper: {
        ...paper,
        telegramMessageId: undefined, // Don't expose telegram IDs
      }
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch paper' },
      { status: 500 }
    );
  }
}
