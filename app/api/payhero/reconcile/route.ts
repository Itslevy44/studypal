import { NextResponse } from 'next/server';
import { verifyRequestToken } from '@/lib/auth';
import { getPendingPayments, removePendingPayment } from '@/lib/dataStore';
import { getTransactionStatus } from '@/lib/payhero';
import { settlePending } from '@/lib/payments';

const MAX_AGE_MS = 60 * 60 * 1000; // ignore pending payments older than an hour

/**
 * Called by the app while it waits for the customer to enter their PIN. It asks PayHero
 * directly about the caller's own pending payments, so access still arrives if the webhook is late or lost.
 */
export async function POST(req: Request) {
  const decoded = verifyRequestToken(req.headers.get('authorization'));
  if (!decoded?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const mine = (await getPendingPayments() as any[]).filter(
    (p: any) => p.userId === decoded.userId && p.payheroReference && Date.now() - new Date(p.createdAt).getTime() < MAX_AGE_MS
  );

  let settled = 0;
  for (const p of mine) {
    try {
      const st = await getTransactionStatus(p.payheroReference);
      if (st.status === 'SUCCESS') {
        const r = await settlePending(p, { receipt: st.receipt, amount: Number(p.amount) });
        if (r === 'granted') settled++;
      } else if (st.status === 'FAILED') {
        await removePendingPayment(p.checkoutRequestId).catch(() => {});
      }
    } catch (e) {
      console.error('[PayHero] Reconcile lookup failed:', e);
    }
  }
  return NextResponse.json({ success: true, settled, pending: mine.length - settled });
}
