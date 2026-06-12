import { NextRequest, NextResponse } from 'next/server';
import { verifyRequestToken } from '@/lib/auth';
import { getUsers } from '@/lib/dataStore';

/**
 * GET /api/auth/students
 * Returns the count (and optionally list) of registered students.
 * Requires admin authorization.
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const tokenData = verifyRequestToken(authHeader);

    if (!tokenData || tokenData.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 401 });
    }

    const users = getUsers() || [];
    const students = users.filter((u: any) => u.role === 'student' || !u.role || u.role === undefined);

    return NextResponse.json({
      count: students.length,
      total: users.length,
      students: students.map((u: any) => ({
        id: u.id,
        email: u.email,
        fullName: u.fullName,
        university: u.university,
        campus: u.campus,
        yearOfStudy: u.yearOfStudy,
        createdAt: u.createdAt,
      })),
    });
  } catch (error: any) {
    console.error('[Students API] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch students' }, { status: 500 });
  }
}
