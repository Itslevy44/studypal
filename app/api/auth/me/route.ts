import { NextRequest, NextResponse } from 'next/server';
import { verifyRequestToken } from '@/lib/auth';
import { getUserById, checkPaperAccess } from '@/lib/dataStore';

/**
 * GET /api/auth/me
 * Returns fresh user data from the database for the authenticated user.
 * Used to refresh stale localStorage profile data after login.
 */
export async function GET(request: NextRequest) {
  try {
    const decoded = verifyRequestToken(request.headers.get('Authorization'));
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = getUserById(decoded.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
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
        hasActiveSubscription: checkPaperAccess(user.id),
      },
    });
  } catch (error: any) {
    console.error('[Auth/Me] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch user' }, { status: 500 });
  }
}
