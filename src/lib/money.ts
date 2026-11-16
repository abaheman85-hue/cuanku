function groupThousands(digits: string): string {
  let result = '';
  for (let index = 0; index < digits.length; index += 1) {
    if (index > 0 && (digits.length - index) % 3 === 0) result += '.';
    result += digits[index];
  }
  return result;
}

function toInteger(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.trunc(value);
}

export function formatThousands(value: number): string {
  const integer = toInteger(value);
  const negative = integer < 0;
  const digits = String(Math.abs(integer));
  return `${negative ? '-' : ''}${groupThousands(digits)}`;
}

/** Format nominal rupiah tanpa desimal, contoh: `Rp 1.500.000`. */
export function formatRupiah(value: number): string {
  const integer = toInteger(value);
  const negative = integer < 0;
  return `${negative ? '-Rp' : 'Rp'} ${groupThousands(String(Math.abs(integer)))}`;
}

/** Mengambil digit dari input berformat apa pun. */
export function parseMoneyInput(value: string): number {
  const digits = value.replace(/\D+/g, '');
  if (!digits) return 0;
  const parsed = Number.parseInt(digits, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Memformat ulang isi input nominal dengan pemisah titik. */
export function formatMoneyInput(value: string): string {
  return formatThousands(parseMoneyInput(value));
}

export function formatCompactRupiah(value: number): string {
  const integer = toInteger(value);
  const absolute = Math.abs(integer);
  const sign = integer < 0 ? '-' : '';

  if (absolute < 10_000) return `Rp ${sign === '' ? '' : sign}${groupThousands(String(absolute))}`;

  const format = (scaled: number, unit: string) => {
    const rounded = Math.round(scaled * 10) / 10;
    const text = Number.isInteger(rounded)
      ? String(rounded)
      : String(rounded).replace('.', ',');
    return `Rp ${sign}${text} ${unit}`;
  };

  if (absolute < 1_000_000) return format(absolute / 1_000, 'rb');
  if (absolute < 1_000_000_000) return format(absolute / 1_000_000, 'jt');
  return format(absolute / 1_000_000_000, 'M');
}

export function parseRupiahInputOrZero(value: string): number {
  return parseMoneyInput(value);
}
