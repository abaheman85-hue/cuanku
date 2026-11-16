const MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
] as const;

const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
] as const;

const DAYS = [
  'Minggu',
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
] as const;

const DATE_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_KEY = /^(\d{4})-(\d{2})$/;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function toDateKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function toMonthKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

export function currentMonthKey(): string {
  return toMonthKey(new Date());
}

export function parseDateKey(key: string): Date {
  const match = DATE_KEY.exec(key);
  if (!match) return new Date(Number.NaN);
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0, 0);
}

export function parseMonthKey(key: string): Date {
  const match = MONTH_KEY.exec(key);
  if (!match) return new Date(Number.NaN);
  return new Date(Number(match[1]), Number(match[2]) - 1, 1, 12, 0, 0, 0);
}

export function isValidDateKey(key: string): boolean {
  const date = parseDateKey(key);
  return !Number.isNaN(date.getTime()) && toDateKey(date) === key;
}

export function monthLabel(key: string): string {
  const date = parseMonthKey(key);
  if (Number.isNaN(date.getTime())) return key;
  return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export function monthShortLabel(key: string): string {
  const date = parseMonthKey(key);
  if (Number.isNaN(date.getTime())) return key;
  return MONTHS_SHORT[date.getMonth()];
}

export function monthYearLabel(date: Date): string {
  return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export function dateLabel(key: string): string {
  const date = parseDateKey(key);
  if (Number.isNaN(date.getTime())) return key;
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}`;
}

export function dateLabelLong(key: string): string {
  const date = parseDateKey(key);
  if (Number.isNaN(date.getTime())) return key;
  return `${DAYS[date.getDay()]}, ${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export function dayHeading(key: string): string {
  const today = toDateKey();
  if (key === today) return 'Hari ini';
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (key === toDateKey(yesterday)) return 'Kemarin';
  return dateLabelLong(key);
}

export function timeLabel(hour: number, minute: number): string {
  return `${pad(hour)}:${pad(minute)}`;
}

export function shiftMonth(key: string, delta: number): string {
  const date = parseMonthKey(key);
  if (Number.isNaN(date.getTime())) return currentMonthKey();
  date.setMonth(date.getMonth() + delta);
  return toMonthKey(date);
}

export function addMonths(date: Date, delta: number): Date {
  const result = new Date(date.getTime());
  const day = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + delta);
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(day, lastDay));
  return result;
}

export function isSameMonth(dateKey: string, monthKey: string): boolean {
  return dateKey.slice(0, 7) === monthKey;
}

export function isoNow(): string {
  return new Date().toISOString();
}

export function monthKeysEndingAt(key: string, count: number): string[] {
  const keys: string[] = [];
  for (let index = count - 1; index >= 0; index -= 1) {
    keys.push(shiftMonth(key, -index));
  }
  return keys;
}
