import { NextRequest, NextResponse } from 'next/server';
import { hashPassword, createToken } from '@/lib/auth';
import { getUserByEmail, addUser } from '@/lib/dataStore';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { email, password, fullName, university, campus, yearOfStudy } = await request.json();

    // Validate input
    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: 'Email, password, and full name are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const newUser = {
      id: `user_${crypto.randomBytes(8).toString('hex')}`,
      email: email.toLowerCase(),
      passwordHash,
      fullName,
      university: university || '',
      campus: campus || '',
      yearOfStudy: yearOfStudy || '',
      role: 'student',
      createdAt: new Date().toISOString(),
    };

    addUser(newUser);

    // Create JWT token
    const token = createToken(newUser.id, newUser.email, 'student');

    // Return user data (without password hash)
    return NextResponse.json({
      success: true,
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        fullName: newUser.fullName,
        university: newUser.university,
        campus: newUser.campus,
        yearOfStudy: newUser.yearOfStudy,
        role: 'student',
      },
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: error.message || 'Registration failed' },
      { status: 500 }
    );
  }
}
