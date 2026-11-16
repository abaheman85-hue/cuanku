import { buildBackupFile, parseBackup } from './backup-format';
import { isoNow, toDateKey } from './dates';
import {
  importBackupData,
  readBackupData,
  saveSettings,
  type BackupData,
} from '../db/repositories';
import type { ParsedBackup } from '../db/types';

export function backupFileName(date: Date = new Date()): string {
  return `cuanku-backup-${toDateKey(date)}.json`;
}

export async function createBackupText(data?: BackupData): Promise<string> {
  const source = data ?? (await readBackupData());
  const payload = buildBackupFile({
    ...source,
    exportedAt: isoNow(),
  });
  return JSON.stringify(payload, null, 2);
}

export function downloadTextFile(filename: string, text: string): void {
  const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export async function exportBackup(): Promise<void> {
  const text = await createBackupText();
  downloadTextFile(backupFileName(), text);
  await saveSettings(undefined, { last_backup_at: isoNow() });
}

export function readTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('Gagal membaca file backup.'));
    reader.readAsText(file);
  });
}

export async function parseBackupFile(file: File): Promise<ParsedBackup> {
  if (file.size > 120 * 1024 * 1024) {
    throw new Error('Ukuran file backup terlalu besar (maksimal 120 MB).');
  }
  return parseBackup(await readTextFile(file));
}

export async function applyBackup(parsed: ParsedBackup): Promise<void> {
  await importBackupData(undefined, parsed);
}
