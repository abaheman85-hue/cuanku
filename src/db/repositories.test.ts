import { afterEach, describe, expect, it } from 'vitest';
import { CuanKuDatabase, initDatabase, resetDatabase } from './db';
import { DEFAULT_CATEGORIES } from './defaults';
import { DEFAULT_SETTINGS } from './types';
import { buildBackupFile, parseBackup } from '../lib/backup-format';
import {
  addSavingsDeposit,
  addWishlistFunds,
  checkBudgetAlerts,
  claimSavingsReward,
  countAllTransactions,
  countCategoryUsage,
  createCategory,
  createSavingsGoal,
  createTransaction,
  createWishlistItem,
  deleteBudget,
  deleteCategory,
  deleteSavingsDeposit,
  deleteTransaction,
  deleteWishlistItem,
  ensureBudgetMonth,
  getBudgetOverview,
  getExpenseByCategory,
  getMonthSummary,
  getMonthlySeries,
  getSavingsTotals,
  getSettings,
  getTransactionById,
  getWishlistById,
  getWishlistTotals,
  importBackupData,
  listBudgetAlerts,
  listCategories,
  listRecentTransactions,
  listSavingsGoals,
  listTransactions,
  listWishlist,
  readBackupData,
  saveBudget,
  saveSettings,
  setWishlistPlan,
  setWishlistPurchased,
  setWishlistSaved,
  updateCategory,
  updateTransaction,
  updateWishlistItem,
} from './repositories';
import { currentMonthKey, toDateKey } from '../lib/dates';

let counter = 0;
const opened: CuanKuDatabase[] = [];

async function freshDb(): Promise<CuanKuDatabase> {
  counter += 1;
  const database = new CuanKuDatabase(`cuanku-test-${counter}`);
  opened.push(database);
  await initDatabase(database);
  return database;
}

afterEach(async () => {
  await Promise.all(opened.splice(0).map((database) => database.delete()));
});

async function expenseCategoryId(database: CuanKuDatabase, name: string): Promise<number> {
  const row = (await listCategories(database, 'expense')).find((item) => item.name === name);
  if (!row?.id) throw new Error(`Kategori ${name} tidak ditemukan.`);
  return row.id;
}

describe('initDatabase', () => {
  it('mengisi kategori dan pengaturan default sekali saja', async () => {
    const database = await freshDb();
    expect(await listCategories(database)).toHaveLength(DEFAULT_CATEGORIES.length);
    expect(await getSettings(database)).toEqual(DEFAULT_SETTINGS);

    await initDatabase(database);
    expect(await listCategories(database)).toHaveLength(DEFAULT_CATEGORIES.length);
  });

  it('tidak memunculkan kembali kategori yang dihapus dan melengkapi pengaturan', async () => {
    const database = await freshDb();
    const categories = await listCategories(database);
    await deleteCategory(database, categories[0].id!);
    await database.settings.delete('reminder_minute');

    await initDatabase(database);

    expect(await listCategories(database)).toHaveLength(DEFAULT_CATEGORIES.length - 1);
    expect((await getSettings(database)).reminder_minute).toBe(DEFAULT_SETTINGS.reminder_minute);
  });
});

describe('kategori', () => {
  it('membuat, mengubah, dan menghapus kategori', async () => {
    const database = await freshDb();
    const id = await createCategory(database, {
      name: '  Kopi  ',
      type: 'expense',
      color: '#FFB08A',
    });

    let created = (await listCategories(database, 'expense')).find((row) => row.id === id);
    expect(created?.name).toBe('Kopi');
    expect(created?.is_default).toBe(0);

    await updateCategory(database, id, { name: '  Kopi Susu  ' });
    created = (await listCategories(database)).find((row) => row.id === id);
    expect(created?.name).toBe('Kopi Susu');

    await deleteCategory(database, id);
    expect((await listCategories(database)).some((row) => row.id === id)).toBe(false);
  });

  it('mengosongkan kategori transaksi saat kategori dihapus', async () => {
    const database = await freshDb();
    const id = await createCategory(database, {
      name: 'Kopi',
      type: 'expense',
      color: '#FFB08A',
    });
    const transactionId = await createTransaction(database, {
      type: 'expense',
      amount: 20000,
      category_id: id,
      date: '2026-01-05',
      note: null,
    });

    expect(await countCategoryUsage(database, id)).toBe(1);
    await deleteCategory(database, id);

    expect(await countCategoryUsage(database, id)).toBe(0);
    const transaction = await getTransactionById(database, transactionId);
    expect(transaction?.category_id).toBeNull();
    expect(transaction?.category_name).toBeNull();
  });
});

