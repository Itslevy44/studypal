/**
 * dataStore.ts — Telegram-backed persistent store (v3)
 *
 * Architecture:
 * - Each collection (universities, papers, etc.) has its data stored as a
 *   Telegram document message in the channel.
 * - A single "index" message (pinned or known by ID) tracks the latest
 *   message ID for each collection.
 * - On read: fetch the index → get the message ID for the collection →
 *   download that document.
 * - On write: upload new document → update index with new message ID.
 * - The index message ID is stored in the INDEX_MESSAGE_ID env var,
 *   or auto-created on first run and logged so you can set it.
 *
 * Telegram bot tokens NEVER expire — this is the reliable permanent store.
 */

import { deleteFromTelegram } from './telegram';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const CHAT_ID   = process.env.TELEGRAM_CHAT_ID!;
const API       = `https://api.telegram.org/bot${BOT_TOKEN}`;

// The message ID of our index document in the channel.
// Set TELEGRAM_INDEX_MSG_ID env var after first deploy.
let INDEX_MSG_ID: string | null = process.env.TELEGRAM_INDEX_MSG_ID || null;

// In-process cache: { [kind]: { data, msgId, ts } }
interface CacheEntry { data: any[]; msgId: string; ts: number }
const cache: Record<string, CacheEntry> = {};
const CACHE_TTL = 15_000; // 15 seconds

// In-process index cache
let indexCache: Record<string, string> | null = null; // kind → msgId
let indexCacheTs = 0;
const INDEX_CACHE_TTL = 10_000;

// ── Low-level Telegram helpers ────────────────────────────────────────────────

async function tgDownloadByFileId(fileId: string): Promise<any[] | null> {
  try {
    const r1 = await fetch(`${API}/getFile?file_id=${fileId}`, { cache: 'no-store' });
    const j1 = await r1.json();
    if (!j1.ok) return null;
    const url = `https://api.telegram.org/file/bot${BOT_TOKEN}/${j1.result.file_path}`;
    const r2 = await fetch(url, { cache: 'no-store' });
    const text = await r2.text();
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('[TG Download]', e);
    return null;
  }
}

async function tgGetMessageFileId(msgId: string): Promise<string | null> {
  // Forward message to same chat then get its file_id, then delete it
  try {
    const fwd = await fetch(`${API}/forwardMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT_ID, from_chat_id: CHAT_ID, message_id: parseInt(msgId) }),
    });
    const fj = await fwd.json();
    if (!fj.ok) return null;
    const fileId = fj.result?.document?.file_id || null;
    // Clean up the forwarded copy
    await fetch(`${API}/deleteMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT_ID, message_id: fj.result.message_id }),
    });
    return fileId;
  } catch { return null; }
}

async function tgUploadJson(kind: string, data: any[]): Promise<string | null> {
  try {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const file = new File([blob], `studypal_${kind}.json`, { type: 'application/json' });
    const caption = JSON.stringify({ app: 'studypal_store', kind, ts: Date.now() });
    const form = new FormData();
    form.append('chat_id', CHAT_ID);
    form.append('caption', caption);
    form.append('document', file);
    const res = await fetch(`${API}/sendDocument`, { method: 'POST', body: form });
    const j = await res.json();
    if (!j.ok) { console.error(`[TG Upload ${kind}]`, j.description); return null; }
    return String(j.result.message_id);
  } catch (e) { console.error(`[TG Upload ${kind}]`, e); return null; }
}

// ── Index management ──────────────────────────────────────────────────────────

async function readIndex(): Promise<Record<string, string>> {
  // Return cached index if fresh
  if (indexCache && Date.now() - indexCacheTs < INDEX_CACHE_TTL) return indexCache;

  if (!INDEX_MSG_ID) {
    console.warn('[dataStore] TELEGRAM_INDEX_MSG_ID not set — starting with empty index');
    indexCache = {};
    indexCacheTs = Date.now();
    return {};
  }

  const fileId = await tgGetMessageFileId(INDEX_MSG_ID);
  if (!fileId) {
    console.warn('[dataStore] Could not read index message', INDEX_MSG_ID);
    indexCache = indexCache || {};
    return indexCache || {};
  }

  const data = await tgDownloadByFileId(fileId);
  const index = (data && !Array.isArray(data)) ? data as any : {};
  // data might be parsed as array if JSON is wrong — handle object
  const r1 = await fetch(`${API}/getFile?file_id=${fileId}`, { cache: 'no-store' });
  const j1 = await r1.json();
  if (j1.ok) {
    const url = `https://api.telegram.org/file/bot${BOT_TOKEN}/${j1.result.file_path}`;
    const r2 = await fetch(url, { cache: 'no-store' });
    const text = await r2.text();
    try {
      const parsed = JSON.parse(text);
      if (typeof parsed === 'object' && !Array.isArray(parsed)) {
        indexCache = parsed;
        indexCacheTs = Date.now();
        return parsed;
      }
    } catch {}
  }

  indexCache = indexCache || {};
  return indexCache || {};
}

