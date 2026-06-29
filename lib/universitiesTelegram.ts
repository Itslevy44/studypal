import {
  getUniversities,
  setTelegramCollection,
  getUniversityById,
  addUniversity,
  updateUniversity
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

export const getUniversitiesFromTelegramStore = async (): Promise<University[]> => {
  return getUniversities();
};

export const setUniversitiesInTelegramStore = async (universities: University[]): Promise<University[]> => {
  return setTelegramCollection('universities.json', 'universities', universities);
};

export const getUniversityFromTelegramStore = async (idOrName: string): Promise<University | undefined> => {
  const universities = await getUniversities();
  return universities.find((university) => university.id === idOrName || university.name === idOrName);
};

export const addUniversityToTelegramStore = async (university: University): Promise<University[]> => {
  const universities = await getUniversities();

  if (universities.some((item) => item.id === university.id || item.name === university.name)) {
    throw new Error('University already exists.');
  }

  return setUniversitiesInTelegramStore([...universities, university]);
};

export const updateUniversityInTelegramStore = async (
  id: string,
  updates: Partial<University>
): Promise<University | null> => {
  return updateUniversity(id, updates);
};

export const deleteUniversityFromTelegramStore = async (id: string): Promise<boolean> => {
  const universities = await getUniversities();
  const exists = universities.some((university) => university.id === id);

  if (!exists) return false;

  await setUniversitiesInTelegramStore(universities.filter((university) => university.id !== id));

  return true;
};
