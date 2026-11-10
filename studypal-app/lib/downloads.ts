import * as FileSystem from 'expo-file-system';
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
