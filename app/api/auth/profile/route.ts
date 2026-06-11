import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword, hashPassword, verifyRequestToken } from '@/lib/auth';
import { getUserById, getUsers, writeJsonFile } from '@/lib/dataStore';

export async function PUT(request: NextRequest) {
  try {
    const decoded = verifyRequestToken(request.headers.get('Authorization'));
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const user = getUserById(decoded.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { fullName, campus, yearOfStudy, university, currentPassword, newPassword } = body;

    // Handle password change
    if (currentPassword && newPassword) {
      const isValid = await verifyPassword(currentPassword, user.passwordHash);
      if (!isValid) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
      }
      const newHash = await hashPassword(newPassword);
      const users = getUsers();
      const idx = users.findIndex((u: any) => u.id === user.id);
      if (idx !== -1) {
        users[idx] = { ...users[idx], passwordHash: newHash };
        writeJsonFile('users.json', users);
      }
      return NextResponse.json({ success: true, message: 'Password updated' });
    }

    // Handle profile update
    const users = getUsers();
    const idx = users.findIndex((u: any) => u.id === user.id);
    if (idx === -1) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const updatedUser = {
      ...users[idx],
      ...(fullName && { fullName }),
      ...(campus !== undefined && { campus }),
      ...(yearOfStudy && { yearOfStudy }),
      ...(university && { university }),
    };
    users[idx] = updatedUser;
    writeJsonFile('users.json', users);

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        fullName: updatedUser.fullName,
        university: updatedUser.university,
        campus: updatedUser.campus,
        yearOfStudy: updatedUser.yearOfStudy,
      },
    });
  } catch (error: any) {
    console.error('Profile update error:', error);
    return NextResponse.json({ error: error.message || 'Update failed' }, { status: 500 });
  }
}
