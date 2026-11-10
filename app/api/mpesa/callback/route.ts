import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import {
  addSubscription,
  getUsers,
  getSubscriptions,
  getMarketplaceItemById,
  updateMarketplaceItem,
  getPendingPayments,
  removePendingPayment,
} from '@/lib/dataStore';

const ACK = { ResultCode: 0, ResultDesc: 'Accepted' };

/** Constant-time compare of the shared secret carried in the callback URL (?secret=...). */
function secretOk(req: Request): boolean {
  const expected = process.env.MPESA_CALLBACK_SECRET;
  if (!expected) return true; // not configured: keep legacy behaviour (see README / .env.example)
  const given = new URL(req.url).searchParams.get('secret') ?? '';
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  try {
    if (!secretOk(req)) {
      console.warn('[M-Pesa] Rejected callback: bad or missing secret');
      return NextResponse.json({ ResultCode: 1, ResultDesc: 'Forbidden' }, { status: 403 });
    }

    const callbackData = await req.json();
    const stkCallback = callbackData?.Body?.stkCallback;
    if (!stkCallback) {
      return NextResponse.json({ ResultCode: 1, ResultDesc: 'Invalid callback data' });
    }

    const checkoutRequestID: string = stkCallback.CheckoutRequestID;

    if (stkCallback.ResultCode !== 0) {
      console.log(`[M-Pesa] Payment failed | Reason: ${stkCallback.ResultDesc} | RequestID: ${checkoutRequestID}`);
      // Failed/cancelled payments will never complete, so drop the pending record.
      await removePendingPayment(checkoutRequestID).catch(() => {});
      return NextResponse.json(ACK);
    }

    const items: any[] = stkCallback.CallbackMetadata?.Item || [];
    const meta = (name: string) => items.find((i: any) => i.Name === name)?.Value ?? null;
    const amount = Number(meta('Amount'));
    const receiptNumber: string | null = meta('MpesaReceiptNumber');
    const phoneNumber = String(meta('PhoneNumber') ?? '');

    // 1. Only honour payments WE initiated. The body is attacker-controlled, so it must
    //    never decide who gets access: no pending record means no grant.
    const pending = (await getPendingPayments()).find((p: any) => p.checkoutRequestId === checkoutRequestID);
    if (!pending) {
      console.warn(`[M-Pesa] Ignored callback with no matching pending payment: ${checkoutRequestID}`);
      return NextResponse.json(ACK);
    }

    // 2. Idempotency: Safaricom may retry. Never grant twice for one receipt.
    if (receiptNumber) {
      const subs: any[] = await getSubscriptions();
      if (subs.some((s: any) => s.receiptNumber === receiptNumber)) {
        console.log(`[M-Pesa] Duplicate callback for receipt ${receiptNumber}, ignoring`);
        await removePendingPayment(checkoutRequestID).catch(() => {});
        return NextResponse.json(ACK);
      }
    }

    // 3. The amount actually paid must cover what we asked for.
    const expected = Number(pending.amount);
    if (!isFinite(amount) || (isFinite(expected) && amount < expected)) {
      console.warn(`[M-Pesa] Amount mismatch for ${checkoutRequestID}: paid ${amount}, expected ${expected}`);
      return NextResponse.json(ACK);
    }

    // 4. Resolve the buyer: the user recorded at STK-push time; phone match only when the
    //    push was started without a session.
    let userId: string | null = pending.userId ?? null;
    if (!userId && phoneNumber) {
      const norm = (p: string) => String(p || '').replace(/^\+?254/, '0');
      const users: any[] = await getUsers();
      userId = users.find((u: any) => norm(u.phone) === norm(phoneNumber))?.id ?? null;
    }

    const targetId: string | null = pending.paperId ?? null;
    if (!userId || !targetId) {
      console.warn(`[M-Pesa] Could not resolve user/target for ${checkoutRequestID} (user=${userId}, target=${targetId})`);
      return NextResponse.json(ACK); // keep the pending record so it can be reconciled manually
    }

    if (String(targetId).startsWith('item_')) {
      const item = await getMarketplaceItemById(targetId);
      if (!item) {
        console.warn(`[M-Pesa] Paid item ${targetId} not found`);
      } else if (item.status === 'sold') {
        console.warn(`[M-Pesa] Item ${targetId} was already sold; payment ${receiptNumber} needs a manual refund`);
      } else {
        await updateMarketplaceItem(targetId, { status: 'sold' });
        console.log(`[M-Pesa] Item ${targetId} sold | buyer ${userId} | receipt ${receiptNumber}`);
      }
    } else {
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + 3);
      await addSubscription({
        id: `sub_${Date.now()}`,
        userId,
        paperId: 'all_access',
        status: 'active',
        expiryDate: expiryDate.toISOString(),
        receiptNumber,
        amount,
        createdAt: new Date().toISOString(),
      });
      console.log(`[M-Pesa] Subscription created | user ${userId} | receipt ${receiptNumber}`);
    }

    // Remove the pending record only after the grant succeeded.
    await removePendingPayment(checkoutRequestID);
    return NextResponse.json(ACK);
  } catch (error) {
    console.error('[M-Pesa] Callback processing error:', error);
    return NextResponse.json(ACK); // always ack Safaricom
  }
}
