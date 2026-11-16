export function ProgressBar({
  percent,
  label,
  done = false,
}: {
  percent: number;
  label?: string;
  done?: boolean;
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
        className={`progress__fill ${done ? 'progress__fill--done' : ''}`.trim()}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}
