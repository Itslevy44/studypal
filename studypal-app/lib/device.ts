import * as Application from 'expo-application';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'sp_device_id';
let cached: string | null = null;

/**
 * One stable identifier used for BOTH login and every later request.
 * (Previously login could send a random id while requests sent 'unknown', which made
 * the server treat the session as belonging to another device.)
 */
export async function getDeviceId(): Promise<string> {
  if (cached) return cached;
  let id: string | null = null;
  try { id = Application.getAndroidId(); } catch { /* not Android */ }
  if (!id) {
    id = await AsyncStorage.getItem(KEY);
    if (!id) {
      id = `device_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
      await AsyncStorage.setItem(KEY, id);
    }
  }
  cached = id;
  return id;
}
