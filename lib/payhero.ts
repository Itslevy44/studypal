// PayHero (https://payhero.co.ke) M-Pesa STK push client.
// Credentials come ONLY from environment variables, never from source:
//   PAYHERO_BASIC_AUTH   "Basic <base64(username:password)>" (or just the base64 part)
//   PAYHERO_API_USERNAME / PAYHERO_API_PASSWORD   alternative to PAYHERO_BASIC_AUTH
//   PAYHERO_CHANNEL_ID   your PayHero payment channel id
//   PAYHERO_WEBHOOK_SECRET   shared secret appended to the callback URL
//   PAYHERO_CALLBACK_URL     optional full public callback URL override

const BASE = 'https://backend.payhero.co.ke/api/v2';

export function authHeader(): string {
  const raw = process.env.PAYHERO_BASIC_AUTH?.trim();
  if (raw) return /^basic\s/i.test(raw) ? raw : `Basic ${raw}`;
  const u = process.env.PAYHERO_API_USERNAME;
  const p = process.env.PAYHERO_API_PASSWORD;
  if (u && p) return `Basic ${Buffer.from(`${u}:${p}`).toString('base64')}`;
  throw new Error('PayHero is not configured (set PAYHERO_BASIC_AUTH).');
}

/** Accepts 07xx…, 01xx…, 2547xx…, +2547xx…, 7xx… and returns local 07xxxxxxxx form, or null. */
export function normalizePhone(input: string): string | null {
  let p = String(input || '').replace(/[\s\-()]/g, '');
  if (p.startsWith('+')) p = p.slice(1);
  if (p.startsWith('254')) p = `0${p.slice(3)}`;
  else if (/^[17]\d{8}$/.test(p)) p = `0${p}`;
  return /^0[17]\d{8}$/.test(p) ? p : null;
}

export interface StkResult {
  reference: string;
  checkoutRequestId: string | null;
}

export async function stkPush(opts: {
  amount: number;
  phone: string; // already normalised
  externalReference: string;
  customerName?: string;
  callbackUrl: string;
}): Promise<StkResult> {
  const channelId = Number(process.env.PAYHERO_CHANNEL_ID);
  if (!channelId) throw new Error('PayHero is not configured (set PAYHERO_CHANNEL_ID).');

  const res = await fetch(`${BASE}/payments`, {
    method: 'POST',
    headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: opts.amount,
      phone_number: opts.phone,
      channel_id: channelId,
      provider: 'm-pesa',
      external_reference: opts.externalReference,
      customer_name: opts.customerName || 'StudyPal customer',
      callback_url: opts.callbackUrl,
    }),
  });

  let data: any = null;
  try { data = await res.json(); } catch { /* non-JSON */ }

  if (!res.ok || !data?.success) {
    const msg = data?.error_message || data?.error || data?.message || data?.detail;
    console.error('[PayHero] STK push failed', res.status, data);
    throw Object.assign(new Error(msg || 'Could not start the M-Pesa payment. Please try again.'), {
      status: res.ok ? 502 : res.status,
    });
  }
  return { reference: String(data.reference), checkoutRequestId: data.CheckoutRequestID ?? null };
}

export type PayheroStatus = 'SUCCESS' | 'FAILED' | 'QUEUED' | 'UNKNOWN';

/** Authoritative status lookup, used to confirm payments instead of trusting webhook bodies. */
export async function getTransactionStatus(reference: string): Promise<{
  status: PayheroStatus;
  receipt: string | null;
}> {
  const res = await fetch(`${BASE}/transaction-status?reference=${encodeURIComponent(reference)}`, {
    headers: { Authorization: authHeader() },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`PayHero status lookup failed (${res.status})`);
  const d: any = await res.json();
  const s = String(d?.status || '').toUpperCase();
  return {
    status: s === 'SUCCESS' || s === 'FAILED' || s === 'QUEUED' ? (s as PayheroStatus) : 'UNKNOWN',
    receipt: d?.provider_reference || d?.third_party_reference || null,
  };
}
