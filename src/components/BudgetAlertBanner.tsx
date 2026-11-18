import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import type { BudgetAlertNotice, BudgetOverview } from '../db/types';
import { checkBudgetAlerts, ensureBudgetMonth, getBudgetOverview } from '../db/repositories';
import { currentMonthKey } from '../lib/dates';
import { formatRupiah } from '../lib/money';
import { showAppNotification } from '../lib/notifications';
import { useLiveQuery } from '../hooks/useLiveQuery';

const EMPTY: BudgetOverview = {
  month: '',
  rows: [],
  unassigned: [],
  totalLimit: 0,
  totalSpent: 0,
  percent: 0,
};

function noticeTitle(notice: BudgetAlertNotice): string {
  return notice.level === 100
    ? 'CuanKu — Anggaran terlampaui'
    : 'CuanKu — Anggaran hampir penuh';
}

function noticeBody(notice: BudgetAlertNotice): string {
  const keterangan =
    notice.level === 100 ? 'sudah melewati batas' : 'sudah mencapai 80%';
  return `Anggaran ${notice.category_name} ${keterangan}: ${formatRupiah(notice.spent)} dari ${formatRupiah(notice.amount)}.`;
}

/** Banner + notifikasi best-effort, sekali per level per kategori per bulan. */
export function BudgetAlertBanner() {
  const month = currentMonthKey();
  const [notices, setNotices] = useState<BudgetAlertNotice[]>([]);
  const lastSignature = useRef<string | null>(null);
  const overviewQuery = useLiveQuery(() => getBudgetOverview(undefined, month), [month], EMPTY);

  useEffect(() => {
    void ensureBudgetMonth(undefined, month).catch(() => undefined);
  }, [month]);

  const signature = overviewQuery.data.rows
    .map((row) => `${row.budget_id}:${row.level}`)
    .join('|');

  useEffect(() => {
    if (lastSignature.current === signature) return;
    lastSignature.current = signature;
    let active = true;
    void checkBudgetAlerts(undefined, month)
      .then((items) => {
        if (!active || items.length === 0) return;
        setNotices(items);
        void Promise.all(
          items.map((notice) =>
            showAppNotification(
              noticeTitle(notice),
              noticeBody(notice),
              `cuanku-anggaran-${month}-${notice.category_id}-${notice.level}`,
            ),
          ),
        );
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [month, signature]);

  if (notices.length === 0) return null;

  return (
    <aside className="budget-alert" aria-label="Peringatan anggaran">
      <AlertTriangle aria-hidden="true" />
      <div className="budget-alert__body">
        <strong>
          {notices.some((notice) => notice.level === 100)
            ? 'Ada anggaran yang terlampaui'
            : 'Ada anggaran yang hampir penuh'}
        </strong>
        {notices.map((notice) => (
          <span key={`${notice.category_id}-${notice.level}`}>{noticeBody(notice)}</span>
        ))}
      </div>
      <div className="budget-alert__actions">
        <Link className="btn btn--sm btn--primary" to="/anggaran">
          Lihat
        </Link>
        <button type="button" className="btn btn--sm" onClick={() => setNotices([])}>
          Nanti
        </button>
      </div>
    </aside>
  );
}
