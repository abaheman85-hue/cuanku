import Dexie, { type Table } from 'dexie';
import { defaultCategoryRows } from './defaults';
import type { Category, Setting, Transaction, WishlistItem } from './types';
import { DEFAULT_SETTINGS } from './types';
import { isoNow } from '../lib/dates';
import { settingsToRows } from '../lib/settings';

export class CuanKuDatabase extends Dexie {
  categories!: Table<Category, number>;
  transactions!: Table<Transaction, number>;
  wishlist!: Table<WishlistItem, number>;
  settings!: Table<Setting, string>;

  constructor(name = 'cuanku') {
    super(name);
    this.version(1).stores({
      categories: '++id, name, type, is_default, created_at',
      transactions: '++id, date, type, category_id, created_at',
      wishlist: '++id, purchased, created_at',
      settings: 'key',
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
    },
  );
  await seedDefaults(database);
}
