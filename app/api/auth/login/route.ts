import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword, createToken } from '@/lib/auth';
import { getUserByEmail, checkPaperAccess, updateUser } from '@/lib/dataStore';

export async function POST(request: NextRequest) {
  try {
    const { email, password, deviceId } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const user = await getUserByEmail(email);
    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // ── Device lock: if a different device is already registered, block login ──
    if (deviceId && user.deviceId && user.deviceId !== deviceId) {
      return NextResponse.json(
        {
          error: 'This account is already active on another device. Sign out of the other device first, or contact support to reset your device.',
        },
        { status: 403 }
      );
    }

    // Register or refresh the device ID on the user record
    if (deviceId && user.deviceId !== deviceId) {
      await updateUser(user.id, { deviceId });
    }

    const token = createToken(user.id, user.email, user.role);

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        university: user.university,
        campus: user.campus,
        yearOfStudy: user.yearOfStudy,
        role: user.role,
        hasActiveSubscription: await checkPaperAccess(user.id),
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: error.message || 'Login failed' },
      { status: 500 }
    );
  }
}