describe('transaksi', () => {
  async function seed(database: CuanKuDatabase) {
    const categories = await listCategories(database);
    const makan = categories.find((row) => row.name === 'Makan' && row.type === 'expense')!;
    const gaji = categories.find((row) => row.name === 'Gaji')!;

    const makanId = await createTransaction(database, {
      type: 'expense',
      amount: 75000,
      category_id: makan.id!,
      date: '2026-01-03',
      note: 'Makan siang',
    });
    const gajiId = await createTransaction(database, {
      type: 'income',
      amount: 5000000,
      category_id: gaji.id!,
      date: '2026-01-01',
      note: 'Gaji',
    });
    const tanpaKategoriId = await createTransaction(database, {
      type: 'expense',
      amount: 25000,
      category_id: null,
      date: '2026-01-10',
      note: null,
    });
    await createTransaction(database, {
      type: 'expense',
      amount: 30000,
      category_id: makan.id!,
      date: '2026-02-02',
      note: null,
    });

    return { makanId, gajiId, tanpaKategoriId };
  }

  it('menyaring bulan, jenis, dan mengurutkan tanggal terbaru', async () => {
    const database = await freshDb();
    const { makanId, gajiId, tanpaKategoriId } = await seed(database);

    const january = await listTransactions(database, '2026-01');
    expect(january.map((row) => row.id)).toEqual([tanpaKategoriId, makanId, gajiId]);
    expect(january.find((row) => row.id === makanId)?.category_name).toBe('Makan');
    expect(january.find((row) => row.id === gajiId)?.category_color).toBe('#C8F560');

    const expenses = await listTransactions(database, '2026-01', 'expense');
    expect(expenses.map((row) => row.id)).toEqual([tanpaKategoriId, makanId]);
    expect(await countAllTransactions(database)).toBe(4);
    expect((await listRecentTransactions(database, 2)).map((row) => row.amount)).toEqual([
      30000, 25000,
    ]);
  });

  it('menghitung ringkasan bulanan', async () => {
    const database = await freshDb();
    await seed(database);
    expect(await getMonthSummary(database, '2026-01')).toEqual({
      income: 5000000,
      expense: 100000,
      balance: 4900000,
      count: 3,
    });
    expect(await getMonthSummary(database, '2026-03')).toEqual({
      income: 0,
      expense: 0,
      balance: 0,
      count: 0,
    });
  });

  it('mengelompokkan pengeluaran per kategori termasuk tanpa kategori', async () => {
    const database = await freshDb();
    await seed(database);
    expect(await getExpenseByCategory(database, '2026-01')).toEqual([
      { name: 'Makan', color: '#FFD166', total: 75000 },
      { name: 'Tanpa kategori', color: '#D9C7FF', total: 25000 },
    ]);
  });

  it('mengisi bulan kosong pada seri grafik bulanan', async () => {
    const database = await freshDb();
    await seed(database);
    expect(await getMonthlySeries(database, '2026-02', 3)).toEqual([
      { month: '2025-12', income: 0, expense: 0 },
      { month: '2026-01', income: 5000000, expense: 100000 },
      { month: '2026-02', income: 0, expense: 30000 },
    ]);
  });

  it('mengubah dan menghapus transaksi', async () => {
    const database = await freshDb();
    const { makanId } = await seed(database);
    const categories = await listCategories(database);
    const gaji = categories.find((row) => row.name === 'Gaji')!;

    await updateTransaction(database, makanId, {
      type: 'expense',
      amount: 80000,
      category_id: gaji.id!,
      date: '2026-01-04',
      note: 'Diperbarui',
    });

    const updated = await getTransactionById(database, makanId);
    expect(updated?.amount).toBe(80000);
    expect(updated?.date).toBe('2026-01-04');
    expect(updated?.note).toBe('Diperbarui');
    expect(updated?.category_name).toBe('Gaji');

    await deleteTransaction(database, makanId);
    expect(await getTransactionById(database, makanId)).toBeNull();
    expect(await countAllTransactions(database)).toBe(3);
  });

  it('menolak nominal nol dan tanggal tidak valid', async () => {
    const database = await freshDb();
    await expect(
      createTransaction(database, {
        type: 'expense',
        amount: 0,
        category_id: null,
        date: '2026-01-01',
        note: null,
      }),
    ).rejects.toThrow(/lebih dari nol/i);
    await expect(
      createTransaction(database, {
        type: 'expense',
        amount: 1000,
        category_id: null,
        date: '2026-02-30',
        note: null,
      }),
    ).rejects.toThrow(/tanggal/i);
  });
});

