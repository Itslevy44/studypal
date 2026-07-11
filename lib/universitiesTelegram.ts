/**
 * universitiesTelegram.ts
 * Delegates entirely to the Telegram-backed dataStore.
 * Kept so existing import paths in upload/route.ts and universities/route.ts don't break.
 */
import {
  getUniversities,
  getUniversityById,
  addUniversity,
  updateUniversity,
  deleteUniversity,
  setCollection,
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
  getUniversities() as Promise<University[]>;

export const setUniversitiesInTelegramStore = async (universities: University[]): Promise<University[]> => {
  await setCollection('universities', universities);
  return universities;
};

export const getUniversityFromTelegramStore = async (idOrName: string): Promise<University | undefined> => {
  const list = await getUniversities() as University[];
  return list.find((u) => u.id === idOrName || u.name === idOrName);
};

export const addUniversityToTelegramStore = async (university: University): Promise<University[]> => {
  const list = await getUniversities() as University[];
  if (list.some((u) => u.id === university.id || u.name === university.name)) {
    throw new Error('University already exists.');
  }
  await addUniversity(university);
  return getUniversities() as Promise<University[]>;
};

export const updateUniversityInTelegramStore = async (
  id: string,
  updates: Partial<University>
): Promise<University | null> => updateUniversity(id, updates) as Promise<University | null>;

export const deleteUniversityFromTelegramStore = async (id: string): Promise<boolean> => {
  const list = await getUniversities() as University[];
  if (!list.some((u) => u.id === id)) return false;
  await deleteUniversity(id);
  return true;
};
