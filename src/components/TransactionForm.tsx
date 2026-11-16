import { useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { TransactionType, TransactionView } from '../db/types';
import {
  createTransaction,
  deleteTransaction,
  listCategories,
  updateTransaction,
} from '../db/repositories';
import { isValidDateKey, toDateKey } from '../lib/dates';
import { formatMoneyInput, parseMoneyInput } from '../lib/money';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { useFeedback } from '../context/Feedback';
import { Button } from './ui/Button';
import { Field, MoneyInput, SegmentedControl, TextArea, TextInput } from './ui/Field';
import { Modal } from './ui/Modal';

const QUICK_AMOUNTS = [10000, 25000, 50000, 100000];

interface TransactionFormProps {
  open: boolean;
  onClose: () => void;
  transaction?: TransactionView | null;
  defaultType?: TransactionType;
  defaultDate?: string;
}

type TransactionDialogProps = Omit<TransactionFormProps, 'open'>;

export function TransactionForm({ open, ...props }: TransactionFormProps) {
  if (!open) return null;
  return <TransactionDialog {...props} />;
}

function TransactionDialog({
  onClose,
  transaction = null,
  defaultType = 'expense',
  defaultDate,
}: TransactionDialogProps) {
  const { confirm, toast } = useFeedback();
  const [type, setType] = useState<TransactionType>(transaction?.type ?? defaultType);
  const [amountText, setAmountText] = useState(
    transaction ? formatMoneyInput(String(transaction.amount)) : '',
  );
  const [categoryId, setCategoryId] = useState<string>(
    transaction?.category_id == null ? 'none' : String(transaction.category_id),
  );
  const [date, setDate] = useState(transaction?.date ?? defaultDate ?? toDateKey());
  const [note, setNote] = useState(transaction?.note ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const categoriesQuery = useLiveQuery(
    () => listCategories(undefined, type),
    [type],
    [],
  );
  const categories = categoriesQuery.data;
  const editing = transaction !== null;

  const amount = useMemo(() => parseMoneyInput(amountText), [amountText]);

  const handleTypeChange = (next: TransactionType) => {
    setType(next);
    setCategoryId('none');
  };

  const handleSave = async () => {
    if (amount <= 0) {
      setError('Nominal harus lebih dari nol.');
      return;
    }
    if (!isValidDateKey(date)) {
      setError('Tanggal tidak valid.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const payload = {
        type,
        amount,
        category_id: categoryId === 'none' ? null : Number(categoryId),
        date,
        note: note.trim() ? note.trim() : null,
      };
      if (transaction?.id) {
        await updateTransaction(undefined, transaction.id, payload);
        toast('Transaksi diperbarui.');
      } else {
        await createTransaction(undefined, payload);
        toast('Transaksi tersimpan.');
      }
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Gagal menyimpan transaksi.');
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!transaction?.id) return;
    const ok = await confirm({
      title: 'Hapus transaksi ini?',
      message: 'Transaksi akan dihapus permanen dari catatanmu.',
      confirmLabel: 'Hapus',
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      await deleteTransaction(undefined, transaction.id);
      toast('Transaksi dihapus.');
      onClose();
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : 'Gagal menghapus transaksi.', 'error');
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? 'Ubah transaksi' : 'Catat transaksi'}
      subtitle={editing ? 'Perbarui detail catatanmu.' : 'Pemasukan atau pengeluaran, satu tempat.'}
      footer={
        <>
          <Button onClick={onClose} disabled={busy}>
            Batal
          </Button>
          <Button variant="primary" onClick={() => void handleSave()} disabled={busy}>
            {busy ? 'Menyimpan...' : editing ? 'Simpan perubahan' : 'Simpan transaksi'}
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Jenis transaksi">
          <SegmentedControl
            label="Jenis transaksi"
            value={type}
            onChange={handleTypeChange}
            options={[
              { value: 'expense', label: 'Pengeluaran', tone: 'expense' },
              { value: 'income', label: 'Pemasukan', tone: 'income' },
            ]}
          />
        </Field>

        <Field label="Nominal" required htmlFor="transaction-amount" hint="Pakai angka tanpa desimal.">
          <MoneyInput
            id="transaction-amount"
            value={amountText}
            onValueChange={setAmountText}
            large
            autoFocus={!editing}
          />
          <div className="quick-amounts">
            {QUICK_AMOUNTS.map((value) => (
              <button
                key={value}
                type="button"
                className="chip"
                onClick={() => setAmountText(formatMoneyInput(String(value)))}
              >
                {value >= 1000 ? `${value / 1000}rb` : value}
              </button>
            ))}
            {amountText ? (
              <button
                type="button"
                className="chip"
                onClick={() => setAmountText('')}
              >
                Hapus
              </button>
            ) : null}
          </div>
        </Field>

        <Field label="Kategori" hint="Kategori mengikuti jenis transaksi.">
          <div className="choice-chips">
            <button
              type="button"
              className={`choice-chip ${categoryId === 'none' ? 'active' : ''}`.trim()}
              onClick={() => setCategoryId('none')}
            >
              Tanpa kategori
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                className={`choice-chip ${categoryId === String(category.id) ? 'active' : ''}`.trim()}
                onClick={() => setCategoryId(String(category.id))}
              >
                <span
                  className="choice-chip__dot"
                  style={{ background: category.color }}
                  aria-hidden="true"
                />
                {category.name}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Tanggal" required htmlFor="transaction-date">
          <TextInput
            id="transaction-date"
            type="date"
            value={date}
            max="2100-12-31"
            onChange={(event) => setDate(event.target.value)}
          />
        </Field>

        <Field label="Catatan" htmlFor="transaction-note" hint="Opsional, misalnya 'Makan siang bareng tim'.">
          <TextArea
            id="transaction-note"
            value={note}
            maxLength={300}
            placeholder="Tulis catatan singkat..."
            onChange={(event) => setNote(event.target.value)}
          />
        </Field>

        {error ? <div className="error-box">{error}</div> : null}

        {editing ? (
          <Button
            variant="ghost"
            size="sm"
            icon={<Trash2 />}
            onClick={() => void handleDelete()}
            disabled={busy}
          >
            Hapus transaksi ini
          </Button>
        ) : null}
      </div>
    </Modal>
  );
}