describe('wishlist', () => {
  function input(overrides: Partial<Parameters<typeof createWishlistItem>[1]> = {}) {
    return {
      name: 'Headphone',
      price: 1500000,
      image: null,
      link: null,
      note: null,
      monthly_plan: 0,
      ...overrides,
    };
  }

  it('membuat item, mengatur dana, rencana, dan mengubah data', async () => {
    const database = await freshDb();
    const id = await createWishlistItem(
      database,
      input({
        name: '  Headphone  ',
        image: 'data:image/jpeg;base64,abc',
        link: 'contoh.test/headphone',
      }),
    );

    const item = await getWishlistById(database, id);
    expect(item).toMatchObject({
      name: 'Headphone',
      price: 1500000,
      image: 'data:image/jpeg;base64,abc',
      link: 'https://contoh.test/headphone',
      saved_amount: 0,
      monthly_plan: 0,
      purchased: 0,
      purchased_at: null,
    });

    await addWishlistFunds(database, id, 500000);
    expect((await getWishlistById(database, id))?.saved_amount).toBe(500000);
    await addWishlistFunds(database, id, -900000);
    expect((await getWishlistById(database, id))?.saved_amount).toBe(0);
    await setWishlistSaved(database, id, 350000);
    expect((await getWishlistById(database, id))?.saved_amount).toBe(350000);
    await setWishlistSaved(database, id, -10);
    expect((await getWishlistById(database, id))?.saved_amount).toBe(0);

    await setWishlistPlan(database, id, 250000);
    expect((await getWishlistById(database, id))?.monthly_plan).toBe(250000);
    await setWishlistPlan(database, id, -5);
    expect((await getWishlistById(database, id))?.monthly_plan).toBe(0);

    await updateWishlistItem(
      database,
      id,
      input({ name: '  Headphone Baru  ', price: 1750000, note: 'Warna hitam' }),
    );
    expect(await getWishlistById(database, id)).toMatchObject({
      name: 'Headphone Baru',
      price: 1750000,
      note: 'Warna hitam',
    });
  });

  it('menghitung total aktif dan mengecualikan item yang sudah dibeli', async () => {
    const database = await freshDb();
    const first = await createWishlistItem(database, input({ name: 'Pertama', price: 1000000 }));
    const second = await createWishlistItem(database, input({ name: 'Kedua', price: 2000000 }));
    await setWishlistSaved(database, first, 250000);

    expect(await getWishlistTotals(database)).toMatchObject({
      target: 3000000,
      saved: 250000,
      remaining: 2750000,
      activeCount: 2,
      purchasedCount: 0,
    });

    await setWishlistPurchased(database, second, true);
    expect(await getWishlistTotals(database)).toMatchObject({
      target: 1000000,
      saved: 250000,
      activeCount: 1,
      purchasedCount: 1,
    });

    const order = await listWishlist(database);
    expect(order[order.length - 1].id).toBe(second);
    const restored = await getWishlistById(database, second);
    expect(restored?.purchased).toBe(1);
    expect(restored?.purchased_at).toBeTruthy();

    await setWishlistPurchased(database, second, false);
    expect((await getWishlistById(database, second))?.purchased_at).toBeNull();
  });

  it('menghapus item wishlist', async () => {
    const database = await freshDb();
    const id = await createWishlistItem(database, input());
    await deleteWishlistItem(database, id);
    expect(await getWishlistById(database, id)).toBeNull();
  });
});

describe('pengaturan', () => {
  it('menyimpan pengingat dan membatasi jam ke rentang wajar', async () => {
    const database = await freshDb();
    await saveSettings(database, {
      reminder_enabled: true,
      reminder_hour: 99,
      reminder_minute: -5,
      reminder_last_notified_on: '2026-01-15',
    });

    expect(await getSettings(database)).toEqual({
      ...DEFAULT_SETTINGS,
      reminder_enabled: true,
      reminder_hour: 23,
      reminder_minute: 0,
      reminder_last_notified_on: '2026-01-15',
    });
  });
});

