/**
 * dataStore.ts — Telegram-backed store (v5 — robust index tracking)
 *
 * Architecture:
 *   The index is a JSON document stored in Telegram containing:
 *     { users: { fileId, msgId }, papers: { fileId, msgId }, ... }
 *
 *   TELEGRAM_INDEX_FILE_ID env var = the file_id of the current index document.
 *   file_ids in Telegram never expire as long as the file exists.
 *
 * Flow:
 *   read  → getFile(indexFileId) → download index JSON → get collection fileId → download collection
 *   write → upload new collection doc → get new fileId → update index → upload new index → update INDEX_FILE_ID in memory
 *
 * Setup:
 *   1. Call POST /api/admin/bootstrap to upload all data and get the initial TELEGRAM_INDEX_FILE_ID
 *   2. Set TELEGRAM_INDEX_FILE_ID in .env.local and Vercel environment variables
 *   3. After any write, the in-process INDEX_FILE_ID updates automatically
 *      BUT Vercel cold starts reset it — always keep the env var current
 *      Use GET /api/admin/index-status to check the live value
 */

import { deleteFromTelegram } from './telegram';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const CHAT_ID   = process.env.TELEGRAM_CHAT_ID!;
const API       = `https://api.telegram.org/bot${BOT_TOKEN}`;

// The file_id of the current index document — loaded from env, updated on writes
let INDEX_FILE_ID: string | null = process.env.TELEGRAM_INDEX_FILE_ID || null;
// The message_id of the current index document — for cleanup on rewrites
let INDEX_MSG_ID: number | null = null;

interface IndexEntry { fileId: string; msgId: number }

// ── Exposed helper for /api/admin/index-status ────────────────────────────────
export const getIndexFileId = () => INDEX_FILE_ID;

// ── Telegram file helpers ─────────────────────────────────────────────────────

async function tgDownload(fileId: string): Promise<string | null> {
  try {
    const r = await fetch(`${API}/getFile?file_id=${encodeURIComponent(fileId)}`, { cache: 'no-store' });
    const j = await r.json();
    if (!j.ok) {
      console.error('[TG getFile]', j.description, 'fileId:', fileId);
      return null;
    }
    const url = `https://api.telegram.org/file/bot${BOT_TOKEN}/${j.result.file_path}`;
    const r2 = await fetch(url, { cache: 'no-store' });
    return await r2.text();
  } catch (e) {
    console.error('[TG download]', e);
    return null;
  }
}

async function tgUpload(kind: string, data: unknown[]): Promise<{ fileId: string; msgId: number } | null> {
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
    if (!j.ok) { console.error(`[TG upload ${kind}]`, j.description); return null; }
    return { fileId: j.result.document.file_id, msgId: j.result.message_id };
  } catch (e) {
    console.error(`[TG upload ${kind}]`, e);
    return null;
  }
}

async function tgDeleteMsg(msgId: number) {
  fetch(`${API}/deleteMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: CHAT_ID, message_id: msgId }),
  }).catch(() => {});
}

function parseJsonCaption(caption?: string): Record<string, unknown> | null {
  if (!caption) return null;
  try {
    return JSON.parse(caption);
  } catch {
    return null;
  }
}

function getStringMetadata(metadata: Record<string, unknown>, key: string): string | undefined {
  const value = metadata[key];
  return typeof value === 'string' ? value : undefined;
}

async function tgGetPinnedIndexEntry(): Promise<{ fileId: string; msgId: number } | null> {
  try {
    const res = await fetch(`${API}/getChat?chat_id=${CHAT_ID}`);
    const json = await res.json();
    if (!json.ok || !json.result?.pinned_message) return null;

    const pinned = json.result.pinned_message as any;
    const fileId = pinned.document?.file_id || pinned.photo?.[pinned.photo.length - 1]?.file_id;
    const msgId = pinned.message_id;
    if (!fileId || !msgId) return null;

    const metadata = parseJsonCaption(pinned.caption);
    if (getStringMetadata(metadata ?? {}, 'app') !== 'studypal_index') return null;

    return { fileId, msgId };
  } catch (error) {
    console.warn('[dataStore] Failed to read pinned index entry from Telegram', error);
    return null;
  }
}

async function tgPinMessage(msgId: number) {
  try {
    await fetch(`${API}/pinChatMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT_ID, message_id: msgId, disable_notification: true }),
    });
  } catch (error) {
    console.warn('[dataStore] Failed to pin Telegram index message', error);
  }
}

