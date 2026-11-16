import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import { formatMoneyInput } from '../../lib/money';

export function Field({
  label,
  hint,
  error,
  required = false,
  htmlFor,
  children,
}: {
  label?: string;
  hint?: string;
  error?: string | null;
  required?: boolean;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="field">
      {label ? (
        <label className="field__label" htmlFor={htmlFor}>
          {label}
          {required ? (
            <span className="field__required" aria-hidden="true">
              *
            </span>
          ) : null}
        </label>
      ) : null}
      {children}
      {error ? (
        <span className="field__error" role="alert">
          {error}
        </span>
      ) : hint ? (
        <span className="field__hint">{hint}</span>
      ) : null}
    </div>
  );
}

export function TextInput({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`input ${className ?? ''}`.trim()} {...rest} />;
}

export function TextArea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`textarea ${className ?? ''}`.trim()} {...rest} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`select ${className ?? ''}`.trim()} {...rest}>
      {children}
    </select>
  );
}

export function MoneyInput({
  id,
  value,
  onValueChange,
  placeholder = '0',
  large = false,
  disabled = false,
  autoFocus = false,
}: {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  large?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  return (
    <div className={`input-money ${large ? 'input-money--lg' : ''}`.trim()}>
      <span className="input-money__prefix" aria-hidden="true">
        Rp
      </span>
      <input
        id={id}
        className="input"
        inputMode="numeric"
        autoComplete="off"
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        onChange={(event) => onValueChange(formatMoneyInput(event.target.value))}
      />
    </div>
  );
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (value: T) => void;
  options: ReadonlyArray<{ value: T; label: string; tone?: 'income' | 'expense' }>;
  label: string;
}) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            className={[
              'segmented__item',
              active ? 'active' : '',
              active && option.tone ? option.tone : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  id,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  id?: string;
}) {
  return (
    <label className="switch">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="switch__track" aria-hidden="true">
        <span className="switch__thumb" />
      </span>
      <span className="sr-only">{label}</span>
    </label>
  );
}
