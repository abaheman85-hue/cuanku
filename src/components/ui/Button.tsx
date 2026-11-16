import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'paper' | 'primary' | 'mint' | 'lime' | 'pink' | 'yellow' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'sm' | 'md' | 'lg';
  block?: boolean;
  icon?: ReactNode;
}

function classNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}

export function Button({
  variant = 'paper',
  size = 'md',
  block = false,
  icon,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={classNames(
        'btn',
        variant !== 'paper' && `btn--${variant}`,
        size !== 'md' && `btn--${size}`,
        block && 'btn--block',
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  variant?: 'paper' | 'mint' | 'lime' | 'pink' | 'primary';
  size?: 'sm' | 'md';
}

export function IconButton({
  label,
  variant = 'paper',
  size = 'md',
  className,
  children,
  type = 'button',
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      className={classNames(
        'icon-btn',
        variant !== 'paper' && `icon-btn--${variant}`,
        size === 'sm' && 'icon-btn--sm',
        className,
      )}
      aria-label={label}
      title={label}
      {...rest}
    >
      {children}
    </button>
  );
}
