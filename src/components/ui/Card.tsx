import type { HTMLAttributes, ReactNode } from 'react';

type Tone = 'paper' | 'mint' | 'lime' | 'pink' | 'yellow' | 'blue' | 'peach';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  tone?: Tone;
  flat?: boolean;
  dashed?: boolean;
  children?: ReactNode;
}

export function Card({
  tone = 'paper',
  flat = false,
  dashed = false,
  className,
  children,
  ...rest
}: CardProps) {
  const classes = [
    'card',
    tone !== 'paper' && `card--${tone}`,
    flat && 'card--flat',
    dashed && 'card--dashed',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
}

export function Chip({
  tone = 'paper',
  icon,
  children,
  className,
}: {
  tone?: 'paper' | 'mint' | 'lime' | 'pink' | 'yellow' | 'blue' | 'peach' | 'ink';
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={`chip ${tone !== 'paper' ? `chip--${tone}` : ''} ${className ?? ''}`.trim()}>
      {icon}
      {children}
    </span>
  );
}

export function Badge({
  tone = 'paper',
  children,
  className,
}: {
  tone?: 'paper' | 'mint' | 'lime' | 'pink' | 'yellow';
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={`badge ${tone !== 'paper' ? `badge--${tone}` : ''} ${className ?? ''}`.trim()}>
      {children}
    </span>
  );
}
