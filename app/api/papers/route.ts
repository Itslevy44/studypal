import { NextRequest, NextResponse } from 'next/server';
import { getPapers, getPapersByUniversity, updatePaper, getPaperById, deletePaper, getUniversityById } from '@/lib/dataStore';
import { verifyRequestToken } from '@/lib/auth';
import { deleteFromTelegram } from '@/lib/telegram';

export async function GET(request: NextRequest) {
  try {
    // Optional: verify token for analytics
    const authHeader = request.headers.get('Authorization');
    const tokenData = verifyRequestToken(authHeader);

    const url = new URL(request.url);
    const univFilter = url.searchParams.get('university');
    const yearFilter = url.searchParams.get('year');
    const courseFilter = url.searchParams.get('course');

    let papers = univFilter ? await getPapersByUniversity(univFilter) : await getPapers();

    // Apply filters
    if (yearFilter) {
      papers = papers.filter((p: any) => p.yearOfStudy === yearFilter);
    }
    
    if (courseFilter) {
      papers = papers.filter((p: any) => p.course.toLowerCase().includes(courseFilter.toLowerCase()));
    }

    const isAdmin = tokenData?.role === 'admin';

    // Remove sensitive data from non-admin responses
    const safePapers = papers.map((p: any) =>
      isAdmin ? p : {
        ...p,
        telegramMessageId: undefined,
        telegramFileId: undefined,
      }
    );

    return NextResponse.json({ papers: safePapers });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch papers' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const tokenData = verifyRequestToken(authHeader);
    if (!tokenData || tokenData.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: 'Paper ID is required' }, { status: 400 });

    const existing = await getPaperById(id);
    if (!existing) return NextResponse.json({ error: 'Paper not found' }, { status: 404 });

    const sanitizedUpdates = { ...updates };
    if ('cost' in sanitizedUpdates) {
      sanitizedUpdates.cost = Number(sanitizedUpdates.cost) || 0;
    }

    const updated = await updatePaper(id, sanitizedUpdates);
    return NextResponse.json({ success: true, paper: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update paper' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const tokenData = verifyRequestToken(authHeader);
    if (!tokenData || tokenData.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 401 });
    }

    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Paper ID is required' }, { status: 400 });

    const paper = await getPaperById(id);
    if (!paper) return NextResponse.json({ error: 'Paper not found' }, { status: 404 });

    // Try deleting from Telegram
    if (paper.telegramMessageId) {
      try { await deleteFromTelegram(paper.telegramMessageId); } catch (_) {}
    }

    await deletePaper(id);
    return NextResponse.json({ success: true, message: 'Paper deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete paper' }, { status: 500 });
  }
}
