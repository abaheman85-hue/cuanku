import { useMemo, useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Gift,
  PartyPopper,
  Pencil,
  PiggyBank,
  Plus,
  ReceiptText,
  Trash2,
  Wallet,
} from 'lucide-react';
import type { RewardClaim } from '../db/repositories';
import type { SavingsGoalView } from '../db/types';
import {
  deleteSavingsDeposit,
  deleteSavingsGoal,
  getSavingsTotals,
  listSavingsGoals,
} from '../db/repositories';
import { dateLabel } from '../lib/dates';
import { formatRupiah } from '../lib/money';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { useFeedback } from '../context/Feedback';
import { Button, IconButton } from './ui/Button';
import { Badge, Card, Chip } from './ui/Card';
import { Modal } from './ui/Modal';
import { ProgressBar } from './ProgressBar';
import { EmptyState, ErrorState, InlineEmpty, LoadingState } from './States';
import { Mascot } from './Mascot';
import {
  RewardClaimForm,
  SavingsDepositForm,
  SavingsGoalForm,
} from './SavingsForms';

const EMPTY_TOTALS = { target: 0, saved: 0, activeCount: 0, achievedCount: 0, completedCount: 0 };

type GoalFormState = { mode: 'create' } | { mode: 'edit'; goal: SavingsGoalView };

function Confetti() {
  return (
    <div className="confetti" aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
      <span />
      <span />
    </div>
  );
}

