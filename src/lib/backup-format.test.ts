import { describe, expect, it } from 'vitest';
import { BACKUP_APP, BACKUP_VERSION, buildBackupFile, parseBackup } from './backup-format';
import { DEFAULT_SETTINGS } from '../db/types';

const CREATED = '2026-01-01T10:00:00.000Z';

function v1Backup() {
  return {
    app: BACKUP_APP,
    version: 1,
    exported_at: '2026-02-01T00:00:00.000Z',
    data: {
      categories: [
        {
          id: 1,
          name: 'Makan',
          type: 'expense',
          color: '#FFD166',
          is_default: 1,
          created_at: CREATED,
        },
      ],
      transactions: [
        {
          id: 10,
          type: 'expense',
          amount: 50000.9,
          category_id: 1,
          date: '2026-01-05',
          note: 'Sarapan',
          created_at: CREATED,
          updated_at: CREATED,
        },
        {
          id: 11,
          type: 'income',
          amount: 1000000,
          category_id: 99,
          date: '2026-01-06',
          note: null,
          created_at: CREATED,
          updated_at: CREATED,
        },
      ],
      wishlist: [
        {
          id: 3,
          name: 'Headphone',
          price: 1500000,
          image_file: 'headphone.jpg',
          link: 'https://contoh.test/headphone',
          note: 'Warna hitam',
          saved_amount: 250000,
          monthly_plan: 100000,
          created_at: CREATED,
          purchased: 0,
          purchased_at: null,
        },
      ],
      settings: [
        { key: 'reminder_enabled', value: 'true' },
        { key: 'reminder_hour', value: '99' },
        { key: 'reminder_minute', value: 'bukan-angka' },
        { key: 'last_backup_at', value: '2026-01-31T12:00:00.000Z' },
      ],
    },
    images: {
      'headphone.jpg': { base64: 'aGVhZHBob25l', mime_type: 'image/jpeg' },
      'kosong.jpg': { base64: '' },
      'salah.jpg': { base64: 123 },
    },
  };
}

describe('parseBackup', () => {
  it('mengimpor backup v1 lama beserta gambar base64', () => {
    const payload = parseBackup(JSON.stringify(v1Backup()), DEFAULT_SETTINGS);

    expect(payload.app).toBe(BACKUP_APP);
    expect(payload.version).toBe(1);
    expect(payload.exported_at).toBe('2026-02-01T00:00:00.000Z');
    expect(payload.categories).toHaveLength(1);
    expect(payload.transactions).toHaveLength(2);
    expect(payload.transactions[0].amount).toBe(50001);
    expect(payload.transactions[1].category_id).toBeNull();
    expect(payload.wishlist[0].image).toBe('data:image/jpeg;base64,aGVhZHBob25l');
  });

  it('menormalkan pengaturan pengingat ke rentang aman', () => {
    const payload = parseBackup(JSON.stringify(v1Backup()), DEFAULT_SETTINGS);
    expect(payload.settings).toEqual({
      ...DEFAULT_SETTINGS,
      reminder_enabled: true,
      reminder_hour: 23,
      reminder_minute: 0,
      last_backup_at: '2026-01-31T12:00:00.000Z',
    });
    expect(payload.settingsRows).toHaveLength(6);
  });

  it('menerima backup v2 dengan data URL gambar', () => {
    const raw = v1Backup();
    const dataUrl = 'data:image/jpeg;base64,aGVhZHBob25l';
    const payload = parseBackup(
      JSON.stringify({
        app: BACKUP_APP,
        version: BACKUP_VERSION,
        exported_at: '2026-02-01T00:00:00.000Z',
        data: {
          ...raw.data,
          wishlist: [{ ...raw.data.wishlist[0], image: dataUrl, image_file: undefined }],
        },
      }),
      DEFAULT_SETTINGS,
    );
    expect(payload.version).toBe(2);
    expect(payload.wishlist[0].image).toBe(dataUrl);
  });

  it('memotong nama yang terlalu panjang', () => {
    const raw = v1Backup();
    raw.data.categories[0].name = 'K'.repeat(70);
    raw.data.wishlist[0].name = 'W'.repeat(130);
    const payload = parseBackup(JSON.stringify(raw), DEFAULT_SETTINGS);
    expect(payload.categories[0].name).toHaveLength(40);
    expect(payload.wishlist[0].name).toHaveLength(120);
  });

  it('menolak JSON yang rusak', () => {
    expect(() => parseBackup('{bukan json', DEFAULT_SETTINGS)).toThrow(/tidak bisa dibaca/i);
  });

  it('menolak file yang bukan backup CuanKu', () => {
    const raw = { ...v1Backup(), app: 'AplikasiLain' };
    expect(() => parseBackup(JSON.stringify(raw), DEFAULT_SETTINGS)).toThrow(/bukan backup CuanKu/i);
  });

  it('menolak versi backup yang lebih baru', () => {
    const raw = { ...v1Backup(), version: BACKUP_VERSION + 1 };
    expect(() => parseBackup(JSON.stringify(raw), DEFAULT_SETTINGS)).toThrow(/lebih baru/i);
  });

  it('menolak bagian data yang hilang', () => {
    const raw = v1Backup() as Record<string, unknown> & {
      data: Record<string, unknown>;
    };
    delete raw.data.categories;
    expect(() => parseBackup(JSON.stringify(raw), DEFAULT_SETTINGS)).toThrow(/bagian kategori/i);
  });

  it('menolak jenis transaksi yang tidak dikenal', () => {
    const raw = v1Backup() as unknown as {
      data: { transactions: { type: string }[] };
    };
    raw.data.transactions[0].type = 'transfer';
    expect(() => parseBackup(JSON.stringify(raw), DEFAULT_SETTINGS)).toThrow(/jenis transaksi/i);
  });

  it('menolak nominal transaksi nol atau negatif', () => {
    const raw = v1Backup();
    raw.data.transactions[0].amount = 0;
    expect(() => parseBackup(JSON.stringify(raw), DEFAULT_SETTINGS)).toThrow(/lebih dari nol/i);
  });

  it('menolak format tanggal transaksi yang salah', () => {
    const raw = v1Backup();
    raw.data.transactions[0].date = '05-01-2026';
    expect(() => parseBackup(JSON.stringify(raw), DEFAULT_SETTINGS)).toThrow(/tanggal transaksi/i);
  });

  it('menolak harga wishlist nol atau negatif', () => {
    const raw = v1Backup();
    raw.data.wishlist[0].price = -1;
    expect(() => parseBackup(JSON.stringify(raw), DEFAULT_SETTINGS)).toThrow(/harga wishlist/i);
  });
});

describe('buildBackupFile', () => {
  it('membentuk payload backup v2 lengkap', () => {
    const categories = [
      {
        id: 1,
        name: 'Gaji',
        type: 'income' as const,
        color: '#C8F560',
        is_default: 1 as const,
        created_at: CREATED,
      },
    ];
    const payload = buildBackupFile({
      categories,
      transactions: [],
      wishlist: [],
      settings: [{ key: 'reminder_enabled', value: 'false' }],
      exportedAt: '2026-03-01T00:00:00.000Z',
    });

    expect(payload).toEqual({
      app: BACKUP_APP,
      version: BACKUP_VERSION,
      exported_at: '2026-03-01T00:00:00.000Z',
      data: {
        categories,
        transactions: [],
        wishlist: [],
        settings: [{ key: 'reminder_enabled', value: 'false' }],
      },
    });
  });
});
