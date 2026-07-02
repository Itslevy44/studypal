/**
 * universitiesTelegram.ts
 * Legacy wrapper — now delegates entirely to the GitHub-backed dataStore.
 * Kept so existing import paths in upload/route.ts don't break.
 */
import {
  getUniversities,
  getUniversityById,
  addUniversity,
  updateUniversity,
  deleteUniversity,
} from '@/lib/dataStore';

type Campus = {
  id: string;
  name: string;
  location: string;
  [key: string]: unknown;
};

type University = {
  id: string;
  name: string;
  campuses?: Campus[];
  [key: string]: unknown;
};

export const getUniversitiesFromTelegramStore = (): Promise<University[]> =>
  getUniversities();

export const setUniversitiesInTelegramStore = async (universities: University[]): Promise<University[]> => {
  // Bulk replace — write each one; in practice this is called after a delete
  // Just return the list; callers that need a full replace should use individual ops
  return universities;
};

export const getUniversityFromTelegramStore = async (idOrName: string): Promise<University | undefined> => {
  const list = await getUniversities();
  return list.find((u: any) => u.id === idOrName || u.name === idOrName);
};

export const addUniversityToTelegramStore = async (university: University): Promise<University[]> => {
  const list = await getUniversities();
  if (list.some((u: any) => u.id === university.id || u.name === university.name)) {
    throw new Error('University already exists.');
  }
  await addUniversity(university);
  return getUniversities();
};

export const updateUniversityInTelegramStore = async (
  id: string,
  updates: Partial<University>
): Promise<University | null> => updateUniversity(id, updates);

export const deleteUniversityFromTelegramStore = async (id: string): Promise<boolean> => {
  const list = await getUniversities();
  if (!list.some((u: any) => u.id === id)) return false;
  await deleteUniversity(id);
  return true;
};
