import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  TOKEN: 'sp_token',
  USER: 'sp_user',
  LAST_UPDATE_CHECK: 'sp_last_update_check',
  DISMISSED_VERSION: 'sp_dismissed_version',
};

export const storage = {
  async getToken(): Promise<string | null> {
    return AsyncStorage.getItem(KEYS.TOKEN);
  },
  async setToken(token: string): Promise<void> {
    await AsyncStorage.setItem(KEYS.TOKEN, token);
  },
  async getUser(): Promise<any | null> {
    const raw = await AsyncStorage.getItem(KEYS.USER);
    return raw ? JSON.parse(raw) : null;
  },
  async setUser(user: any): Promise<void> {
    await AsyncStorage.setItem(KEYS.USER, JSON.stringify(user));
  },
  async clearAuth(): Promise<void> {
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
};