// ── Index management ──────────────────────────────────────────────────────────

async function readIndex(): Promise<Record<string, IndexEntry>> {
  if (!INDEX_FILE_ID) {
    const pinnedEntry = await tgGetPinnedIndexEntry();
    if (pinnedEntry) {
      INDEX_FILE_ID = pinnedEntry.fileId;
      INDEX_MSG_ID = pinnedEntry.msgId;
      console.log('[dataStore] Using pinned index from Telegram chat.');
    }
  }

  const pinnedEntry = await tgGetPinnedIndexEntry();
  if (pinnedEntry && pinnedEntry.fileId !== INDEX_FILE_ID) {
    INDEX_FILE_ID = pinnedEntry.fileId;
    INDEX_MSG_ID = pinnedEntry.msgId;
    console.log('[dataStore] Switched to latest pinned index from Telegram chat.');
  }

  if (!INDEX_FILE_ID) {
    console.error(
      '[dataStore] ❌ TELEGRAM_INDEX_FILE_ID is not set and no pinned index was found!\n' +
      '   → Call POST /api/admin/bootstrap (as admin) to initialize the Telegram store.\n' +
      '   → Copy the returned indexFileId into TELEGRAM_INDEX_FILE_ID in your .env.local\n' +
      '   → Also set it in your Vercel environment variables and redeploy.'
    );
    return {};
  }

  const text = await tgDownload(INDEX_FILE_ID);
  if (!text) {
    console.warn('[dataStore] Failed to download index from TELEGRAM_INDEX_FILE_ID. Trying pinned index. fileId:', INDEX_FILE_ID);
    const pinned = await tgGetPinnedIndexEntry();
    if (pinned && pinned.fileId !== INDEX_FILE_ID) {
      INDEX_FILE_ID = pinned.fileId;
      INDEX_MSG_ID = pinned.msgId;
      return readIndex();
    }
    console.error('[dataStore] Failed to download index. fileId:', INDEX_FILE_ID);
    return {};
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    console.error('[dataStore] Index parse error', e, 'fileId:', INDEX_FILE_ID);
    const pinned = await tgGetPinnedIndexEntry();
    if (pinned && pinned.fileId !== INDEX_FILE_ID) {
      INDEX_FILE_ID = pinned.fileId;
      INDEX_MSG_ID = pinned.msgId;
      return readIndex();
    }
    return {};
  }
}

async function writeIndex(index: Record<string, IndexEntry>): Promise<void> {
  const blob = new Blob([JSON.stringify(index, null, 2)], { type: 'application/json' });
  const file = new File([blob], 'studypal_index.json', { type: 'application/json' });
  const form = new FormData();
  form.append('chat_id', CHAT_ID);
  form.append('caption', JSON.stringify({ app: 'studypal_index', ts: Date.now() }));
  form.append('document', file);
  const res = await fetch(`${API}/sendDocument`, { method: 'POST', body: form });
  const j = await res.json();
  if (!j.ok) {
    console.error('[dataStore] Failed to upload index', j.description);
    throw new Error('[dataStore] Failed to upload index to Telegram');
  }

  // Delete old index message to keep the chat clean
  if (INDEX_MSG_ID && INDEX_MSG_ID !== j.result.message_id) {
    tgDeleteMsg(INDEX_MSG_ID);
  }

  const newFileId = j.result.document.file_id;
  const newMsgId  = j.result.message_id;
  INDEX_FILE_ID   = newFileId;
  INDEX_MSG_ID    = newMsgId;

  await tgPinMessage(newMsgId);

  console.log(`[dataStore] ✅ Index updated. New file_id: ${newFileId}`);
  console.log(`[dataStore] 💡 If this is a new cold-start-safe value, update TELEGRAM_INDEX_FILE_ID=${newFileId} in your env vars.`);
}

