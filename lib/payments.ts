import {
  addSubscription,
  getUsers,
  getSubscriptions,
  getMarketplaceItemById,
  updateMarketplaceItem,
  removePendingPayment,
} from '@/lib/dataStore';

// Serialises settlement per payment inside one server instance (webhook vs. app reconcile racing).
const inflight = new Set<string>();

export type SettleResult = 'granted' | 'duplicate' | 'ignored';

/**
 * Turns a confirmed payment into access (subscription or sold marketplace item).
 * Shared by the PayHero webhook and the app-triggered reconcile endpoint, so both
 * paths are idempotent and apply the same checks.
 */
export async function settlePending(
  pending: any,
  paid: { receipt: string | null; amount: number; phone?: string | null }
): Promise<SettleResult> {
  const key: string = pending.checkoutRequestId;
  if (inflight.has(key)) return 'duplicate';
  inflight.add(key);
  try {
    return await settleOnce(pending, paid, key);
  } finally {
    inflight.delete(key);
  }
}

async function settleOnce(
  pending: any,
  paid: { receipt: string | null; amount: number; phone?: string | null },
  key: string
): Promise<SettleResult> {

  // Idempotency: one receipt grants once (webhook retries, webhook + reconcile racing).
  if (paid.receipt) {
    const subs: any[] = await getSubscriptions();
    if (subs.some((s: any) => s.receiptNumber === paid.receipt)) {
      await removePendingPayment(key).catch(() => {});
      return 'duplicate';
    }
  }

  const expected = Number(pending.amount);
  if (!isFinite(paid.amount) || (isFinite(expected) && paid.amount < expected)) {
    console.warn(`[Payments] Amount mismatch for ${key}: paid ${paid.amount}, expected ${expected}`);
    return 'ignored';
  }

  let userId: string | null = pending.userId ?? null;
  if (!userId && paid.phone) {
    const norm = (p: string) => String(p || '').replace(/^\+?254/, '0');
    const users: any[] = await getUsers();
    userId = users.find((u: any) => norm(u.phone) === norm(paid.phone!))?.id ?? null;
  }
  const targetId: string | null = pending.paperId ?? null;
  if (!userId || !targetId) {
    console.warn(`[Payments] Cannot resolve user/target for ${key}; leaving pending for manual reconciliation`);
    return 'ignored';
  }

  if (String(targetId).startsWith('item_')) {
    const item = await getMarketplaceItemById(targetId);
    if (!item) console.warn(`[Payments] Paid item ${targetId} not found`);
    else if (item.status === 'sold') console.warn(`[Payments] Item ${targetId} already sold; receipt ${paid.receipt} needs a manual refund`);
    else await updateMarketplaceItem(targetId, { status: 'sold' });
  } else {
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + 3);
    await addSubscription({
      id: `sub_${Date.now()}`,
      userId,
      paperId: 'all_access',
      status: 'active',
      expiryDate: expiryDate.toISOString(),
      receiptNumber: paid.receipt,
      amount: paid.amount,
      createdAt: new Date().toISOString(),
    });
  }

  // Remove the pending record only after the grant succeeded.
  await removePendingPayment(key);
  console.log(`[Payments] Granted ${targetId} to ${userId} | receipt ${paid.receipt}`);
  return 'granted';
}
