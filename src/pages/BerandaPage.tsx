import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  ChevronRight,
  Gift,
  PiggyBank,
  Plus,
  ReceiptText,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import type {
  BudgetOverview,
  SavingsTotals,
  TransactionView,
  TransactionType,
} from '../db/types';
import {
  ensureBudgetMonth,
  getBudgetOverview,
  getExpenseByCategory,
  getMonthSummary,
  getMonthlySeries,
  getSavingsTotals,
  getWishlistTotals,
  listRecentTransactions,
} from '../db/repositories';
import { currentMonthKey, monthLabel, toDateKey } from '../lib/dates';
import { formatCompactRupiah, formatRupiah } from '../lib/money';
import { progressPercent } from '../lib/wishlist';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { Button } from '../components/ui/Button';
import { Card, Chip } from '../components/ui/Card';
import { MonthSwitcher } from '../components/MonthSwitcher';
import { MonthlyBarChart } from '../components/MonthlyBarChart';
import { ProgressBar } from '../components/ProgressBar';
import { TransactionItem } from '../components/TransactionItem';
import { TransactionForm } from '../components/TransactionForm';
import { LoadingState, ErrorState, EmptyState, InlineEmpty } from '../components/States';
import { Mascot } from '../components/Mascot';

const EMPTY_SUMMARY = { income: 0, expense: 0, balance: 0, count: 0 };
const EMPTY_WISHLIST = { target: 0, saved: 0, remaining: 0, activeCount: 0, purchasedCount: 0 };
const EMPTY_BUDGET: BudgetOverview = {
  month: '',
  rows: [],
  unassigned: [],
  totalLimit: 0,
  totalSpent: 0,
  percent: 0,
};
const EMPTY_SAVINGS: SavingsTotals = {
  target: 0,
  saved: 0,
  activeCount: 0,
  achievedCount: 0,
  completedCount: 0,
};

function defaultDateForMonth(month: string): string {
  const current = currentMonthKey();
  return month === current ? toDateKey() : `${month}-01`;
}

function heroCopy(balance: number, count: number): { speech: string } {
  if (count === 0) {
    return {
      speech: 'Belum ada catatan bulan ini. Yuk mulai dari pengeluaran kecil hari ini.',
    };
  }
  if (balance < 0) {
    return {
      speech: 'Waduh, pengeluaran lebih besar dari pemasukan. Coba rem pengeluaran ya!',
    };
  }
  if (count >= 8) {
    return {
      speech: 'Rajin sekali mencatat! Cuan tetap aman dan terkendali.',
    };
  }
  return {
    speech: 'Cuan aman! Sedikit lagi rapi. Terus catat supaya makin jelas.',
  };
}