async function writeIndex(index: Record<string, string>): Promise<void> {
  indexCache = index;
  indexCacheTs = Date.now();

  // Upload index as JSON document
  const blob = new Blob([JSON.stringify(index, null, 2)], { type: 'application/json' });
  const file = new File([blob], 'studypal_index.json', { type: 'application/json' });
  const form = new FormData();
  form.append('chat_id', CHAT_ID);
  form.append('caption', JSON.stringify({ app: 'studypal_index', ts: Date.now() }));
  form.append('document', file);
  const res = await fetch(`${API}/sendDocument`, { method: 'POST', body: form });
  const j = await res.json();

  if (j.ok) {
    const newMsgId = String(j.result.message_id);
    // If we had an old index message, delete it
    if (INDEX_MSG_ID && INDEX_MSG_ID !== newMsgId) {
      fetch(`${API}/deleteMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: CHAT_ID, message_id: parseInt(INDEX_MSG_ID) }),
      }).catch(() => {});
    }
    INDEX_MSG_ID = newMsgId;
    console.log(`[dataStore] Index updated → msgId ${newMsgId}. Set TELEGRAM_INDEX_MSG_ID=${newMsgId} in Vercel env.`);
  }
}

// ── Core collection read/write ─────────────────────────────────────────────────

async function getCollection(kind: string): Promise<any[]> {
  // Check in-process cache
  const cached = cache[kind];
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  const index = await readIndex();
  const msgId = index[kind];

  if (!msgId) return [];

  const fileId = await tgGetMessageFileId(msgId);
  if (!fileId) return [];

  const data = await tgDownloadByFileId(fileId);
  if (!data) return [];

  cache[kind] = { data, msgId, ts: Date.now() };
  return data;
}

async function setCollection(kind: string, data: any[]): Promise<any[]> {
  // Upload new document
  const newMsgId = await tgUploadJson(kind, data);
  if (!newMsgId) throw new Error(`Failed to save ${kind} to Telegram`);

  // Update index
  const index = await readIndex();
  const oldMsgId = index[kind];
  index[kind] = newMsgId;
  await writeIndex(index);

  // Delete old data message (optional cleanup, non-critical)
  if (oldMsgId) {
    fetch(`${API}/deleteMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT_ID, message_id: parseInt(oldMsgId) }),
    }).catch(() => {});
  }

  // Update cache
  cache[kind] = { data, msgId: newMsgId, ts: Date.now() };
  return data;
}

// ── Public helpers ────────────────────────────────────────────────────────────

export const readJsonFile  = (_f: string) => [];
export const writeJsonFile = (_f: string, _d: any) => {};

// ── Universities ──────────────────────────────────────────────────────────────
export const getUniversities  = () => getCollection('universities');
export const getUniversityById = async (id: string) =>
  (await getUniversities()).find((u: any) => u.id === id) ?? null;
export const addUniversity = async (u: any) => {
  const list = await getUniversities(); list.push(u);
  await setCollection('universities', list); return u;
};
export const updateUniversity = async (id: string, updates: any) => {
  const list = await getUniversities();
  const idx = list.findIndex((u: any) => u.id === id); if (idx === -1) return null;
  list[idx] = { ...list[idx], ...updates };
  await setCollection('universities', list); return list[idx];
};
export const deleteUniversity = async (id: string) => {
  const list = await getUniversities();
  await setCollection('universities', list.filter((u: any) => u.id !== id)); return true;
};

// ── Papers ────────────────────────────────────────────────────────────────────
export const getPapers = () => getCollection('papers');
export const getPapersByUniversity = async (univId: string) => {
  const [papers, univs] = await Promise.all([getPapers(), getUniversities()]);
  const name = univs.find((u: any) => u.id === univId)?.name;
  return papers.filter((p: any) =>
    p.university === univId || p.university === name ||
    p.universityName === univId || p.universityName === name);
};
export const getPaperById = async (id: string) =>
  (await getPapers()).find((p: any) => p.id === id) ?? null;
export const addPaper = async (p: any) => {
  const list = await getPapers(); list.push(p);
  await setCollection('papers', list); return p;
};
export const updatePaper = async (id: string, updates: any) => {
  const list = await getPapers();
  const idx = list.findIndex((p: any) => p.id === id); if (idx === -1) return null;
  list[idx] = { ...list[idx], ...updates };
  await setCollection('papers', list); return list[idx];
};
export const deletePaper = async (id: string) => {
  const list = await getPapers();
  await setCollection('papers', list.filter((p: any) => p.id !== id)); return true;
};

