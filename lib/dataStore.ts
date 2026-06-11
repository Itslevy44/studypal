import fs from 'fs';
import path from 'path';

const dataDir = path.join(process.cwd(), 'data');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
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
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
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

export const checkPaperAccess = (userId: string, paperId: string) => {
  const subs = getSubscriptions();
  const sub = subs.find((s: any) => 
    s.userId === userId && 
    s.paperId === paperId && 
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
