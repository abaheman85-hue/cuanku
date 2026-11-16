import { describe, expect, it } from 'vitest';
import {
  addMonths,
  currentMonthKey,
  dateLabel,
  dateLabelLong,
  dayHeading,
  isSameMonth,
  isValidDateKey,
  monthKeysEndingAt,
  monthLabel,
  monthShortLabel,
  monthYearLabel,
  parseDateKey,
  parseMonthKey,
  shiftMonth,
  timeLabel,
  toDateKey,
  toMonthKey,
} from './dates';

describe('kunci tanggal & bulan', () => {
  it('memakai waktu lokal, bukan UTC', () => {
    expect(toDateKey(new Date(2026, 10, 16, 0, 5))).toBe('2026-11-16');
    expect(toMonthKey(new Date(2026, 0, 1, 23, 59))).toBe('2026-01');
  });

  it('mengurai kembali kunci tanggal dan bulan', () => {
    const date = parseDateKey('2026-07-09');
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(6);
    expect(date.getDate()).toBe(9);

    const month = parseMonthKey('2025-12');
    expect(month.getFullYear()).toBe(2025);
    expect(month.getMonth()).toBe(11);
    expect(month.getDate()).toBe(1);
  });

  it('memvalidasi kunci tanggal dengan ketat', () => {
    expect(isValidDateKey('2026-02-28')).toBe(true);
    expect(isValidDateKey('2026-02-30')).toBe(false);
    expect(isValidDateKey('16-11-2026')).toBe(false);
  });
});

describe('label tanggal', () => {
  it('membuat label bulan panjang dan pendek', () => {
    expect(monthLabel('2026-08')).toBe('Agustus 2026');
    expect(monthShortLabel('2026-08')).toBe('Agu');
    expect(monthYearLabel(new Date(2026, 0, 15, 12))).toBe('Januari 2026');
    expect(currentMonthKey()).toMatch(/^\d{4}-\d{2}$/);
  });

  it('membuat label tanggal pendek dan panjang', () => {
    expect(dateLabel('2026-01-01')).toBe('1 Jan 2026');
    expect(dateLabelLong('2026-01-01')).toBe('Kamis, 1 Januari 2026');
  });

  it('memformat jam dengan dua digit', () => {
    expect(timeLabel(5, 7)).toBe('05:07');
    expect(timeLabel(20, 0)).toBe('20:00');
  });
});

describe('dayHeading', () => {
  it('mengenali hari ini dan kemarin', () => {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(dayHeading(toDateKey(today))).toBe('Hari ini');
    expect(dayHeading(toDateKey(yesterday))).toBe('Kemarin');
  });

  it('memakai label panjang untuk tanggal lain', () => {
    expect(dayHeading('2026-01-01')).toBe('Kamis, 1 Januari 2026');
  });
});

describe('shiftMonth & addMonths', () => {
  it('berpindah bulan melewati batas tahun', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2025-12', 1)).toBe('2026-01');
    expect(shiftMonth('2026-01', -13)).toBe('2024-12');
    expect(shiftMonth('2026-06', 18)).toBe('2027-12');
  });

  it('membuat deret bulan yang berakhir di bulan tertentu', () => {
    expect(monthKeysEndingAt('2026-02', 3)).toEqual(['2025-12', '2026-01', '2026-02']);
  });

  it('mempertahankan tanggal dan menyesuaikan akhir bulan', () => {
    expect(toDateKey(addMonths(new Date(2026, 0, 15, 12), 3))).toBe('2026-04-15');
    expect(toDateKey(addMonths(new Date(2026, 0, 31, 12), 1))).toBe('2026-02-28');
    expect(toDateKey(addMonths(new Date(2024, 0, 31, 12), 1))).toBe('2024-02-29');
    expect(toDateKey(addMonths(new Date(2026, 10, 16, 12), 2))).toBe('2027-01-16');
  });
});

describe('isSameMonth', () => {
  it('membandingkan prefiks bulan', () => {
    expect(isSameMonth('2026-01-31', '2026-01')).toBe(true);
    expect(isSameMonth('2026-02-01', '2026-01')).toBe(false);
  });
});
