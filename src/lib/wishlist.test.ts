import { describe, expect, it } from 'vitest';
import {
  formatRemainingDays,
  getSavingEstimate,
  getWaitInfo,
  isTargetReached,
  progressPercent,
  WAIT_DAYS,
  wishlistStatus,
} from './wishlist';

const DAY_MS = 24 * 60 * 60 * 1000;
const CREATED = new Date('2026-06-01T12:00:00.000Z').getTime();

describe('getWaitInfo', () => {
  it('menghitung sisa masa tunggu 7 hari', () => {
    const now = new Date(CREATED + 3.5 * DAY_MS);
    const info = getWaitInfo(new Date(CREATED).toISOString(), now);
    expect(WAIT_DAYS).toBe(7);
    expect(info.waiting).toBe(true);
    expect(info.remainingDays).toBe(4);
    expect(info.readyAt.getTime()).toBe(CREATED + 7 * DAY_MS);
    expect(info.progress).toBeCloseTo(0.5, 5);
  });

  it('menandai siap dibeli tepat setelah 7 hari', () => {
    const info = getWaitInfo(new Date(CREATED).toISOString(), new Date(CREATED + 7 * DAY_MS));
    expect(info.waiting).toBe(false);
    expect(info.remainingDays).toBe(0);
    expect(info.progress).toBe(1);
  });

  it('tetap aman jika tanggal pembuatan tidak valid', () => {
    const info = getWaitInfo('bukan-tanggal', new Date(CREATED));
    expect(info.waiting).toBe(true);
    expect(info.remainingDays).toBe(7);
    expect(info.progress).toBe(0);
  });

  it('tidak pernah menampilkan sisa lebih dari 7 hari saat jam masih tertinggal', () => {
    const now = new Date(CREATED - 5 * 60 * 1000);
    const info = getWaitInfo(new Date(CREATED).toISOString(), now);
    expect(info.waiting).toBe(true);
    expect(info.remainingDays).toBe(7);
    expect(info.progress).toBe(0);
  });
});

describe('getSavingEstimate', () => {
  const now = new Date(2026, 0, 15, 12);

  it('melaporkan selesai saat dana sudah cukup', () => {
    expect(getSavingEstimate(1000000, 1000000, 0, now)).toEqual({ kind: 'done', remaining: 0 });
    expect(getSavingEstimate(1000000, 1500000, 500000, now)).toEqual({
      kind: 'done',
      remaining: 0,
    });
  });

  it('meminta rencana bulanan bila belum diatur', () => {
    expect(getSavingEstimate(3000000, 500000, 0, now)).toEqual({
      kind: 'no-plan',
      remaining: 2500000,
    });
  });

  it('memperkirakan jumlah bulan dan bulan target', () => {
    expect(getSavingEstimate(3000000, 500000, 1000000, now)).toEqual({
      kind: 'estimate',
      remaining: 2500000,
      months: 3,
      targetLabel: 'April 2026',
    });
  });

  it('minimal satu bulan dan membulatkan sisa ke atas', () => {
    expect(getSavingEstimate(1200000, 1000000, 500000, now)).toMatchObject({ months: 1 });
    expect(getSavingEstimate(3000000, 100000, 1000000, now)).toMatchObject({ months: 3 });
  });
});

describe('progressPercent', () => {
  it('menghitung persentase dan membatasi 0-100', () => {
    expect(progressPercent(0, 0)).toBe(0);
    expect(progressPercent(1000000, 250000)).toBe(25);
    expect(progressPercent(1000000, 5000000)).toBe(100);
    expect(progressPercent(1000000, -50000)).toBe(0);
  });
});

describe('isTargetReached', () => {
  it('memerlukan harga positif dan dana cukup', () => {
    expect(isTargetReached(0, 0)).toBe(false);
    expect(isTargetReached(100000, 99999)).toBe(false);
    expect(isTargetReached(100000, 100000)).toBe(true);
  });
});

describe('wishlistStatus', () => {
  it('membedakan dibeli, menunggu, dan siap', () => {
    expect(wishlistStatus({ purchased: 1, created_at: new Date().toISOString() })).toBe(
      'purchased',
    );
    expect(wishlistStatus({ purchased: 0, created_at: new Date().toISOString() })).toBe('waiting');
    expect(
      wishlistStatus({
        purchased: 0,
        created_at: new Date(Date.now() - 8 * DAY_MS).toISOString(),
      }),
    ).toBe('ready');
  });
});

describe('formatRemainingDays', () => {
  it('memberi label siap dibeli saat hitungan habis', () => {
    expect(formatRemainingDays(0)).toBe('Siap dibeli');
    expect(formatRemainingDays(3)).toBe('3 hari lagi');
  });
});
