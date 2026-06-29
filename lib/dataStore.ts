import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  downloadJsonDocumentFromTelegram,
  getLatestJsonDocumentFromTelegram,
  sendJsonDocumentToTelegram
} from './telegram';

const packagedDataDir = path.join(process.cwd(), 'data');

// Determine a writable data directory. In serverless environments the project
// directory (e.g. /var/task) may be read-only. Use a runtime temp dir if so.
const runtimeDataDir = process.env.RUNTIME_DATA_DIR || path.join(os.tmpdir(), 'study-pal-data');

let dataDir = packagedDataDir;

const ensureDir = (dir: string) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// If packaged data dir is writable use it. Otherwise fall back to runtimeDataDir
try {
  // Try to write a small temp file to verify writability
  ensureDir(packagedDataDir);
  const testPath = path.join(packagedDataDir, '.write_test');
  fs.writeFileSync(testPath, 'ok');
  fs.unlinkSync(testPath);
  dataDir = packagedDataDir;
} catch (err) {
  // Packaged dir not writable — copy files to runtime dir on first run
  dataDir = runtimeDataDir;
  ensureDir(dataDir);

  try {
    const files = fs.readdirSync(packagedDataDir);
    for (const f of files) {
      const src = path.join(packagedDataDir, f);
      const dest = path.join(dataDir, f);
      if (!fs.existsSync(dest)) {
        try {
          fs.copyFileSync(src, dest);
        } catch (copyErr) {
          // ignore copy errors for missing files
        }
      }
    }
  } catch (readErr) {
    // packaged data dir may not exist or be unreadable — ensure runtime dir exists
    ensureDir(dataDir);
  }
}

// Generic file-based data store
export const readJsonFile = (filename: string) => {
  const filePath = path.join(dataDir, filename);
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.warn(`File ${filename} not found or invalid JSON`);
    return [];
  }
};

export const writeJsonFile = (filename: string, data: any) => {
  const filePath = path.join(dataDir, filename);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(`Failed to write ${filePath}:`, err);
    throw err;
  }
};

// GitHub REST API — persist index pointer files directly to the repo.
// This works in serverless environments (Vercel) where git CLI is unavailable.
const GITHUB_PAT = process.env.GITHUB_PAT;
const GITHUB_REPO = 'Itslevy44/studypal';
const GITHUB_BRANCH = 'main';

