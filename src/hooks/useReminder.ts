import { useEffect, useRef, useState } from 'react';
import { DEFAULT_SETTINGS } from '../db/types';
import { countTransactionsOnDate, getSettings, saveSettings } from '../db/repositories';
import { toDateKey } from '../lib/dates';
import {
  getNotificationPermission,
  reminderTimePassed,
  showReminderNotification,
} from '../lib/notifications';
import { useLiveQuery } from './useLiveQuery';

export interface ReminderState {
  ready: boolean;
  showBanner: boolean;
  settings: typeof DEFAULT_SETTINGS;
  dismiss: () => void;
}

/**
 * Pengingat harian bersifat best-effort: notifikasi web hanya bisa dikirim
 * saat aplikasi/PWA sedang berjalan. Banner tetap muncul di dalam aplikasi.
 */
export function useReminder(): ReminderState {
  const settingsQuery = useLiveQuery(() => getSettings(), [], DEFAULT_SETTINGS);
  const today = toDateKey();
  const countQuery = useLiveQuery(
    () => countTransactionsOnDate(undefined, today),
    [today],
    1,
  );
  const [tick, setTick] = useState(() => Date.now());
  const notifiedRef = useRef('');

  useEffect(() => {
    const timer = window.setInterval(() => setTick(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const settings = settingsQuery.data;
  const now = new Date(tick);
  const ready = !settingsQuery.loading && !countQuery.loading;
  const hasTransactions = countQuery.data > 0;
  const passed = reminderTimePassed(settings, now);
  const dismissedToday = settings.reminder_dismissed_on === today;
  const showBanner = ready && settings.reminder_enabled && passed && !hasTransactions && !dismissedToday;

  useEffect(() => {
    if (!ready || !settings.reminder_enabled || !passed || hasTransactions) return;
    if (settings.reminder_last_notified_on === today) return;
    if (notifiedRef.current === today) return;
    if (getNotificationPermission() !== 'granted') return;

    notifiedRef.current = today;
    void showReminderNotification().then((sent) => {
      if (sent) void saveSettings(undefined, { reminder_last_notified_on: today });
    });
  }, [ready, settings.reminder_enabled, settings.reminder_last_notified_on, passed, hasTransactions, today]);

  const dismiss = () => {
    void saveSettings(undefined, { reminder_dismissed_on: today });
  };

  return { ready, showBanner: Boolean(showBanner), settings, dismiss };
}
