/**
 * dataStore.ts
 *
 * GitHub is the single source of truth for all JSON collections.
 * Every read fetches the latest file directly from GitHub.
 * Every write commits the updated file back to GitHub immediately.
 *
 * Telegram is used ONLY for binary file storage (PDFs, images).
 * The stale-Telegram-index problem is eliminated entirely.
 */

import {
  deleteFromTelegram,
} from './telegram';

const GITHUB_PAT = process.env.GITHUB_PAT;
const GITHUB_REPO = 'Itslevy44/studypal';
const GITHUB_BRANCH = 'main';
const GITHUB_API = 'https://api.github.com';

// ── In-memory write-through cache (per serverless instance) ──────────────────
// Prevents multiple reads in the same request, but GitHub is always the source
// on a fresh instance.
const memCache: Record<string, { data: any; sha: string }> = {};

async function githubGet(filePath: string): Promise<{ data: any; sha: string } | null> {
  if (!GITHUB_PAT) {
    console.error('[dataStore] GITHUB_PAT is not set');
    return null;
  }

  const url = `${GITHUB_API}/repos/${GITHUB_REPO}/contents/${filePath}?ref=${GITHUB_BRANCH}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `token ${GITHUB_PAT}`,
      Accept: 'application/vnd.github.v3+json',
    },
    // Always bypass any CDN cache
    cache: 'no-store',
  });

  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`GitHub GET ${filePath} failed: ${res.status}`);
  }

  const file = await res.json();
  const content = Buffer.from(file.content, 'base64').toString('utf8');
  return { data: JSON.parse(content), sha: file.sha };
}

async function githubPut(filePath: string, data: any, currentSha?: string): Promise<string> {
  if (!GITHUB_PAT) throw new Error('[dataStore] GITHUB_PAT is not set');

  // Get current SHA if not provided
  let sha = currentSha;
  if (!sha) {
    const existing = await githubGet(filePath);
    sha = existing?.sha;
  }

  const content = Buffer.from(JSON.stringify(data, null, 2) + '\n').toString('base64');
  const body: any = {
    message: `data: update ${filePath.split('/').pop()}`,
    content,
    branch: GITHUB_BRANCH,
  };
  if (sha) body.sha = sha;

  const res = await fetch(`${GITHUB_API}/repos/${GITHUB_REPO}/contents/${filePath}`, {
    method: 'PUT',
    headers: {
      Authorization: `token ${GITHUB_PAT}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`GitHub PUT ${filePath} failed: ${res.status} ${err.message || ''}`);
  }

  const result = await res.json();
  return result.content.sha;
}

// ── Generic collection helpers ────────────────────────────────────────────────

async function getCollection<T = any[]>(filename: string): Promise<T> {
  // Check memory cache first (valid within same serverless invocation)
  if (memCache[filename]) return memCache[filename].data as T;

  const result = await githubGet(`data/${filename}`);
  if (!result) return [] as unknown as T;

  memCache[filename] = result;
  return result.data as T;
}

async function setCollection<T = any[]>(filename: string, data: T): Promise<T> {
  const currentSha = memCache[filename]?.sha;
  const newSha = await githubPut(`data/${filename}`, data, currentSha);
  memCache[filename] = { data, sha: newSha };
  return data;
}

// ── Public helpers (used by api routes) ──────────────────────────────────────

export const readJsonFile = (filename: string) => {
  // Legacy sync helper — returns empty array; actual data comes from GitHub async
  return [];
};

export const writeJsonFile = (_filename: string, _data: any) => {
  // No-op — all writes go through setCollection → GitHub
};

// ── Universities ─────────────────────────────────────────────────────────────

export const getUniversities = () => getCollection('universities.json');

export const getUniversityById = async (id: string) => {
  const list = await getUniversities();
  return list.find((u: any) => u.id === id) ?? null;
};

export const addUniversity = async (university: any) => {
  const list = await getUniversities();
  list.push(university);
  await setCollection('universities.json', list);
  return university;
};

export const updateUniversity = async (id: string, updates: any) => {
  const list = await getUniversities();
  const idx = list.findIndex((u: any) => u.id === id);
  if (idx === -1) return null;
  list[idx] = { ...list[idx], ...updates };
  await setCollection('universities.json', list);
  return list[idx];
};

export const deleteUniversity = async (id: string) => {
  const list = await getUniversities();
  await setCollection('universities.json', list.filter((u: any) => u.id !== id));
  return true;
};

// ── Papers ────────────────────────────────────────────────────────────────────

export const getPapers = () => getCollection('papers.json');

export const getPapersByUniversity = async (univId: string) => {
  const [papers, universities] = await Promise.all([getPapers(), getUniversities()]);
  const university = universities.find((u: any) => u.id === univId);
  const universityName = university?.name;
  return papers.filter((p: any) =>
    p.university === univId ||
    p.university === universityName ||
    p.universityName === univId ||
    p.universityName === universityName
  );
};

export const getPaperById = async (id: string) => {
  const list = await getPapers();
  return list.find((p: any) => p.id === id) ?? null;
};

export const addPaper = async (paper: any) => {
  const list = await getPapers();
  list.push(paper);
  await setCollection('papers.json', list);
  return paper;
};

