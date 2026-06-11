import { NextRequest, NextResponse } from 'next/server';
import { createToken } from '@/lib/auth';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    // Validate input
    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    // Verify admin password
    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: 'Invalid admin password' },
        { status: 401 }
      );
    }

    // Create JWT token for admin
    const token = createToken('admin', 'admin@studypal.com', 'admin');

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: 'admin',
        email: 'admin@studypal.com',
        role: 'admin',
      },
    });
  } catch (error: any) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { error: error.message || 'Admin login failed' },
      { status: 500 }
    );
  }
}
