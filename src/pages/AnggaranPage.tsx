import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  CircleDollarSign,
  Pencil,
  Plus,
  Sparkles,
  Target,
  Trash2,
  TrendingDown,
} from 'lucide-react';
import type { BudgetRow, BudgetOverview } from '../db/types';
import { deleteBudget, ensureBudgetMonth, getBudgetOverview } from '../db/repositories';
import { currentMonthKey, monthLabel } from '../lib/dates';
import { formatCompactRupiah, formatRupiah } from '../lib/money';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { useFeedback } from '../context/Feedback';
import { Button, IconButton } from '../components/ui/Button';
import { Badge, Card, Chip } from '../components/ui/Card';
import { BudgetForm } from '../components/BudgetForm';
import { MonthSwitcher } from '../components/MonthSwitcher';
import { ProgressBar } from '../components/ProgressBar';
import { ErrorState, InlineEmpty, LoadingState } from '../components/States';

const EMPTY_OVERVIEW: BudgetOverview = {
  month: '',
  rows: [],
  unassigned: [],
  totalLimit: 0,
  totalSpent: 0,
  percent: 0,
};

type BudgetFormState = { mode: 'create'; categoryId: number | null } | { mode: 'edit'; row: BudgetRow };

function levelInfo(row: BudgetRow): { label: string; tone: 'lime' | 'yellow' | 'pink'; progress: 'default' | 'warn' | 'danger' } {
  if (row.level === 100) return { label: 'Lewat batas', tone: 'pink', progress: 'danger' };
  if (row.level === 80) return { label: 'Hampir penuh', tone: 'yellow', progress: 'warn' };
  return { label: 'Aman', tone: 'lime', progress: 'default' };
}

