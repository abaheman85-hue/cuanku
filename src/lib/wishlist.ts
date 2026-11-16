import { addMonths, monthYearLabel } from './dates';

export const WAIT_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface WaitInfo {
  waiting: boolean;
  remainingDays: number;
  readyAt: Date;
  progress: number;
}

/** Masa tunggu 7 hari sebelum sebuah wishlist berstatus "Siap dibeli". */
export function getWaitInfo(createdAt: string, now: Date = new Date()): WaitInfo {
  const created = new Date(createdAt);
  const safeNow = now.getTime();
  if (Number.isNaN(created.getTime())) {
    return {
      waiting: true,
      remainingDays: WAIT_DAYS,
      readyAt: new Date(safeNow + WAIT_DAYS * DAY_MS),
      progress: 0,
    };
  }

  const readyAt = new Date(created.getTime() + WAIT_DAYS * DAY_MS);
  const elapsed = safeNow - created.getTime();
  const progress = Math.min(1, Math.max(0, elapsed / (WAIT_DAYS * DAY_MS)));
  const waiting = elapsed < WAIT_DAYS * DAY_MS;
  const remainingDays = waiting
    ? Math.min(
        WAIT_DAYS,
        Math.max(0, Math.ceil((readyAt.getTime() - safeNow) / DAY_MS)),
      )
    : 0;

  return {
    waiting,
    remainingDays,
    readyAt,
    progress,
  };
}

export type SavingEstimate =
  | { kind: 'done'; remaining: number }
  | { kind: 'no-plan'; remaining: number }
  | { kind: 'estimate'; remaining: number; months: number; targetLabel: string };

/** Perkiraan waktu tercapainya target berdasarkan rencana tabungan bulanan. */
export function getSavingEstimate(
  price: number,
  saved: number,
  monthlyPlan: number,
  now: Date = new Date(),
): SavingEstimate {
  const remaining = Math.max(0, Math.trunc(price) - Math.trunc(saved));
  if (remaining === 0) return { kind: 'done', remaining: 0 };
  if (monthlyPlan <= 0) return { kind: 'no-plan', remaining };

  const months = Math.max(1, Math.ceil(remaining / monthlyPlan));
  return {
    kind: 'estimate',
    remaining,
    months,
    targetLabel: monthYearLabel(addMonths(now, months)),
  };
}

export function progressPercent(price: number, saved: number): number {
  if (!Number.isFinite(price) || price <= 0) return 0;
  return Math.min(100, Math.max(0, (saved / price) * 100));
}

export function isTargetReached(price: number, saved: number): boolean {
  return price > 0 && saved >= price;
}

export type WishlistStatus = 'purchased' | 'waiting' | 'ready';

export function wishlistStatus(item: {
  purchased: 0 | 1;
  created_at: string;
  now?: Date;
}): WishlistStatus {
  if (item.purchased === 1) return 'purchased';
  return getWaitInfo(item.created_at, item.now).waiting ? 'waiting' : 'ready';
}

export function formatRemainingDays(days: number): string {
  if (days <= 0) return 'Siap dibeli';
  return `${days} hari lagi`;
}
