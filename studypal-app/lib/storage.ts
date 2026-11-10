import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const KEYS = {
  TOKEN: 'sp_token',
  USER: 'sp_user',
  LAST_UPDATE_CHECK: 'sp_last_update_check',
  DISMISSED_VERSION: 'sp_dismissed_version',
  UPDATE_INFO: 'sp_update_info',
};

// The auth token lives in the OS keystore. Older installs kept it in AsyncStorage (plain
// text), so migrate it on first read.
async function readToken(): Promise<string | null> {
  try {
    const secure = await SecureStore.getItemAsync(KEYS.TOKEN);
    if (secure) return secure;
  } catch { /* keystore unavailable: fall through to legacy */ }
  const legacy = await AsyncStorage.getItem(KEYS.TOKEN);
  if (legacy) {
    try {
      await SecureStore.setItemAsync(KEYS.TOKEN, legacy);
      await AsyncStorage.removeItem(KEYS.TOKEN);
    } catch { /* keep legacy copy if the keystore refuses */ }
  }
  return legacy;
}

export const storage = {
  getToken: readToken,
  async setToken(token: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(KEYS.TOKEN, token);
      await AsyncStorage.removeItem(KEYS.TOKEN);
    } catch {
      await AsyncStorage.setItem(KEYS.TOKEN, token);
    }
  },
  async getUser(): Promise<any | null> {
    const raw = await AsyncStorage.getItem(KEYS.USER);
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
  },
  async setUser(user: any): Promise<void> {
    await AsyncStorage.setItem(KEYS.USER, JSON.stringify(user));
  },
  async clearAuth(): Promise<void> {
    await SecureStore.deleteItemAsync(KEYS.TOKEN).catch(() => {});
    await AsyncStorage.multiRemove([KEYS.TOKEN, KEYS.USER]);
  },
  async getLastUpdateCheck(): Promise<number> {
    const val = await AsyncStorage.getItem(KEYS.LAST_UPDATE_CHECK);
    return val ? parseInt(val, 10) : 0;
  },
  async setLastUpdateCheck(ts: number): Promise<void> {
    await AsyncStorage.setItem(KEYS.LAST_UPDATE_CHECK, String(ts));
  },
  async getDismissedVersion(): Promise<string | null> {
    return AsyncStorage.getItem(KEYS.DISMISSED_VERSION);
  },
  async setDismissedVersion(version: string): Promise<void> {
    await AsyncStorage.setItem(KEYS.DISMISSED_VERSION, version);
  },
  /** Last update the server told us about, so a pending/mandatory update keeps showing between checks. */
  async getUpdateInfo(): Promise<any | null> {
    const raw = await AsyncStorage.getItem(KEYS.UPDATE_INFO);
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
  },
  async setUpdateInfo(info: any | null): Promise<void> {
    if (info) await AsyncStorage.setItem(KEYS.UPDATE_INFO, JSON.stringify(info));
    else await AsyncStorage.removeItem(KEYS.UPDATE_INFO);
  },
};