export const updatePaper = async (id: string, updates: any) => {
  const list = await getPapers();
  const idx = list.findIndex((p: any) => p.id === id);
  if (idx === -1) return null;
  list[idx] = { ...list[idx], ...updates };
  await setCollection('papers.json', list);
  return list[idx];
};

export const deletePaper = async (id: string) => {
  const list = await getPapers();
  await setCollection('papers.json', list.filter((p: any) => p.id !== id));
  return true;
};

// ── Users ─────────────────────────────────────────────────────────────────────

export const getUsers = () => getCollection('users.json');

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
  await setCollection('users.json', list);
  return user;
};

export const updateUser = async (id: string, updates: any) => {
  const list = await getUsers();
  const idx = list.findIndex((u: any) => u.id === id);
  if (idx === -1) return null;
  list[idx] = { ...list[idx], ...updates };
  await setCollection('users.json', list);
  return list[idx];
};

// ── Subscriptions ─────────────────────────────────────────────────────────────

export const getSubscriptions = () => getCollection('subscriptions.json');

export const checkPaperAccess = async (userId: string, _paperId?: string) => {
  const subs = await getSubscriptions();
  return subs.some((s: any) =>
    s.userId === userId &&
    s.status === 'active' &&
    new Date(s.expiryDate) > new Date()
  );
};

export const addSubscription = async (subscription: any) => {
  const list = await getSubscriptions();
  list.push(subscription);
  await setCollection('subscriptions.json', list);
  return subscription;
};

// ── Marketplace Items ─────────────────────────────────────────────────────────

export const getMarketplaceItems = () => getCollection('marketplace_items.json');

export const getMarketplaceItemById = async (id: string) => {
  const list = await getMarketplaceItems();
  return list.find((i: any) => i.id === id) ?? null;
};

export const addMarketplaceItem = async (item: any) => {
  const list = await getMarketplaceItems();
  list.push(item);
  await setCollection('marketplace_items.json', list);
  return item;
};

export const updateMarketplaceItem = async (id: string, updates: any) => {
  const list = await getMarketplaceItems();
  const idx = list.findIndex((i: any) => i.id === id);
  if (idx === -1) return null;
  list[idx] = { ...list[idx], ...updates };
  await setCollection('marketplace_items.json', list);
  return list[idx];
};

export const deleteMarketplaceItem = async (id: string) => {
  const list = await getMarketplaceItems();
  const item = list.find((i: any) => i.id === id);
  if (item?.telegramMessageId) {
    try { await deleteFromTelegram(item.telegramMessageId); } catch (_) {}
  }
  await setCollection('marketplace_items.json', list.filter((i: any) => i.id !== id));
  return true;
};

// ── Advertisements ────────────────────────────────────────────────────────────

export const getAdvertisements = () => getCollection('advertisements.json');

export const addAdvertisement = async (ad: any) => {
  const list = await getAdvertisements();
  list.push(ad);
  await setCollection('advertisements.json', list);
  return ad;
};

export const updateAdvertisement = async (id: string, updates: any) => {
  const list = await getAdvertisements();
  const idx = list.findIndex((a: any) => a.id === id);
  if (idx === -1) return null;
  list[idx] = { ...list[idx], ...updates };
  await setCollection('advertisements.json', list);
  return list[idx];
};

export const deleteAdvertisement = async (id: string) => {
  const list = await getAdvertisements();
  const ad = list.find((a: any) => a.id === id);
  if (ad?.telegramMessageId) {
    try { await deleteFromTelegram(ad.telegramMessageId); } catch (_) {}
  }
  await setCollection('advertisements.json', list.filter((a: any) => a.id !== id));
  return true;
};

// ── Notices ───────────────────────────────────────────────────────────────────

export const getNotices = () => getCollection('notices.json');

export const addNotice = async (notice: any) => {
  const list = await getNotices();
  list.push(notice);
  await setCollection('notices.json', list);
  return notice;
};

export const updateNotice = async (id: string, updates: any) => {
  const list = await getNotices();
  const idx = list.findIndex((n: any) => n.id === id);
  if (idx === -1) return null;
  list[idx] = { ...list[idx], ...updates };
  await setCollection('notices.json', list);
  return list[idx];
};

export const deleteNotice = async (id: string) => {
  const list = await getNotices();
  await setCollection('notices.json', list.filter((n: any) => n.id !== id));
  return true;
};

// ── Pending Payments ──────────────────────────────────────────────────────────

export const getPendingPayments = () => getCollection('pending_payments.json');

export const addPendingPayment = async (payment: any) => {
  const list = await getPendingPayments();
  list.push(payment);
  await setCollection('pending_payments.json', list);
  return payment;
};

export const removePendingPayment = async (checkoutRequestId: string) => {
  const list = await getPendingPayments();
  const filtered = list.filter((p: any) => p.checkoutRequestId !== checkoutRequestId);
  if (filtered.length === list.length) return false;
  await setCollection('pending_payments.json', filtered);
  return true;
};

// ── Subscriptions extra ───────────────────────────────────────────────────────

export const getSubscriptionsByUser = async (userId: string) => {
  const list = await getSubscriptions();
  return list.filter((s: any) => s.userId === userId);
};

// ── Legacy Telegram helpers (kept for upload routes that still use them) ──────
export { deleteFromTelegram } from './telegram';
