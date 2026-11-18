export function ProgressBar({
  percent,
  label,
  done = false,
  tone = 'default',
}: {
  percent: number;
  label?: string;
  done?: boolean;
  tone?: 'default' | 'warn' | 'danger';
}) {
  const value = Math.min(100, Math.max(0, percent));
  return (
    <div
      className="progress__track"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value)}
      aria-label={label ?? 'Kemajuan tabungan'}
    >
      <div
        className={[
          'progress__fill',
          done ? 'progress__fill--done' : '',
          tone === 'warn' ? 'progress__fill--warn' : '',
          tone === 'danger' ? 'progress__fill--danger' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}
