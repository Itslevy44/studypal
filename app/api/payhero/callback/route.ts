import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { getPendingPayments, removePendingPayment } from '@/lib/dataStore';
import { getTransactionStatus } from '@/lib/payhero';
import { settlePending } from '@/lib/payments';

const ack = () => NextResponse.json({ ok: true });

function secretConfigured() { return !!process.env.PAYHERO_WEBHOOK_SECRET; }

function secretMatches(req: Request): boolean {
  const expected = process.env.PAYHERO_WEBHOOK_SECRET;
  if (!expected) return false;
  const given = new URL(req.url).searchParams.get('secret') ?? '';
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  try {
    // The callback URL we give PayHero carries ?secret=… ; reject anything without it.
    if (secretConfigured() && !secretMatches(req)) {
      console.warn('[PayHero] Rejected callback: bad or missing secret');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const r = body?.response;
    if (!r) return NextResponse.json({ error: 'Invalid callback data' }, { status: 400 });

    const externalRef: string | null = r.ExternalReference ?? null;
    const checkoutId: string | null = r.CheckoutRequestID ?? null;

    // Only payments WE started are honoured; the body alone never decides who gets access.
    const pending = (await getPendingPayments() as any[]).find(
      (p: any) => (externalRef && p.externalReference === externalRef) || (checkoutId && p.checkoutRequestId === checkoutId)
    );
    if (!pending) {
      console.warn(`[PayHero] Ignored callback with no pending payment (ref=${externalRef}, checkout=${checkoutId})`);
      return ack();
    }

    const success = body.status === true && Number(r.ResultCode) === 0 && String(r.Status).toLowerCase() === 'success';
    if (!success) {
      console.log(`[PayHero] Payment failed/cancelled | ${r.ResultDesc} | ref ${externalRef}`);
      await removePendingPayment(pending.checkoutRequestId).catch(() => {});
      return ack();
    }

    // Confirm with PayHero directly. If their API is unreachable, fall back to the webhook
    // only when the shared secret was verified; never when it isn't configured.
    let confirmed = false;
    try {
      const st = await getTransactionStatus(pending.payheroReference || externalRef || checkoutId!);
      confirmed = st.status === 'SUCCESS';
      if (!confirmed) console.warn(`[PayHero] Webhook said success but PayHero reports ${st.status} for ${externalRef}`);
    } catch (e) {
      console.error('[PayHero] Status lookup failed:', e);
      confirmed = secretConfigured() && secretMatches(req);
    }
    if (!confirmed) return ack();

    await settlePending(pending, {
      receipt: r.MpesaReceiptNumber ?? null,
      amount: Number(r.Amount),
      phone: r.Phone ?? null,
    });
    return ack();
  } catch (error) {
    console.error('[PayHero] Callback error:', error);
    return NextResponse.json({ error: 'Callback processing failed' }, { status: 500 });
  }
}
