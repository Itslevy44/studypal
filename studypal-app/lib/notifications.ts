import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ENABLED_KEY = 'sp_notifications_enabled';
const SUB_ID = 'sp-subscription-expiry';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function remindersEnabled(): Promise<boolean> {
  return (await AsyncStorage.getItem(ENABLED_KEY)) !== 'false'; // on by default
}

export async function setRemindersEnabled(on: boolean) {
  await AsyncStorage.setItem(ENABLED_KEY, on ? 'true' : 'false');
  if (!on) await Notifications.cancelAllScheduledNotificationsAsync();
}

/** Asks for permission if needed. Returns true when notifications can be shown. */
export async function ensurePermission(): Promise<boolean> {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('reminders', {
        name: 'Reminders',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    return (await Notifications.requestPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

function at(date: Date, daysBefore: number, hour: number) {
  const d = new Date(date);
  d.setDate(d.getDate() - daysBefore);
  d.setHours(hour, 0, 0, 0);
  return d;
}

async function scheduleAt(when: Date, title: string, body: string, identifier?: string) {
  if (when.getTime() <= Date.now() + 60_000) return null; // skip times in the past
  return Notifications.scheduleNotificationAsync({
    identifier,
    content: { title, body },
    trigger: { date: when, channelId: 'reminders' },
  });
}

/** Schedules 7-day, 1-day and exam-morning reminders. Returns the notification ids. */
export async function scheduleExamReminders(course: string, examDate: Date): Promise<string[]> {
  if (!(await remindersEnabled()) || !(await ensurePermission())) return [];
  const plan: [Date, string, string][] = [
    [at(examDate, 7, 8), `${course} is in a week`, 'Time to start revising. Open StudyPal for past papers.'],
    [at(examDate, 1, 18), `${course} is tomorrow`, 'Last look at past papers, then get some rest.'],
    [at(examDate, 0, 7), `${course} exam today`, 'You have got this. Good luck!'],
  ];
  const ids: string[] = [];
  for (const [when, title, body] of plan) {
    const id = await scheduleAt(when, title, body).catch(() => null);
    if (id) ids.push(id);
  }
  return ids;
}

export async function cancelReminders(ids?: string[]) {
  if (!ids?.length) return;
  await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})));
}

/** One reminder 3 days before the subscription ends. Re-scheduling replaces the old one. */
export async function scheduleSubscriptionReminder(expiryIso: string, isTrial: boolean) {
  try {
    await Notifications.cancelScheduledNotificationAsync(SUB_ID).catch(() => {});
    if (!(await remindersEnabled()) || !(await ensurePermission())) return;
    const expiry = new Date(expiryIso);
    if (isNaN(expiry.getTime())) return;
    await scheduleAt(
      at(expiry, 3, 9),
      isTrial ? 'Your free trial ends in 3 days' : 'Your subscription ends in 3 days',
      'Renew in StudyPal to keep access to all papers.',
      SUB_ID
    );
  } catch { /* reminders are best-effort */ }
}
