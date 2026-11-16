import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Database,
  Download,
  Info,
  Lock,
  RotateCcw,
  Sparkles,
  Upload,
} from 'lucide-react';
import { DEFAULT_SETTINGS } from '../db/types';
import {
  countAllTransactions,
  getSettings,
  listCategories,
  listWishlist,
  saveSettings,
} from '../db/repositories';
import { resetDatabase } from '../db/db';
import { applyBackup, exportBackup, parseBackupFile } from '../lib/backup';
import { dateLabel, timeLabel } from '../lib/dates';
import { formatRupiah } from '../lib/money';
import {
  REMINDER_BODY,
  getNotificationPermission,
  reminderTimeLabel,
  requestNotificationPermission,
  showReminderNotification,
  type ReminderPermission,
} from '../lib/notifications';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { useFeedback } from '../context/Feedback';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Switch } from '../components/ui/Field';
import { CategoryManager } from '../components/CategoryManager';
import { Mascot } from '../components/Mascot';

const APP_VERSION = '2.0.0';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function permissionLabel(permission: ReminderPermission): string {
  if (permission === 'granted') return 'Izin notifikasi aktif.';
  if (permission === 'denied') return 'Izin notifikasi diblokir di browser ini.';
  if (permission === 'unsupported') return 'Browser ini tidak mendukung notifikasi.';
  return 'Izin notifikasi belum diberikan.';
}

function backupDateLabel(value: string): string {
  if (!value) return 'Belum pernah backup dari perangkat ini.';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Belum pernah backup dari perangkat ini.';
  return `${dateLabel(value.slice(0, 10))} pukul ${String(date.getHours()).padStart(2, '0')}:${String(
    date.getMinutes(),
  ).padStart(2, '0')}`;
}