export function AnggaranPage() {
  const { confirm, toast } = useFeedback();
  const [month, setMonth] = useState(currentMonthKey);
  const [form, setForm] = useState<BudgetFormState | null>(null);

  useEffect(() => {
    void ensureBudgetMonth(undefined, month).catch(() => undefined);
  }, [month]);

  const overviewQuery = useLiveQuery(
    () => getBudgetOverview(undefined, month),
    [month],
    EMPTY_OVERVIEW,
  );
  const overview = overviewQuery.data;
  const remaining = Math.max(0, overview.totalLimit - overview.totalSpent);
  const tone = overview.percent >= 100 ? 'danger' : overview.percent >= 80 ? 'warn' : 'default';

  const openCreate = (categoryId: number | null = null) => {
    setForm({ mode: 'create', categoryId });
  };

  const handleDelete = async (row: BudgetRow) => {
    const ok = await confirm({
      title: `Hapus anggaran ${row.category_name}?`,
      message: `Batas ${formatRupiah(row.amount)} untuk ${monthLabel(month)} akan dihapus. Transaksi tetap tersimpan.`,
      confirmLabel: 'Hapus anggaran',
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteBudget(undefined, row.budget_id);
      toast('Anggaran dihapus.');
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : 'Gagal menghapus anggaran.', 'error');
    }
  };

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <span className="eyebrow">
            <Target aria-hidden="true" /> Anggaran
          </span>
          <h1 className="page-title">Atur batas pengeluaran</h1>
          <p className="page-subtitle">
            Batas per kategori dibuat setiap bulan dan disalin dari bulan sebelumnya. Anggaran
            hanya memberi peringatan, tidak memblokir transaksi.
          </p>
        </div>
        <div className="page-actions">
          <MonthSwitcher month={month} onChange={setMonth} />
          <Button variant="primary" icon={<Plus />} onClick={() => openCreate()}>
            Tambah anggaran
          </Button>
        </div>
      </header>

      {overviewQuery.error ? <ErrorState message={overviewQuery.error} /> : null}

      <div className="stack">
        <Card className="budget-summary">
          <div>
            <span className="eyebrow">
              <CircleDollarSign aria-hidden="true" /> Ringkasan {monthLabel(month)}
            </span>
            <p className="budget-summary__amount">{formatRupiah(remaining)}</p>
            <p className="small muted">Sisa anggaran yang masih bisa dipakai bulan ini.</p>
            <div className="row row--wrap" style={{ marginTop: 10 }}>
              <Chip tone="paper">{overview.rows.length} kategori dianggarkan</Chip>
              <Chip tone={tone === 'danger' ? 'pink' : tone === 'warn' ? 'yellow' : 'lime'}>
                {Math.round(overview.percent)}% terpakai
              </Chip>
            </div>
          </div>
          <div className="stack stack--sm">
            <div className="wishlist-summary__numbers">
              <div className="wishlist-summary__item">
                <span>Total batas</span>
                <strong>{formatRupiah(overview.totalLimit)}</strong>
              </div>
              <div className="wishlist-summary__item">
                <span>Terpakai</span>
                <strong>{formatRupiah(overview.totalSpent)}</strong>
              </div>
            </div>
            <ProgressBar
              percent={overview.percent}
              tone={tone}
              label="Kemajuan total anggaran"
            />
            <p className="tiny muted">
              Peringatan muncul di 80% dan 100% untuk setiap kategori, sekali per bulan.
            </p>
          </div>
        </Card>

        <div className="notice">
          <AlertTriangle aria-hidden="true" />
          <span>
            Anggaran tidak memotong saldo dan tidak menolak transaksi. Ini hanya pembanding
            pengeluaran terhadap batas yang kamu tentukan.
          </span>
        </div>

        {overviewQuery.loading ? (
          <Card>
            <LoadingState label="Memuat anggaran..." />
          </Card>
        ) : (
          <>
            <div>
              <div className="wishlist-section-head">
                <h2>Anggaran bulan ini</h2>
                <span className="small muted">{overview.rows.length} kategori</span>
              </div>
              {overview.rows.length === 0 ? (
                <Card dashed>
                  <InlineEmpty>
                    Belum ada anggaran. Tambahkan batas untuk kategori yang ingin kamu pantau.
                  </InlineEmpty>
                </Card>
              ) : (
                <div className="budget-list">
                  {overview.rows.map((row) => {
                    const info = levelInfo(row);
                    return (
                      <article className="budget-row" key={row.budget_id}>
                        <div className="budget-row__head">
                          <span
                            className="breakdown__dot"
                            style={{ background: row.category_color }}
                            aria-hidden="true"
                          />
                          <div className="budget-row__title">
                            <strong>{row.category_name}</strong>
                            <span className="tiny muted">
                              {formatCompactRupiah(row.spent)} dari {formatCompactRupiah(row.amount)}
                            </span>
                          </div>
                          <Badge tone={info.tone}>{info.label}</Badge>
                        </div>
                        <ProgressBar
                          percent={row.percent}
                          tone={info.progress}
                          label={`Penggunaan anggaran ${row.category_name}`}
                        />
                        <div className="budget-row__foot">
                          <span className="tiny muted">
                            {row.spent > row.amount
                              ? `Lebih ${formatRupiah(row.spent - row.amount)}`
                              : `Sisa ${formatRupiah(row.amount - row.spent)}`}
                          </span>
                          <div className="row">
                            <IconButton
                              label={`Ubah anggaran ${row.category_name}`}
                              size="sm"
                              onClick={() => setForm({ mode: 'edit', row })}
                            >
                              <Pencil />
                            </IconButton>
                            <IconButton
                              label={`Hapus anggaran ${row.category_name}`}
                              size="sm"
                              variant="pink"
                              onClick={() => void handleDelete(row)}
                            >
                              <Trash2 />
                            </IconButton>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>

            {overview.unassigned.length > 0 ? (
              <div>
                <div className="wishlist-section-head">
                  <h2>Belum dianggarkan</h2>
                  <span className="small muted">{overview.unassigned.length} kategori</span>
                </div>
                <Card>
                  <div className="budget-unassigned">
                    {overview.unassigned.map((category) => (
                      <div className="budget-unassigned__item" key={category.category_id}>
                        <span
                          className="breakdown__dot"
                          style={{ background: category.category_color }}
                          aria-hidden="true"
                        />
                        <div className="budget-unassigned__text">
                          <strong>{category.category_name}</strong>
                          <span className="tiny muted">
                            {category.spent > 0
                              ? `${formatCompactRupiah(category.spent)} terpakai`
                              : 'Belum ada pengeluaran'}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          icon={<Plus />}
                          onClick={() => openCreate(category.category_id)}
                        >
                          Atur
                        </Button>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            ) : null}
          </>
        )}

        <Card tone="mint" className="budget-tip">
          <div className="section-head">
            <h2 className="section-title">
              <CheckCircle2 aria-hidden="true" /> Tips anggaran
            </h2>
          </div>
          <p className="small">
            Mulai dari kategori yang paling sering dipakai, misalnya Makan atau Jajan. Kalau
            pengeluaran melewati batas, CuanKu tetap mencatatnya supaya gambaran keuanganmu jujur.
          </p>
          <div className="row row--wrap" style={{ marginTop: 10 }}>
            <Chip tone="lime"><Sparkles aria-hidden="true" /> 80%: hampir penuh</Chip>
            <Chip tone="pink"><TrendingDown aria-hidden="true" /> 100%: lewat batas</Chip>
          </div>
        </Card>
      </div>

      <Button
        className="fab"
        variant="primary"
        aria-label="Tambah anggaran baru"
        onClick={() => openCreate()}
      >
        <Plus aria-hidden="true" />
      </Button>

      <BudgetForm
        open={form !== null}
        onClose={() => setForm(null)}
        month={month}
        row={form?.mode === 'edit' ? form.row : null}
        categoryId={form?.mode === 'create' ? form.categoryId : null}
      />
    </div>
  );
}