async function getCollection(kind: string): Promise<any[]> {
  const index = await readIndex();
  const entry = index[kind];
  if (!entry?.fileId) {
    console.warn(`[dataStore] No index entry for "${kind}". Run /api/admin/bootstrap if this is unexpected.`);
    return [];
  }

  const text = await tgDownload(entry.fileId);
  if (!text) { console.error(`[dataStore] Failed to download "${kind}"`); return []; }

  try {
    const data = JSON.parse(text);
    return Array.isArray(data) ? data : [];
  } catch {
    console.error(`[dataStore] Parse error for "${kind}"`);
    return [];
  }
}

export async function setCollection(kind: string, data: any[]): Promise<any[]> {
  const result = await tgUpload(kind, data);
  if (!result) throw new Error(`[dataStore] Failed to upload "${kind}" to Telegram`);

  const index = await readIndex();
  const oldEntry = index[kind];
  index[kind] = { fileId: result.fileId, msgId: result.msgId };
  await writeIndex(index);

  // Delete old collection message to keep the chat clean
  if (oldEntry?.msgId && oldEntry.msgId !== result.msgId) {
    tgDeleteMsg(oldEntry.msgId);
  }

  return data;
}

// ── Public stubs (kept for any legacy imports) ────────────────────────────────
export const readJsonFile  = (_f: string) => [];
export const writeJsonFile = (_f: string, _d: unknown) => {};

// ── Universities ──────────────────────────────────────────────────────────────
export const getUniversities = () => getCollection('universities');
export const getUniversityById = async (id: string) =>
  (await getUniversities()).find((u: any) => u.id === id) ?? null;
export const addUniversity = async (u: any) => {
  const list = await getUniversities(); list.push(u);
  await setCollection('universities', list); return u;
};
export const updateUniversity = async (id: string, upd: any) => {
  const list = await getUniversities();
  const i = list.findIndex((u: any) => u.id === id); if (i === -1) return null;
  (list as any[])[i] = { ...(list as any[])[i], ...upd };
  await setCollection('universities', list); return (list as any[])[i];
};
export const deleteUniversity = async (id: string) => {
  const list = await getUniversities();
  await setCollection('universities', list.filter((u: any) => u.id !== id)); return true;
};

// ── Papers ────────────────────────────────────────────────────────────────────
export const getPapers = () => getCollection('papers');
export const getPapersByUniversity = async (univId: string) => {
  const [papers, univs] = await Promise.all([getPapers(), getUniversities()]);
  const name = (univs as any[]).find((u: any) => u.id === univId)?.name;
  return (papers as any[]).filter((p: any) =>
    p.university === univId || p.university === name ||
    p.universityName === univId || p.universityName === name);
};
export const getPaperById = async (id: string) =>
  (await getPapers() as any[]).find((p: any) => p.id === id) ?? null;
export const addPaper = async (p: any) => {
  const list = await getPapers(); (list as any[]).push(p);
  await setCollection('papers', list as any[]); return p;
};
export const updatePaper = async (id: string, upd: any) => {
  const list = await getPapers() as any[];
  const i = list.findIndex((p: any) => p.id === id); if (i === -1) return null;
  list[i] = { ...list[i], ...upd }; await setCollection('papers', list); return list[i];
};
export const deletePaper = async (id: string) => {
  const list = await getPapers() as any[];
  await setCollection('papers', list.filter((p: any) => p.id !== id)); return true;
};

// ── Users ─────────────────────────────────────────────────────────────────────
export const getUsers = () => getCollection('users');
export const getUserByEmail = async (email: string) =>
  (await getUsers() as any[]).find((u: any) => u.email === email.toLowerCase()) ?? null;
export const getUserById = async (id: string) =>
  (await getUsers() as any[]).find((u: any) => u.id === id) ?? null;
export const addUser = async (u: any) => {
  const list = await getUsers(); (list as any[]).push(u);
  await setCollection('users', list as any[]); return u;
};
export const updateUser = async (id: string, upd: any) => {
  const list = await getUsers() as any[];
  const i = list.findIndex((u: any) => u.id === id); if (i === -1) return null;
  list[i] = { ...list[i], ...upd }; await setCollection('users', list); return list[i];
};