export function BerandaPage() {
  const [month, setMonth] = useState(currentMonthKey);
  const [formOpen, setFormOpen] = useState(false);
  const [formType, setFormType] = useState<TransactionType>('expense');
  const [editing, setEditing] = useState<TransactionView | null>(null);

  const summaryQuery = useLiveQuery(
    () => getMonthSummary(undefined, month),
    [month],
    EMPTY_SUMMARY,
  );
  const seriesQuery = useLiveQuery(
    () => getMonthlySeries(undefined, month, 6),
    [month],
    [],
  );
  const breakdownQuery = useLiveQuery(
    () => getExpenseByCategory(undefined, month),
    [month],
    [],
  );
  const recentQuery = useLiveQuery(() => listRecentTransactions(undefined, 5), [], []);
  const wishlistQuery = useLiveQuery(() => getWishlistTotals(), [], EMPTY_WISHLIST);
  const budgetQuery = useLiveQuery(
    () => getBudgetOverview(undefined, month),
    [month],
    EMPTY_BUDGET,
  );
  const savingsQuery = useLiveQuery(() => getSavingsTotals(), [], EMPTY_SAVINGS);

  useEffect(() => {
    void ensureBudgetMonth(undefined, month).catch(() => undefined);
  }, [month]);

  const summary = summaryQuery.data;
  const breakdown = breakdownQuery.data;
  const recent = recentQuery.data;
  const wishlist = wishlistQuery.data;
  const budget = budgetQuery.data;
  const savings = savingsQuery.data;
  const hero = heroCopy(summary.balance, summary.count);
  const breakdownTotal = useMemo(
    () => breakdown.reduce((total, row) => total + row.total, 0),
    [breakdown],
  );
  const wishlistPercent = progressPercent(wishlist.target, wishlist.saved);
  const budgetTone =
    budget.percent >= 100 ? 'danger' : budget.percent >= 80 ? 'warn' : 'default';
  const topBudgets = budget.rows.slice(0, 3);

  const openForm = (type: TransactionType) => {
    setEditing(null);
    setFormType(type);
    setFormOpen(true);
  };

  const openEdit = (transaction: TransactionView) => {
    setEditing(transaction);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
  };

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <span className="eyebrow">
            <Sparkles aria-hidden="true" /> Beranda
          </span>
          <h1 className="page-title">Catatan keuanganmu</h1>
          <p className="page-subtitle">
            Semua angka dihitung dari catatan di perangkat ini. Pilih bulan untuk melihat
            ringkasannya.
          </p>
        </div>
        <div className="page-actions">
          <MonthSwitcher month={month} onChange={setMonth} />
          <Button icon={<TrendingDown />} onClick={() => openForm('expense')}>
            Pengeluaran
          </Button>
          <Button variant="mint" icon={<TrendingUp />} onClick={() => openForm('income')}>
            Pemasukan
          </Button>
        </div>
      </header>

      {summaryQuery.error ? <ErrorState message={summaryQuery.error} /> : null}

      <div className="stack">
        <section className="hero" aria-labelledby="hero-balance-label">
          <div>
            <span className="hero__label" id="hero-balance-label">
              <Wallet aria-hidden="true" /> Saldo bulan ini
            </span>
            <p className={`hero__balance ${summary.balance < 0 ? 'negative' : ''}`.trim()}>
              {formatRupiah(summary.balance)}
            </p>
            <p className="hero__sub">
              {summary.count} transaksi • {monthLabel(month)}
            </p>
            <div className="hero__pills">
              <span className="hero__pill hero__pill--income">
                <TrendingUp aria-hidden="true" />
                Masuk {formatCompactRupiah(summary.income)}
              </span>
              <span className="hero__pill hero__pill--expense">
                <TrendingDown aria-hidden="true" />
                Keluar {formatCompactRupiah(summary.expense)}
              </span>
            </div>
            <Link className="hero__savings" to="/wishlist?tab=tabungan">
              <PiggyBank aria-hidden="true" />
              Tertabung <strong>{formatRupiah(savings.saved)}</strong>
              <ChevronRight size={14} aria-hidden="true" />
            </Link>
          </div>
          <div className="hero__mascot">
            <Mascot decorative />
            <p className="speech">{hero.speech}</p>
          </div>
        </section>

        <div className="stats-grid">
          <div className="stat-card stat-card--income">
            <div className="stat-card__head">
              <TrendingUp aria-hidden="true" /> Pemasukan
            </div>
            <p className="stat-card__amount">{formatRupiah(summary.income)}</p>
            <p className="stat-card__foot">Uang yang masuk bulan ini</p>
          </div>
          <div className="stat-card stat-card--expense">
            <div className="stat-card__head">
              <TrendingDown aria-hidden="true" /> Pengeluaran
            </div>
            <p className="stat-card__amount">{formatRupiah(summary.expense)}</p>
            <p className="stat-card__foot">Uang yang keluar bulan ini</p>
          </div>
        </div>

        <Card tone="mint" className="home-budget">
          <div className="section-head">
            <h2 className="section-title">
              <Target aria-hidden="true" /> Anggaran bulan ini
            </h2>
            <Link className="section-link" to="/anggaran">
              Atur anggaran <ChevronRight size={14} aria-hidden="true" />
            </Link>
          </div>
          {budgetQuery.loading ? (
            <LoadingState label="Memuat anggaran..." />
          ) : budget.rows.length === 0 ? (
            <div className="stack stack--sm">
              <p className="small muted">
                Belum ada batas pengeluaran. Tambahkan anggaran supaya pemakaian bulan ini lebih
                mudah dipantau.
              </p>
              <Link className="btn btn--sm" to="/anggaran">
                <Plus aria-hidden="true" /> Tambah anggaran
              </Link>
            </div>
          ) : (
            <div className="stack stack--sm">
              <div className="row row--between row--wrap">
                <Chip tone="paper">{formatRupiah(budget.totalSpent)} terpakai</Chip>
                <strong className="small">
                  {Math.round(budget.percent)}% dari {formatRupiah(budget.totalLimit)}
                </strong>
              </div>
              <ProgressBar percent={budget.percent} tone={budgetTone} label="Anggaran bulan ini" />
              <div className="home-budget__list">
                {topBudgets.map((row) => (
                  <div className="home-budget__row" key={row.budget_id}>
                    <span
                      className="breakdown__dot"
                      style={{ background: row.category_color }}
                      aria-hidden="true"
                    />
                    <span>{row.category_name}</span>
                    <strong>{Math.round(row.percent)}%</strong>
                  </div>
                ))}
              </div>
              <p className="tiny muted">
                Peringatan muncul saat kategori mencapai 80% dan 100% batas.
              </p>
            </div>
          )}
        </Card>

        <div className="dashboard-grid">
          <div className="stack">
            <Card tone="paper">
              <div className="section-head">
                <h2 className="section-title">
                  <Calendar aria-hidden="true" /> 6 bulan terakhir
                </h2>
              </div>
              {seriesQuery.loading ? (
                <LoadingState label="Menyiapkan grafik..." />
              ) : (
                <MonthlyBarChart data={seriesQuery.data} currentMonth={month} />
              )}
            </Card>

            <Card tone="paper">
              <div className="section-head">
                <h2 className="section-title">
                  <ReceiptText aria-hidden="true" /> Transaksi terakhir
                </h2>
                <Link className="section-link" to="/transaksi">
                  Semua <ChevronRight size={14} aria-hidden="true" />
                </Link>
              </div>
              {recentQuery.loading ? (
                <LoadingState label="Memuat transaksi..." />
              ) : recent.length === 0 ? (
                <EmptyState
                  title="Belum ada transaksi"
                  message="Catat pemasukan atau pengeluaran pertamamu supaya saldo mulai terhitung."
                  actionLabel="Catat sekarang"
                  onAction={() => openForm('expense')}
                />
              ) : (
                <div className="tx-list">
                  {recent.map((transaction) => (
                    <TransactionItem
                      key={transaction.id}
                      transaction={transaction}
                      onEdit={() => openEdit(transaction)}
                    />
                  ))}
                </div>
              )}
            </Card>
          </div>

          <div className="stack">
            <Card tone="paper">
              <div className="section-head">
                <h2 className="section-title">
                  <Target aria-hidden="true" /> Pengeluaran per kategori
                </h2>
              </div>
              {breakdownQuery.loading ? (
                <LoadingState label="Menghitung kategori..." />
              ) : breakdown.length === 0 ? (
                <InlineEmpty>Belum ada pengeluaran di bulan ini.</InlineEmpty>
              ) : (
                <div className="breakdown">
                  {breakdown.map((row) => (
                    <div className="breakdown__row" key={row.name}>
                      <div className="breakdown__name">
                        <span
                          className="breakdown__dot"
                          style={{ background: row.color }}
                          aria-hidden="true"
                        />
                        <span>{row.name}</span>
                      </div>
                      <div className="breakdown__track">
                        <div
                          className="breakdown__fill"
                          style={{
                            width: `${breakdownTotal > 0 ? (row.total / breakdownTotal) * 100 : 0}%`,
                            background: row.color,
                          }}
                        />
                      </div>
                      <span className="breakdown__amount">{formatCompactRupiah(row.total)}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card tone="lime">
              <div className="section-head">
                <h2 className="section-title">
                  <Gift aria-hidden="true" /> Wishlist
                </h2>
                <Link className="section-link" to="/wishlist">
                  Buka <ChevronRight size={14} aria-hidden="true" />
                </Link>
              </div>
              {wishlist.activeCount === 0 ? (
                <div className="stack stack--sm">
                  <p className="small">
                    Belum ada wishlist aktif. Tulis barang impianmu dan tentukan target tabungan.
                  </p>
                  <Link className="btn btn--sm" to="/wishlist?tambah=1">
                    <Plus aria-hidden="true" /> Tambah wishlist
                  </Link>
                </div>
              ) : (
                <div className="stack stack--sm">
                  <div className="row row--between row--wrap">
                    <Chip tone="paper">{wishlist.activeCount} barang aktif</Chip>
                    <strong className="small">{Math.round(wishlistPercent)}% terkumpul</strong>
                  </div>
                  <ProgressBar percent={wishlistPercent} label="Kemajuan total wishlist" />
                  <div className="small">
                    Terkumpul <strong>{formatRupiah(wishlist.saved)}</strong> dari{' '}
                    {formatRupiah(wishlist.target)}
                  </div>
                  <p className="tiny muted">
                    Dana wishlist dicatat terpisah dan tidak mengurangi saldo transaksi.
                  </p>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>

      <Button
        className="fab"
        variant="primary"
        aria-label="Catat transaksi baru"
        onClick={() => openForm('expense')}
      >
        <Plus aria-hidden="true" />
      </Button>

      <TransactionForm
        open={formOpen}
        onClose={closeForm}
        transaction={editing}
        defaultType={formType}
        defaultDate={defaultDateForMonth(month)}
      />
    </div>
  );
}
