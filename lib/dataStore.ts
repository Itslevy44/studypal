import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

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

// If GITHUB_PAT is provided and GITHUB_BACKED_STORE is enabled, commit and push
const shouldUseGithub = !!process.env.GITHUB_PAT || process.env.GITHUB_BACKED_STORE === '1';

const commitAndPushFile = (filePath: string, filename: string) => {
  if (!shouldUseGithub) return;

  try {
    const repoUrlBuffer = execSync('git config --get remote.origin.url', { encoding: 'utf8' });
    let repoUrl = (repoUrlBuffer || '').trim();
    if (!repoUrl) return;

    const branchBuffer = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' });
    const branch = (branchBuffer || 'main').trim();

    const githubPat = process.env.GITHUB_PAT || '';

    // Stage the file
    execSync(`git add "${filePath}"`);

    // Commit (ignore if no changes)
    try {
      execSync(`git commit -m "data: update ${filename}" --no-verify`, { stdio: 'ignore' });
    } catch (commitErr) {
      // nothing to commit
    }

    // Push using authenticated URL if PAT available
    if (githubPat) {
      // construct authenticated URL safely
      if (repoUrl.startsWith('https://')) {
        const authUrl = repoUrl.replace('https://', `https://${githubPat}@`);
        execSync(`git push "${authUrl}" HEAD:${branch}`);
      } else {
        execSync(`git push origin ${branch}`);
      }
    } else {
      execSync(`git push origin ${branch}`);
    }
  } catch (err) {
    console.error('Failed to commit/push data file to GitHub:', err instanceof Error ? err.message : err);
  }
};

// Universities operations
export const getUniversities = () => readJsonFile('universities.json');

export const getUniversityById = (id: string) => {
  const universities = getUniversities();
  return universities.find((u: any) => u.id === id);
};

export const addUniversity = (university: any) => {
  const universities = getUniversities();
  universities.push(university);
  writeJsonFile('universities.json', universities);
  return university;
};

export const updateUniversity = (id: string, updates: any) => {
  const universities = getUniversities();
  const index = universities.findIndex((u: any) => u.id === id);
  if (index !== -1) {
    universities[index] = { ...universities[index], ...updates };
    writeJsonFile('universities.json', universities);
    return universities[index];
  }
  return null;
};

// Papers operations
export const getPapers = () => readJsonFile('papers.json');

export const getPapersByUniversity = (univId: string) => {
  const papers = getPapers();
  const university = getUniversityById(univId);
  const universityName = university?.name;

  return papers.filter((p: any) =>
    p.university === univId ||
    p.university === universityName ||
    p.universityName === univId ||
    p.universityName === universityName
  );
};

export const getPaperById = (id: string) => {
  const papers = getPapers();
  return papers.find((p: any) => p.id === id);
};

export const addPaper = (paper: any) => {
  const papers = getPapers();
  papers.push(paper);
  writeJsonFile('papers.json', papers);
  return paper;
};

export const updatePaper = (id: string, updates: any) => {
  const papers = getPapers();
  const index = papers.findIndex((p: any) => p.id === id);
  if (index !== -1) {
    papers[index] = { ...papers[index], ...updates };
    writeJsonFile('papers.json', papers);
    return papers[index];
  }
  return null;
};

// Users operations
export const getUsers = () => readJsonFile('users.json');

export const getUserByEmail = (email: string) => {
  const users = getUsers();
  return users.find((u: any) => u.email === email.toLowerCase());
};

export const getUserById = (id: string) => {
  const users = getUsers();
  return users.find((u: any) => u.id === id);
};

export const addUser = (user: any) => {
  const users = getUsers();
  users.push(user);
  writeJsonFile('users.json', users);
  return user;
};

// Subscriptions operations
export const getSubscriptions = () => readJsonFile('subscriptions.json');

export const getSubscriptionsByUser = (userId: string) => {
  const subs = getSubscriptions();
  return subs.filter((s: any) => s.userId === userId);
};

export const checkPaperAccess = (userId: string, paperId?: string) => {
  const subs = getSubscriptions();
  const sub = subs.find((s: any) => 
    s.userId === userId && 
    s.status === 'active' &&
    new Date(s.expiryDate) > new Date()
  );
  return !!sub;
};

export const addSubscription = (subscription: any) => {
  const subs = getSubscriptions();
  subs.push(subscription);
  writeJsonFile('subscriptions.json', subs);
  return subscription;
};

// Marketplace Items operations
export const getMarketplaceItems = () => readJsonFile('marketplace_items.json');

export const getMarketplaceItemById = (id: string) => {
  const items = getMarketplaceItems();
  return items.find((i: any) => i.id === id);
};

export const addMarketplaceItem = (item: any) => {
  const items = getMarketplaceItems() || [];
  items.push(item);
  writeJsonFile('marketplace_items.json', items);
  return item;
};

export const updateMarketplaceItem = (id: string, updates: any) => {
  const items = getMarketplaceItems();
  const index = items.findIndex((i: any) => i.id === id);
  if (index !== -1) {
    items[index] = { ...items[index], ...updates };
    writeJsonFile('marketplace_items.json', items);
    return items[index];
  }
  return null;
};

export const deleteMarketplaceItem = (id: string) => {
  const items = getMarketplaceItems();
  const filtered = items.filter((i: any) => i.id !== id);
  writeJsonFile('marketplace_items.json', filtered);
  return true;
};

// Advertisements operations
export const getAdvertisements = () => readJsonFile('advertisements.json');

export const addAdvertisement = (ad: any) => {
  const ads = getAdvertisements() || [];
  ads.push(ad);
  writeJsonFile('advertisements.json', ads);
  return ad;
};

export const updateAdvertisement = (id: string, updates: any) => {
  const ads = getAdvertisements();
  const index = ads.findIndex((a: any) => a.id === id);
  if (index !== -1) {
    ads[index] = { ...ads[index], ...updates };
    writeJsonFile('advertisements.json', ads);
    return ads[index];
  }
  return null;
};

export const deleteAdvertisement = (id: string) => {
  const ads = getAdvertisements();
  const filtered = ads.filter((a: any) => a.id !== id);
  writeJsonFile('advertisements.json', filtered);
  return true;
};

// Notices operations
export const getNotices = () => readJsonFile('notices.json');

export const addNotice = (notice: any) => {
  const notices = getNotices() || [];
  notices.push(notice);
  writeJsonFile('notices.json', notices);
  return notice;
};

export const updateNotice = (id: string, updates: any) => {
  const notices = getNotices();
  const index = notices.findIndex((n: any) => n.id === id);
  if (index !== -1) {
    notices[index] = { ...notices[index], ...updates };
    writeJsonFile('notices.json', notices);
    return notices[index];
  }
  return null;
};

export const deleteNotice = (id: string) => {
  const notices = getNotices();
  const filtered = notices.filter((n: any) => n.id !== id);
  writeJsonFile('notices.json', filtered);
  return true;
};
