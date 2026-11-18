import type { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Mascot } from './Mascot';

export function EmptyState({
  title,
  message,
  actionLabel,
  onAction,
}: {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <Card dashed className="empty">
      <Mascot className="empty__mascot" decorative />
      <h3>{title}</h3>
      <p>{message}</p>
      {actionLabel && onAction ? (
        <Button variant="primary" onClick={onAction} icon={<span aria-hidden="true">+</span>}>
          {actionLabel}
        </Button>
      ) : null}
    </Card>
  );
}

export function LoadingState({ label = 'Memuat data...' }: { label?: string }) {
  return (
    <div className="loading-block" role="status">
      <span className="spinner" aria-hidden="true" />
      {label}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="error-box" role="alert">
      <AlertTriangle aria-hidden="true" />
      <div>
        <strong>{message}</strong>
        {onRetry ? (
          <div className="settings-actions">
            <Button size="sm" onClick={onRetry}>
              Coba lagi
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function InlineEmpty({ children }: { children: ReactNode }) {
  return <p className="muted small center">{children}</p>;
}
