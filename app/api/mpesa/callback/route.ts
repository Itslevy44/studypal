import { NextResponse } from 'next/server';
import { addSubscription, getUsers, writeJsonFile } from '@/lib/dataStore';

export async function POST(req: Request) {
  try {
    const callbackData = await req.json();
    const stkCallback = callbackData?.Body?.stkCallback;

    if (!stkCallback) {
      return NextResponse.json({ ResultCode: 1, ResultDesc: 'Invalid callback data' });
    }

    const checkoutRequestID: string = stkCallback.CheckoutRequestID;

    if (stkCallback.ResultCode === 0) {
      // Payment successful
      const callbackMetadata: any[] = stkCallback.CallbackMetadata?.Item || [];
      const amount = callbackMetadata.find((i: any) => i.Name === 'Amount')?.Value ?? null;
      const receiptNumber = callbackMetadata.find((i: any) => i.Name === 'MpesaReceiptNumber')?.Value ?? null;
      const phoneNumber = String(callbackMetadata.find((i: any) => i.Name === 'PhoneNumber')?.Value ?? '');

      console.log(`[M-Pesa] ✅ Payment success | Receipt: ${receiptNumber} | Amount: KES ${amount} | Phone: ${phoneNumber} | RequestID: ${checkoutRequestID}`);

      // The AccountReference we set was the first 10 chars of the paperId
      // Find which paper this payment was for (we store it in the reference)
      // The checkoutRequestID maps to a pending transaction stored in session.
      // Since we don't have a session store, we record the payment against the phone.
      const paperId = stkCallback.AccountReference || null; // We pass paper.id.substring(0,10) — use as partial ID

      // Create a subscription record to grant access
      const expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 1); // 1 year access

      // Try to find user by phone number
      const allUsers: any[] = getUsers();
      const normalizedPhone = phoneNumber.replace(/^\+?254/, '0');
      const matchedUser = allUsers.find((u: any) => {
        const uPhone = String(u.phone || '').replace(/^\+?254/, '0');
        return uPhone === normalizedPhone;
      });

      if (matchedUser && paperId) {
        addSubscription({
          id: `sub_${Date.now()}`,
          userId: matchedUser.id,
          paperId: paperId, // partial ID — improve by using full paper lookup if needed
          status: 'active',
          expiryDate: expiryDate.toISOString(),
          receiptNumber,
          amount,
          createdAt: new Date().toISOString(),
        });
        console.log(`[M-Pesa] ✅ Subscription created for user ${matchedUser.email}`);
      } else {
        // Record payment without linking to user (can be reconciled manually)
        console.warn(`[M-Pesa] ⚠️ Could not match phone ${phoneNumber} to a user. Payment recorded but not linked.`);
      }

    } else {
      console.log(`[M-Pesa] ❌ Payment failed | Reason: ${stkCallback.ResultDesc} | RequestID: ${checkoutRequestID}`);
    }

    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  } catch (error) {
    console.error('[M-Pesa] Callback processing error:', error);
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' }); // always ack Safaricom
  }
}
