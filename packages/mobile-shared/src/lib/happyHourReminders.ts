/**
 * Happy hour reminders (TasteLanc+ feature)
 *
 * Schedules a local notification 30 minutes before a happy hour starts, on
 * each day it runs. Reminder state is kept in AsyncStorage per user so the
 * toggle survives restarts; notification ids are stored so we can cancel.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import type { DayOfWeek, HappyHour } from '../types/database';
import { formatTime } from './formatters';

const REMINDERS_KEY = '@tastelanc_hh_reminders';
export const REMINDER_LEAD_MINUTES = 30;

interface StoredReminder {
  notificationIds: string[];
  restaurantId: string;
  restaurantName: string;
  happyHourName: string;
}

type ReminderMap = Record<string, StoredReminder>;

// expo-notifications weekday: 1 = Sunday ... 7 = Saturday
const WEEKDAY: Record<DayOfWeek, number> = {
  sunday: 1,
  monday: 2,
  tuesday: 3,
  wednesday: 4,
  thursday: 5,
  friday: 6,
  saturday: 7,
};

function storageKey(userId: string | null | undefined): string {
  return `${REMINDERS_KEY}_${userId || 'anon'}`;
}

async function readAll(userId: string | null | undefined): Promise<ReminderMap> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(userId));
    return raw ? (JSON.parse(raw) as ReminderMap) : {};
  } catch {
    return {};
  }
}

async function writeAll(userId: string | null | undefined, map: ReminderMap): Promise<void> {
  await AsyncStorage.setItem(storageKey(userId), JSON.stringify(map));
}

/** Whether a reminder is currently set for this happy hour. */
export async function isReminderSet(userId: string | null | undefined, happyHourId: string): Promise<boolean> {
  const map = await readAll(userId);
  return !!map[happyHourId];
}

async function ensurePermission(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status === 'granted') return true;
  const { status: requested } = await Notifications.requestPermissionsAsync();
  return requested === 'granted';
}

/**
 * "16:00:00" minus the lead time -> { weekdayShift, hour, minute }.
 * weekdayShift is -1 when the reminder falls on the previous day (e.g. 00:10 start).
 */
function reminderClock(startTime: string): { weekdayShift: number; hour: number; minute: number } {
  const [h, m] = startTime.split(':').map((n) => parseInt(n, 10));
  let total = h * 60 + (m || 0) - REMINDER_LEAD_MINUTES;
  let weekdayShift = 0;
  if (total < 0) {
    total += 24 * 60;
    weekdayShift = -1;
  }
  return { weekdayShift, hour: Math.floor(total / 60), minute: total % 60 };
}

/**
 * Schedule weekly reminders for every day the happy hour runs.
 * Returns false if notification permission was denied.
 */
export async function setReminder(
  userId: string | null | undefined,
  happyHour: HappyHour,
  restaurantId: string,
  restaurantName: string
): Promise<boolean> {
  const ok = await ensurePermission();
  if (!ok) return false;

  // Replace any existing schedule for this happy hour
  await clearReminder(userId, happyHour.id);

  const { weekdayShift, hour, minute } = reminderClock(happyHour.start_time);
  const title = `${happyHour.name} starts in ${REMINDER_LEAD_MINUTES} minutes`;
  const body = `${restaurantName}: ${formatTime(happyHour.start_time)} to ${formatTime(happyHour.end_time)}`;

  const notificationIds: string[] = [];
  for (const day of happyHour.days_of_week) {
    let weekday = WEEKDAY[day] + weekdayShift;
    if (weekday < 1) weekday = 7;
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        data: { type: 'happy_hour_reminder', restaurantId, happyHourId: happyHour.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday,
        hour,
        minute,
      },
    });
    notificationIds.push(id);
  }

  const map = await readAll(userId);
  map[happyHour.id] = { notificationIds, restaurantId, restaurantName, happyHourName: happyHour.name };
  await writeAll(userId, map);
  return true;
}

/** Cancel and forget the reminder for this happy hour. */
export async function clearReminder(userId: string | null | undefined, happyHourId: string): Promise<void> {
  const map = await readAll(userId);
  const existing = map[happyHourId];
  if (!existing) return;
  await Promise.all(
    existing.notificationIds.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined))
  );
  delete map[happyHourId];
  await writeAll(userId, map);
}
