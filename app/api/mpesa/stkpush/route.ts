import { NextResponse } from 'next/server';
import { getMpesaToken, generatePassword, generateTimestamp } from '@/lib/mpesa';
import { verifyRequestToken } from '@/lib/auth';
import { getUsers, getUserById, writeJsonFile, readJsonFile, getPapers } from '@/lib/dataStore';

export async function POST(req: Request) {
  try {
    const { phoneNumber, amount, accountReference, transactionDesc } = await req.json();

    if (!phoneNumber || !amount) {
      return NextResponse.json(
        { error: 'Phone number and amount are required' },
        { status: 400 }
      );
    }

    // Format phone number to 254...
    let formattedPhone = phoneNumber.replace(/\s+/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = `254${formattedPhone.substring(1)}`;
    } else if (formattedPhone.startsWith('+')) {
      formattedPhone = formattedPhone.substring(1);
    }

    const shortcode = process.env.MPESA_SHORTCODE!;
    const passkey = process.env.MPESA_PASSKEY!;
    const timestamp = generateTimestamp();
    const password = generatePassword(shortcode, passkey, timestamp);

    const token = await getMpesaToken();

    const url = process.env.MPESA_ENVIRONMENT === 'sandbox'
      ? 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest'
      : 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest';

    const payload = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: amount,
      PartyA: formattedPhone,
      PartyB: shortcode,
      PhoneNumber: formattedPhone,
      CallBackURL: process.env.MPESA_CALLBACK_URL || 'https://mydomain.com/api/mpesa/callback',
      AccountReference: accountReference || 'StudyPal',
      TransactionDesc: transactionDesc || 'Payment for Past Paper',
    };

    const authHeader = req.headers.get('authorization');
    const decoded = verifyRequestToken(authHeader);
    if (decoded?.userId) {
      const users = getUsers();
      const idx = users.findIndex((u: any) => u.id === decoded.userId);
      if (idx !== -1) {
        users[idx] = { ...users[idx], phone: formattedPhone };
        writeJsonFile('users.json', users);
      }
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('STK Push Error:', data);
      return NextResponse.json(
        { error: data.errorMessage || 'STK push failed' },
        { status: response.status }
      );
    }

    // Record the pending transaction mapping CheckoutRequestID -> { userId, paperId }
    if (data.CheckoutRequestID) {
      try {
        const papers = getPapers() || [];
        const matchedPaper = papers.find((p: any) => p.id === accountReference || p.id.startsWith(accountReference));
        const paperId = matchedPaper ? matchedPaper.id : (accountReference || 'unknown');

        const pendingPayments = readJsonFile('pending_payments.json') || [];
        pendingPayments.push({
          checkoutRequestId: data.CheckoutRequestID,
          userId: decoded?.userId || null,
          paperId: paperId,
          amount: amount,
          createdAt: new Date().toISOString(),
        });
        writeJsonFile('pending_payments.json', pendingPayments);
        console.log(`[M-Pesa] Pending payment stored: RequestID: ${data.CheckoutRequestID} | User: ${decoded?.userId} | Paper: ${paperId}`);
      } catch (err) {
        console.error('[M-Pesa] Failed to record pending payment:', err);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'STK push sent successfully',
      data,
    });
  } catch (error: any) {
    console.error('M-Pesa STK Push error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