function SavingsCard({
  goal,
  onDeposit,
  onClaim,
  onHistory,
  onEdit,
  onDelete,
}: {
  goal: SavingsGoalView;
  onDeposit: () => void;
  onClaim: () => void;
  onHistory: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const badge = goal.completed
    ? { tone: 'lime' as const, label: 'Selesai' }
    : goal.achieved
      ? { tone: 'yellow' as const, label: 'Tercapai' }
      : { tone: 'paper' as const, label: 'Berjalan' };

  return (
    <article className={`savings-card ${goal.completed ? 'savings-card--done' : ''}`.trim()}>
      <div className="savings-card__head">
        <div className="savings-card__title">
          <span className="savings-card__icon" aria-hidden="true">
            <PiggyBank />
          </span>
          <h3>{goal.name}</h3>
        </div>
        <Badge tone={badge.tone}>{badge.label}</Badge>
      </div>

      <div className="savings-card__numbers">
        <div>
          <span>Terkumpul</span>
          <strong>{formatRupiah(goal.saved)}</strong>
        </div>
        <div>
          <span>Target</span>
          <strong>{formatRupiah(goal.target_amount)}</strong>
        </div>
      </div>

      <ProgressBar
        percent={goal.percent}
        done={goal.achieved}
        label={`Kemajuan tabungan ${goal.name}`}
      />
      <div className="progress__meta">
        <span>{Math.round(goal.percent)}%</span>
        <span>
          {goal.completed
            ? 'Reward sudah dipakai'
            : goal.achieved
              ? 'Target tercapai'
              : `Sisa ${formatRupiah(goal.remaining)}`}
        </span>
      </div>

      {goal.note ? <p className="tiny muted savings-card__note">{goal.note}</p> : null}

      <div className="savings-card__actions">
        {!goal.completed ? (
          <>
            {goal.achieved ? (
              <Button size="sm" variant="primary" icon={<PartyPopper />} onClick={onClaim}>
                Pakai buat jajan
              </Button>
            ) : (
              <Button size="sm" variant="mint" icon={<Plus />} onClick={onDeposit}>
                Catat setoran
              </Button>
            )}
            <Button size="sm" icon={<ReceiptText />} onClick={onHistory}>
              Riwayat
            </Button>
          </>
        ) : (
          <span className="tiny muted">
            Me time {formatRupiah(goal.reward_amount)} sudah dinikmati.
          </span>
        )}
        {!goal.completed ? (
          <>
            <IconButton label={`Ubah ${goal.name}`} size="sm" onClick={onEdit}>
              <Pencil />
            </IconButton>
            <IconButton
              label={`Hapus ${goal.name}`}
              size="sm"
              variant="pink"
              onClick={onDelete}
            >
              <Trash2 />
            </IconButton>
          </>
        ) : null}
      </div>
    </article>
  );
}

export function SavingsSection() {
  const { confirm, toast } = useFeedback();
  const [goalForm, setGoalForm] = useState<GoalFormState | null>(null);
  const [depositGoal, setDepositGoal] = useState<SavingsGoalView | null>(null);
  const [claimGoal, setClaimGoal] = useState<SavingsGoalView | null>(null);
  const [historyId, setHistoryId] = useState<number | null>(null);
  const [celebrating, setCelebrating] = useState<RewardClaim | null>(null);

  const goalsQuery = useLiveQuery(() => listSavingsGoals(), [], []);
  const totalsQuery = useLiveQuery(() => getSavingsTotals(), [], EMPTY_TOTALS);
  const goals = goalsQuery.data;
  const totals = totalsQuery.data;
  const active = goals.filter((goal) => !goal.completed && !goal.achieved);
  const achieved = goals.filter((goal) => !goal.completed && goal.achieved);
  const completed = goals.filter((goal) => goal.completed);
  const historyGoal = useMemo(
    () => goals.find((goal) => goal.id === historyId) ?? null,
    [goals, historyId],
  );

  const handleDeleteGoal = async (goal: SavingsGoalView) => {
    if (!goal.id) return;
    const ok = await confirm({
      title: `Hapus target "${goal.name}"?`,
      message: `Semua ${goal.deposits.length} setoran akan dihapus. Transaksi me time yang sudah dibuat tetap tersimpan.`,
      confirmLabel: 'Hapus target',
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteSavingsGoal(undefined, goal.id);
      toast('Target tabungan dihapus.');
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : 'Gagal menghapus target.', 'error');
    }
  };

  const handleDeleteDeposit = async (depositId: number) => {
    const ok = await confirm({
      title: 'Hapus setoran ini?',
      message: 'Jumlah tabungan akan disesuaikan kembali.',
      confirmLabel: 'Hapus setoran',
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteSavingsDeposit(undefined, depositId);
      toast('Setoran dihapus.');
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : 'Gagal menghapus setoran.', 'error');
    }
  };

  return (
    <div className="stack">
      <Card className="savings-summary">
        <div>
          <span className="eyebrow">
            <Wallet aria-hidden="true" /> Ringkasan tabungan
          </span>
          <p className="hero__balance" style={{ marginTop: 6 }}>
            {formatRupiah(totals.saved)}
          </p>
          <p className="small muted">Total dana yang sedang disisihkan untuk targetmu.</p>
          <div className="row row--wrap" style={{ marginTop: 10 }}>
            <Chip tone="paper">{totals.activeCount} berjalan</Chip>
            <Chip tone="yellow">{totals.achievedCount} siap me time</Chip>
            <Chip tone="lime">{totals.completedCount} selesai</Chip>
          </div>
          <Button
            variant="primary"
            size="sm"
            icon={<Plus />}
            onClick={() => setGoalForm({ mode: 'create' })}
            style={{ marginTop: 12 }}
          >
            Tambah target tabungan
          </Button>
        </div>
        <div className="savings-summary__target">
          <span>Total target</span>
          <strong>{formatRupiah(totals.target)}</strong>
          <p className="tiny muted">
            Dana tabungan tidak mengurangi saldo transaksi maupun anggaran.
          </p>
        </div>
      </Card>

      {goalsQuery.error || totalsQuery.error ? (
        <ErrorState message={goalsQuery.error ?? totalsQuery.error ?? 'Gagal memuat tabungan.'} />
      ) : null}

      {achieved.length > 0 ? (
        <div className="reward-list">
          {achieved.map((goal) => (
            <Card tone="lime" className="reward-card" key={goal.id}>
              <Confetti />
              <Mascot className="reward-card__mascot" decorative />
              <div className="reward-card__body">
                <span className="eyebrow">
                  <PartyPopper aria-hidden="true" /> Selamat!
                </span>
                <h2>Waktunya me time!</h2>
                <p>
                  Target <strong>{goal.name}</strong> sudah tercapai. Ambil sedikit hadiah untuk
                  dirimu sendiri.
                </p>
                <div className="row row--wrap" style={{ marginTop: 10 }}>
                  <Button
                    variant="primary"
                    icon={<Gift />}
                    onClick={() => setClaimGoal(goal)}
                  >
                    Pakai buat jajan
                  </Button>
                  <Button icon={<ReceiptText />} onClick={() => setHistoryId(goal.id ?? null)}>
                    Lihat setoran
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      {goalsQuery.loading ? (
        <Card>
          <LoadingState label="Memuat target tabungan..." />
        </Card>
      ) : goals.length === 0 ? (
        <EmptyState
          title="Belum ada target tabungan"
          message="Tentukan target dan sisihkan dana sedikit demi sedikit. Setelah tercapai, kamu bisa mengambil reward me time."
          actionLabel="Tambah target pertama"
          onAction={() => setGoalForm({ mode: 'create' })}
        />
      ) : (
        <>
          <div>
            <div className="wishlist-section-head">
              <h2>Sedang ditabung</h2>
              <span className="small muted">{active.length} target</span>
            </div>
            {active.length === 0 ? (
              <Card dashed>
                <InlineEmpty>
                  Belum ada target berjalan. Tambahkan target baru kapan saja.
                </InlineEmpty>
              </Card>
            ) : (
              <div className="savings-grid">
                {active.map((goal) => (
                  <SavingsCard
                    key={goal.id}
                    goal={goal}
                    onDeposit={() => setDepositGoal(goal)}
                    onClaim={() => setClaimGoal(goal)}
                    onHistory={() => setHistoryId(goal.id ?? null)}
                    onEdit={() => setGoalForm({ mode: 'edit', goal })}
                    onDelete={() => void handleDeleteGoal(goal)}
                  />
                ))}
              </div>
            )}
          </div>

          {completed.length > 0 ? (
            <div>
              <div className="wishlist-section-head">
                <h2>Selesai</h2>
                <span className="small muted">{completed.length} target</span>
              </div>
              <div className="savings-grid">
                {completed.map((goal) => (
                  <SavingsCard
                    key={goal.id}
                    goal={goal}
                    onDeposit={() => undefined}
                    onClaim={() => undefined}
                    onHistory={() => setHistoryId(goal.id ?? null)}
                    onEdit={() => undefined}
                    onDelete={() => void handleDeleteGoal(goal)}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </>
      )}

      <SavingsGoalForm
        open={goalForm !== null}
        onClose={() => setGoalForm(null)}
        goal={goalForm?.mode === 'edit' ? goalForm.goal : null}
      />

      {depositGoal ? (
        <SavingsDepositForm
          open
          onClose={() => setDepositGoal(null)}
          goal={depositGoal}
        />
      ) : null}

      {claimGoal ? (
        <RewardClaimForm
          open
          onClose={() => setClaimGoal(null)}
          goal={claimGoal}
          onClaimed={(claim) => {
            setCelebrating(claim);
            toast('Me time dipakai. Pengeluaran sudah dicatat.');
          }}
        />
      ) : null}

      <Modal
        open={historyGoal !== null}
        onClose={() => setHistoryId(null)}
        title={historyGoal ? `Setoran — ${historyGoal.name}` : 'Riwayat setoran'}
        subtitle={
          historyGoal
            ? `${formatRupiah(historyGoal.saved)} terkumpul dari ${formatRupiah(historyGoal.target_amount)}.`
            : undefined
        }
        footer={
          <Button onClick={() => setHistoryId(null)} block>
            Tutup
          </Button>
        }
      >
        {historyGoal ? (
          <div className="deposit-history">
            {historyGoal.deposits.length === 0 ? (
              <InlineEmpty>Belum ada setoran untuk target ini.</InlineEmpty>
            ) : (
              historyGoal.deposits.map((deposit) => (
                <div className="deposit-history__row" key={deposit.id}>
                  <div className="deposit-history__info">
                    <strong>{formatRupiah(deposit.amount)}</strong>
                    <span className="tiny muted">
                      <CalendarDays size={12} aria-hidden="true" /> {dateLabel(deposit.date)}
                      {deposit.note ? ` • ${deposit.note}` : ''}
                    </span>
                  </div>
                  {!historyGoal.completed ? (
                    <IconButton
                      label={`Hapus setoran ${dateLabel(deposit.date)}`}
                      size="sm"
                      variant="pink"
                      onClick={() => void handleDeleteDeposit(deposit.id!)}
                    >
                      <Trash2 />
                    </IconButton>
                  ) : (
                    <CheckCircle2 size={18} aria-hidden="true" />
                  )}
                </div>
              ))
            )}
            {!historyGoal.completed && !historyGoal.achieved ? (
              <Button
                variant="mint"
                icon={<Plus />}
                onClick={() => {
                  setDepositGoal(historyGoal);
                  setHistoryId(null);
                }}
              >
                Tambah setoran
              </Button>
            ) : null}
          </div>
        ) : null}
      </Modal>

      <Modal
        open={celebrating !== null}
        onClose={() => setCelebrating(null)}
        size="sm"
        footer={
          <Button variant="primary" block onClick={() => setCelebrating(null)}>
            Mantap
          </Button>
        }
      >
        <Confetti />
        <div className="celebrate">
          <Mascot className="celebrate__mascot" decorative />
          <h2>Selamat!</h2>
          <p>
            <strong>{formatRupiah(celebrating?.amount ?? 0)}</strong> untuk me time sudah dicatat
            sebagai pengeluaran kategori <strong>Me time</strong>. Target dipindah ke
            &ldquo;Selesai&rdquo;.
          </p>
          <p className="tiny muted">
            <Clock3 size={12} aria-hidden="true" /> Reward hanya bisa dipakai sekali per target.
          </p>
        </div>
      </Modal>
    </div>
  );
}
