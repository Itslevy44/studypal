import { NextResponse } from 'next/server';
import { getMpesaToken, generatePassword, generateTimestamp } from '@/lib/mpesa';
import { verifyRequestToken } from '@/lib/auth';
import { getUsers, updateUser, getMarketplaceItems, addPendingPayment } from '@/lib/dataStore';

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

    const isItem = String(accountReference).startsWith('item_');
    // Never trust a client-supplied price: marketplace items are charged at their listed price.
    let paymentAmount = 100;
    let resolvedItemId: string | null = null;
    if (isItem) {
      const all = (await getMarketplaceItems()) || [];
      const ref = String(accountReference);
      const item = all.find((i: any) => i.id === ref) || all.find((i: any) => ref.length >= 8 && i.id.startsWith(ref));
      if (!item) {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 });
      }
      if (item.status === 'sold') {
        return NextResponse.json({ error: 'This item has already been sold' }, { status: 409 });
      }
      paymentAmount = Math.ceil(Number(item.price));
      if (!isFinite(paymentAmount) || paymentAmount <= 0) {
        return NextResponse.json({ error: 'This item has no valid price' }, { status: 400 });
      }
      resolvedItemId = item.id;
    }
    const paymentDesc = isItem ? (transactionDesc || 'Marketplace Item') : 'StudyPal: 3-Month All-Access Pass';
    const paymentRef = isItem ? (accountReference || 'item') : 'all_access';

    // Optional shared secret so only Safaricom (who is given this URL) can hit the callback
    const baseCallback = process.env.MPESA_CALLBACK_URL || 'https://mydomain.com/api/mpesa/callback';
    const callbackUrl = process.env.MPESA_CALLBACK_SECRET
      ? `${baseCallback}${baseCallback.includes('?') ? '&' : '?'}secret=${encodeURIComponent(process.env.MPESA_CALLBACK_SECRET)}`
      : baseCallback;

    const payload = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: paymentAmount,
      PartyA: formattedPhone,
      PartyB: shortcode,
      PhoneNumber: formattedPhone,
      CallBackURL: callbackUrl,
      AccountReference: paymentRef,
      TransactionDesc: paymentDesc,
    };

    const authHeader = req.headers.get('authorization');
    const decoded = verifyRequestToken(authHeader);
    if (decoded?.userId) {
      await updateUser(decoded.userId, { phone: formattedPhone });
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
        const resolvedId = resolvedItemId ?? paymentRef;

        await addPendingPayment({
          checkoutRequestId: data.CheckoutRequestID,
          userId: decoded?.userId || null,
          paperId: resolvedId,
          amount: paymentAmount,
          createdAt: new Date().toISOString(),
        });
        console.log(`[M-Pesa] Pending payment stored: RequestID: ${data.CheckoutRequestID} | User: ${decoded?.userId} | ID: ${resolvedId}`);
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
