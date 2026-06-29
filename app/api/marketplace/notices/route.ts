import { NextRequest, NextResponse } from 'next/server';
import { verifyRequestToken } from '@/lib/auth';
import { getNotices, addNotice, updateNotice, deleteNotice } from '@/lib/dataStore';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const univFilter = url.searchParams.get('university');

    const notices = (await getNotices()) || [];

    // Filter notices if university is specified
    let filteredNotices = notices;
    if (univFilter) {
      filteredNotices = notices.filter((n: any) => 
        !n.university || n.university === 'all' || n.university === univFilter
      );
    }

    const sorted = [...filteredNotices].sort((a: any, b: any) => 
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );

    return NextResponse.json({ notices: sorted });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch notices' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin token
    const authHeader = request.headers.get('Authorization');
    const tokenData = verifyRequestToken(authHeader);

    if (!tokenData || tokenData.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 401 });
    }

    const { title, content, category, university } = await request.json();

    if (!title || !content || !category) {
      return NextResponse.json({ error: 'Missing required fields: title, content, or category' }, { status: 400 });
    }

    const noticeRecord = {
      id: `notice_${crypto.randomBytes(6).toString('hex')}`,
      title,
      content,
      category,
      university: university || 'all',
      createdAt: new Date().toISOString(),
      uploadedBy: tokenData.email
    };

    await addNotice(noticeRecord);

    return NextResponse.json({
      success: true,
      message: 'Notice successfully posted to board!',
      notice: noticeRecord
    }, { status: 201 });

  } catch (error: any) {
    console.error('[Notices API] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const tokenData = verifyRequestToken(authHeader);

    if (!tokenData || tokenData.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 401 });
    }

    const { id, title, content, category, university } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Missing required field: id' }, { status: 400 });
    }

    const updates: any = {};
    if (title !== undefined) updates.title = title;
    if (content !== undefined) updates.content = content;
    if (category !== undefined) updates.category = category;
    if (university !== undefined) updates.university = university;

    const updated = await updateNotice(id, updates);
    if (!updated) {
      return NextResponse.json({ error: 'Notice not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Notice updated successfully!',
      notice: updated
    });
  } catch (error: any) {
    console.error('[Notices PATCH API] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
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

    if (!id) {
      return NextResponse.json({ error: 'Missing required parameter: id' }, { status: 400 });
    }

    const notices = await getNotices();
    const notice = notices.find((n: any) => n.id === id);
    if (!notice) {
      return NextResponse.json({ error: 'Notice not found' }, { status: 404 });
    }

    await deleteNotice(id);

    return NextResponse.json({
      success: true,
      message: 'Notice deleted successfully!'
    });
  } catch (error: any) {
    console.error('[Notices DELETE API] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
