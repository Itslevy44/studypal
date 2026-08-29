import { NextRequest, NextResponse } from 'next/server';
import { verifyRequestToken } from '@/lib/auth';
import { getSubscriptions } from '@/lib/dataStore';

export async function GET(request: NextRequest) {
  try {
    const decoded = verifyRequestToken(request.headers.get('Authorization'));
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const subs = await getSubscriptions();
    const active = subs
      .filter((s: any) =>
        s.userId === decoded.userId &&
        s.status === 'active' &&
        new Date(s.expiryDate) > new Date()
      )
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ subscription: active[0] || null });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
