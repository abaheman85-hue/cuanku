import { useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Gift, Home, Lock, ReceiptText, Settings, Target } from 'lucide-react';
import { CuanMark } from '../Mascot';
import { BudgetAlertBanner } from '../BudgetAlertBanner';
import { PullToRefresh } from '../PullToRefresh';
import { ReminderBanner } from '../ReminderBanner';

const NAV_ITEMS = [
  { to: '/', label: 'Beranda', icon: Home, end: true },
  { to: '/transaksi', label: 'Transaksi', icon: ReceiptText, end: false },
  { to: '/anggaran', label: 'Anggaran', icon: Target, end: false },
  { to: '/wishlist', label: 'Wishlist', icon: Gift, end: false },
  { to: '/pengaturan', label: 'Pengaturan', icon: Settings, end: false },
] as const;

const APP_VERSION = '2.1.0';

export function AppShell() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [location.pathname]);

  return (
    <div className="app">
      <aside className="sidebar">
        <Link to="/" className="sidebar__brand" aria-label="CuanKu, kembali ke beranda">
          <span className="brand-mark" aria-hidden="true">
            <CuanMark />
          </span>
          <span className="brand-word">
            <strong>CuanKu</strong>
            <small>Catatan keuangan</small>
          </span>
        </Link>

        <nav className="sidebar__nav" aria-label="Navigasi utama">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`.trim()}
              >
                <Icon aria-hidden="true" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar__spacer" />

        <div className="sidebar__foot">
          <div className="offline-card">
            <div className="offline-card__title">
              <Lock aria-hidden="true" />
              100% offline
            </div>
            <p>
              Semua data tersimpan di browser ini. Tanpa akun, tanpa iklan, tanpa koneksi keluar.
            </p>
          </div>
          <p className="sidebar__version">CuanKu versi {APP_VERSION}</p>
        </div>
      </aside>

      <div className="main">
        <PullToRefresh />
        <header className="mobile-topbar">
          <Link to="/" className="mobile-brand" aria-label="CuanKu, kembali ke beranda">
            <span className="brand-mark" aria-hidden="true">
              <CuanMark />
            </span>
            <strong>CuanKu</strong>
          </Link>
          <div className="mobile-topbar__actions">
            <Link
              to="/pengaturan"
              className="icon-btn icon-btn--sm"
              aria-label="Buka pengaturan"
              title="Pengaturan"
            >
              <Settings aria-hidden="true" />
            </Link>
          </div>
        </header>

        <div className="content">
          <BudgetAlertBanner />
          <ReminderBanner />
          <Outlet />
        </div>

        <nav className="bottom-nav" aria-label="Navigasi utama">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                aria-label={item.label}
                className={({ isActive }) =>
                  `bottom-nav__item ${isActive ? 'active' : ''}`.trim()
                }
              >
                <Icon aria-hidden="true" />
                <span className="bottom-nav__label">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
