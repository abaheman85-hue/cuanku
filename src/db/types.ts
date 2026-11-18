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

export interface Budget {
  id?: number;
  /** Bulan anggaran, format `YYYY-MM`. */
  month: string;
  category_id: number;
  /** Batas pengeluaran bulanan dalam Rupiah. */
  amount: number;
  created_at: string;
  updated_at: string;
}

/** Penanda bahwa salinan anggaran untuk bulan ini sudah dibuat. */
export interface BudgetMonth {
  month: string;
  initialized_at: string;
}

export type BudgetAlertLevel = 80 | 100;

export interface BudgetAlert {
  id?: number;
  month: string;
  category_id: number;
  level: BudgetAlertLevel;
  notified_at: string;
}

export interface BudgetRow {
  budget_id: number;
  category_id: number;
  category_name: string;
  category_color: string;
  amount: number;
  spent: number;
  percent: number;
  level: 0 | BudgetAlertLevel;
}

export interface BudgetUnassigned {
  category_id: number;
  category_name: string;
  category_color: string;
  spent: number;
}

export interface BudgetOverview {
  month: string;
  rows: BudgetRow[];
  unassigned: BudgetUnassigned[];
  totalLimit: number;
  totalSpent: number;
  percent: number;
}

export interface BudgetAlertNotice {
  category_id: number;
  category_name: string;
  level: BudgetAlertLevel;
  spent: number;
  amount: number;
}

export interface SavingsGoal {
  id?: number;
  name: string;
  target_amount: number;
  note: string | null;
  created_at: string;
  achieved_at: string | null;
  reward_claimed_at: string | null;
  reward_transaction_id: number | null;
  reward_amount: number;
}

export interface SavingsDeposit {
  id?: number;
  goal_id: number;
  amount: number;
  /** Kunci tanggal lokal `YYYY-MM-DD`. */
  date: string;
  note: string | null;
  created_at: string;
}

export interface SavingsGoalView extends SavingsGoal {
  saved: number;
  remaining: number;
  percent: number;
  achieved: boolean;
  completed: boolean;
  deposits: SavingsDeposit[];
}

export interface SavingsTotals {
  target: number;
  saved: number;
  activeCount: number;
  achievedCount: number;
  completedCount: number;
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
    budgets?: Budget[];
    budget_months?: BudgetMonth[];
    budget_alerts?: BudgetAlert[];
    savings_goals?: SavingsGoal[];
    savings_deposits?: SavingsDeposit[];
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
  budgets: Budget[];
  budgetMonths: BudgetMonth[];
  budgetAlerts: BudgetAlert[];
  savingsGoals: SavingsGoal[];
  savingsDeposits: SavingsDeposit[];
}