export function PengaturanPage() {
  const { confirm, toast } = useFeedback();
  const fileRef = useRef<HTMLInputElement>(null);
  const [permission, setPermission] = useState<ReminderPermission>(() => getNotificationPermission());
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [standalone, setStandalone] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia?.('(display-mode: standalone)').matches ?? false;
  });

  const settingsQuery = useLiveQuery(() => getSettings(), [], DEFAULT_SETTINGS);
  const transactionCountQuery = useLiveQuery(() => countAllTransactions(), [], 0);
  const categoryQuery = useLiveQuery(() => listCategories(), [], []);
  const wishlistQuery = useLiveQuery(() => listWishlist(), [], []);

  const settings = settingsQuery.data;
  const transactionCount = transactionCountQuery.data;
  const categoryCount = categoryQuery.data.length;
  const wishlistCount = wishlistQuery.data.length;
  const wishlistActive = wishlistQuery.data.filter((item) => item.purchased === 0).length;
  const wishlistSaved = wishlistQuery.data
    .filter((item) => item.purchased === 0)
    .reduce((total, item) => total + item.saved_amount, 0);

  useEffect(() => {
    const refresh = () => setPermission(getNotificationPermission());
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const installed = () => {
      setStandalone(true);
      setInstallPrompt(null);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', installed);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installed);
    };
  }, []);

  const updateReminder = async (patch: Parameters<typeof saveSettings>[1]) => {
    try {
      await saveSettings(undefined, patch);
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : 'Gagal menyimpan pengaturan.', 'error');
    }
  };

  const handleToggleReminder = async (enabled: boolean) => {
    if (enabled) {
      const next = await requestNotificationPermission();
      setPermission(next);
      if (next === 'denied') {
        toast('Notifikasi diblokir. Pengingat di dalam aplikasi tetap aktif.', 'error');
      }
    }
    await updateReminder({ reminder_enabled: enabled });
  };

  const handleTimeChange = (value: string) => {
    const [hour, minute] = value.split(':');
    void updateReminder({
      reminder_hour: Number(hour),
      reminder_minute: Number(minute),
    });
  };

  const handleRequestPermission = async () => {
    const next = await requestNotificationPermission();
    setPermission(next);
    if (next === 'granted') toast('Izin notifikasi diberikan.');
    else if (next === 'denied') toast('Izin notifikasi ditolak atau diblokir browser.', 'error');
    else if (next === 'unsupported') toast('Browser ini tidak mendukung notifikasi.', 'error');
  };

  const handleTestNotification = async () => {
    const next = await requestNotificationPermission();
    setPermission(next);
    if (next !== 'granted') {
      toast('Izin notifikasi belum aktif. Aktifkan dulu di browser.', 'error');
      return;
    }
    const sent = await showReminderNotification(REMINDER_BODY);
    if (sent) toast('Contoh notifikasi dikirim.');
    else toast('Notifikasi gagal dikirim di browser ini.', 'error');
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportBackup();
      toast('Backup diunduh. Simpan file JSON di tempat aman.');
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : 'Gagal membuat backup.', 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setImporting(true);
    try {
      const parsed = await parseBackupFile(file);
      const ok = await confirm({
        title: 'Impor backup ini?',
        message: `File berisi ${parsed.transactions.length} transaksi, ${parsed.categories.length} kategori, dan ${parsed.wishlist.length} wishlist. Semua data yang ada di perangkat ini akan diganti.`,
        confirmLabel: 'Impor dan ganti data',
        danger: true,
      });
      if (!ok) return;
      await applyBackup(parsed);
      toast('Backup berhasil diimpor.');
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : 'Gagal mengimpor backup.', 'error');
    } finally {
      setImporting(false);
    }
  };

  const handleReset = async () => {
    const ok = await confirm({
      title: 'Hapus semua data?',
      message:
        'Semua transaksi, wishlist, kategori, dan pengaturan akan dihapus dari perangkat ini. Tindakan ini tidak bisa dibatalkan. Buat backup dulu bila perlu.',
      confirmLabel: 'Hapus semua data',
      danger: true,
    });
    if (!ok) return;
    setResetBusy(true);
    try {
      await resetDatabase();
      toast('Semua data dihapus dan kategori awal dipulihkan.');
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : 'Gagal menghapus data.', 'error');
    } finally {
      setResetBusy(false);
    }
  };

  const handleInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'accepted') setStandalone(true);
    setInstallPrompt(null);
  };

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <span className="eyebrow">
            <Sparkles aria-hidden="true" /> Pengaturan
          </span>
          <h1 className="page-title">Atur CuanKu, sesuai caramu</h1>
          <p className="page-subtitle">
            Pengingat, kategori, backup, dan data lokal. Semua tersimpan di perangkat ini.
          </p>
        </div>
      </header>

      {settingsQuery.error ? (
        <div className="error-box" role="alert">
          <AlertTriangle aria-hidden="true" />
          <span>{settingsQuery.error}</span>
        </div>
      ) : null}

      <div className="settings-grid">
        <Card>
          <div className="settings-card__head">
            <span className="settings-card__icon" style={{ background: 'var(--yellow)' }}>
              <Bell aria-hidden="true" />
            </span>
            <div className="settings-card__titles">
              <h2>Pengingat harian</h2>
              <p>Ingatkan untuk mencatat di jam yang kamu pilih.</p>
            </div>
            <Switch
              checked={settings.reminder_enabled}
              onChange={(enabled) => void handleToggleReminder(enabled)}
              label="Aktifkan pengingat harian"
            />
          </div>

          <div className="settings-row">
            <div className="settings-row__text">
              <strong>Jam pengingat</strong>
              <span>Berlaku setiap hari, memakai waktu perangkat.</span>
            </div>
            <input
              type="time"
              className="input time-input"
              value={timeLabel(settings.reminder_hour, settings.reminder_minute)}
              aria-label="Jam pengingat harian"
              onChange={(event) => handleTimeChange(event.target.value)}
            />
          </div>

          <div className="settings-row">
            <div className="settings-row__text">
              <strong>Izin notifikasi</strong>
              <span>{permissionLabel(permission)}</span>
            </div>
            <CheckCircle2
              size={22}
              aria-hidden="true"
              style={{ color: permission === 'granted' ? 'var(--positive)' : 'var(--muted)' }}
            />
          </div>

          <div className="settings-actions">
            <Button
              size="sm"
              icon={<Bell />}
              onClick={() => void handleRequestPermission()}
              disabled={permission === 'unsupported'}
            >
              Minta izin
            </Button>
            <Button size="sm" icon={<Bell />} onClick={() => void handleTestNotification()}>
              Coba notifikasi
            </Button>
          </div>

          <div className="notice notice--warn" style={{ marginTop: 12 }}>
            <Info aria-hidden="true" />
            <span>
              Notifikasi hanya bisa dikirim saat CuanKu atau PWA-nya sedang terbuka. Banner
              pengingat di dalam aplikasi tetap muncul setelah jam pengingat lewat jika hari ini
              belum ada transaksi.
            </span>
          </div>
        </Card>

        <Card>
          <div className="settings-card__head">
            <span className="settings-card__icon" style={{ background: 'var(--mint)' }}>
              <Database aria-hidden="true" />
            </span>
            <div className="settings-card__titles">
              <h2>Backup dan data</h2>
              <p>Satu file JSON berisi semua catatan dan foto wishlist.</p>
            </div>
          </div>

          <div className="data-stats">
            <div className="data-stat">
              <strong>{transactionCount}</strong>
              <span>Transaksi</span>
            </div>
            <div className="data-stat">
              <strong>{wishlistCount}</strong>
              <span>Wishlist</span>
            </div>
            <div className="data-stat">
              <strong>{categoryCount}</strong>
              <span>Kategori</span>
            </div>
          </div>

          <p className="small muted">
            Terakhir backup: {backupDateLabel(settings.last_backup_at)}
          </p>

          <div className="settings-actions">
            <Button
              variant="primary"
              size="sm"
              icon={<Download />}
              onClick={() => void handleExport()}
              disabled={exporting}
            >
              {exporting ? 'Menyiapkan...' : 'Unduh backup'}
            </Button>
            <Button
              size="sm"
              icon={<Upload />}
              onClick={() => fileRef.current?.click()}
              disabled={importing}
            >
              {importing ? 'Mengimpor...' : 'Impor backup'}
            </Button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="file-input"
            aria-label="Pilih file backup CuanKu"
            onChange={(event) => void handleImportFile(event)}
          />

          <div className="notice" style={{ marginTop: 12 }}>
            <Info aria-hidden="true" />
            <span>
              Kompatibel dengan backup CuanKu v1 (aplikasi lama) dan v2. Impor akan mengganti
              seluruh data yang ada sekarang.
            </span>
          </div>
        </Card>

        <Card className="settings-grid__wide">
          <div className="settings-card__head">
            <span className="settings-card__icon" style={{ background: 'var(--lavender-deep)' }}>
              <Sparkles aria-hidden="true" />
            </span>
            <div className="settings-card__titles">
              <h2>Kategori</h2>
              <p>Tambah, ubah nama atau warna, dan hapus kategori sesuai kebutuhanmu.</p>
            </div>
          </div>
          <CategoryManager />
        </Card>

        <Card>
          <div className="settings-card__head">
            <span className="settings-card__icon" style={{ background: 'var(--pink)' }}>
              <RotateCcw aria-hidden="true" />
            </span>
            <div className="settings-card__titles">
              <h2>Hapus semua data</h2>
              <p>Mulai dari awal dengan kategori bawaan.</p>
            </div>
          </div>
          <p className="small muted">
            {transactionCount} transaksi dan {wishlistCount} wishlist ({wishlistActive} aktif,{' '}
            {formatRupiah(wishlistSaved)} dana tercatat) akan dihapus permanen.
          </p>
          <div className="settings-actions">
            <Button
              variant="danger"
              size="sm"
              icon={<AlertTriangle />}
              onClick={() => void handleReset()}
              disabled={resetBusy}
            >
              {resetBusy ? 'Menghapus...' : 'Hapus semua data'}
            </Button>
          </div>
        </Card>

        <Card tone="lime">
          <div className="settings-card__head">
            <span className="settings-card__icon" style={{ background: 'var(--paper)' }}>
              <Lock aria-hidden="true" />
            </span>
            <div className="settings-card__titles">
              <h2>Tentang CuanKu</h2>
              <p>Versi {APP_VERSION} • web offline tanpa akun.</p>
            </div>
          </div>
          <div className="about">
            <Mascot mood="happy" className="about__mascot" decorative />
            <div>
              <p>
                CuanKu menyimpan semua catatan di penyimpanan browser (IndexedDB). Tidak ada
                server, iklan, atau pelacakan. Data hanya hilang jika kamu menghapus data
                browser — rutinlah membuat backup.
              </p>
              <p style={{ marginTop: 6 }}>
                {standalone
                  ? 'CuanKu sudah berjalan sebagai aplikasi terpasang.'
                  : 'Pasang lewat menu browser (Add to Home Screen / Install app) agar bisa dibuka seperti aplikasi.'}
              </p>
            </div>
          </div>
          <div className="settings-actions">
            {installPrompt ? (
              <Button size="sm" variant="primary" icon={<Download />} onClick={() => void handleInstall()}>
                Pasang aplikasi
              </Button>
            ) : (
              <span className="chip chip--paper">Pengingat terakhir {reminderTimeLabel(settings)}</span>
            )}
          </div>
        </Card>
      </div>

      <p className="tiny muted center" style={{ marginTop: 22 }}>
        Dibuat untuk pencatatan pribadi. Semua nominal memakai Rupiah tanpa desimal.
      </p>
    </div>
  );
}
