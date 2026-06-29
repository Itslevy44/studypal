import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword, createToken } from '@/lib/auth';
import { getUserByEmail, checkPaperAccess } from '@/lib/dataStore';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find user
    const user = await getUserByEmail(email);
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Create JWT token
    const token = createToken(user.id, user.email, user.role);

    // Return user data (without password hash)
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
