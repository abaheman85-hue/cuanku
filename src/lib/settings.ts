import type { AppSettings, Setting } from '../db/types';
import { DEFAULT_SETTINGS } from '../db/types';

export function clampHour(value: unknown): number {
  const parsed = Math.trunc(Number(value));
  if (!Number.isFinite(parsed)) return DEFAULT_SETTINGS.reminder_hour;
  return Math.min(23, Math.max(0, parsed));
}

export function clampMinute(value: unknown): number {
  const parsed = Math.trunc(Number(value));
  if (!Number.isFinite(parsed)) return DEFAULT_SETTINGS.reminder_minute;
  return Math.min(59, Math.max(0, parsed));
}

export function parseBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1' || normalized === 'ya') return true;
    if (normalized === 'false' || normalized === '0' || normalized === 'tidak') return false;
  }
  return fallback;
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function settingsFromRows(
  rows: readonly Setting[],
  defaults: AppSettings = DEFAULT_SETTINGS,
): AppSettings {
  const map = new Map(rows.map((row) => [row.key, row.value]));
  return {
    reminder_enabled: parseBoolean(map.get('reminder_enabled'), defaults.reminder_enabled),
    reminder_hour: map.has('reminder_hour')
      ? clampHour(map.get('reminder_hour'))
      : defaults.reminder_hour,
    reminder_minute: map.has('reminder_minute')
      ? clampMinute(map.get('reminder_minute'))
      : defaults.reminder_minute,
    reminder_last_notified_on: map.has('reminder_last_notified_on')
      ? stringValue(map.get('reminder_last_notified_on'))
      : defaults.reminder_last_notified_on,
    reminder_dismissed_on: map.has('reminder_dismissed_on')
      ? stringValue(map.get('reminder_dismissed_on'))
      : defaults.reminder_dismissed_on,
    last_backup_at: map.has('last_backup_at')
      ? stringValue(map.get('last_backup_at'))
      : defaults.last_backup_at,
  };
}

export function settingsToRows(settings: Partial<AppSettings>): Setting[] {
  const rows: Setting[] = [];
  if (settings.reminder_enabled !== undefined) {
    rows.push({ key: 'reminder_enabled', value: String(settings.reminder_enabled) });
  }
  if (settings.reminder_hour !== undefined) {
    rows.push({ key: 'reminder_hour', value: String(clampHour(settings.reminder_hour)) });
  }
  if (settings.reminder_minute !== undefined) {
    rows.push({ key: 'reminder_minute', value: String(clampMinute(settings.reminder_minute)) });
  }
  if (settings.reminder_last_notified_on !== undefined) {
    rows.push({
      key: 'reminder_last_notified_on',
      value: settings.reminder_last_notified_on,
    });
  }
  if (settings.reminder_dismissed_on !== undefined) {
    rows.push({ key: 'reminder_dismissed_on', value: settings.reminder_dismissed_on });
  }
  if (settings.last_backup_at !== undefined) {
    rows.push({ key: 'last_backup_at', value: settings.last_backup_at });
  }
  return rows;
}
