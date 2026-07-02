import { NextRequest, NextResponse } from 'next/server';
import { verifyRequestToken } from '@/lib/auth';
import { getUsers, updateUser } from '@/lib/dataStore';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const tokenData = verifyRequestToken(authHeader);

    if (!tokenData || tokenData.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 401 });
    }

    const users = (await getUsers()) || [];
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
        deviceId: u.deviceId || null,
        createdAt: u.createdAt,
      })),
    });
  } catch (error: any) {
    console.error('[Students API] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch students' }, { status: 500 });
  }
}

// PATCH /api/auth/students — admin can reset a user's device lock
export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const tokenData = verifyRequestToken(authHeader);

    if (!tokenData || tokenData.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 401 });
    }

    const { id, deviceId } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    await updateUser(id, { deviceId: deviceId ?? null });

    return NextResponse.json({ success: true, message: 'Device lock reset successfully.' });
  } catch (error: any) {
    console.error('[Students PATCH] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to reset device' }, { status: 500 });
  }
}
