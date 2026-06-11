import { NextRequest, NextResponse } from 'next/server';
import { getPapers, getPapersByUniversity } from '@/lib/dataStore';
import { verifyRequestToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Optional: verify token for analytics
    const authHeader = request.headers.get('Authorization');
    const tokenData = verifyRequestToken(authHeader);

    const url = new URL(request.url);
    const univFilter = url.searchParams.get('university');
    const yearFilter = url.searchParams.get('year');
    const courseFilter = url.searchParams.get('course');

    let papers = univFilter ? getPapersByUniversity(univFilter) : getPapers();

    // Apply filters
    if (yearFilter) {
      papers = papers.filter((p: any) => p.yearOfStudy === yearFilter);
    }
    
    if (courseFilter) {
      papers = papers.filter((p: any) => p.course.toLowerCase().includes(courseFilter.toLowerCase()));
    }

    // Remove sensitive data
    const safePapers = papers.map((p: any) => ({
      ...p,
      telegramMessageId: undefined, // Don't expose telegram IDs to clients
    }));

    return NextResponse.json({ papers: safePapers });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch papers' },
      { status: 500 }
    );
  }
}
