import { NextResponse } from 'next/server';
import { addSubscription, getUsers, writeJsonFile, readJsonFile } from '@/lib/dataStore';

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

      // Read pending payments mapping CheckoutRequestID -> { userId, paperId }
      const pendingPayments = readJsonFile('pending_payments.json') || [];
      const pendingIdx = pendingPayments.findIndex((p: any) => p.checkoutRequestId === checkoutRequestID);
      
      let matchedUserId = null;
      let matchedPaperId = null;

      if (pendingIdx !== -1) {
        const pending = pendingPayments[pendingIdx];
        matchedUserId = pending.userId;
        matchedPaperId = pending.paperId;
        // Remove from pending list
        pendingPayments.splice(pendingIdx, 1);
        writeJsonFile('pending_payments.json', pendingPayments);
        console.log(`[M-Pesa] Match found in pending_payments for request: ${checkoutRequestID}. User: ${matchedUserId}, Paper: ${matchedPaperId}`);
      }

      // Try to find user by phone number as a fallback if not found in pending
      let matchedUserIdFinal = matchedUserId;
      if (!matchedUserIdFinal && phoneNumber) {
        const allUsers: any[] = getUsers();
        const normalizedPhone = phoneNumber.replace(/^\+?254/, '0');
        const matchedUserByPhone = allUsers.find((u: any) => {
          const uPhone = String(u.phone || '').replace(/^\+?254/, '0');
          return uPhone === normalizedPhone;
        });
        if (matchedUserByPhone) {
          matchedUserIdFinal = matchedUserByPhone.id;
        }
      }

      // Fallback paperId from AccountReference if missing from pending
      const paperId = matchedPaperId || stkCallback.AccountReference || null;

      // Create a subscription record to grant access
      const expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 1); // 1 year access

      if (matchedUserIdFinal && paperId) {
        // Resolve full paperId if it was a partial substring
        const papers = readJsonFile('papers.json') || [];
        const matchedPaper = papers.find((p: any) => p.id === paperId || p.id.startsWith(paperId));
        const finalPaperId = matchedPaper ? matchedPaper.id : paperId;

        addSubscription({
          id: `sub_${Date.now()}`,
          userId: matchedUserIdFinal,
          paperId: finalPaperId,
          status: 'active',
          expiryDate: expiryDate.toISOString(),
          receiptNumber,
          amount,
          createdAt: new Date().toISOString(),
        });
        
        // Find user email for logging if possible
        const fullUser = getUsers().find((u: any) => u.id === matchedUserIdFinal);
        console.log(`[M-Pesa] ✅ Subscription created for user ${fullUser?.email || matchedUserIdFinal} and paper ${finalPaperId}`);
      } else {
        console.warn(`[M-Pesa] ⚠️ Could not match transaction ${checkoutRequestID} to a user or paper. User: ${matchedUserIdFinal}, Paper: ${paperId}`);
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
