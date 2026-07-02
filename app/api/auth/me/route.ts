import { NextRequest, NextResponse } from 'next/server';
import { verifyRequestToken } from '@/lib/auth';
import { getUserById, checkPaperAccess } from '@/lib/dataStore';

export async function GET(request: NextRequest) {
  try {
    const decoded = verifyRequestToken(request.headers.get('Authorization'));
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserById(decoded.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // ── Device check: reject if the request comes from a different device ──
    const incomingDeviceId = request.headers.get('X-Device-Id');
    if (incomingDeviceId && user.deviceId && user.deviceId !== incomingDeviceId) {
      return NextResponse.json(
        { error: 'Session invalidated. This account is logged in on another device.' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        university: user.university,
        campus: user.campus,
        yearOfStudy: user.yearOfStudy,
        role: user.role,
        phone: user.phone,
        hasActiveSubscription: await checkPaperAccess(user.id),
      },
    });
  } catch (error: any) {
    console.error('[Auth/Me] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch user' }, { status: 500 });
  }
}
