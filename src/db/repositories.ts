import { db as defaultDb, type CuanKuDatabase } from './db';
import type {
  AppSettings,
  Budget,
  BudgetAlert,
  BudgetAlertLevel,
  BudgetAlertNotice,
  BudgetMonth,
  BudgetOverview,
  BudgetRow,
  Category,
  CategoryTotal,
  MonthSummary,
  MonthlyPoint,
  ParsedBackup,
  SavingsDeposit,
  SavingsGoal,
  SavingsGoalView,
  SavingsTotals,
  Setting,
  Transaction,
  TransactionType,
  TransactionView,
  WishlistInput,
  WishlistItem,
} from './types';
import { DEFAULT_SETTINGS } from './types';
import { isValidDateKey, isValidMonthKey, isoNow, monthKeysEndingAt, toDateKey } from '../lib/dates';
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

function cleanMonth(value: string): string {
  if (!isValidMonthKey(value)) throw new Error('Bulan tidak valid.');
  return value;
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
  await database.transaction(
    'rw',
    database.categories,
    database.transactions,
    database.budgets,
    database.budgetAlerts,
    async () => {
      await database.transactions
        .where('category_id')
        .equals(id)
        .modify({ category_id: null, updated_at: isoNow() });
      await database.budgets.where('category_id').equals(id).delete();
      await database.budgetAlerts.where('category_id').equals(id).delete();
      await database.categories.delete(id);
    },
  );
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
// Anggaran
// ---------------------------------------------------------------------------

function budgetLevel(amount: number, spent: number): 0 | BudgetAlertLevel {
  if (amount <= 0) return 0;
  const percent = (spent / amount) * 100;
  if (percent >= 100) return 100;
  if (percent >= 80) return 80;
  return 0;
}

/**
 * Menyalin anggaran bulan sebelumnya ke bulan ini sekali saja.
 * Penanda `budget_months` mencegah penyalinan ulang setelah pengguna
 * sengaja menghapus semua anggaran di bulan tersebut.
 */
export async function ensureBudgetMonth(
  database: Db = defaultDb,
  monthInput: string = toDateKey().slice(0, 7),
): Promise<void> {
  const month = cleanMonth(monthInput);
  await database.transaction('rw', database.budgets, database.budgetMonths, async () => {
    const marker = await database.budgetMonths.get(month);
    if (marker) return;

    const previous = await database.budgets
      .filter((row) => row.month < month)
      .toArray();
    const sourceMonth = previous
      .map((row) => row.month)
      .sort()
      .at(-1);
    if (sourceMonth) {
      const now = isoNow();
      const copies = previous
        .filter((row) => row.month === sourceMonth)
        .map((row) => ({
          month,
          category_id: row.category_id,
          amount: row.amount,
          created_at: now,
          updated_at: now,
        }));
      if (copies.length > 0) await database.budgets.bulkAdd(copies);
    }

    await database.budgetMonths.put({ month, initialized_at: isoNow() });
  });
}

export async function getBudgetOverview(
  database: Db = defaultDb,
  monthInput: string,
): Promise<BudgetOverview> {
  const month = cleanMonth(monthInput);
  const [budgets, categories, transactions] = await Promise.all([
    database.budgets.where('month').equals(month).toArray(),
    database.categories.toArray(),
    database.transactions.where('date').startsWith(month).toArray(),
  ]);

  const categoryMap = new Map(categories.map((category) => [category.id!, category]));
  const spentByCategory = new Map<number, number>();
  for (const row of transactions) {
    if (row.type !== 'expense' || row.category_id === null) continue;
    spentByCategory.set(
      row.category_id,
      (spentByCategory.get(row.category_id) ?? 0) + row.amount,
    );
  }

  const rows: BudgetRow[] = [];
  for (const budget of budgets) {
    const category = categoryMap.get(budget.category_id);
    if (!category) continue;
    const spent = spentByCategory.get(budget.category_id) ?? 0;
    rows.push({
      budget_id: budget.id!,
      category_id: budget.category_id,
      category_name: category.name,
      category_color: category.color,
      amount: budget.amount,
      spent,
      percent: budget.amount > 0 ? (spent / budget.amount) * 100 : 0,
      level: budgetLevel(budget.amount, spent),
    });
  }
  rows.sort((a, b) => b.percent - a.percent || a.category_name.localeCompare(b.category_name));

  const budgeted = new Set(rows.map((row) => row.category_id));
  const unassigned = categories
    .filter((category) => category.type === 'expense' && !budgeted.has(category.id!))
    .map((category) => ({
      category_id: category.id!,
      category_name: category.name,
      category_color: category.color,
      spent: spentByCategory.get(category.id!) ?? 0,
    }))
    .sort((a, b) => b.spent - a.spent || a.category_name.localeCompare(b.category_name));

  const totalLimit = rows.reduce((total, row) => total + row.amount, 0);
  const totalSpent = rows.reduce((total, row) => total + row.spent, 0);

  return {
    month,
    rows,
    unassigned,
    totalLimit,
    totalSpent,
    percent: totalLimit > 0 ? (totalSpent / totalLimit) * 100 : 0,
  };
}

export async function saveBudget(
  database: Db = defaultDb,
  input: { month: string; category_id: number; amount: number },
): Promise<number> {
  const month = cleanMonth(input.month);
  const amount = cleanAmount(input.amount);
  const category = await database.categories.get(input.category_id);
  if (!category || category.type !== 'expense') {
    throw new Error('Pilih kategori pengeluaran yang valid.');
  }
  const now = isoNow();
  return database.transaction('rw', database.budgets, async () => {
    const existing = await database.budgets
      .where('[month+category_id]')
      .equals([month, input.category_id])
      .first();
    if (existing?.id) {
      await database.budgets.update(existing.id, { amount, updated_at: now });
      return existing.id;
    }
    return database.budgets.add({
      month,
      category_id: input.category_id,
      amount,
      created_at: now,
      updated_at: now,
    });
  });
}

export async function deleteBudget(database: Db = defaultDb, id: number): Promise<void> {
  await database.transaction('rw', database.budgets, database.budgetAlerts, async () => {
    const row = await database.budgets.get(id);
    if (!row) return;
    await database.budgetAlerts
      .where('month')
      .equals(row.month)
      .filter((alert) => alert.category_id === row.category_id)
      .delete();
    await database.budgets.delete(id);
  });
}

export async function listBudgetAlerts(
  database: Db = defaultDb,
  monthInput: string,
): Promise<BudgetAlert[]> {
  const month = cleanMonth(monthInput);
  return database.budgetAlerts.where('month').equals(month).toArray();
}

/**
 * Mencatat level peringatan yang belum pernah dikirim untuk bulan ini.
 * Kalau satu transaksi langsung melewati 80% dan 100%, hanya level 100
 * yang dilaporkan, tetapi kedua level ditandai agar tidak berulang.
 */
export async function checkBudgetAlerts(
  database: Db = defaultDb,
  monthInput: string = toDateKey().slice(0, 7),
): Promise<BudgetAlertNotice[]> {
  const month = cleanMonth(monthInput);
  const [overview, existing] = await Promise.all([
    getBudgetOverview(database, month),
    listBudgetAlerts(database, month),
  ]);
  const marked = new Set(existing.map((row) => `${row.category_id}:${row.level}`));
  const toAdd: BudgetAlert[] = [];
  const notices: BudgetAlertNotice[] = [];

  for (const row of overview.rows) {
    if (row.level < 80) continue;
    const levels: BudgetAlertLevel[] = row.level === 100 ? [80, 100] : [80];
    let highestMissing: BudgetAlertLevel | null = null;
    for (const level of levels) {
      if (marked.has(`${row.category_id}:${level}`)) continue;
      toAdd.push({
        month,
        category_id: row.category_id,
        level,
        notified_at: isoNow(),
      });
      highestMissing = level;
    }
    if (highestMissing !== null) {
      notices.push({
        category_id: row.category_id,
        category_name: row.category_name,
        level: highestMissing,
        spent: row.spent,
        amount: row.amount,
      });
    }
  }

  if (toAdd.length > 0) {
    await Promise.all(
      toAdd.map((row) => database.budgetAlerts.add(row).catch(() => undefined)),
    );
  }
  return notices;
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
// Tabungan target ("me time")
// ---------------------------------------------------------------------------

export interface SavingsGoalInput {
  name: string;
  target_amount: number;
  note: string | null;
}

export interface SavingsDepositInput {
  amount: number;
  date: string;
  note: string | null;
}

function savingsPercent(target: number, saved: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.max(0, (saved / target) * 100));
}

export async function listSavingsGoals(database: Db = defaultDb): Promise<SavingsGoalView[]> {
  const [goals, deposits] = await Promise.all([
    database.savingsGoals.toArray(),
    database.savingsDeposits.toArray(),
  ]);
  const depositsByGoal = new Map<number, SavingsDeposit[]>();
  for (const deposit of deposits) {
    const list = depositsByGoal.get(deposit.goal_id) ?? [];
    list.push(deposit);
    depositsByGoal.set(deposit.goal_id, list);
  }

  return goals
    .map((goal) => {
      const goalDeposits = (depositsByGoal.get(goal.id!) ?? []).sort(
        (a, b) => b.date.localeCompare(a.date) || (b.id ?? 0) - (a.id ?? 0),
      );
      const saved = goalDeposits.reduce((total, row) => total + row.amount, 0);
      const achieved = goal.target_amount > 0 && saved >= goal.target_amount;
      return {
        ...goal,
        saved,
        remaining: Math.max(0, goal.target_amount - saved),
        percent: savingsPercent(goal.target_amount, saved),
        achieved,
        completed: goal.reward_claimed_at !== null,
        deposits: goalDeposits,
      };
    })
    .sort((a, b) => {
      if (a.completed !== b.completed) return Number(a.completed) - Number(b.completed);
      if (a.achieved !== b.achieved) return Number(b.achieved) - Number(a.achieved);
      return b.created_at.localeCompare(a.created_at);
    });
}

export async function getSavingsTotals(database: Db = defaultDb): Promise<SavingsTotals> {
  const goals = await listSavingsGoals(database);
  const active = goals.filter((goal) => !goal.completed);
  return {
    target: active.reduce((total, goal) => total + goal.target_amount, 0),
    saved: active.reduce((total, goal) => total + goal.saved, 0),
    activeCount: active.filter((goal) => !goal.achieved).length,
    achievedCount: active.filter((goal) => goal.achieved).length,
    completedCount: goals.length - active.length,
  };
}

export async function createSavingsGoal(
  database: Db = defaultDb,
  input: SavingsGoalInput,
): Promise<number> {
  const name = cleanName(input.name, 120);
  const target = cleanAmount(input.target_amount);
  return database.savingsGoals.add({
    name,
    target_amount: target,
    note: cleanNote(input.note, 500),
    created_at: isoNow(),
    achieved_at: null,
    reward_claimed_at: null,
    reward_transaction_id: null,
    reward_amount: 0,
  });
}

export async function updateSavingsGoal(
  database: Db = defaultDb,
  id: number,
  input: SavingsGoalInput,
): Promise<void> {
  const goal = await database.savingsGoals.get(id);
  if (!goal) throw new Error('Tabungan tidak ditemukan.');
  await database.savingsGoals.update(id, {
    name: cleanName(input.name, 120),
    target_amount: cleanAmount(input.target_amount),
    note: cleanNote(input.note, 500),
  });
}

export async function deleteSavingsGoal(database: Db = defaultDb, id: number): Promise<void> {
  await database.transaction('rw', database.savingsGoals, database.savingsDeposits, async () => {
    await database.savingsDeposits.where('goal_id').equals(id).delete();
    await database.savingsGoals.delete(id);
  });
}

export async function addSavingsDeposit(
  database: Db = defaultDb,
  goalId: number,
  input: SavingsDepositInput,
): Promise<number> {
  const deposit: SavingsDeposit = {
    goal_id: goalId,
    amount: cleanAmount(input.amount),
    date: cleanDate(input.date),
    note: cleanNote(input.note, 300),
    created_at: isoNow(),
  };
  return database.transaction('rw', database.savingsGoals, database.savingsDeposits, async () => {
    const goal = await database.savingsGoals.get(goalId);
    if (!goal) throw new Error('Tabungan tidak ditemukan.');
    if (goal.reward_claimed_at) throw new Error('Target ini sudah selesai dan tidak bisa ditambah.');
    const id = await database.savingsDeposits.add(deposit);
    if (!goal.achieved_at) {
      const saved = await database.savingsDeposits
        .where('goal_id')
        .equals(goalId)
        .toArray()
        .then((rows) => rows.reduce((total, row) => total + row.amount, 0));
      if (saved >= goal.target_amount) {
        await database.savingsGoals.update(goalId, { achieved_at: isoNow() });
      }
    }
    return id;
  });
}

export async function deleteSavingsDeposit(database: Db = defaultDb, id: number): Promise<void> {
  await database.transaction('rw', database.savingsGoals, database.savingsDeposits, async () => {
    const deposit = await database.savingsDeposits.get(id);
    if (!deposit) return;
    const goal = await database.savingsGoals.get(deposit.goal_id);
    if (goal?.reward_claimed_at) {
      throw new Error('Setoran target yang sudah selesai tidak bisa dihapus.');
    }
    await database.savingsDeposits.delete(id);
    if (goal?.achieved_at) {
      const saved = await database.savingsDeposits
        .where('goal_id')
        .equals(deposit.goal_id)
        .toArray()
        .then((rows) => rows.reduce((total, row) => total + row.amount, 0));
      if (saved < goal.target_amount) {
        await database.savingsGoals.update(deposit.goal_id, { achieved_at: null });
      }
    }
  });
}

export interface RewardClaim {
  goal_id: number;
  transaction_id: number;
  amount: number;
  category_name: string;
}

/** Klaim reward "me time" sekali per target; membuat satu transaksi nyata. */
export async function claimSavingsReward(
  database: Db = defaultDb,
  goalId: number,
  amountInput: number,
): Promise<RewardClaim> {
  const amount = cleanAmount(amountInput);
  return database.transaction(
    'rw',
    database.savingsGoals,
    database.savingsDeposits,
    database.categories,
    database.transactions,
    async () => {
      const goal = await database.savingsGoals.get(goalId);
      if (!goal) throw new Error('Tabungan tidak ditemukan.');
      if (goal.reward_claimed_at) throw new Error('Reward untuk target ini sudah diklaim.');
      const deposits = await database.savingsDeposits.where('goal_id').equals(goalId).toArray();
      const saved = deposits.reduce((total, row) => total + row.amount, 0);
      if (saved < goal.target_amount) throw new Error('Target belum tercapai.');
      if (amount > saved) throw new Error('Nominal melebihi dana yang terkumpul.');

      const categories = await database.categories.toArray();
      const category = categories.find(
        (row) => row.type === 'expense' && row.name.trim().toLowerCase() === 'me time',
      );
      let categoryId = category?.id;
      if (categoryId === undefined) {
        categoryId = await database.categories.add({
          name: 'Me time',
          type: 'expense',
          color: '#D9C7FF',
          is_default: 1,
          created_at: isoNow(),
        });
      }

      const now = isoNow();
      const transactionId = await database.transactions.add({
        type: 'expense',
        amount,
        category_id: categoryId,
        date: toDateKey(),
        note: cleanNote(`Me time: ${goal.name}`, 300),
        created_at: now,
        updated_at: now,
      });
      await database.savingsGoals.update(goalId, {
        achieved_at: goal.achieved_at ?? now,
        reward_claimed_at: now,
        reward_transaction_id: transactionId,
        reward_amount: amount,
      });
      return {
        goal_id: goalId,
        transaction_id: transactionId,
        amount,
        category_name: category?.name ?? 'Me time',
      };
    },
  );
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
  budgets: Budget[];
  budgetMonths: BudgetMonth[];
  budgetAlerts: BudgetAlert[];
  savingsGoals: SavingsGoal[];
  savingsDeposits: SavingsDeposit[];
}

export async function readBackupData(database: Db = defaultDb): Promise<BackupData> {
  const [
    categories,
    transactions,
    wishlist,
    settings,
    budgets,
    budgetMonths,
    budgetAlerts,
    savingsGoals,
    savingsDeposits,
  ] = await Promise.all([
    database.categories.toArray(),
    database.transactions.toArray(),
    database.wishlist.toArray(),
    database.settings.toArray(),
    database.budgets.toArray(),
    database.budgetMonths.toArray(),
    database.budgetAlerts.toArray(),
    database.savingsGoals.toArray(),
    database.savingsDeposits.toArray(),
  ]);
  return {
    categories,
    transactions,
    wishlist,
    settings,
    budgets,
    budgetMonths,
    budgetAlerts,
    savingsGoals,
    savingsDeposits,
  };
}

export async function importBackupData(
  database: Db = defaultDb,
  parsed: ParsedBackup,
): Promise<void> {
  await database.transaction(
    'rw',
    [
      database.categories,
      database.transactions,
      database.wishlist,
      database.settings,
      database.budgets,
      database.budgetMonths,
      database.budgetAlerts,
      database.savingsGoals,
      database.savingsDeposits,
    ],
    async () => {
      await Promise.all([
        database.categories.clear(),
        database.transactions.clear(),
        database.wishlist.clear(),
        database.settings.clear(),
        database.budgets.clear(),
        database.budgetMonths.clear(),
        database.budgetAlerts.clear(),
        database.savingsGoals.clear(),
        database.savingsDeposits.clear(),
      ]);
      if (parsed.categories.length > 0) await database.categories.bulkAdd(parsed.categories);
      if (parsed.transactions.length > 0) await database.transactions.bulkAdd(parsed.transactions);
      if (parsed.wishlist.length > 0) await database.wishlist.bulkAdd(parsed.wishlist);
      if (parsed.budgets.length > 0) await database.budgets.bulkAdd(parsed.budgets);
      if (parsed.budgetMonths.length > 0) await database.budgetMonths.bulkAdd(parsed.budgetMonths);
      if (parsed.budgetAlerts.length > 0) await database.budgetAlerts.bulkAdd(parsed.budgetAlerts);
      if (parsed.savingsGoals.length > 0) await database.savingsGoals.bulkAdd(parsed.savingsGoals);
      if (parsed.savingsDeposits.length > 0) {
        await database.savingsDeposits.bulkAdd(parsed.savingsDeposits);
      }
      await database.settings.bulkPut(parsed.settingsRows);
    },
  );
}