// ── Subscriptions ─────────────────────────────────────────────────────────────
export const getSubscriptions = () => getCollection('subscriptions');
export const getSubscriptionsByUser = async (userId: string) =>
  (await getSubscriptions() as any[]).filter((s: any) => s.userId === userId);
export const checkPaperAccess = async (userId: string, _?: string) =>
  (await getSubscriptions() as any[]).some((s: any) =>
    s.userId === userId && s.status === 'active' && new Date(s.expiryDate) > new Date());
export const addSubscription = async (s: any) => {
  const list = await getSubscriptions(); (list as any[]).push(s);
  await setCollection('subscriptions', list as any[]); return s;
};

// ── Marketplace Items ─────────────────────────────────────────────────────────
export const getMarketplaceItems = () => getCollection('marketplace_items');
export const getMarketplaceItemById = async (id: string) =>
  (await getMarketplaceItems() as any[]).find((i: any) => i.id === id) ?? null;
export const addMarketplaceItem = async (item: any) => {
  const list = await getMarketplaceItems(); (list as any[]).push(item);
  await setCollection('marketplace_items', list as any[]); return item;
};
export const updateMarketplaceItem = async (id: string, upd: any) => {
  const list = await getMarketplaceItems() as any[];
  const i = list.findIndex((x: any) => x.id === id); if (i === -1) return null;
  list[i] = { ...list[i], ...upd }; await setCollection('marketplace_items', list); return list[i];
};
export const deleteMarketplaceItem = async (id: string) => {
  const list = await getMarketplaceItems() as any[];
  const item = list.find((i: any) => i.id === id);
  if (item?.telegramMessageId) { try { await deleteFromTelegram(item.telegramMessageId); } catch {} }
  await setCollection('marketplace_items', list.filter((i: any) => i.id !== id)); return true;
};

// ── Advertisements ────────────────────────────────────────────────────────────
export const getAdvertisements = () => getCollection('advertisements');
export const addAdvertisement = async (ad: any) => {
  const list = await getAdvertisements(); (list as any[]).push(ad);
  await setCollection('advertisements', list as any[]); return ad;
};
export const updateAdvertisement = async (id: string, upd: any) => {
  const list = await getAdvertisements() as any[];
  const i = list.findIndex((a: any) => a.id === id); if (i === -1) return null;
  list[i] = { ...list[i], ...upd }; await setCollection('advertisements', list); return list[i];
};
export const deleteAdvertisement = async (id: string) => {
  const list = await getAdvertisements() as any[];
  const ad = list.find((a: any) => a.id === id);
  if (ad?.telegramMessageId) { try { await deleteFromTelegram(ad.telegramMessageId); } catch {} }
  await setCollection('advertisements', list.filter((a: any) => a.id !== id)); return true;
};

// ── Notices ───────────────────────────────────────────────────────────────────
export const getNotices = () => getCollection('notices');
export const addNotice = async (n: any) => {
  const list = await getNotices(); (list as any[]).push(n);
  await setCollection('notices', list as any[]); return n;
};
export const updateNotice = async (id: string, upd: any) => {
  const list = await getNotices() as any[];
  const i = list.findIndex((n: any) => n.id === id); if (i === -1) return null;
  list[i] = { ...list[i], ...upd }; await setCollection('notices', list); return list[i];
};
export const deleteNotice = async (id: string) => {
  const list = await getNotices() as any[];
  await setCollection('notices', list.filter((n: any) => n.id !== id)); return true;
};

// ── Pending Payments ──────────────────────────────────────────────────────────
export const getPendingPayments = () => getCollection('pending_payments');
export const addPendingPayment = async (p: any) => {
  const list = await getPendingPayments(); (list as any[]).push(p);
  await setCollection('pending_payments', list as any[]); return p;
};
export const removePendingPayment = async (checkoutRequestId: string) => {
  const list = await getPendingPayments() as any[];
  const filtered = list.filter((p: any) => p.checkoutRequestId !== checkoutRequestId);
  if (filtered.length === list.length) return false;
  await setCollection('pending_payments', filtered); return true;
};

export { deleteFromTelegram } from './telegram';