describe('anggaran', () => {
  it('menyalin anggaran bulan sebelumnya sekali saja', async () => {
    const database = await freshDb();
    const jajanId = await expenseCategoryId(database, 'Jajan');
    await saveBudget(database, { month: '2026-01', category_id: jajanId, amount: 500000 });
    await createTransaction(database, {
      type: 'expense',
      amount: 200000,
      category_id: jajanId,
      date: '2026-01-10',
      note: null,
    });

    await ensureBudgetMonth(database, '2026-02');
    await ensureBudgetMonth(database, '2026-02');

    const january = await getBudgetOverview(database, '2026-01');
    const february = await getBudgetOverview(database, '2026-02');
    expect(january.rows[0]).toMatchObject({
      category_name: 'Jajan',
      amount: 500000,
      spent: 200000,
      level: 0,
    });
    expect(february.rows).toHaveLength(1);
    expect(february.rows[0]).toMatchObject({ amount: 500000, spent: 0 });

    await deleteBudget(database, february.rows[0].budget_id);
    await ensureBudgetMonth(database, '2026-02');
    expect((await getBudgetOverview(database, '2026-02')).rows).toHaveLength(0);
  });

  it('memberi peringatan 80% dan 100% sekali per kategori per bulan', async () => {
    const database = await freshDb();
    const jajanId = await expenseCategoryId(database, 'Jajan');
    const meTimeId = await expenseCategoryId(database, 'Me time');
    await saveBudget(database, { month: '2026-01', category_id: jajanId, amount: 500000 });

    await createTransaction(database, {
      type: 'expense',
      amount: 420000,
      category_id: jajanId,
      date: '2026-01-08',
      note: null,
    });
    expect(await checkBudgetAlerts(database, '2026-01')).toMatchObject([
      { category_id: jajanId, level: 80 },
    ]);
    expect(await checkBudgetAlerts(database, '2026-01')).toEqual([]);

    // Satu transaksi yang melompat dari 84% ke 204% hanya melaporkan level 100.
    await createTransaction(database, {
      type: 'expense',
      amount: 600000,
      category_id: jajanId,
      date: '2026-01-09',
      note: null,
    });
    expect(await checkBudgetAlerts(database, '2026-01')).toMatchObject([
      { category_id: jajanId, level: 100 },
    ]);
    expect(
      (await listBudgetAlerts(database, '2026-01'))
        .map((row) => row.level)
        .sort((a, b) => a - b),
    ).toEqual([80, 100]);

    await saveBudget(database, { month: '2026-01', category_id: meTimeId, amount: 200000 });
    await createTransaction(database, {
      type: 'expense',
      amount: 250000,
      category_id: meTimeId,
      date: '2026-01-10',
      note: null,
    });
    expect(await checkBudgetAlerts(database, '2026-01')).toMatchObject([
      { category_id: meTimeId, level: 100 },
    ]);
    expect(
      (await listBudgetAlerts(database, '2026-01'))
        .map((row) => row.level)
        .sort((a, b) => a - b),
    ).toEqual([80, 80, 100, 100]);
    expect(await countAllTransactions(database)).toBe(3);
  });
});

describe('tabungan target', () => {
  it('memisahkan setoran dari saldo dan membatasi klaim reward me time', async () => {
    const database = await freshDb();
    const month = currentMonthKey();
    const today = toDateKey();
    const meTimeId = await expenseCategoryId(database, 'Me time');
    const goalId = await createSavingsGoal(database, {
      name: 'Liburan',
      target_amount: 500000,
      note: null,
    });

    await addSavingsDeposit(database, goalId, { amount: 500000, date: today, note: null });
    const goal = (await listSavingsGoals(database))[0];
    expect(goal).toMatchObject({
      saved: 500000,
      remaining: 0,
      percent: 100,
      achieved: true,
      completed: false,
    });
    expect(await getMonthSummary(database, month)).toEqual({
      income: 0,
      expense: 0,
      balance: 0,
      count: 0,
    });

    await saveBudget(database, { month, category_id: meTimeId, amount: 100000 });
    expect((await getBudgetOverview(database, month)).rows[0].spent).toBe(0);

    await expect(claimSavingsReward(database, goalId, 600000)).rejects.toThrow(/melebihi/i);
    const claim = await claimSavingsReward(database, goalId, 200000);
    expect(claim).toMatchObject({
      goal_id: goalId,
      amount: 200000,
      category_name: 'Me time',
    });
    expect(await countAllTransactions(database)).toBe(1);
    expect(await getMonthSummary(database, month)).toMatchObject({ expense: 200000, count: 1 });
    expect((await getBudgetOverview(database, month)).rows[0].spent).toBe(200000);
    expect((await listSavingsGoals(database))[0].completed).toBe(true);
    expect(await getSavingsTotals(database)).toMatchObject({ saved: 0, completedCount: 1 });

    await expect(claimSavingsReward(database, goalId, 10000)).rejects.toThrow(/sudah diklaim/i);
    await expect(
      addSavingsDeposit(database, goalId, { amount: 10000, date: today, note: null }),
    ).rejects.toThrow(/selesai/i);
    await expect(deleteSavingsDeposit(database, goal.deposits[0].id!)).rejects.toThrow(
      /sudah selesai/i,
    );
  });
});

