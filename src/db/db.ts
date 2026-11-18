import Dexie, { type Table } from 'dexie';
import { ADDED_DEFAULT_CATEGORIES, defaultCategoryRows } from './defaults';
import type {
  Budget,
  BudgetAlert,
  BudgetMonth,
  Category,
  SavingsDeposit,
  SavingsGoal,
  Setting,
  Transaction,
  WishlistItem,
} from './types';
import { DEFAULT_SETTINGS } from './types';
import { isoNow } from '../lib/dates';
import { settingsToRows } from '../lib/settings';

export class CuanKuDatabase extends Dexie {
  categories!: Table<Category, number>;
  transactions!: Table<Transaction, number>;
  wishlist!: Table<WishlistItem, number>;
  settings!: Table<Setting, string>;
  budgets!: Table<Budget, number>;
  budgetMonths!: Table<BudgetMonth, string>;
  budgetAlerts!: Table<BudgetAlert, number>;
  savingsGoals!: Table<SavingsGoal, number>;
  savingsDeposits!: Table<SavingsDeposit, number>;

  constructor(name = 'cuanku') {
    super(name);
    this.version(1).stores({
      categories: '++id, name, type, is_default, created_at',
      transactions: '++id, date, type, category_id, created_at',
      wishlist: '++id, purchased, created_at',
      settings: 'key',
    });

    // Aditif: tabel anggaran + kategori baru, data lama tidak disentuh.
    this.version(2)
      .stores({
        budgets: '++id, month, category_id, &[month+category_id]',
        budgetMonths: 'month',
        budgetAlerts: '++id, month, category_id, &[month+category_id+level]',
      })
      .upgrade(async (tx) => {
        const categories = (await tx.table('categories').toArray()) as Category[];
        if (categories.length === 0) return;
        const existing = new Set(categories.map((row) => row.name.trim().toLowerCase()));
        const additions = ADDED_DEFAULT_CATEGORIES.filter(
          (row) => !existing.has(row.name.toLowerCase()),
        );
        if (additions.length > 0) {
          await tx.table('categories').bulkAdd(
            additions.map((row) => ({ ...row, is_default: 1, created_at: isoNow() })),
          );
        }
      });

    // Aditif: tabel tabungan target.
    this.version(3).stores({
      savingsGoals: '++id, created_at, reward_claimed_at',
      savingsDeposits: '++id, goal_id, date, created_at',
    });
  }
}

export const db = new CuanKuDatabase();

async function seedDefaults(database: CuanKuDatabase): Promise<void> {
  await database.transaction('rw', database.categories, database.settings, async () => {
    const settingsCount = await database.settings.count();
    const categoryCount = await database.categories.count();

    if (categoryCount === 0 && settingsCount === 0) {
      await database.categories.bulkAdd(defaultCategoryRows(isoNow()));
    }

    if (settingsCount === 0) {
      await database.settings.bulkPut(settingsToRows(DEFAULT_SETTINGS));
      return;
    }

    // Lengkapi kunci pengaturan baru tanpa menimpa nilai pengguna.
    const keys = new Set((await database.settings.toCollection().primaryKeys()) as string[]);
    const missing = settingsToRows(DEFAULT_SETTINGS).filter((row) => !keys.has(row.key));
    if (missing.length > 0) await database.settings.bulkPut(missing);
  });
}

export async function initDatabase(database: CuanKuDatabase = db): Promise<void> {
  await database.open();
  await seedDefaults(database);
}

export async function resetDatabase(database: CuanKuDatabase = db): Promise<void> {
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
    },
  );
  await seedDefaults(database);
}
