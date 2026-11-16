import type {
  AppSettings,
  BackupFile,
  BackupImage,
  Category,
  ParsedBackup,
  Setting,
  Transaction,
  TransactionType,
  WishlistItem,
} from '../db/types';
import { DEFAULT_SETTINGS } from '../db/types';
import { isValidDateKey, isoNow } from './dates';
import { settingsFromRows, settingsToRows } from './settings';

export const BACKUP_APP = 'CuanKu' as const;
export const BACKUP_VERSION = 2;

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

/** Memvalidasi file backup v1 (lama) maupun v2 (website). */
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

  return {
    app: BACKUP_APP,
    version,
    exported_at: text(raw.exported_at, 40, isoNow()),
    categories,
    transactions,
    wishlist,
    settingsRows,
    settings,
  };
}

export function buildBackupFile(input: {
  categories: Category[];
  transactions: Transaction[];
  wishlist: WishlistItem[];
  settings: Setting[];
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
    },
  };
}
