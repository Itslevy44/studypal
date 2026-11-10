import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';
import { storage } from './storage';

export interface PaperLike {
  id: string;
  title?: string;
  course?: string;
  examPeriod?: string;
  yearOfStudy?: string;
}

const dir = () => FileSystem.documentDirectory!;
export const pdfPath = (id: string) => `${dir()}${id}.pdf`;
const metaPath = (id: string) => `${dir()}${id}.meta.json`;

export async function isDownloaded(id: string): Promise<boolean> {
  const info = await FileSystem.getInfoAsync(pdfPath(id));
  return info.exists;
}

export async function listDownloadedIds(): Promise<Set<string>> {
  try {
    const files = await FileSystem.readDirectoryAsync(dir());
    return new Set(files.filter((f) => f.endsWith('.pdf')).map((f) => f.replace('.pdf', '')));
  } catch {
    return new Set();
  }
}

/** Downloads a paper to the device with progress (0..1) and writes metadata for the Offline tab. */
export async function downloadPaper(
  paper: PaperLike,
  onProgress?: (fraction: number) => void
): Promise<void> {
  const token = await storage.getToken();
  const task = FileSystem.createDownloadResumable(
    api.papers.downloadUrl(paper.id),
    pdfPath(paper.id),
    { headers: { Authorization: `Bearer ${token}` } },
    (p) => {
      if (onProgress && p.totalBytesExpectedToWrite > 0) {
        onProgress(p.totalBytesWritten / p.totalBytesExpectedToWrite);
      }
    }
  );
  const result = await task.downloadAsync();
  if (!result || result.status !== 200) {
    await FileSystem.deleteAsync(pdfPath(paper.id), { idempotent: true });
    throw new Error(
      result?.status === 403 ? 'Subscription required to download this paper.' : 'Failed to download paper.'
    );
  }
  await FileSystem.writeAsStringAsync(
    metaPath(paper.id),
    JSON.stringify({
      id: paper.id,
      title: paper.title || paper.course,
      course: paper.course,
      examPeriod: paper.examPeriod || '',
      yearOfStudy: paper.yearOfStudy || '',
      savedAt: new Date().toISOString(),
    })
  );
}

export interface SavedPaperMeta {
  id: string; title: string; course: string; examPeriod: string; yearOfStudy: string; savedAt: string;
}

/** Metadata of every paper saved on the device (for shelves like "Continue studying"). */
export async function listDownloadedMeta(): Promise<SavedPaperMeta[]> {
  try {
    const files = await FileSystem.readDirectoryAsync(dir());
    const out: SavedPaperMeta[] = [];
    for (const f of files.filter((n) => n.endsWith('.meta.json'))) {
      const id = f.replace('.meta.json', '');
      if (!(await isDownloaded(id))) continue;
      try { out.push(JSON.parse(await FileSystem.readAsStringAsync(`${dir()}${f}`))); } catch { /* skip corrupt meta */ }
    }
    return out;
  } catch {
    return [];
  }
}

const RECENT_KEY = 'sp_recent_opened';

/** Remember that a paper was just opened (most recent first, max 10). */
export async function recordOpened(id: string): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(RECENT_KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    await AsyncStorage.setItem(RECENT_KEY, JSON.stringify([id, ...list.filter((x) => x !== id)].slice(0, 10)));
  } catch { /* best-effort */ }
}

export async function getRecentOpened(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
