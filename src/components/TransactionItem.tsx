import { Pencil, Trash2 } from 'lucide-react';
import type { TransactionView } from '../db/types';
import { dateLabel } from '../lib/dates';
import { formatRupiah } from '../lib/money';
import { IconButton } from './ui/Button';

export function TransactionItem({
  transaction,
  onEdit,
  onDelete,
  showDate = true,
}: {
  transaction: TransactionView;
  onEdit?: () => void;
  onDelete?: () => void;
  showDate?: boolean;
}) {
  const isIncome = transaction.type === 'income';
  const category = transaction.category_name ?? 'Tanpa kategori';
  const color = transaction.category_color ?? '#D9C7FF';
  const title =
    transaction.note ??
    transaction.category_name ??
    (isIncome ? 'Pemasukan' : 'Pengeluaran');
  const initial = (transaction.category_name ?? (isIncome ? 'P' : 'K')).charAt(0).toUpperCase();

  return (
    <article className="tx-row">
      <span
        className="tx-row__icon"
        style={{ background: color }}
        aria-hidden="true"
      >
        {initial}
      </span>
      <div className="tx-row__body">
        <div className="tx-row__title">{title}</div>
        <div className="tx-row__meta">
          {category}
          {showDate ? ` • ${dateLabel(transaction.date)}` : null}
        </div>
      </div>
      <div
        className={`tx-row__amount ${isIncome ? 'tx-row__amount--income' : 'tx-row__amount--expense'}`}
      >
        {isIncome ? '+' : '-'}
        {formatRupiah(transaction.amount)}
      </div>
      {onEdit || onDelete ? (
        <div className="tx-row__actions">
          {onEdit ? (
            <IconButton
              label="Ubah transaksi"
              size="sm"
              className="tx-row__edit"
              onClick={onEdit}
            >
              <Pencil />
            </IconButton>
          ) : null}
          {onDelete ? (
            <IconButton label="Hapus transaksi" size="sm" variant="pink" onClick={onDelete}>
              <Trash2 />
            </IconButton>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
