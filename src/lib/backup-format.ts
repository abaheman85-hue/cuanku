import type {
  AppSettings,
  BackupFile,
  BackupImage,
  Budget,
  BudgetAlert,
  BudgetAlertLevel,
  BudgetMonth,
  Category,
  ParsedBackup,
  SavingsDeposit,
  SavingsGoal,
  Setting,
  Transaction,
  TransactionType,
  WishlistItem,
} from '../db/types';
import { DEFAULT_SETTINGS } from '../db/types';
import { isValidDateKey, isValidMonthKey, isoNow } from './dates';
import { settingsFromRows, settingsToRows } from './settings';

export const BACKUP_APP = 'CuanKu' as const;
export const BACKUP_VERSION = 3;

function fail(message: string): never {
  throw new Error(message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown, maxLength: number, fallback = ''): string {
  if (typeof value !== 'string') return fallback;
  return value.trim().slice(0, maxLength);
}

function optionalText(value: unknown, maxLength: number): string | null {
  const result = text(value, maxLength);
  return result ? result : null;
}

function integer(value: unknown, fallback: number): number {
  const parsed = Math.round(Number(value));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function positiveInteger(value: unknown): number | null {
  const parsed = Math.round(Number(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function nonNegative(value: unknown): number {
  const parsed = Math.round(Number(value));
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function typeOf(value: unknown): TransactionType {
  if (value === 'income' || value === 'expense') return value;
  fail('Ada jenis transaksi yang tidak dikenal di file backup.');
}

function colorOf(value: unknown): string {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : '#D8D4CC';
}

function imageDataFromMap(
  images: Record<string, unknown>,
  filename: string | null,
): string | null {
  if (!filename) return null;
  if (filename.startsWith('data:image/')) return filename;
  const image = images[filename];
  if (!isRecord(image)) return null;
  const base64 = typeof image.base64 === 'string' ? image.base64 : '';
  if (!base64) return null;
  const mime = typeof image.mime_type === 'string' ? image.mime_type : 'image/jpeg';
  return `data:${mime};base64,${base64}`;
}

interface NormalizedCategories {
  rows: Category[];
  idMap: Map<number, number>;
}

function normalizeCategories(value: unknown): NormalizedCategories {
  if (!Array.isArray(value)) fail('File backup tidak memiliki bagian kategori.');
  const rows: Category[] = [];
  const idMap = new Map<number, number>();
  const usedIds = new Set<number>();
  let nextId = 1;

  value.forEach((item, index) => {
    if (!isRecord(item)) fail('Ada data kategori yang rusak di file backup.');
    const name = text(item.name, 40);
    if (!name) fail(`Kategori ke-${index + 1} tidak memiliki nama.`);
    const originalId = positiveInteger(item.id);
    let id = originalId ?? nextId;
    while (usedIds.has(id)) id += 1;
    usedIds.add(id);
    nextId = Math.max(nextId, id + 1);
    if (originalId !== null) idMap.set(originalId, id);

    rows.push({
      id,
      name,
      type: typeOf(item.type),
      color: colorOf(item.color),
      is_default: item.is_default === 1 || item.is_default === true ? 1 : 0,
      created_at: text(item.created_at, 40, isoNow()),
    });
  });

  return { rows, idMap };
}

function normalizeTransactions(
  value: unknown,
  idMap: Map<number, number>,
): Transaction[] {
  if (!Array.isArray(value)) fail('File backup tidak memiliki bagian transaksi.');
  return value.map((item, index) => {
    if (!isRecord(item)) fail('Ada data transaksi yang rusak di file backup.');
    const amount = Math.round(Number(item.amount));
    if (!Number.isFinite(amount) || amount <= 0) {
      fail(`Nominal transaksi ke-${index + 1} harus lebih dari nol.`);
    }
    const date = text(item.date, 10);
    if (!isValidDateKey(date)) fail(`Tanggal transaksi ke-${index + 1} tidak valid.`);
    const rawCategoryId = positiveInteger(item.category_id);
    const categoryId = rawCategoryId === null ? null : (idMap.get(rawCategoryId) ?? null);
    const createdAt = text(item.created_at, 40, isoNow());
    return {
      id: positiveInteger(item.id) ?? undefined,
      type: typeOf(item.type),
      amount,
      category_id: categoryId,
      date,
      note: optionalText(item.note, 300),
      created_at: createdAt,
      updated_at: text(item.updated_at, 40, createdAt),
    };
  });
}

function normalizeWishlist(
  value: unknown,
  images: Record<string, unknown>,
): WishlistItem[] {
  if (!Array.isArray(value)) fail('File backup tidak memiliki bagian wishlist.');
  return value.map((item, index) => {
    if (!isRecord(item)) fail('Ada data wishlist yang rusak di file backup.');
    const name = text(item.name, 120);
    if (!name) fail(`Wishlist ke-${index + 1} tidak memiliki nama.`);
    const price = Math.round(Number(item.price));
    if (!Number.isFinite(price) || price <= 0) {
      fail(`Harga wishlist ke-${index + 1} harus lebih dari nol.`);
    }
    const image =
      typeof item.image === 'string'
        ? imageDataFromMap(images, item.image)
        : imageDataFromMap(images, optionalText(item.image_file, 200));
    const purchased = item.purchased === 1 || item.purchased === true ? 1 : 0;
    return {
      id: positiveInteger(item.id) ?? undefined,
      name,
      price,
      image,
      link: optionalText(item.link, 500),
      note: optionalText(item.note, 500),
      saved_amount: nonNegative(item.saved_amount),
      monthly_plan: nonNegative(item.monthly_plan),
      created_at: text(item.created_at, 40, isoNow()),
      purchased,
      purchased_at: purchased === 1 ? optionalText(item.purchased_at, 40) : null,
    };
  });
}

function normalizeSettingsRows(value: unknown): Setting[] {
  if (!Array.isArray(value)) return [];
  const rows: Setting[] = [];
  for (const item of value) {
    if (!isRecord(item) || typeof item.key !== 'string') continue;
    const raw = item.value;
    if (typeof raw === 'string') rows.push({ key: item.key, value: raw });
    else if (typeof raw === 'number' || typeof raw === 'boolean') {
      rows.push({ key: item.key, value: String(raw) });
    }
  }
  return rows;
}

function nextUniqueId(raw: unknown, used: Set<number>, next: { value: number }): number {
  const original = positiveInteger(raw);
  let id = original ?? next.value;
  while (used.has(id)) id += 1;
  used.add(id);
  next.value = Math.max(next.value, id + 1);
  return id;
}

function normalizeBudgets(value: unknown, idMap: Map<number, number>): Budget[] {
  if (!Array.isArray(value)) return [];
  const usedIds = new Set<number>();
  const usedPairs = new Set<string>();
  const next = { value: 1 };
  const rows: Budget[] = [];
  for (const item of value) {
    if (!isRecord(item)) continue;
    const month = text(item.month, 7);
    const rawCategory = positiveInteger(item.category_id);
    const categoryId = rawCategory === null ? null : (idMap.get(rawCategory) ?? null);
    const amount = positiveInteger(item.amount);
    if (!isValidMonthKey(month) || categoryId === null || amount === null) continue;
    const pair = `${month}:${categoryId}`;
    if (usedPairs.has(pair)) continue;
    usedPairs.add(pair);
    rows.push({
      id: nextUniqueId(item.id, usedIds, next),
      month,
      category_id: categoryId,
      amount,
      created_at: text(item.created_at, 40, isoNow()),
      updated_at: text(item.updated_at, 40, isoNow()),
    });
  }
  return rows;
}

function normalizeBudgetMonths(value: unknown, budgets: Budget[]): BudgetMonth[] {
  const months = new Set<string>();
  if (Array.isArray(value)) {
    for (const item of value) {
      const month = isRecord(item) ? text(item.month, 7) : text(item, 7);
      if (isValidMonthKey(month)) months.add(month);
    }
  }
  // Backup lama tidak punya penanda; ambil dari bulan yang memiliki anggaran.
  for (const budget of budgets) months.add(budget.month);
  return [...months]
    .sort()
    .map((month) => ({ month, initialized_at: isoNow() }));
}

function normalizeBudgetAlerts(value: unknown, idMap: Map<number, number>): BudgetAlert[] {
  if (!Array.isArray(value)) return [];
  const usedIds = new Set<number>();
  const usedKeys = new Set<string>();
  const next = { value: 1 };
  const rows: BudgetAlert[] = [];
  for (const item of value) {
    if (!isRecord(item)) continue;
    const month = text(item.month, 7);
    const rawCategory = positiveInteger(item.category_id);
    const categoryId = rawCategory === null ? null : (idMap.get(rawCategory) ?? null);
    const level = Number(item.level);
    if (!isValidMonthKey(month) || categoryId === null || (level !== 80 && level !== 100)) continue;
    const key = `${month}:${categoryId}:${level}`;
    if (usedKeys.has(key)) continue;
    usedKeys.add(key);
    rows.push({
      id: nextUniqueId(item.id, usedIds, next),
      month,
      category_id: categoryId,
      level: level as BudgetAlertLevel,
      notified_at: text(item.notified_at, 40, isoNow()),
    });
  }
  return rows;
}

interface NormalizedSavingsGoals {
  rows: SavingsGoal[];
  idMap: Map<number, number>;
}

function normalizeSavingsGoals(value: unknown): NormalizedSavingsGoals {
  const rows: SavingsGoal[] = [];
  const idMap = new Map<number, number>();
  const usedIds = new Set<number>();
  const next = { value: 1 };
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      if (!isRecord(item)) fail(`Tabungan ke-${index + 1} rusak di file backup.`);
      const name = text(item.name, 120);
      if (!name) fail(`Tabungan ke-${index + 1} tidak memiliki nama.`);
      const target = positiveInteger(item.target_amount);
      if (target === null) fail(`Target tabungan ke-${index + 1} tidak valid.`);
      const originalId = positiveInteger(item.id);
      const id = nextUniqueId(item.id, usedIds, next);
      if (originalId !== null) idMap.set(originalId, id);
      const claimed = item.reward_claimed_at === null ? null : optionalText(item.reward_claimed_at, 40);
      rows.push({
        id,
        name,
        target_amount: target,
        note: optionalText(item.note, 500),
        created_at: text(item.created_at, 40, isoNow()),
        achieved_at: item.achieved_at === null ? null : optionalText(item.achieved_at, 40),
        reward_claimed_at: claimed,
        reward_transaction_id: positiveInteger(item.reward_transaction_id),
        reward_amount: nonNegative(item.reward_amount),
      });
    });
  }
  return { rows, idMap };
}

function normalizeSavingsDeposits(value: unknown, idMap: Map<number, number>): SavingsDeposit[] {
  if (!Array.isArray(value)) return [];
  const usedIds = new Set<number>();
  const next = { value: 1 };
  const rows: SavingsDeposit[] = [];
  for (const item of value) {
    if (!isRecord(item)) continue;
    const rawGoal = positiveInteger(item.goal_id);
    const goalId = rawGoal === null ? null : (idMap.get(rawGoal) ?? null);
    const amount = positiveInteger(item.amount);
    const date = text(item.date, 10);
    if (goalId === null || amount === null || !isValidDateKey(date)) continue;
    rows.push({
      id: nextUniqueId(item.id, usedIds, next),
      goal_id: goalId,
      amount,
      date,
      note: optionalText(item.note, 300),
      created_at: text(item.created_at, 40, isoNow()),
    });
  }
  return rows;
}

/** Memvalidasi file backup v1, v2, dan v3. */
export function parseBackup(
  rawText: string,
  defaults: AppSettings = DEFAULT_SETTINGS,
): ParsedBackup {
  let raw: unknown;
  try {
    raw = JSON.parse(rawText);
  } catch {
    fail('File backup tidak bisa dibaca. Pastikan file JSON yang dipilih benar.');
  }
  if (!isRecord(raw)) fail('Isi file backup tidak dikenali.');
  if (raw.app !== BACKUP_APP) fail('File ini bukan backup CuanKu.');
  const version = integer(raw.version, 0);
  if (version < 1) fail('Versi file backup tidak dikenali.');
  if (version > BACKUP_VERSION) {
    fail('File backup dibuat oleh versi CuanKu yang lebih baru. Perbarui aplikasi terlebih dahulu.');
  }
  if (!isRecord(raw.data)) fail('File backup tidak memiliki bagian data.');

  const images = isRecord(raw.images) ? (raw.images as Record<string, BackupImage>) : {};
  const { rows: categories, idMap } = normalizeCategories(raw.data.categories);
  const transactions = normalizeTransactions(raw.data.transactions, idMap);
  const wishlist = normalizeWishlist(raw.data.wishlist, images as Record<string, unknown>);
  const settingsRowsInput = normalizeSettingsRows(raw.data.settings);
  const settings = settingsFromRows(settingsRowsInput, defaults);
  const settingsRows = settingsToRows(settings);
  const budgets = normalizeBudgets(raw.data.budgets, idMap);
  const budgetMonths = normalizeBudgetMonths(raw.data.budget_months, budgets);
  const budgetAlerts = normalizeBudgetAlerts(raw.data.budget_alerts, idMap);
  const savings = normalizeSavingsGoals(raw.data.savings_goals);
  const savingsDeposits = normalizeSavingsDeposits(raw.data.savings_deposits, savings.idMap);

  return {
    app: BACKUP_APP,
    version,
    exported_at: text(raw.exported_at, 40, isoNow()),
    categories,
    transactions,
    wishlist,
    settingsRows,
    settings,
    budgets,
    budgetMonths,
    budgetAlerts,
    savingsGoals: savings.rows,
    savingsDeposits,
  };
}

export function buildBackupFile(input: {
  categories: Category[];
  transactions: Transaction[];
  wishlist: WishlistItem[];
  settings: Setting[];
  budgets?: Budget[];
  budgetMonths?: BudgetMonth[];
  budgetAlerts?: BudgetAlert[];
  savingsGoals?: SavingsGoal[];
  savingsDeposits?: SavingsDeposit[];
  exportedAt?: string;
}): BackupFile {
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exported_at: input.exportedAt ?? isoNow(),
    data: {
      categories: input.categories,
      transactions: input.transactions,
      wishlist: input.wishlist,
      settings: input.settings,
      budgets: input.budgets ?? [],
      budget_months: input.budgetMonths ?? [],
      budget_alerts: input.budgetAlerts ?? [],
      savings_goals: input.savingsGoals ?? [],
      savings_deposits: input.savingsDeposits ?? [],
    },
  };
}