// ── Users ─────────────────────────────────────────────────────────────────────
export const getUsers = () => getCollection('users');
export const getUserByEmail = async (email: string) =>
  (await getUsers()).find((u: any) => u.email === email.toLowerCase()) ?? null;
export const getUserById = async (id: string) =>
  (await getUsers()).find((u: any) => u.id === id) ?? null;
export const addUser = async (u: any) => {
  const list = await getUsers(); list.push(u);
  await setCollection('users', list); return u;
};
export const updateUser = async (id: string, updates: any) => {
  const list = await getUsers();
  const idx = list.findIndex((u: any) => u.id === id); if (idx === -1) return null;
  list[idx] = { ...list[idx], ...updates };
  await setCollection('users', list); return list[idx];
};

// ── Subscriptions ─────────────────────────────────────────────────────────────
export const getSubscriptions = () => getCollection('subscriptions');
export const getSubscriptionsByUser = async (userId: string) =>
  (await getSubscriptions()).filter((s: any) => s.userId === userId);
export const checkPaperAccess = async (userId: string, _?: string) =>
  (await getSubscriptions()).some((s: any) =>
    s.userId === userId && s.status === 'active' && new Date(s.expiryDate) > new Date());
export const addSubscription = async (s: any) => {
  const list = await getSubscriptions(); list.push(s);
  await setCollection('subscriptions', list); return s;
};

// ── Marketplace Items ─────────────────────────────────────────────────────────
export const getMarketplaceItems = () => getCollection('marketplace_items');
export const getMarketplaceItemById = async (id: string) =>
  (await getMarketplaceItems()).find((i: any) => i.id === id) ?? null;
export const addMarketplaceItem = async (item: any) => {
  const list = await getMarketplaceItems(); list.push(item);
  await setCollection('marketplace_items', list); return item;
};
export const updateMarketplaceItem = async (id: string, updates: any) => {
  const list = await getMarketplaceItems();
  const idx = list.findIndex((i: any) => i.id === id); if (idx === -1) return null;
  list[idx] = { ...list[idx], ...updates };
  await setCollection('marketplace_items', list); return list[idx];
};
export const deleteMarketplaceItem = async (id: string) => {
  const list = await getMarketplaceItems();
  const item = list.find((i: any) => i.id === id);
  if (item?.telegramMessageId) { try { await deleteFromTelegram(item.telegramMessageId); } catch {} }
  await setCollection('marketplace_items', list.filter((i: any) => i.id !== id)); return true;
};

// ── Advertisements ────────────────────────────────────────────────────────────
export const getAdvertisements = () => getCollection('advertisements');
export const addAdvertisement = async (ad: any) => {
  const list = await getAdvertisements(); list.push(ad);
  await setCollection('advertisements', list); return ad;
};
export const updateAdvertisement = async (id: string, updates: any) => {
  const list = await getAdvertisements();
  const idx = list.findIndex((a: any) => a.id === id); if (idx === -1) return null;
  list[idx] = { ...list[idx], ...updates };
  await setCollection('advertisements', list); return list[idx];
};
export const deleteAdvertisement = async (id: string) => {
  const list = await getAdvertisements();
  const ad = list.find((a: any) => a.id === id);
  if (ad?.telegramMessageId) { try { await deleteFromTelegram(ad.telegramMessageId); } catch {} }
  await setCollection('advertisements', list.filter((a: any) => a.id !== id)); return true;
};

// ── Notices ───────────────────────────────────────────────────────────────────
export const getNotices = () => getCollection('notices');
export const addNotice = async (n: any) => {
  const list = await getNotices(); list.push(n);
  await setCollection('notices', list); return n;
};
export const updateNotice = async (id: string, updates: any) => {
  const list = await getNotices();
  const idx = list.findIndex((n: any) => n.id === id); if (idx === -1) return null;
  list[idx] = { ...list[idx], ...updates };
  await setCollection('notices', list); return list[idx];
};
export const deleteNotice = async (id: string) => {
  const list = await getNotices();
  await setCollection('notices', list.filter((n: any) => n.id !== id)); return true;
};

// ── Pending Payments ──────────────────────────────────────────────────────────
export const getPendingPayments = () => getCollection('pending_payments');
export const addPendingPayment = async (p: any) => {
  const list = await getPendingPayments(); list.push(p);
  await setCollection('pending_payments', list); return p;
};
export const removePendingPayment = async (checkoutRequestId: string) => {
  const list = await getPendingPayments();
  const filtered = list.filter((p: any) => p.checkoutRequestId !== checkoutRequestId);
  if (filtered.length === list.length) return false;
  await setCollection('pending_payments', filtered); return true;
};

export { deleteFromTelegram } from './telegram';
