import type { Category, TransactionType } from './types';

export const CATEGORY_COLORS = [
  '#FFD166',
  '#FFC2E2',
  '#FFB08A',
  '#C8F560',
  '#B9F5D8',
  '#A9D6FF',
  '#D9C7FF',
  '#D8D4CC',
] as const;

interface DefaultCategory {
  name: string;
  type: TransactionType;
  color: string;
}

export const DEFAULT_CATEGORIES: readonly DefaultCategory[] = [
  { name: 'Makan', type: 'expense', color: '#FFD166' },
  { name: 'Transport', type: 'expense', color: '#A9D6FF' },
  { name: 'Belanja', type: 'expense', color: '#FFC2E2' },
  { name: 'Tagihan', type: 'expense', color: '#D9C7FF' },
  { name: 'Hiburan', type: 'expense', color: '#FFB08A' },
  { name: 'Kesehatan', type: 'expense', color: '#B9F5D8' },
  { name: 'Pendidikan', type: 'expense', color: '#C8F560' },
  { name: 'Lainnya', type: 'expense', color: '#D8D4CC' },
  { name: 'Gaji', type: 'income', color: '#C8F560' },
  { name: 'Bonus', type: 'income', color: '#FFD166' },
  { name: 'Pemasukan lain', type: 'income', color: '#B9F5D8' },
];

export function defaultCategoryRows(createdAt: string): Omit<Category, 'id'>[] {
  return DEFAULT_CATEGORIES.map((category) => ({
    ...category,
    is_default: 1,
    created_at: createdAt,
  }));
}