const persistIndexToGithub = async (indexFilename: string, indexData: object): Promise<void> => {
  if (!GITHUB_PAT) return;

  const repoPath = `data/${indexFilename}`;
  const apiUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${repoPath}`;
  const headers = {
    Authorization: `token ${GITHUB_PAT}`,
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  };

  try {
    // Get current file SHA (required for updates)
    let sha: string | undefined;
    const getRes = await fetch(apiUrl, { headers });
    if (getRes.ok) {
      const existing = await getRes.json();
      sha = existing.sha;
    }

    const content = Buffer.from(JSON.stringify(indexData, null, 2)).toString('base64');
    const body: Record<string, unknown> = {
      message: `data: update ${indexFilename}`,
      content,
      branch: GITHUB_BRANCH,
    };
    if (sha) body.sha = sha;

    const putRes = await fetch(apiUrl, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });

    if (!putRes.ok) {
      const err = await putRes.json();
      console.error(`[GitHub Persist] Failed to update ${indexFilename}:`, err.message);
    } else {
      console.log(`[GitHub Persist] Successfully updated ${indexFilename} in GitHub repo`);
    }
  } catch (err) {
    console.error(`[GitHub Persist] Exception updating ${indexFilename}:`, err instanceof Error ? err.message : err);
  }
};

// Fetch index pointer file from GitHub when local cache is missing (e.g. fresh Vercel instance)
const fetchIndexFromGithub = async (indexFilename: string): Promise<object | null> => {
  if (!GITHUB_PAT) return null;

  const repoPath = `data/${indexFilename}`;
  const apiUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${repoPath}?ref=${GITHUB_BRANCH}`;

  try {
    const res = await fetch(apiUrl, {
      headers: {
        Authorization: `token ${GITHUB_PAT}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });
    if (!res.ok) return null;
    const file = await res.json();
    if (!file.content) return null;
    const decoded = Buffer.from(file.content, 'base64').toString('utf8');
    return JSON.parse(decoded);
  } catch {
    return null;
  }
};

// Process-level cache to track if we've synced the index from GitHub on startup
const startupSyncDone: Record<string, boolean> = {};

// Generic Telegram-backed store collection helper functions
export const getTelegramCollection = async <T>(
  filename: string,
  kind: string,
  defaultValue: T
): Promise<T> => {
  const indexFilename = `${kind}_telegram.json`;
  let index = readJsonFile(indexFilename) as any;

  // On process/container startup, fetch the latest index pointer from GitHub
  // to ensure we don't use a stale packaged index file.
  if (!startupSyncDone[kind]) {
    console.log(`[Telegram Store ${kind}] Startup check: fetching latest index from GitHub...`);
    const githubIndex = await fetchIndexFromGithub(indexFilename);
    if (githubIndex) {
      index = githubIndex;
      // Cache it locally for subsequent requests in this container instance
      try { writeJsonFile(indexFilename, githubIndex); } catch { /* read-only fs */ }
    }
    startupSyncDone[kind] = true;
  } else if (!index?.telegramFileId) {
    console.log(`[Telegram Store ${kind}] No local index, fetching from GitHub...`);
    const githubIndex = await fetchIndexFromGithub(indexFilename);
    if (githubIndex) {
      index = githubIndex;
      try { writeJsonFile(indexFilename, githubIndex); } catch { /* read-only fs */ }
    }
  }

  const telegramFileId = (index as any)?.telegramFileId;

  if (telegramFileId) {
    try {
      const data = await downloadJsonDocumentFromTelegram<T>(telegramFileId);
      if (data) {
        try { writeJsonFile(filename, data); } catch { /* read-only fs */ }
        return data;
      }
    } catch (error) {
      console.warn(`[Telegram Store ${kind}] Falling back to cached local file:`, error);
    }
  }

  // Try to get latest from telegram channel updates as final fallback
  try {
    const latest = await getLatestJsonDocumentFromTelegram<T>(kind);
    if (latest) {
      const newIndex = {
        telegramMessageId: latest.messageId,
        telegramFileId: latest.fileId,
        updatedAt: latest.uploadedAt || new Date().toISOString(),
      };
      try { writeJsonFile(indexFilename, newIndex); } catch { /* read-only fs */ }
      try { writeJsonFile(filename, latest.data); } catch { /* read-only fs */ }
      return latest.data;
    }
  } catch (error) {
    console.warn(`[Telegram Store ${kind}] Failed to fetch from telegram updates:`, error);
  }

  // Fallback to local cache
  const cached = readJsonFile(filename);
  return (Array.isArray(cached) || typeof cached === 'object') && cached ? (cached as T) : defaultValue;
};

export const setTelegramCollection = async <T>(
  filename: string,
  kind: string,
  data: T
): Promise<T> => {
  const indexFilename = `${kind}_telegram.json`;
  const telegramFilename = `studypal_${kind}.json`;

  // Write locally first
  writeJsonFile(filename, data);

  try {
    const result = await sendJsonDocumentToTelegram(
      telegramFilename,
      data,
      { kind }
    );

    if (result.success && result.fileId && result.messageId) {
      const indexData = {
        telegramMessageId: result.messageId,
        telegramFileId: result.fileId,
        updatedAt: new Date().toISOString(),
      };
      try { writeJsonFile(indexFilename, indexData); } catch { /* read-only fs */ }
      // Persist index pointer to GitHub so it survives Vercel redeploys
      persistIndexToGithub(indexFilename, indexData).catch((e) =>
        console.error(`[GitHub Persist] Background push failed for ${indexFilename}:`, e)
      );
    } else {
      console.error(`[Telegram Store ${kind}] Failed to upload to Telegram:`, result.error);
    }
  } catch (error) {
    console.error(`[Telegram Store ${kind}] Exception uploading to Telegram:`, error);
  }

  return data;
};

// Universities operations
export const getUniversities = async () => getTelegramCollection<any[]>('universities.json', 'universities', []);

export const getUniversityById = async (id: string) => {
  const universities = await getUniversities();
  return universities.find((u: any) => u.id === id);
};

export const addUniversity = async (university: any) => {
  const universities = await getUniversities();
  universities.push(university);
  await setTelegramCollection('universities.json', 'universities', universities);
  return university;
};

export const updateUniversity = async (id: string, updates: any) => {
  const universities = await getUniversities();
  const index = universities.findIndex((u: any) => u.id === id);
  if (index !== -1) {
    universities[index] = { ...universities[index], ...updates };
    await setTelegramCollection('universities.json', 'universities', universities);
    return universities[index];
  }
  return null;
};

// Papers operations
export const getPapers = async () => getTelegramCollection<any[]>('papers.json', 'papers', []);

export const getPapersByUniversity = async (univId: string) => {
  const papers = await getPapers();
  const university = await getUniversityById(univId);
  const universityName = university?.name;

  return papers.filter((p: any) =>
    p.university === univId ||
    p.university === universityName ||
    p.universityName === univId ||
    p.universityName === universityName
  );
};

export const getPaperById = async (id: string) => {
  const papers = await getPapers();
  return papers.find((p: any) => p.id === id);
};

export const addPaper = async (paper: any) => {
  const papers = await getPapers();
  papers.push(paper);
  await setTelegramCollection('papers.json', 'papers', papers);
  return paper;
};

export const updatePaper = async (id: string, updates: any) => {
  const papers = await getPapers();
  const index = papers.findIndex((p: any) => p.id === id);
  if (index !== -1) {
    papers[index] = { ...papers[index], ...updates };
    await setTelegramCollection('papers.json', 'papers', papers);
    return papers[index];
  }
  return null;
};

export const deletePaper = async (id: string) => {
  const papers = await getPapers();
  const filtered = papers.filter((p: any) => p.id !== id);
  await setTelegramCollection('papers.json', 'papers', filtered);
  return true;
};

// Users operations
export const getUsers = async () => getTelegramCollection<any[]>('users.json', 'users', []);

export const getUserByEmail = async (email: string) => {
  const users = await getUsers();
  return users.find((u: any) => u.email === email.toLowerCase());
};

export const getUserById = async (id: string) => {
  const users = await getUsers();
  return users.find((u: any) => u.id === id);
};

export const addUser = async (user: any) => {
  const users = await getUsers();
  users.push(user);
  await setTelegramCollection('users.json', 'users', users);
  return user;
};

export const updateUser = async (id: string, updates: any) => {
  const users = await getUsers();
  const index = users.findIndex((u: any) => u.id === id);
  if (index !== -1) {
    users[index] = { ...users[index], ...updates };
    await setTelegramCollection('users.json', 'users', users);
    return users[index];
  }
  return null;
};

// Subscriptions operations
export const getSubscriptions = async () => getTelegramCollection<any[]>('subscriptions.json', 'subscriptions', []);

export const getSubscriptionsByUser = async (userId: string) => {
  const subs = await getSubscriptions();
  return subs.filter((s: any) => s.userId === userId);
};

export const checkPaperAccess = async (userId: string, paperId?: string) => {
  const subs = await getSubscriptions();
  const sub = subs.find((s: any) => 
    s.userId === userId && 
    s.status === 'active' &&
    new Date(s.expiryDate) > new Date()
  );
  return !!sub;
};

export const addSubscription = async (subscription: any) => {
  const subs = await getSubscriptions();
  subs.push(subscription);
  await setTelegramCollection('subscriptions.json', 'subscriptions', subs);
  return subscription;
};

// Marketplace Items operations
export const getMarketplaceItems = async () => getTelegramCollection<any[]>('marketplace_items.json', 'marketplace_items', []);

export const getMarketplaceItemById = async (id: string) => {
  const items = await getMarketplaceItems();
  return items.find((i: any) => i.id === id);
};

export const addMarketplaceItem = async (item: any) => {
  const items = (await getMarketplaceItems()) || [];
  items.push(item);
  await setTelegramCollection('marketplace_items.json', 'marketplace_items', items);
  return item;
};

export const updateMarketplaceItem = async (id: string, updates: any) => {
  const items = await getMarketplaceItems();
  const index = items.findIndex((i: any) => i.id === id);
  if (index !== -1) {
    items[index] = { ...items[index], ...updates };
    await setTelegramCollection('marketplace_items.json', 'marketplace_items', items);
    return items[index];
  }
  return null;
};

export const deleteMarketplaceItem = async (id: string) => {
  const items = await getMarketplaceItems();
  const filtered = items.filter((i: any) => i.id !== id);
  await setTelegramCollection('marketplace_items.json', 'marketplace_items', filtered);
  return true;
};

// Advertisements operations
export const getAdvertisements = async () => getTelegramCollection<any[]>('advertisements.json', 'advertisements', []);

export const addAdvertisement = async (ad: any) => {
  const ads = (await getAdvertisements()) || [];
  ads.push(ad);
  await setTelegramCollection('advertisements.json', 'advertisements', ads);
  return ad;
};

export const updateAdvertisement = async (id: string, updates: any) => {
  const ads = await getAdvertisements();
  const index = ads.findIndex((a: any) => a.id === id);
  if (index !== -1) {
    ads[index] = { ...ads[index], ...updates };
    await setTelegramCollection('advertisements.json', 'advertisements', ads);
    return ads[index];
  }
  return null;
};

export const deleteAdvertisement = async (id: string) => {
  const ads = await getAdvertisements();
  const filtered = ads.filter((a: any) => a.id !== id);
  await setTelegramCollection('advertisements.json', 'advertisements', filtered);
  return true;
};

// Notices operations
export const getNotices = async () => getTelegramCollection<any[]>('notices.json', 'notices', []);

export const addNotice = async (notice: any) => {
  const notices = (await getNotices()) || [];
  notices.push(notice);
  await setTelegramCollection('notices.json', 'notices', notices);
  return notice;
};

export const updateNotice = async (id: string, updates: any) => {
  const notices = await getNotices();
  const index = notices.findIndex((n: any) => n.id === id);
  if (index !== -1) {
    notices[index] = { ...notices[index], ...updates };
    await setTelegramCollection('notices.json', 'notices', notices);
    return notices[index];
  }
  return null;
};

export const deleteNotice = async (id: string) => {
  const notices = await getNotices();
  const filtered = notices.filter((n: any) => n.id !== id);
  await setTelegramCollection('notices.json', 'notices', filtered);
  return true;
};

// Pending Payments operations
export const getPendingPayments = async () => getTelegramCollection<any[]>('pending_payments.json', 'pending_payments', []);

export const addPendingPayment = async (payment: any) => {
  const payments = await getPendingPayments();
  payments.push(payment);
  await setTelegramCollection('pending_payments.json', 'pending_payments', payments);
  return payment;
};

export const removePendingPayment = async (checkoutRequestId: string) => {
  const payments = await getPendingPayments();
  const index = payments.findIndex((p: any) => p.checkoutRequestId === checkoutRequestId);
  if (index !== -1) {
    payments.splice(index, 1);
    await setTelegramCollection('pending_payments.json', 'pending_payments', payments);
    return true;
  }
  return false;
};
