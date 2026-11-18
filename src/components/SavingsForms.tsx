import { useState } from 'react';
import { AlertTriangle, PartyPopper, Plus, Wallet } from 'lucide-react';
import type { RewardClaim } from '../db/repositories';
import type { SavingsGoalView } from '../db/types';
import {
  addSavingsDeposit,
  claimSavingsReward,
  createSavingsGoal,
  updateSavingsGoal,
} from '../db/repositories';
import { toDateKey } from '../lib/dates';
import { formatMoneyInput, formatRupiah, parseMoneyInput } from '../lib/money';
import { useFeedback } from '../context/Feedback';
import { Button } from './ui/Button';
import { Field, MoneyInput, TextArea, TextInput } from './ui/Field';
import { Modal } from './ui/Modal';

/** Dialog form hanya di-mount saat open; state awal dibaca dari props. */
export function SavingsGoalForm({
  open,
  onClose,
  goal = null,
}: {
  open: boolean;
  onClose: () => void;
  goal?: SavingsGoalView | null;
}) {
  if (!open) return null;
  return <GoalDialog onClose={onClose} goal={goal} />;
}

function GoalDialog({ onClose, goal }: { onClose: () => void; goal: SavingsGoalView | null }) {
  const { toast } = useFeedback();
  const [name, setName] = useState(goal?.name ?? '');
  const [targetText, setTargetText] = useState(
    goal ? formatMoneyInput(String(goal.target_amount)) : '',
  );
  const [note, setNote] = useState(goal?.note ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const editing = goal !== null;

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Nama target tidak boleh kosong.');
      return;
    }
    const target = parseMoneyInput(targetText);
    if (target <= 0) {
      setError('Target tabungan harus lebih dari nol.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const payload = { name, target_amount: target, note: note.trim() ? note.trim() : null };
      if (goal?.id) {
        await updateSavingsGoal(undefined, goal.id, payload);
        toast('Target tabungan diperbarui.');
      } else {
        await createSavingsGoal(undefined, payload);
        toast('Target tabungan dibuat. Yuk mulai menabung!');
      }
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Gagal menyimpan target.');
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? 'Ubah target tabungan' : 'Tambah target tabungan'}
      subtitle="Dana tabungan dicatat terpisah dari saldo dan anggaran transaksi."
      footer={
        <>
          <Button onClick={onClose} disabled={busy}>
            Batal
          </Button>
          <Button variant="primary" onClick={() => void handleSave()} disabled={busy}>
            {busy ? 'Menyimpan...' : editing ? 'Simpan perubahan' : 'Simpan target'}
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Nama target" required htmlFor="savings-name">
          <TextInput
            id="savings-name"
            value={name}
            maxLength={120}
            placeholder="Contoh: Liburan ke pantai"
            autoFocus
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
        <Field label="Target dana" required htmlFor="savings-target">
          <MoneyInput
            id="savings-target"
            value={targetText}
            onValueChange={setTargetText}
            large
          />
        </Field>
        <Field label="Catatan" htmlFor="savings-note" hint="Opsional. Tulis alasan menabungmu.">
          <TextArea
            id="savings-note"
            value={note}
            maxLength={500}
            placeholder="Contoh: budget tiket dan penginapan"
            onChange={(event) => setNote(event.target.value)}
          />
        </Field>
        {error ? <div className="error-box">{error}</div> : null}
      </div>
    </Modal>
  );
}

export function SavingsDepositForm({
  open,
  onClose,
  goal,
}: {
  open: boolean;
  onClose: () => void;
  goal: SavingsGoalView;
}) {
  if (!open) return null;
  return <DepositDialog onClose={onClose} goal={goal} />;
}

function DepositDialog({ onClose, goal }: { onClose: () => void; goal: SavingsGoalView }) {
  const { toast } = useFeedback();
  const [amountText, setAmountText] = useState('');
  const [date, setDate] = useState(toDateKey());
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSave = async () => {
    const amount = parseMoneyInput(amountText);
    if (amount <= 0) {
      setError('Nominal setoran harus lebih dari nol.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await addSavingsDeposit(undefined, goal.id!, { amount, date, note: note.trim() || null });
      toast(amount + goal.saved >= goal.target_amount
        ? 'Target tercapai! Waktunya me time.'
        : 'Setoran dicatat.');
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Gagal menyimpan setoran.');
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Setoran — ${goal.name}`}
      subtitle={`Terkumpul ${formatRupiah(goal.saved)} dari ${formatRupiah(goal.target_amount)}.`}
      footer={
        <>
          <Button onClick={onClose} disabled={busy}>
            Batal
          </Button>
          <Button variant="mint" onClick={() => void handleSave()} disabled={busy}>
            {busy ? 'Menyimpan...' : 'Simpan setoran'}
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Nominal setoran" required htmlFor="deposit-amount">
          <MoneyInput
            id="deposit-amount"
            value={amountText}
            onValueChange={setAmountText}
            large
            autoFocus
          />
        </Field>
        <Field label="Tanggal setoran" required htmlFor="deposit-date">
          <TextInput
            id="deposit-date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </Field>
        <Field label="Catatan" htmlFor="deposit-note" hint="Opsional.">
          <TextInput
            id="deposit-note"
            value={note}
            maxLength={300}
            placeholder="Contoh: uang sisa minggu ini"
            onChange={(event) => setNote(event.target.value)}
          />
        </Field>
        {error ? <div className="error-box">{error}</div> : null}
      </div>
    </Modal>
  );
}

export function RewardClaimForm({
  open,
  onClose,
  goal,
  onClaimed,
}: {
  open: boolean;
  onClose: () => void;
  goal: SavingsGoalView;
  onClaimed: (claim: RewardClaim) => void;
}) {
  if (!open) return null;
  return <ClaimDialog onClose={onClose} goal={goal} onClaimed={onClaimed} />;
}

function ClaimDialog({
  onClose,
  goal,
  onClaimed,
}: {
  onClose: () => void;
  goal: SavingsGoalView;
  onClaimed: (claim: RewardClaim) => void;
}) {
  const suggested = Math.min(goal.saved, Math.max(50000, Math.round(goal.target_amount * 0.2)));
  const [amountText, setAmountText] = useState(formatMoneyInput(String(Math.max(1, suggested))));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleClaim = async () => {
    const amount = parseMoneyInput(amountText);
    if (amount <= 0) {
      setError('Nominal harus lebih dari nol.');
      return;
    }
    if (amount > goal.saved) {
      setError(`Maksimal ${formatRupiah(goal.saved)}.`);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const claim = await claimSavingsReward(undefined, goal.id!, amount);
      onClaimed(claim);
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Gagal mengklaim reward.');
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Pakai buat me time"
      subtitle={`Target "${goal.name}" sudah tercapai. Pilih nominal hadiahmu.`}
      footer={
        <>
          <Button onClick={onClose} disabled={busy}>
            Nanti aja
          </Button>
          <Button variant="primary" icon={<PartyPopper />} onClick={() => void handleClaim()} disabled={busy}>
            {busy ? 'Memproses...' : 'Pakai buat jajan'}
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <Field
          label="Nominal me time"
          required
          htmlFor="reward-amount"
          hint={`Maksimal total yang terkumpul: ${formatRupiah(goal.saved)}.`}
        >
          <MoneyInput
            id="reward-amount"
            value={amountText}
            onValueChange={setAmountText}
            large
            autoFocus
          />
        </Field>
        <div className="notice notice--warn">
          <AlertTriangle aria-hidden="true" />
          <span>
            Klaim dibuat sekali per target. Nominal ini akan dicatat sebagai pengeluaran nyata
            kategori <strong>Me time</strong>, termasuk dalam saldo dan anggaran bulan ini.
          </span>
        </div>
        {error ? <div className="error-box">{error}</div> : null}
      </div>
    </Modal>
  );
}

export function SavingsQuickAdd({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="primary" icon={<Plus />} onClick={onClick}>
      <Wallet aria-hidden="true" /> Tambah tabungan
    </Button>
  );
}
