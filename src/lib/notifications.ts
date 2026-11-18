import type { AppSettings } from '../db/types';
import { timeLabel } from './dates';

export type ReminderPermission = NotificationPermission | 'unsupported';

export const REMINDER_TITLE = 'CuanKu — Waktunya mencatat';
export const REMINDER_BODY = 'Sudah catat pengeluaran hari ini? Luangkan satu menit, yuk.';

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): ReminderPermission {
  if (!notificationsSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<ReminderPermission> {
  if (!notificationsSupported()) return 'unsupported';
  if (Notification.permission !== 'default') return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export async function showReminderNotification(
  body: string = REMINDER_BODY,
): Promise<boolean> {
  return showAppNotification(REMINDER_TITLE, body, 'cuanku-pengingat-harian');
}

/** Notifikasi umum (best-effort) untuk pesan dalam aplikasi. */
export async function showAppNotification(
  title: string,
  body: string,
  tag: string,
): Promise<boolean> {
  if (!notificationsSupported() || Notification.permission !== 'granted') return false;

  const options: NotificationOptions = {
    body,
    icon: './icons/icon-192.png',
    badge: './icons/icon-192.png',
    tag,
    lang: 'id',
  };

  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.showNotification(title, options);
        return true;
      }
    }
    new Notification(title, options);
    return true;
  } catch {
    return false;
  }
}

/** Apakah jam pengingat hari ini sudah lewat? */
export function reminderTimePassed(settings: AppSettings, now: Date = new Date()): boolean {
  const minutes = now.getHours() * 60 + now.getMinutes();
  return minutes >= settings.reminder_hour * 60 + settings.reminder_minute;
}

export function reminderTimeLabel(settings: AppSettings): string {
  return timeLabel(settings.reminder_hour, settings.reminder_minute);
}

/** Sisa milidetik menuju pengingat berikutnya (hari ini atau besok). */
export function msUntilNextReminder(settings: AppSettings, now: Date = new Date()): number {
  const target = new Date(now.getTime());
  target.setHours(settings.reminder_hour, settings.reminder_minute, 0, 0);
  if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1);
  return target.getTime() - now.getTime();
}
