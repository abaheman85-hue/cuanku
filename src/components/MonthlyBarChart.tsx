import { monthShortLabel } from '../lib/dates';
import { formatCompactRupiah } from '../lib/money';
import type { MonthlyPoint } from '../db/types';

export function MonthlyBarChart({
  data,
  currentMonth,
}: {
  data: MonthlyPoint[];
  currentMonth: string;
}) {
  const max = Math.max(
    1,
    ...data.flatMap((point) => [point.income, point.expense]),
  );

  return (
    <div>
      <div className="chart" role="img" aria-label="Grafik pemasukan dan pengeluaran enam bulan">
        {data.map((point) => {
          const incomeHeight = point.income === 0 ? 2 : Math.max(3, (point.income / max) * 100);
          const expenseHeight = point.expense === 0 ? 2 : Math.max(3, (point.expense / max) * 100);
          return (
            <div className="chart__col" key={point.month}>
              <div className="chart__bars">
                <div
                  className="chart__bar chart__bar--income"
                  style={{ height: `${incomeHeight}%` }}
                  title={`Pemasukan ${formatCompactRupiah(point.income)}`}
                />
                <div
                  className="chart__bar chart__bar--expense"
                  style={{ height: `${expenseHeight}%` }}
                  title={`Pengeluaran ${formatCompactRupiah(point.expense)}`}
                />
              </div>
              <span
                className={`chart__month ${point.month === currentMonth ? 'current' : ''}`.trim()}
              >
                {monthShortLabel(point.month)}
              </span>
            </div>
          );
        })}
      </div>
      <div className="legend" style={{ marginTop: 12 }}>
        <span className="legend__item">
          <span className="legend__dot" style={{ background: 'var(--mint-deep)' }} />
          Pemasukan
        </span>
        <span className="legend__item">
          <span className="legend__dot" style={{ background: 'var(--peach)' }} />
          Pengeluaran
        </span>
      </div>
    </div>
  );
}
