import { describe, expect, it } from 'vitest';
import {
  clampHour,
  clampMinute,
  parseBoolean,
  settingsFromRows,
  settingsToRows,
} from './settings';
import { DEFAULT_SETTINGS } from '../db/types';

describe('clampHour & clampMinute', () => {
  it('membatasi jam 0-23 dan menit 0-59', () => {
    expect(clampHour(7)).toBe(7);
    expect(clampHour(-3)).toBe(0);
    expect(clampHour(99)).toBe(23);
    expect(clampHour('8')).toBe(8);
    expect(clampHour('bukan angka')).toBe(DEFAULT_SETTINGS.reminder_hour);
    expect(clampMinute(30)).toBe(30);
    expect(clampMinute(-5)).toBe(0);
    expect(clampMinute(90)).toBe(59);
    expect(clampMinute('x')).toBe(DEFAULT_SETTINGS.reminder_minute);
  });
});

describe('parseBoolean', () => {
  it('menerima string dan angka umum', () => {
    expect(parseBoolean('true', false)).toBe(true);
    expect(parseBoolean('1', false)).toBe(true);
    expect(parseBoolean('ya', false)).toBe(true);
    expect(parseBoolean('false', true)).toBe(false);
    expect(parseBoolean('0', true)).toBe(false);
    expect(parseBoolean(undefined, true)).toBe(true);
  });
});

describe('settingsFromRows', () => {
  it('menggabungkan nilai tersimpan dengan default', () => {
    expect(
      settingsFromRows([
        { key: 'reminder_enabled', value: 'true' },
        { key: 'reminder_hour', value: '99' },
        { key: 'reminder_minute', value: 'bukan-angka' },
        { key: 'last_backup_at', value: '2026-01-31T12:00:00.000Z' },
      ]),
    ).toEqual({
      ...DEFAULT_SETTINGS,
      reminder_enabled: true,
      reminder_hour: 23,
      reminder_minute: DEFAULT_SETTINGS.reminder_minute,
      last_backup_at: '2026-01-31T12:00:00.000Z',
    });
  });
});

describe('settingsToRows', () => {
  it('hanya menulis kunci yang diberikan dan menormalkan nilai', () => {
    expect(settingsToRows({ reminder_hour: 99, reminder_enabled: false })).toEqual([
      { key: 'reminder_enabled', value: 'false' },
      { key: 'reminder_hour', value: '23' },
    ]);
  });
});
