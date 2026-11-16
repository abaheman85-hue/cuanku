import { ChevronLeft, ChevronRight } from 'lucide-react';
import { currentMonthKey, monthLabel, shiftMonth } from '../lib/dates';

export function MonthSwitcher({
  month,
  onChange,
}: {
  month: string;
  onChange: (month: string) => void;
}) {
  const isCurrent = month === currentMonthKey();
  return (
    <div className="month-switcher">
      <button
        type="button"
        className="month-switcher__btn"
        aria-label="Bulan sebelumnya"
        onClick={() => onChange(shiftMonth(month, -1))}
      >
        <ChevronLeft />
      </button>
      <span className="month-switcher__label" aria-live="polite">
        {monthLabel(month)}
      </span>
      <button
        type="button"
        className="month-switcher__btn"
        aria-label="Bulan berikutnya"
        onClick={() => onChange(shiftMonth(month, 1))}
      >
        <ChevronRight />
      </button>
      {!isCurrent ? (
        <button
          type="button"
          className="month-switcher__btn month-switcher__reset"
          onClick={() => onChange(currentMonthKey())}
        >
          Bulan ini
        </button>
      ) : null}
    </div>
  );
}
