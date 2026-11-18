import { useState } from 'react';
import type { BudgetRow } from '../db/types';
import { listCategories, saveBudget } from '../db/repositories';
import { formatMoneyInput, parseMoneyInput } from '../lib/money';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { useFeedback } from '../context/Feedback';
import { Button } from './ui/Button';
import { Field, MoneyInput, Select } from './ui/Field';
import { Modal } from './ui/Modal';

/** Dialog hanya di-mount saat open; state awal diambil dari props sekali. */
export function BudgetForm({
  open,
  onClose,
  month,
  row = null,
  categoryId = null,
}: {
  open: boolean;
  onClose: () => void;
  month: string;
  row?: BudgetRow | null;
  categoryId?: number | null;
}) {
  if (!open) return null;
  return (
    <BudgetDialog
      onClose={onClose}
      month={month}
      row={row}
      categoryId={categoryId}
    />
  );
}

function BudgetDialog({
  onClose,
  month,
  row,
  categoryId,
}: {
  onClose: () => void;
  month: string;
  row: BudgetRow | null;
  categoryId: number | null;
}) {
  const { toast } = useFeedback();
  const categoriesQuery = useLiveQuery(() => listCategories(undefined, 'expense'), [], []);
  const [selected, setSelected] = useState(String(row?.category_id ?? categoryId ?? ''));
  const [amountText, setAmountText] = useState(
    row ? formatMoneyInput(String(row.amount)) : '',
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const editing = row !== null;

  const options = categoriesQuery.data.filter(
    (category) => editing || !categoryId || category.id === categoryId,
  );

  const handleSave = async () => {
    const category = Number(selected);
    const amount = parseMoneyInput(amountText);
    if (!Number.isInteger(category) || category <= 0) {
      setError('Pilih kategori pengeluaran.');
      return;
    }
    if (amount <= 0) {
      setError('Batas anggaran harus lebih dari nol.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await saveBudget(undefined, { month, category_id: category, amount });
      toast(editing ? 'Anggaran diperbarui.' : 'Anggaran ditambahkan.');
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Gagal menyimpan anggaran.');
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? 'Ubah anggaran' : 'Tambah anggaran'}
      subtitle={`Batas pengeluaran untuk bulan ini. Berlaku di seluruh transaksi bulan ${month}.`}
      footer={
        <>
          <Button onClick={onClose} disabled={busy}>
            Batal
          </Button>
          <Button variant="primary" onClick={() => void handleSave()} disabled={busy}>
            {busy ? 'Menyimpan...' : editing ? 'Simpan perubahan' : 'Simpan anggaran'}
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Kategori pengeluaran" required htmlFor="budget-category">
          <Select
            id="budget-category"
            value={selected}
            disabled={editing || categoryId !== null}
            onChange={(event) => setSelected(event.target.value)}
          >
            <option value="">Pilih kategori...</option>
            {options.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Batas per bulan" required htmlFor="budget-amount">
          <MoneyInput
            id="budget-amount"
            value={amountText}
            onValueChange={setAmountText}
            large
            autoFocus
          />
        </Field>

        {error ? <div className="error-box">{error}</div> : null}
      </div>
    </Modal>
  );
}
