import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { verifyRequestToken } from '@/lib/auth';
import { getUsers, updateUser, getMarketplaceItems, addPendingPayment } from '@/lib/dataStore';
import { normalizePhone, stkPush } from '@/lib/payhero';

// Route path is unchanged so the web and mobile clients keep working; the payment
// provider behind it is now PayHero.
export async function POST(req: Request) {
  try {
    const { phoneNumber, accountReference, transactionDesc } = await req.json();

    if (!phoneNumber) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }
    const phone = normalizePhone(phoneNumber);
    if (!phone) {
      return NextResponse.json(
        { error: 'Enter a valid Safaricom number, e.g. 0712345678' },
        { status: 400 }
      );
    }

    const isItem = String(accountReference).startsWith('item_');
    // Never trust a client-supplied price: marketplace items are charged at their listed price.
    let paymentAmount = 100;
    let resolvedItemId: string | null = null;
    if (isItem) {
      const all = (await getMarketplaceItems()) || [];
      const ref = String(accountReference);
      const item = all.find((i: any) => i.id === ref) || all.find((i: any) => ref.length >= 8 && i.id.startsWith(ref));
      if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });
      if (item.status === 'sold') return NextResponse.json({ error: 'This item has already been sold' }, { status: 409 });
      paymentAmount = Math.ceil(Number(item.price));
      if (!isFinite(paymentAmount) || paymentAmount <= 0) {
        return NextResponse.json({ error: 'This item has no valid price' }, { status: 400 });
      }
      resolvedItemId = item.id;
    }
    const targetId = resolvedItemId ?? 'all_access';

    const decoded = verifyRequestToken(req.headers.get('authorization'));
    let customerName: string | undefined;
    if (decoded?.userId) {
      const user = (await getUsers() as any[]).find((u: any) => u.id === decoded.userId);
      customerName = user?.fullName;
      await updateUser(decoded.userId, { phone: `254${phone.slice(1)}` });
    }

    // Our own unique reference, echoed back by PayHero in the webhook as ExternalReference
    const externalReference = `sp_${Date.now().toString(36)}_${randomBytes(4).toString('hex')}`;

    const base = process.env.PAYHERO_CALLBACK_URL || `${new URL(req.url).origin}/api/payhero/callback`;
    const callbackUrl = process.env.PAYHERO_WEBHOOK_SECRET
      ? `${base}${base.includes('?') ? '&' : '?'}secret=${encodeURIComponent(process.env.PAYHERO_WEBHOOK_SECRET)}`
      : base;

    const result = await stkPush({
      amount: paymentAmount,
      phone,
      externalReference,
      customerName,
      callbackUrl,
    });

    await addPendingPayment({
      checkoutRequestId: result.checkoutRequestId || externalReference, // primary key for removal
      externalReference,
      payheroReference: result.reference,
      userId: decoded?.userId || null,
      paperId: targetId,
      amount: paymentAmount,
      createdAt: new Date().toISOString(),
    });
    console.log(`[PayHero] STK push sent | ref ${externalReference} | user ${decoded?.userId} | target ${targetId}`);

    return NextResponse.json({
      success: true,
      message: 'STK push sent successfully',
      data: { reference: result.reference, CheckoutRequestID: result.checkoutRequestId },
    });
  } catch (error: any) {
    console.error('STK push error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.status && error.status >= 400 && error.status < 600 ? error.status : 500 }
    );
  }
}