describe('backup database', () => {
  it('mengekspor dan mengimpor ulang seluruh data', async () => {
    const source = await freshDb();
    const categoryId = await createCategory(source, {
      name: 'Kopi',
      type: 'expense',
      color: '#FFB08A',
    });
    await createTransaction(source, {
      type: 'expense',
      amount: 24000,
      category_id: categoryId,
      date: '2026-01-08',
      note: 'Latte',
    });
    await createWishlistItem(source, {
      name: 'Headphone',
      price: 1500000,
      image: 'data:image/jpeg;base64,aGVhZHBob25l',
      link: 'https://contoh.test',
      note: 'Warna hitam',
      monthly_plan: 250000,
    });
    await saveSettings(source, { reminder_enabled: true, reminder_hour: 8 });
    await saveBudget(source, { month: '2026-01', category_id: categoryId, amount: 300000 });
    const savingsGoalId = await createSavingsGoal(source, {
      name: 'Liburan',
      target_amount: 1000000,
      note: 'Liburan akhir tahun',
    });
    await addSavingsDeposit(source, savingsGoalId, {
      amount: 150000,
      date: '2026-01-08',
      note: null,
    });

    const exported = await readBackupData(source);
    const payload = buildBackupFile({ ...exported, exportedAt: '2026-02-01T00:00:00.000Z' });
    const parsed = parseBackup(JSON.stringify(payload), DEFAULT_SETTINGS);

    const target = await freshDb();
    await importBackupData(target, parsed);

    const imported = await readBackupData(target);
    expect(imported.categories).toEqual(exported.categories);
    expect(imported.transactions).toEqual(exported.transactions);
    expect(imported.wishlist).toEqual(exported.wishlist);
    expect(imported.budgets).toEqual(exported.budgets);
    expect(imported.savingsGoals).toEqual(exported.savingsGoals);
    expect(imported.savingsDeposits).toEqual(exported.savingsDeposits);
    expect(await getSettings(target)).toEqual(await getSettings(source));
    expect(await getWishlistTotals(target)).toMatchObject({ target: 1500000 });
  });

  it('mengganti data lama, bukan menggabungkannya', async () => {
    const source = await freshDb();
    await createTransaction(source, {
      type: 'income',
      amount: 5000000,
      category_id: null,
      date: '2026-01-01',
      note: 'Gaji',
    });
    const exported = await readBackupData(source);
    const parsed = parseBackup(JSON.stringify(buildBackupFile(exported)), DEFAULT_SETTINGS);

    const target = await freshDb();
    const extraId = await createCategory(target, {
      name: 'Hanya di target',
      type: 'expense',
      color: '#FFB08A',
    });

    await importBackupData(target, parsed);

    const categories = await listCategories(target);
    expect(categories.some((row) => row.id === extraId)).toBe(false);
    expect(categories.map((row) => row.name)).toEqual(exported.categories.map((row) => row.name));
    expect(await countAllTransactions(target)).toBe(1);
  });
});

describe('resetDatabase', () => {
  it('mengosongkan data pengguna lalu mengisi ulang default', async () => {
    const database = await freshDb();
    await createTransaction(database, {
      type: 'expense',
      amount: 20000,
      category_id: null,
      date: '2026-01-05',
      note: null,
    });
    await resetDatabase(database);
    expect(await countAllTransactions(database)).toBe(0);
    expect(await listCategories(database)).toHaveLength(DEFAULT_CATEGORIES.length);
    expect(await getSettings(database)).toEqual(DEFAULT_SETTINGS);
  });
});
