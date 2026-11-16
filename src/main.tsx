import { StrictMode, useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/space-grotesk/latin-400.css';
import '@fontsource/space-grotesk/latin-500.css';
import '@fontsource/space-grotesk/latin-600.css';
import '@fontsource/space-grotesk/latin-700.css';
import './styles/global.css';
import { App } from './App';
import { Mascot } from './components/Mascot';
import { Button } from './components/ui/Button';
import { initDatabase } from './db/db';

type BootState = { status: 'loading' } | { status: 'ready' } | { status: 'error'; message: string };

function BootScreen({ error, onRetry }: { error?: string; onRetry?: () => void }) {
  return (
    <div className="boot">
      <Mascot mood={error ? 'panic' : 'sleepy'} className="boot__mascot" decorative />
      <h1>CuanKu</h1>
      {error ? (
        <>
          <p>{error}</p>
          {onRetry ? (
            <Button variant="primary" onClick={onRetry}>
              Coba lagi
            </Button>
          ) : null}
        </>
      ) : (
        <>
          <div className="spinner" aria-hidden="true" />
          <p role="status">Menyiapkan catatan keuanganmu di perangkat ini...</p>
        </>
      )}
    </div>
  );
}

function Root() {
  const [boot, setBoot] = useState<BootState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    initDatabase()
      .then(() => {
        if (active) setBoot({ status: 'ready' });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setBoot({
          status: 'error',
          message:
            error instanceof Error
              ? `Penyimpanan lokal tidak bisa dibuka: ${error.message}`
              : 'Penyimpanan lokal tidak bisa dibuka di browser ini.',
        });
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setBoot({ status: 'loading' });
    setAttempt((value) => value + 1);
  }, []);

  if (boot.status === 'loading') return <BootScreen />;
  if (boot.status === 'error') return <BootScreen error={boot.message} onRetry={retry} />;
  return <App />;
}

const container = document.getElementById('root');
if (!container) throw new Error('Elemen #root tidak ditemukan.');

createRoot(container).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  void import('virtual:pwa-register')
    .then(({ registerSW }) => {
      registerSW({ immediate: true });
    })
    .catch(() => {
      // Aplikasi tetap jalan tanpa service worker (mode pengembangan).
    });
}
