export type TransactionType = 'income' | 'expense';

export interface Category {
  id?: number;
  name: string;
  type: TransactionType;
  color: string;
  is_default: 0 | 1;
  created_at: string;
}

export interface Transaction {
  id?: number;
  type: TransactionType;
  amount: number;
  category_id: number | null;
  /** Kunci tanggal lokal `YYYY-MM-DD`. */
  date: string;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface TransactionView extends Transaction {
  category_name: string | null;
  category_color: string | null;
}

export interface WishlistItem {
  id?: number;
  name: string;
  price: number;
  /** Data URL gambar (JPEG) atau null. */
  image: string | null;
  link: string | null;
  note: string | null;
  saved_amount: number;
  monthly_plan: number;
  created_at: string;
  purchased: 0 | 1;
  purchased_at: string | null;
}

export interface Setting {
  key: string;
  value: string;
}

export interface AppSettings {
  reminder_enabled: boolean;
  reminder_hour: number;
  reminder_minute: number;
  reminder_last_notified_on: string;
  reminder_dismissed_on: string;
  last_backup_at: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  reminder_enabled: true,
  reminder_hour: 20,
  reminder_minute: 0,
  reminder_last_notified_on: '',
  reminder_dismissed_on: '',
  last_backup_at: '',
};

export interface MonthSummary {
  income: number;
  expense: number;
  balance: number;
  count: number;
}

export interface CategoryTotal {
  name: string;
  color: string;
  total: number;
}

export interface MonthlyPoint {
  month: string;
  income: number;
  expense: number;
}

export interface WishlistInput {
  name: string;
  price: number;
  image: string | null;
  link: string | null;
  note: string | null;
  monthly_plan: number;
}

export interface BackupImage {
  base64: string;
  mime_type?: string;
}

export interface BackupFile {
  app: 'CuanKu';
  version: number;
  exported_at: string;
  data: {
    categories: Category[];
    transactions: Transaction[];
    wishlist: WishlistItem[];
    settings: Setting[];
  };
  /** Hanya untuk kompatibilitas impor backup lama (v1). */
  images?: Record<string, BackupImage>;
}

export interface ParsedBackup {
  app: 'CuanKu';
  version: number;
  exported_at: string;
  categories: Category[];
  transactions: Transaction[];
  wishlist: WishlistItem[];
  settingsRows: Setting[];
  settings: AppSettings;
}
