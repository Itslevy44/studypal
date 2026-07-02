/**
 * dataStore.ts — Telegram-backed persistent store
 *
 * Telegram bot tokens never expire, making this reliable for production.
 *
 * How it works:
 * - All JSON collections are stored as documents sent to a Telegram channel.
 * - Each write sends a NEW message with the full updated JSON.
 * - Each read scans recent Telegram channel messages to find the latest
 *   document for a given collection (identified by caption metadata).
 * - A per-process in-memory cache prevents redundant Telegram API calls
 *   within the same serverless invocation.
 *
 * Collections: papers, universities, users, subscriptions,
 *              marketplace_items, advertisements, notices, pending_payments
 */

import { deleteFromTelegram } from './telegram';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID!;
const API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// ── In-process cache ──────────────────────────────────────────────────────────
interface CacheEntry { data: any[]; messageId: string; ts: number }
const cache: Record<string, CacheEntry> = {};
const CACHE_TTL_MS = 30_000; // 30 seconds

// ── Telegram helpers ──────────────────────────────────────────────────────────

async function tgGetUpdates(): Promise<any[]> {
  // Use getUpdates with large limit to scan all recent messages
  const res = await fetch(`${API}/getUpdates?limit=100&timeout=0`, { cache: 'no-store' });
  const j = await res.json();
  return j.ok ? j.result : [];
}

async function tgGetChannelHistory(): Promise<any[]> {
  // Forward latest messages to self trick — not reliable for all bots.
  // Instead we rely on getUpdates which gives us recent channel posts.
  return tgGetUpdates();
}

