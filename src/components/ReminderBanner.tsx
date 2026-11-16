import { Link } from 'react-router-dom';
import { useReminder } from '../hooks/useReminder';
import { reminderTimeLabel } from '../lib/notifications';
import { Mascot } from './Mascot';

export function ReminderBanner() {
  const { showBanner, dismiss, settings } = useReminder();
  if (!showBanner) return null;

  return (
    <aside className="reminder-banner" aria-label="Pengingat mencatat">
      <Mascot mood="sleepy" className="reminder-banner__mascot" decorative />
      <div className="reminder-banner__body">
        <strong>Sudah catat pengeluaran hari ini?</strong>
        <span>
          Pengingat {reminderTimeLabel(settings)}. Luangkan satu menit supaya catatanmu tetap
          lengkap.
        </span>
      </div>
      <div className="reminder-banner__actions">
        <Link className="btn btn--primary btn--sm" to="/transaksi?tambah=1">
          Catat
        </Link>
        <button type="button" className="btn btn--sm" onClick={dismiss}>
          Nanti
        </button>
      </div>
    </aside>
  );
}
