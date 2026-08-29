import { NextRequest, NextResponse } from 'next/server';
import { hashPassword, createToken } from '@/lib/auth';
import { getUserByEmail, addUser, addSubscription } from '@/lib/dataStore';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { email, password, fullName, university, campus, yearOfStudy, phone } = await request.json();

    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: 'Email, password, and full name are required' },
        { status: 400 }
      );
    }

    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);

    const newUser = {
      id: `user_${crypto.randomBytes(8).toString('hex')}`,
      email: email.toLowerCase(),
      passwordHash,
      fullName,
      university: university || '',
      campus: campus || '',
      yearOfStudy: yearOfStudy || '',
      phone: phone || '',
      role: 'student',
      createdAt: new Date().toISOString(),
    };

    await addUser(newUser);

    // ── Grant 7-day free trial ──────────────────────────────────────────────
    const trialExpiry = new Date();
    trialExpiry.setDate(trialExpiry.getDate() + 7);
    await addSubscription({
      id: `trial_${crypto.randomBytes(6).toString('hex')}`,
      userId: newUser.id,
      paperId: 'all_access',
      status: 'active',
      expiryDate: trialExpiry.toISOString(),
      receiptNumber: 'FREE_TRIAL',
      amount: 0,
      isTrial: true,
      createdAt: new Date().toISOString(),
    });

    const token = createToken(newUser.id, newUser.email, 'student');

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
        phone: newUser.phone,
        role: 'student',
        hasActiveSubscription: true,
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
