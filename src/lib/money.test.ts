import { describe, expect, it } from 'vitest';
import {
  formatCompactRupiah,
  formatMoneyInput,
  formatRupiah,
  formatThousands,
  parseMoneyInput,
} from './money';

describe('formatRupiah', () => {
  it('memakai pemisah titik dan tanpa desimal', () => {
    expect(formatRupiah(0)).toBe('Rp 0');
    expect(formatRupiah(1500000)).toBe('Rp 1.500.000');
    expect(formatRupiah(999)).toBe('Rp 999');
    expect(formatRupiah(1500.9)).toBe('Rp 1.500');
  });

  it('menangani nilai negatif dan tidak valid', () => {
    expect(formatRupiah(-2500000)).toBe('-Rp 2.500.000');
    expect(formatRupiah(Number.NaN)).toBe('Rp 0');
    expect(formatRupiah(Number.POSITIVE_INFINITY)).toBe('Rp 0');
  });
});

describe('formatThousands', () => {
  it('memformat tanpa prefix', () => {
    expect(formatThousands(1250000)).toBe('1.250.000');
    expect(formatThousands(-45000)).toBe('-45.000');
    expect(formatThousands(0)).toBe('0');
  });
});

describe('parseMoneyInput', () => {
  it('mengambil digit dari input berformat', () => {
    expect(parseMoneyInput('Rp 1.500.000')).toBe(1500000);
    expect(parseMoneyInput('1 250 000')).toBe(1250000);
    expect(parseMoneyInput('abc')).toBe(0);
    expect(parseMoneyInput('')).toBe(0);
  });

  it('mengabaikan tanda minus seperti perilaku input nominal', () => {
    expect(parseMoneyInput('-50.000')).toBe(50000);
  });

  it('membatasi nilai yang melebihi batas aman JavaScript', () => {
    expect(parseMoneyInput('999999999999999999999')).toBeGreaterThan(1e20);
  });
});

describe('formatMoneyInput', () => {
  it('memformat ulang isi input', () => {
    expect(formatMoneyInput('1500000')).toBe('1.500.000');
    expect(formatMoneyInput('12a34')).toBe('1.234');
    expect(formatMoneyInput('')).toBe('0');
  });
});

describe('formatCompactRupiah', () => {
  it('memakai satuan rb, jt, dan M', () => {
    expect(formatCompactRupiah(1500)).toBe('Rp 1.500');
    expect(formatCompactRupiah(15000)).toBe('Rp 15 rb');
    expect(formatCompactRupiah(1500000)).toBe('Rp 1,5 jt');
    expect(formatCompactRupiah(15000000)).toBe('Rp 15 jt');
    expect(formatCompactRupiah(1500000000)).toBe('Rp 1,5 M');
    expect(formatCompactRupiah(15000000000)).toBe('Rp 15 M');
  });

  it('menangani nilai negatif dan tidak valid', () => {
    expect(formatCompactRupiah(-1500000)).toBe('Rp -1,5 jt');
    expect(formatCompactRupiah(Number.NaN)).toBe('Rp 0');
  });
});
