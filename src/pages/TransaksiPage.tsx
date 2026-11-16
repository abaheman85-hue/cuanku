import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, ReceiptText, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import type { TransactionType, TransactionView } from '../db/types';
import {
  deleteTransaction,
  getMonthSummary,
  listTransactions,
} from '../db/repositories';
import { currentMonthKey, dayHeading, monthLabel, toDateKey } from '../lib/dates';
import { formatRupiah } from '../lib/money';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { useFeedback } from '../context/Feedback';
import { Button } from '../components/ui/Button';
import { Card, Chip } from '../components/ui/Card';
import { SegmentedControl } from '../components/ui/Field';
import { MonthSwitcher } from '../components/MonthSwitcher';
import { TransactionItem } from '../components/TransactionItem';
import { TransactionForm } from '../components/TransactionForm';
import { EmptyState, ErrorState, LoadingState } from '../components/States';

type Filter = TransactionType | 'all';

const EMPTY_SUMMARY = { income: 0, expense: 0, balance: 0, count: 0 };

interface DayGroup {
  date: string;
  transactions: TransactionView[];
  income: number;
  expense: number;
}

function defaultDateForMonth(month: string): string {
  return month === currentMonthKey() ? toDateKey() : `${month}-01`;
}

export function TransaksiPage() {
  const { confirm, toast } = useFeedback();
  const [searchParams, setSearchParams] = useSearchParams();
  const [month, setMonth] = useState(currentMonthKey);
  const [filter, setFilter] = useState<Filter>('all');
  const [manualFormOpen, setManualFormOpen] = useState(false);
  const [editing, setEditing] = useState<TransactionView | null>(null);
  const addRequested = searchParams.get('tambah') === '1';
  const formOpen = manualFormOpen || addRequested;

  const transactionsQuery = useLiveQuery(
    () => listTransactions(undefined, month, filter),
    [month, filter],
    [],
  );
  const summaryQuery = useLiveQuery(
    () => getMonthSummary(undefined, month),
    [month],
    EMPTY_SUMMARY,
  );

  const summary = summaryQuery.data;
  const transactions = transactionsQuery.data;

  const groups = useMemo<DayGroup[]>(() => {
    const map = new Map<string, DayGroup>();
    for (const transaction of transactions) {
      const group = map.get(transaction.date) ?? {
        date: transaction.date,
        transactions: [],
        income: 0,
        expense: 0,
      };
      group.transactions.push(transaction);
      if (transaction.type === 'income') group.income += transaction.amount;
      else group.expense += transaction.amount;
      map.set(transaction.date, group);
    }
    return [...map.values()];
  }, [transactions]);

  const openCreate = () => {
    setEditing(null);
    setManualFormOpen(true);
  };

  const closeForm = () => {
    setManualFormOpen(false);
    setEditing(null);
    if (addRequested) {
      const next = new URLSearchParams(searchParams);
      next.delete('tambah');
      setSearchParams(next, { replace: true });
    }
  };

  const handleDelete = async (transaction: TransactionView) => {
    if (!transaction.id) return;
    const ok = await confirm({
      title: 'Hapus transaksi ini?',
      message: 'Transaksi akan dihapus permanen dari catatanmu.',
      confirmLabel: 'Hapus',
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteTransaction(undefined, transaction.id);
      toast('Transaksi dihapus.');
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : 'Gagal menghapus transaksi.', 'error');
    }
  };

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <span className="eyebrow">
            <ReceiptText aria-hidden="true" /> Transaksi
          </span>
          <h1 className="page-title">Catatan transaksi</h1>
          <p className="page-subtitle">
            Semua uang masuk dan keluar, dikelompokkan per tanggal. Ketuk ikon pensil untuk
            mengubah catatan.
          </p>
        </div>
        <div className="page-actions">
          <MonthSwitcher month={month} onChange={setMonth} />
          <Button variant="primary" icon={<Plus />} onClick={openCreate}>
            Catat transaksi
          </Button>
        </div>
      </header>

      {transactionsQuery.error || summaryQuery.error ? (
        <ErrorState message={transactionsQuery.error ?? summaryQuery.error ?? 'Gagal memuat data.'} />
      ) : null}

      <div className="tx-total">
        <Chip tone="paper" icon={<Wallet aria-hidden="true" />}>
          {summary.count} transaksi
        </Chip>
        <Chip tone="mint" icon={<TrendingUp aria-hidden="true" />}>
          Masuk {formatRupiah(summary.income)}
        </Chip>
        <Chip tone="pink" icon={<TrendingDown aria-hidden="true" />}>
          Keluar {formatRupiah(summary.expense)}
        </Chip>
        <Chip tone="lime">Saldo {formatRupiah(summary.balance)}</Chip>
      </div>

      <div className="stack">
        <div className="row row--between row--wrap">
          <SegmentedControl
            label="Saring jenis transaksi"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: 'Semua' },
              { value: 'expense', label: 'Pengeluaran', tone: 'expense' },
              { value: 'income', label: 'Pemasukan', tone: 'income' },
            ]}
          />
          <span className="small muted">
            {monthLabel(month)} • {transactions.length} tampil
          </span>
        </div>

        <Card tone="paper">
          {transactionsQuery.loading ? (
            <LoadingState label="Memuat transaksi..." />
          ) : transactions.length === 0 ? (
            <EmptyState
              mood="sleepy"
              title={filter === 'all' ? 'Belum ada transaksi bulan ini' : 'Tidak ada yang cocok'}
              message={
                filter === 'all'
                  ? 'Mulai catat pengeluaran atau pemasukan pertamamu di bulan ini.'
                  : 'Coba ganti saringan jenis transaksi atau pilih bulan lain.'
              }
              actionLabel="Catat transaksi"
              onAction={openCreate}
            />
          ) : (
            <div>
              {groups.map((group) => (
                <section className="tx-group" key={group.date}>
                  <div className="tx-group__head">
                    <strong>{dayHeading(group.date)}</strong>
                    <span>
                      {group.income > 0 ? `+${formatRupiah(group.income)} ` : ''}
                      {group.expense > 0 ? `-${formatRupiah(group.expense)}` : ''}
                    </span>
                  </div>
                  <div className="tx-list">
                    {group.transactions.map((transaction) => (
                      <TransactionItem
                        key={transaction.id}
                        transaction={transaction}
                        showDate={false}
                        onEdit={() => {
                          setEditing(transaction);
                          setManualFormOpen(true);
                        }}
                        onDelete={() => void handleDelete(transaction)}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Button
        className="fab"
        variant="primary"
        aria-label="Catat transaksi baru"
        onClick={openCreate}
      >
        <Plus aria-hidden="true" />
      </Button>

      <TransactionForm
        open={formOpen}
        onClose={closeForm}
        transaction={editing}
        defaultType="expense"
        defaultDate={defaultDateForMonth(month)}
      />
    </div>
  );
}
