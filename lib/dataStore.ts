/**
 * dataStore.ts — Telegram-backed store (v4 — file_id index)
 *
 * The index is a JSON document stored in Telegram containing:
 *   { universities: { fileId, msgId }, papers: { fileId, msgId }, ... }
 *
 * TELEGRAM_INDEX_FILE_ID env var = the file_id of the index document.
 * file_ids in Telegram never expire as long as the file exists.
 *
 * Flow:
 *   read  → getFile(indexFileId) → download index JSON → get collection fileId → download collection
 *   write → upload new collection doc → get new fileId → update index → upload new index → update TELEGRAM_INDEX_FILE_ID in memory
 */

import { deleteFromTelegram } from './telegram';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const CHAT_ID   = process.env.TELEGRAM_CHAT_ID!;
const API       = `https://api.telegram.org/bot${BOT_TOKEN}`;

// The file_id of the current index document — loaded from env, updated on writes
let INDEX_FILE_ID: string | null = process.env.TELEGRAM_INDEX_FILE_ID || null;

// In-process caches
interface ColCache { data: any[]; fileId: string; ts: number }
const colCache: Record<string, ColCache> = {};
const COL_TTL = 20_000; // 20s

interface IndexEntry { fileId: string; msgId: number }
let indexCache: Record<string, IndexEntry> | null = null;
let indexCacheTs = 0;
const INDEX_TTL = 10_000; // 10s

// ── Telegram file helpers ─────────────────────────────────────────────────────

async function tgDownload(fileId: string): Promise<string | null> {
  try {
    const r = await fetch(`${API}/getFile?file_id=${encodeURIComponent(fileId)}`, { cache: 'no-store' });
    const j = await r.json();
    if (!j.ok) { console.error('[TG getFile]', j.description, 'fileId:', fileId); return null; }
    const url = `https://api.telegram.org/file/bot${BOT_TOKEN}/${j.result.file_path}`;
    const r2 = await fetch(url, { cache: 'no-store' });
    return await r2.text();
  } catch (e) { console.error('[TG download]', e); return null; }
}

async function tgUpload(kind: string, data: any[]): Promise<{ fileId: string; msgId: number } | null> {
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
  } catch (e) { console.error(`[TG upload ${kind}]`, e); return null; }
}

async function tgDeleteMsg(msgId: number) {
  fetch(`${API}/deleteMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: CHAT_ID, message_id: msgId }),
  }).catch(() => {});
}

// ── Index management ──────────────────────────────────────────────────────────

async function readIndex(): Promise<Record<string, IndexEntry>> {
  if (indexCache && Date.now() - indexCacheTs < INDEX_TTL) return indexCache;

  if (!INDEX_FILE_ID) {
    console.warn('[dataStore] TELEGRAM_INDEX_FILE_ID not set');
    indexCache = {};
    indexCacheTs = Date.now();
    return {};
  }

  const text = await tgDownload(INDEX_FILE_ID);
  if (!text) {
    console.error('[dataStore] Failed to download index');
    return indexCache || {};
  }

  try {
    const parsed = JSON.parse(text);
    indexCache = parsed;
    indexCacheTs = Date.now();
    return parsed;
  } catch (e) {
    console.error('[dataStore] Index parse error', e);
    return indexCache || {};
  }
}

async function writeIndex(index: Record<string, IndexEntry>): Promise<void> {
  indexCache = index;
  indexCacheTs = Date.now();

  const blob = new Blob([JSON.stringify(index, null, 2)], { type: 'application/json' });
  const file = new File([blob], 'studypal_index.json', { type: 'application/json' });
  const form = new FormData();
  form.append('chat_id', CHAT_ID);
  form.append('caption', JSON.stringify({ app: 'studypal_index', ts: Date.now() }));
  form.append('document', file);
  const res = await fetch(`${API}/sendDocument`, { method: 'POST', body: form });
  const j = await res.json();
  if (!j.ok) { console.error('[dataStore] Failed to upload index', j.description); return; }

  const oldFileId = INDEX_FILE_ID;
  INDEX_FILE_ID = j.result.document.file_id;

  console.log(`[dataStore] Index updated. New file_id: ${INDEX_FILE_ID}`);
  console.log(`[dataStore] Update TELEGRAM_INDEX_FILE_ID=${INDEX_FILE_ID} in Vercel env.`);

  // Old index message cleanup (non-critical)
  if (j.result.message_id > 1) {
    // We can only delete if we know the old message ID — skip for now
  }
}

// ── Core CRUD ─────────────────────────────────────────────────────────────────

async function getCollection(kind: string): Promise<any[]> {
  const cached = colCache[kind];
  if (cached && Date.now() - cached.ts < COL_TTL) return cached.data;

  const index = await readIndex();
  const entry = index[kind];
  if (!entry?.fileId) { console.warn(`[dataStore] No index entry for ${kind}`); return []; }

  const text = await tgDownload(entry.fileId);
  if (!text) { console.error(`[dataStore] Failed to download ${kind}`); return []; }

  try {
    const data = JSON.parse(text);
    const arr = Array.isArray(data) ? data : [];
    colCache[kind] = { data: arr, fileId: entry.fileId, ts: Date.now() };
    return arr;
  } catch { console.error(`[dataStore] Parse error for ${kind}`); return []; }
}

async function setCollection(kind: string, data: any[]): Promise<any[]> {
  const result = await tgUpload(kind, data);
  if (!result) throw new Error(`[dataStore] Failed to upload ${kind}`);

  const index = await readIndex();
  const oldEntry = index[kind];
  index[kind] = { fileId: result.fileId, msgId: result.msgId };
  await writeIndex(index);

  // Optionally delete old data message
  if (oldEntry?.msgId) tgDeleteMsg(oldEntry.msgId);

  colCache[kind] = { data, fileId: result.fileId, ts: Date.now() };
  return data;
}

// ── Public stubs ──────────────────────────────────────────────────────────────
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
export const updateUniversity = async (id: string, upd: any) => {
  const list = await getUniversities();
  const i = list.findIndex((u: any) => u.id === id); if (i === -1) return null;
  list[i] = { ...list[i], ...upd }; await setCollection('universities', list); return list[i];
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
export const updatePaper = async (id: string, upd: any) => {
  const list = await getPapers();
  const i = list.findIndex((p: any) => p.id === id); if (i === -1) return null;
  list[i] = { ...list[i], ...upd }; await setCollection('papers', list); return list[i];
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
export const updateUser = async (id: string, upd: any) => {
  const list = await getUsers();
  const i = list.findIndex((u: any) => u.id === id); if (i === -1) return null;
  list[i] = { ...list[i], ...upd }; await setCollection('users', list); return list[i];
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
export const updateMarketplaceItem = async (id: string, upd: any) => {
  const list = await getMarketplaceItems();
  const i = list.findIndex((x: any) => x.id === id); if (i === -1) return null;
  list[i] = { ...list[i], ...upd }; await setCollection('marketplace_items', list); return list[i];
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
export const updateAdvertisement = async (id: string, upd: any) => {
  const list = await getAdvertisements();
  const i = list.findIndex((a: any) => a.id === id); if (i === -1) return null;
  list[i] = { ...list[i], ...upd }; await setCollection('advertisements', list); return list[i];
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
export const updateNotice = async (id: string, upd: any) => {
  const list = await getNotices();
  const i = list.findIndex((n: any) => n.id === id); if (i === -1) return null;
  list[i] = { ...list[i], ...upd }; await setCollection('notices', list); return list[i];
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