/** Download a file from Telegram by file_id and parse as JSON */
async function tgDownloadJson<T>(fileId: string): Promise<T | null> {
  try {
    const r1 = await fetch(`${API}/getFile?file_id=${fileId}`, { cache: 'no-store' });
    const j1 = await r1.json();
    if (!j1.ok) return null;
    const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${j1.result.file_path}`;
    const r2 = await fetch(fileUrl, { cache: 'no-store' });
    const text = await r2.text();
    return JSON.parse(text) as T;
  } catch { return null; }
}

/** Upload a JSON collection to Telegram, return new messageId */
async function tgUploadJson(kind: string, data: any[]): Promise<string | null> {
  try {
    const blob = new Blob(
      [JSON.stringify(data, null, 2)],
      { type: 'application/json' }
    );
    const file = new File([blob], `studypal_${kind}.json`, { type: 'application/json' });
    const caption = JSON.stringify({ app: 'studypal_store', kind, savedAt: new Date().toISOString() });

    const form = new FormData();
    form.append('chat_id', CHAT_ID);
    form.append('caption', caption);
    form.append('document', file);

    const res = await fetch(`${API}/sendDocument`, { method: 'POST', body: form });
    const j = await res.json();
    if (!j.ok) { console.error(`[TG Upload ${kind}]`, j.description); return null; }
    return String(j.result.message_id);
  } catch (e) { console.error(`[TG Upload ${kind}] exception:`, e); return null; }
}

/**
 * Scan Telegram updates for the most recent document with caption.kind === kind.
 * Returns { data, messageId } or null.
 */
async function tgFindLatest(kind: string): Promise<{ data: any[]; messageId: string } | null> {
  const updates = await tgGetUpdates();
  const chatIdStr = String(CHAT_ID);

  // Collect all matching messages
  const candidates: { messageId: string; fileId: string; savedAt: number }[] = [];

  for (const upd of updates) {
    const msg = upd.message || upd.channel_post || upd.edited_message || upd.edited_channel_post;
    if (!msg) continue;
    if (String(msg.chat?.id) !== chatIdStr) continue;
    if (!msg.document?.file_id) continue;

    let meta: any = {};
    try { meta = JSON.parse(msg.caption || '{}'); } catch { continue; }
    if (meta.app !== 'studypal_store' || meta.kind !== kind) continue;

    candidates.push({
      messageId: String(msg.message_id),
      fileId: msg.document.file_id,
      savedAt: Date.parse(meta.savedAt || '') || msg.message_id,
    });
  }

  if (!candidates.length) return null;

  // Pick most recent
  candidates.sort((a, b) => b.savedAt - a.savedAt);
  const best = candidates[0];

  const data = await tgDownloadJson<any[]>(best.fileId);
  if (!data) return null;
  return { data: Array.isArray(data) ? data : [], messageId: best.messageId };
}

// ── Core read/write ───────────────────────────────────────────────────────────

async function getCollection(kind: string): Promise<any[]> {
  // Return from cache if still fresh
  const cached = cache[kind];
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.data;

  const result = await tgFindLatest(kind);
  if (result) {
    cache[kind] = { data: result.data, messageId: result.messageId, ts: Date.now() };
    return result.data;
  }

  // Nothing in Telegram yet — return empty array
  return [];
}

async function setCollection(kind: string, data: any[]): Promise<any[]> {
  const msgId = await tgUploadJson(kind, data);
  // Update cache immediately
  cache[kind] = { data, messageId: msgId || '', ts: Date.now() };
  return data;
}

// ── Public helpers ────────────────────────────────────────────────────────────

export const readJsonFile = (_f: string) => [];
export const writeJsonFile = (_f: string, _d: any) => {};

// ── Universities ──────────────────────────────────────────────────────────────

export const getUniversities = () => getCollection('universities');

export const getUniversityById = async (id: string) => {
  const list = await getUniversities();
  return list.find((u: any) => u.id === id) ?? null;
};

export const addUniversity = async (university: any) => {
  const list = await getUniversities();
  list.push(university);
  await setCollection('universities', list);
  return university;
};

export const updateUniversity = async (id: string, updates: any) => {
  const list = await getUniversities();
  const idx = list.findIndex((u: any) => u.id === id);
  if (idx === -1) return null;
  list[idx] = { ...list[idx], ...updates };
  await setCollection('universities', list);
  return list[idx];
};

export const deleteUniversity = async (id: string) => {
  const list = await getUniversities();
  await setCollection('universities', list.filter((u: any) => u.id !== id));
  return true;
};

// ── Papers ────────────────────────────────────────────────────────────────────

export const getPapers = () => getCollection('papers');

export const getPapersByUniversity = async (univId: string) => {
  const [papers, universities] = await Promise.all([getPapers(), getUniversities()]);
  const univ = universities.find((u: any) => u.id === univId);
  const univName = univ?.name;
  return papers.filter((p: any) =>
    p.university === univId || p.university === univName ||
    p.universityName === univId || p.universityName === univName
  );
};

export const getPaperById = async (id: string) => {
  const list = await getPapers();
  return list.find((p: any) => p.id === id) ?? null;
};

export const addPaper = async (paper: any) => {
  const list = await getPapers();
  list.push(paper);
  await setCollection('papers', list);
  return paper;
};

export const updatePaper = async (id: string, updates: any) => {
  const list = await getPapers();
  const idx = list.findIndex((p: any) => p.id === id);
  if (idx === -1) return null;
  list[idx] = { ...list[idx], ...updates };
  await setCollection('papers', list);
  return list[idx];
};

export const deletePaper = async (id: string) => {
  const list = await getPapers();
  await setCollection('papers', list.filter((p: any) => p.id !== id));
  return true;
};

// ── Users ─────────────────────────────────────────────────────────────────────

export const getUsers = () => getCollection('users');

export const getUserByEmail = async (email: string) => {
  const list = await getUsers();
  return list.find((u: any) => u.email === email.toLowerCase()) ?? null;
};

export const getUserById = async (id: string) => {
  const list = await getUsers();
  return list.find((u: any) => u.id === id) ?? null;
};

export const addUser = async (user: any) => {
  const list = await getUsers();
  list.push(user);
  await setCollection('users', list);
  return user;
};

export const updateUser = async (id: string, updates: any) => {
  const list = await getUsers();
  const idx = list.findIndex((u: any) => u.id === id);
  if (idx === -1) return null;
  list[idx] = { ...list[idx], ...updates };
  await setCollection('users', list);
  return list[idx];
};

// ── Subscriptions ─────────────────────────────────────────────────────────────

export const getSubscriptions = () => getCollection('subscriptions');

export const getSubscriptionsByUser = async (userId: string) => {
  const list = await getSubscriptions();
  return list.filter((s: any) => s.userId === userId);
};

export const checkPaperAccess = async (userId: string, _paperId?: string) => {
  const list = await getSubscriptions();
  return list.some((s: any) =>
    s.userId === userId && s.status === 'active' && new Date(s.expiryDate) > new Date()
  );
};

export const addSubscription = async (subscription: any) => {
  const list = await getSubscriptions();
  list.push(subscription);
  await setCollection('subscriptions', list);
  return subscription;
};

// ── Marketplace Items ─────────────────────────────────────────────────────────

export const getMarketplaceItems = () => getCollection('marketplace_items');

export const getMarketplaceItemById = async (id: string) => {
  const list = await getMarketplaceItems();
  return list.find((i: any) => i.id === id) ?? null;
};

export const addMarketplaceItem = async (item: any) => {
  const list = await getMarketplaceItems();
  list.push(item);
  await setCollection('marketplace_items', list);
  return item;
};

export const updateMarketplaceItem = async (id: string, updates: any) => {
  const list = await getMarketplaceItems();
  const idx = list.findIndex((i: any) => i.id === id);
  if (idx === -1) return null;
  list[idx] = { ...list[idx], ...updates };
  await setCollection('marketplace_items', list);
  return list[idx];
};

export const deleteMarketplaceItem = async (id: string) => {
  const list = await getMarketplaceItems();
  const item = list.find((i: any) => i.id === id);
  if (item?.telegramMessageId) {
    try { await deleteFromTelegram(item.telegramMessageId); } catch (_) {}
  }
  await setCollection('marketplace_items', list.filter((i: any) => i.id !== id));
  return true;
};

// ── Advertisements ────────────────────────────────────────────────────────────

export const getAdvertisements = () => getCollection('advertisements');

export const addAdvertisement = async (ad: any) => {
  const list = await getAdvertisements();
  list.push(ad);
  await setCollection('advertisements', list);
  return ad;
};

export const updateAdvertisement = async (id: string, updates: any) => {
  const list = await getAdvertisements();
  const idx = list.findIndex((a: any) => a.id === id);
  if (idx === -1) return null;
  list[idx] = { ...list[idx], ...updates };
  await setCollection('advertisements', list);
  return list[idx];
};

export const deleteAdvertisement = async (id: string) => {
  const list = await getAdvertisements();
  const ad = list.find((a: any) => a.id === id);
  if (ad?.telegramMessageId) {
    try { await deleteFromTelegram(ad.telegramMessageId); } catch (_) {}
  }
  await setCollection('advertisements', list.filter((a: any) => a.id !== id));
  return true;
};

// ── Notices ───────────────────────────────────────────────────────────────────

export const getNotices = () => getCollection('notices');

export const addNotice = async (notice: any) => {
  const list = await getNotices();
  list.push(notice);
  await setCollection('notices', list);
  return notice;
};

export const updateNotice = async (id: string, updates: any) => {
  const list = await getNotices();
  const idx = list.findIndex((n: any) => n.id === id);
  if (idx === -1) return null;
  list[idx] = { ...list[idx], ...updates };
  await setCollection('notices', list);
  return list[idx];
};

export const deleteNotice = async (id: string) => {
  const list = await getNotices();
  await setCollection('notices', list.filter((n: any) => n.id !== id));
  return true;
};

// ── Pending Payments ──────────────────────────────────────────────────────────

export const getPendingPayments = () => getCollection('pending_payments');

export const addPendingPayment = async (payment: any) => {
  const list = await getPendingPayments();
  list.push(payment);
  await setCollection('pending_payments', list);
  return payment;
};

export const removePendingPayment = async (checkoutRequestId: string) => {
  const list = await getPendingPayments();
  const filtered = list.filter((p: any) => p.checkoutRequestId !== checkoutRequestId);
  if (filtered.length === list.length) return false;
  await setCollection('pending_payments', filtered);
  return true;
};

export { deleteFromTelegram } from './telegram';
