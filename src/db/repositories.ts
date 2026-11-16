import { db as defaultDb, type CuanKuDatabase } from './db';
import type {
  AppSettings,
  Category,
  CategoryTotal,
  MonthSummary,
  MonthlyPoint,
  ParsedBackup,
  Setting,
  Transaction,
  TransactionType,
  TransactionView,
  WishlistInput,
  WishlistItem,
} from './types';
import { DEFAULT_SETTINGS } from './types';
import { isValidDateKey, isoNow, monthKeysEndingAt } from '../lib/dates';
import { settingsFromRows, settingsToRows } from '../lib/settings';

type Db = CuanKuDatabase;

function cleanName(value: string, maxLength: number): string {
  const trimmed = value.trim().replace(/\s+/g, ' ');
  if (!trimmed) throw new Error('Nama tidak boleh kosong.');
  return trimmed.slice(0, maxLength);
}

function cleanColor(value: string | undefined): string {
  if (value && /^#[0-9a-f]{6}$/i.test(value)) return value;
  return '#D8D4CC';
}

function cleanAmount(value: number): number {
  if (!Number.isFinite(value)) throw new Error('Nominal tidak valid.');
  const rounded = Math.round(value);
  if (rounded <= 0) throw new Error('Nominal harus lebih dari nol.');
  return rounded;
}

function cleanNonNegative(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
}

function cleanDate(value: string): string {
  if (!isValidDateKey(value)) throw new Error('Tanggal tidak valid.');
  return value;
}

function cleanType(value: string): TransactionType {
  if (value === 'income' || value === 'expense') return value;
  throw new Error('Jenis transaksi tidak dikenal.');
}

function cleanLink(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

function cleanNote(value: string | null | undefined, maxLength = 300): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

// ---------------------------------------------------------------------------
// Kategori
// ---------------------------------------------------------------------------

export async function listCategories(
  database: Db = defaultDb,
  type?: TransactionType,
): Promise<Category[]> {
  const rows = type
    ? await database.categories.where('type').equals(type).toArray()
    : await database.categories.toArray();
  return rows.sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
}

export async function createCategory(
  database: Db = defaultDb,
  input: { name: string; type: TransactionType; color?: string },
): Promise<number> {
  const row: Category = {
    name: cleanName(input.name, 40),
    type: cleanType(input.type),
    color: cleanColor(input.color),
    is_default: 0,
    created_at: isoNow(),
  };
  return database.categories.add(row);
}

export async function updateCategory(
  database: Db = defaultDb,
  id: number,
  patch: { name?: string; color?: string },
): Promise<void> {
  const row = await database.categories.get(id);
  if (!row) throw new Error('Kategori tidak ditemukan.');
  const next: Partial<Category> = {};
  if (patch.name !== undefined) next.name = cleanName(patch.name, 40);
  if (patch.color !== undefined) next.color = cleanColor(patch.color);
  await database.categories.update(id, next);
}

export async function countCategoryUsage(database: Db = defaultDb, id: number): Promise<number> {
  return database.transactions.where('category_id').equals(id).count();
}

export async function countTransactionsByCategory(
  database: Db = defaultDb,
): Promise<Record<number, number>> {
  const rows = await database.transactions.toArray();
  const counts: Record<number, number> = {};
  for (const row of rows) {
    if (row.category_id === null) continue;
    counts[row.category_id] = (counts[row.category_id] ?? 0) + 1;
  }
  return counts;
}

export async function deleteCategory(database: Db = defaultDb, id: number): Promise<void> {
  await database.transaction('rw', database.categories, database.transactions, async () => {
    await database.transactions
      .where('category_id')
      .equals(id)
      .modify({ category_id: null, updated_at: isoNow() });
    await database.categories.delete(id);
  });
}

// ---------------------------------------------------------------------------
// Transaksi
// ---------------------------------------------------------------------------

interface TransactionInput {
  type: TransactionType;
  amount: number;
  category_id: number | null;
  date: string;
  note: string | null;
}

async function resolveCategoryId(
  database: Db,
  categoryId: number | null,
): Promise<number | null> {
  if (categoryId === null || !Number.isInteger(categoryId)) return null;
  const category = await database.categories.get(categoryId);
  return category ? categoryId : null;
}

function joinCategory(
  row: Transaction,
  categories: Map<number, Category>,
): TransactionView {
  const category = row.category_id === null ? undefined : categories.get(row.category_id);
  return {
    ...row,
    category_name: category?.name ?? null,
    category_color: category?.color ?? null,
  };
}

export async function listTransactions(
  database: Db = defaultDb,
  monthKey?: string | null,
  type?: TransactionType | 'all',
): Promise<TransactionView[]> {
  const [rows, categories] = await Promise.all([
    database.transactions.toArray(),
    database.categories.toArray(),
  ]);
  const categoryMap = new Map(categories.map((category) => [category.id!, category]));
  return rows
    .filter((row) => (monthKey ? row.date.startsWith(monthKey) : true))
    .filter((row) => (type && type !== 'all' ? row.type === type : true))
    .sort((a, b) => (a.date === b.date ? (b.id ?? 0) - (a.id ?? 0) : b.date.localeCompare(a.date)))
    .map((row) => joinCategory(row, categoryMap));
}

export async function listRecentTransactions(
  database: Db = defaultDb,
  limit = 5,
): Promise<TransactionView[]> {
  const rows = await listTransactions(database);
  return rows.slice(0, limit);
}

export async function getTransactionById(
  database: Db = defaultDb,
  id: number,
): Promise<TransactionView | null> {
  const row = await database.transactions.get(id);
  if (!row) return null;
  const category = row.category_id === null ? undefined : await database.categories.get(row.category_id);
  const categories = new Map<number, Category>();
  if (category?.id !== undefined) categories.set(category.id, category);
  return joinCategory(row, categories);
}

export async function createTransaction(
  database: Db = defaultDb,
  input: TransactionInput,
): Promise<number> {
  const now = isoNow();
  const row: Transaction = {
    type: cleanType(input.type),
    amount: cleanAmount(input.amount),
    category_id: await resolveCategoryId(database, input.category_id),
    date: cleanDate(input.date),
    note: cleanNote(input.note),
    created_at: now,
    updated_at: now,
  };
  return database.transactions.add(row);
}

export async function updateTransaction(
  database: Db = defaultDb,
  id: number,
  input: TransactionInput,
): Promise<void> {
  const existing = await database.transactions.get(id);
  if (!existing) throw new Error('Transaksi tidak ditemukan.');
  await database.transactions.update(id, {
    type: cleanType(input.type),
    amount: cleanAmount(input.amount),
    category_id: await resolveCategoryId(database, input.category_id),
    date: cleanDate(input.date),
    note: cleanNote(input.note),
    updated_at: isoNow(),
  });
}

export async function deleteTransaction(database: Db = defaultDb, id: number): Promise<void> {
  await database.transactions.delete(id);
}

export async function countAllTransactions(database: Db = defaultDb): Promise<number> {
  return database.transactions.count();
}

export async function countTransactionsOnDate(
  database: Db = defaultDb,
  dateKey: string,
): Promise<number> {
  return database.transactions.where('date').equals(dateKey).count();
}

export async function getMonthSummary(
  database: Db = defaultDb,
  monthKey: string,
): Promise<MonthSummary> {
  const rows = await database.transactions.where('date').startsWith(monthKey).toArray();
  let income = 0;
  let expense = 0;
  for (const row of rows) {
    if (row.type === 'income') income += row.amount;
    else expense += row.amount;
  }
  return { income, expense, balance: income - expense, count: rows.length };
}

export async function getExpenseByCategory(
  database: Db = defaultDb,
  monthKey: string,
): Promise<CategoryTotal[]> {
  const [rows, categories] = await Promise.all([
    database.transactions.where('date').startsWith(monthKey).toArray(),
    database.categories.toArray(),
  ]);
  const categoryMap = new Map(categories.map((category) => [category.id!, category]));
  const totals = new Map<string, CategoryTotal>();
  for (const row of rows) {
    if (row.type !== 'expense') continue;
    const category = row.category_id === null ? undefined : categoryMap.get(row.category_id);
    const name = category?.name ?? 'Tanpa kategori';
    const color = category?.color ?? '#D9C7FF';
    const current = totals.get(name);
    if (current) current.total += row.amount;
    else totals.set(name, { name, color, total: row.amount });
  }
  return [...totals.values()].sort((a, b) => b.total - a.total);
}

export async function getMonthlySeries(
  database: Db = defaultDb,
  monthKey: string,
  count = 6,
): Promise<MonthlyPoint[]> {
  const keys = monthKeysEndingAt(monthKey, count);
  const first = keys[0];
  const rows = await database.transactions.toArray();
  const points = new Map<string, MonthlyPoint>(
    keys.map((key) => [key, { month: key, income: 0, expense: 0 }]),
  );
  for (const row of rows) {
    const key = row.date.slice(0, 7);
    if (key < first || !points.has(key)) continue;
    const point = points.get(key)!;
    if (row.type === 'income') point.income += row.amount;
    else point.expense += row.amount;
  }
  return keys.map((key) => points.get(key)!);
}

export async function getDayTotal(
  database: Db = defaultDb,
  dateKey: string,
): Promise<MonthSummary> {
  const rows = await database.transactions.where('date').equals(dateKey).toArray();
  let income = 0;
  let expense = 0;
  for (const row of rows) {
    if (row.type === 'income') income += row.amount;
    else expense += row.amount;
  }
  return { income, expense, balance: income - expense, count: rows.length };
}

// ---------------------------------------------------------------------------
// Wishlist
// ---------------------------------------------------------------------------

export async function listWishlist(database: Db = defaultDb): Promise<WishlistItem[]> {
  const rows = await database.wishlist.toArray();
  return rows.sort((a, b) => {
    if (a.purchased !== b.purchased) return a.purchased - b.purchased;
    if (a.purchased === 1) {
      return (b.purchased_at ?? '').localeCompare(a.purchased_at ?? '');
    }
    return b.created_at.localeCompare(a.created_at);
  });
}

export async function getWishlistById(
  database: Db = defaultDb,
  id: number,
): Promise<WishlistItem | null> {
  return (await database.wishlist.get(id)) ?? null;
}

export async function createWishlistItem(
  database: Db = defaultDb,
  input: WishlistInput,
): Promise<number> {
  if (!Number.isFinite(input.price) || input.price <= 0) {
    throw new Error('Harga harus lebih dari nol.');
  }
  const row: WishlistItem = {
    name: cleanName(input.name, 120),
    price: Math.round(input.price),
    image: input.image,
    link: cleanLink(input.link),
    note: cleanNote(input.note, 500),
    saved_amount: 0,
    monthly_plan: cleanNonNegative(input.monthly_plan),
    created_at: isoNow(),
    purchased: 0,
    purchased_at: null,
  };
  return database.wishlist.add(row);
}

export async function updateWishlistItem(
  database: Db = defaultDb,
  id: number,
  input: WishlistInput,
): Promise<void> {
  if (!Number.isFinite(input.price) || input.price <= 0) {
    throw new Error('Harga harus lebih dari nol.');
  }
  await database.wishlist.update(id, {
    name: cleanName(input.name, 120),
    price: Math.round(input.price),
    image: input.image,
    link: cleanLink(input.link),
    note: cleanNote(input.note, 500),
    monthly_plan: cleanNonNegative(input.monthly_plan),
  });
}

export async function deleteWishlistItem(database: Db = defaultDb, id: number): Promise<void> {
  await database.wishlist.delete(id);
}

export async function addWishlistFunds(
  database: Db = defaultDb,
  id: number,
  delta: number,
): Promise<void> {
  const row = await database.wishlist.get(id);
  if (!row) throw new Error('Wishlist tidak ditemukan.');
  await database.wishlist.update(id, {
    saved_amount: cleanNonNegative(row.saved_amount + delta),
  });
}

export async function setWishlistSaved(
  database: Db = defaultDb,
  id: number,
  amount: number,
): Promise<void> {
  await database.wishlist.update(id, { saved_amount: cleanNonNegative(amount) });
}

export async function setWishlistPlan(
  database: Db = defaultDb,
  id: number,
  amount: number,
): Promise<void> {
  await database.wishlist.update(id, { monthly_plan: cleanNonNegative(amount) });
}

export async function setWishlistPurchased(
  database: Db = defaultDb,
  id: number,
  purchased: boolean,
): Promise<void> {
  await database.wishlist.update(id, {
    purchased: purchased ? 1 : 0,
    purchased_at: purchased ? isoNow() : null,
  });
}

export async function getWishlistTotal(database: Db = defaultDb): Promise<number> {
  const rows = await database.wishlist.toArray();
  return rows
    .filter((row) => row.purchased === 0)
    .reduce((total, row) => total + row.price, 0);
}

export interface WishlistTotals {
  target: number;
  saved: number;
  remaining: number;
  activeCount: number;
  purchasedCount: number;
}

export async function getWishlistTotals(database: Db = defaultDb): Promise<WishlistTotals> {
  const rows = await database.wishlist.toArray();
  const active = rows.filter((row) => row.purchased === 0);
  const target = active.reduce((total, row) => total + row.price, 0);
  const saved = active.reduce((total, row) => total + Math.min(row.saved_amount, row.price), 0);
  return {
    target,
    saved,
    remaining: Math.max(0, target - saved),
    activeCount: active.length,
    purchasedCount: rows.length - active.length,
  };
}

// ---------------------------------------------------------------------------
// Pengaturan
// ---------------------------------------------------------------------------

export async function listSettingRows(database: Db = defaultDb): Promise<Setting[]> {
  return database.settings.toArray();
}

export async function getSettings(database: Db = defaultDb): Promise<AppSettings> {
  return settingsFromRows(await database.settings.toArray(), DEFAULT_SETTINGS);
}

export async function saveSettings(
  database: Db = defaultDb,
  patch: Partial<AppSettings>,
): Promise<void> {
  const rows = settingsToRows(patch);
  if (rows.length > 0) await database.settings.bulkPut(rows);
}

export async function setSetting(
  database: Db = defaultDb,
  key: keyof AppSettings,
  value: string,
): Promise<void> {
  await database.settings.put({ key, value });
}

// ---------------------------------------------------------------------------
// Backup
// ---------------------------------------------------------------------------

export interface BackupData {
  categories: Category[];
  transactions: Transaction[];
  wishlist: WishlistItem[];
  settings: Setting[];
}

export async function readBackupData(database: Db = defaultDb): Promise<BackupData> {
  const [categories, transactions, wishlist, settings] = await Promise.all([
    database.categories.toArray(),
    database.transactions.toArray(),
    database.wishlist.toArray(),
    database.settings.toArray(),
  ]);
  return { categories, transactions, wishlist, settings };
}

export async function importBackupData(
  database: Db = defaultDb,
  parsed: ParsedBackup,
): Promise<void> {
  await database.transaction(
    'rw',
    database.categories,
    database.transactions,
    database.wishlist,
    database.settings,
    async () => {
      await Promise.all([
        database.categories.clear(),
        database.transactions.clear(),
        database.wishlist.clear(),
        database.settings.clear(),
      ]);
      if (parsed.categories.length > 0) await database.categories.bulkAdd(parsed.categories);
      if (parsed.transactions.length > 0) await database.transactions.bulkAdd(parsed.transactions);
      if (parsed.wishlist.length > 0) await database.wishlist.bulkAdd(parsed.wishlist);
      await database.settings.bulkPut(parsed.settingsRows);
    },
  );
}
