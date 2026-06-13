import { getUniversities, readJsonFile, writeJsonFile } from '@/lib/dataStore';
import { downloadJsonDocumentFromTelegram, getLatestJsonDocumentFromTelegram, sendJsonDocumentToTelegram } from '@/lib/telegram';

const TELEGRAM_STORE_INDEX = 'universities_telegram.json';
const TELEGRAM_STORE_FILE = 'studypal_universities.json';

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

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const normalizeCampus = (value: unknown): Campus | null => {
  if (!isRecord(value)) return null;

  return {
    id: typeof value.id === 'string' ? value.id : '',
    name: typeof value.name === 'string' ? value.name : '',
    location: typeof value.location === 'string' ? value.location : '',
  };
};

const normalizeUniversity = (value: unknown): University | null => {
  if (!isRecord(value)) return null;

  const id = typeof value.id === 'string' ? value.id : '';
  const name = typeof value.name === 'string' ? value.name : '';
  if (!id || !name) return null;

  const campuses = Array.isArray(value.campuses)
    ? value.campuses.map(normalizeCampus).filter((campus): campus is Campus => campus !== null)
    : [];

  return {
    ...value,
    id,
    name,
    campuses,
  };
};

const normalizeUniversities = (data: unknown): University[] => {
  if (Array.isArray(data)) {
    return data.map(normalizeUniversity).filter((university): university is University => university !== null);
  }

  if (isRecord(data) && Array.isArray(data.universities)) {
    return data.universities.map(normalizeUniversity).filter((university): university is University => university !== null);
  }

  return [];
};

const readTelegramIndex = (): Record<string, unknown> => {
  const index = readJsonFile(TELEGRAM_STORE_INDEX);
  return isRecord(index) ? index : {};
};

export const getUniversitiesFromTelegramStore = async (): Promise<University[]> => {
  const index = readTelegramIndex();

  const telegramFileId = typeof index.telegramFileId === 'string' ? index.telegramFileId : '';

  if (telegramFileId) {
    try {
      const data = await downloadJsonDocumentFromTelegram(telegramFileId);
      const universities = normalizeUniversities(data);
      writeJsonFile('universities.json', universities);
      return universities;
    } catch (error: unknown) {
      console.warn('[Universities Telegram Store] Falling back to cached universities:', error);
    }
  }

  const latest = await getLatestJsonDocumentFromTelegram<University[]>('universities');
  if (latest) {
    const universities = normalizeUniversities(latest.data);
    writeJsonFile(TELEGRAM_STORE_INDEX, {
      telegramMessageId: latest.messageId,
      telegramFileId: latest.fileId,
      updatedAt: latest.uploadedAt || new Date().toISOString(),
    });
    writeJsonFile('universities.json', universities);
    return universities;
  }

  const cached = getUniversities();
  return Array.isArray(cached) ? cached : [];
};

export const setUniversitiesInTelegramStore = async (universities: University[]): Promise<University[]> => {
  const result = await sendJsonDocumentToTelegram(
    TELEGRAM_STORE_FILE,
    universities,
    { kind: 'universities' }
  );

  if (!result.success || !result.fileId || !result.messageId) {
    throw new Error(result.error || 'Failed to store universities in Telegram.');
  }

  const index = {
    telegramMessageId: result.messageId,
    telegramFileId: result.fileId,
    updatedAt: new Date().toISOString(),
  };

  writeJsonFile(TELEGRAM_STORE_INDEX, index);
  writeJsonFile('universities.json', universities);

  return universities;
};

export const getUniversityFromTelegramStore = async (idOrName: string): Promise<University | undefined> => {
  const universities = await getUniversitiesFromTelegramStore();
  return universities.find((university) => university.id === idOrName || university.name === idOrName);
};

export const addUniversityToTelegramStore = async (university: University): Promise<University[]> => {
  const universities = await getUniversitiesFromTelegramStore();

  if (universities.some((item) => item.id === university.id || item.name === university.name)) {
    throw new Error('University already exists.');
  }

  return setUniversitiesInTelegramStore([...universities, university]);
};

export const updateUniversityInTelegramStore = async (
  id: string,
  updates: Partial<University>
): Promise<University | null> => {
  const universities = await getUniversitiesFromTelegramStore();
  const index = universities.findIndex((university) => university.id === id);

  if (index === -1) return null;

  const updated = {
    ...universities[index],
    ...updates,
  };

  const nextUniversities = [...universities];
  nextUniversities[index] = updated;

  await setUniversitiesInTelegramStore(nextUniversities);

  return updated;
};

export const deleteUniversityFromTelegramStore = async (id: string): Promise<boolean> => {
  const universities = await getUniversitiesFromTelegramStore();
  const exists = universities.some((university) => university.id === id);

  if (!exists) return false;

  await setUniversitiesInTelegramStore(universities.filter((university) => university.id !== id));

  return true;
};
