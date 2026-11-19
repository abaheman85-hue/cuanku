import { useEffect, useRef, useState } from 'react';
import { Mascot } from './Mascot';

const THRESHOLD = 72;
const MAX_PULL = 120;
const RESISTANCE = 0.55;
const REFRESH_DELAY = 480;

/**
 * Pull-to-refresh buatan aplikasi: indikator bawaan browser dimatikan lewat
 * overscroll-behavior, lalu tarik ke bawah di posisi scroll 0 menampilkan Cuan
 * yang berlari. Lepas di atas ambang batas memuat ulang halaman.
 */
export function PullToRefresh() {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const pullRef = useRef(0);
  const refreshingRef = useRef(false);
  const start = useRef<{ x: number; y: number } | null>(null);
  const eligible = useRef(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    const updatePull = (value: number) => {
      pullRef.current = value;
      setPull(value);
    };

    const onTouchStart = (event: TouchEvent) => {
      if (refreshingRef.current || event.touches.length !== 1) return;
      if (window.scrollY > 0) return;
      if (document.querySelector('.modal-backdrop')) return;
      const touch = event.touches[0];
      start.current = { x: touch.clientX, y: touch.clientY };
      eligible.current = true;
    };

    const onTouchMove = (event: TouchEvent) => {
      const origin = start.current;
      if (!origin || !eligible.current || refreshingRef.current) return;
      if (event.touches.length !== 1) return;

      const touch = event.touches[0];
      const dy = touch.clientY - origin.y;
      const dx = touch.clientX - origin.x;

      if (window.scrollY > 0 || dy <= 0 || Math.abs(dx) > dy) {
        if (pullRef.current !== 0) updatePull(0);
        return;
      }

      // Mencegah pull-to-refresh bawaan browser saat gestur dimulai dari atas.
      event.preventDefault();
      updatePull(Math.min(MAX_PULL, dy * RESISTANCE));
    };

    const onTouchEnd = () => {
      if (!start.current) return;
      start.current = null;
      if (!eligible.current || refreshingRef.current) {
        eligible.current = false;
        updatePull(0);
        return;
      }

      const shouldRefresh = pullRef.current >= THRESHOLD;
      eligible.current = false;
      updatePull(0);
      if (!shouldRefresh) return;

      refreshingRef.current = true;
      setRefreshing(true);
      timer.current = window.setTimeout(() => {
        window.location.reload();
      }, REFRESH_DELAY);
    };

    const onTouchCancel = () => {
      start.current = null;
      eligible.current = false;
      updatePull(0);
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    document.addEventListener('touchcancel', onTouchCancel, { passive: true });

    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('touchcancel', onTouchCancel);
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);

  if (!refreshing && pull === 0) return null;

  const progress = refreshing ? 1 : Math.min(1, pull / THRESHOLD);
  const ready = refreshing || pull >= THRESHOLD;
  const offset = refreshing ? 0 : pull;

  return (
    <div className="ptr" role="status" aria-live="polite">
      <div
        className={`ptr__inner${refreshing ? ' ptr__inner--refreshing' : ''}`}
        style={{
          transform: `translateY(${offset}px) scale(${0.82 + progress * 0.18})`,
          opacity: 0.55 + progress * 0.45,
        }}
      >
        <Mascot mood="cheering" className="ptr__mascot" decorative />
        <span className="ptr__label">
          {refreshing
            ? 'Memuat ulang...'
            : ready
              ? 'Lepas untuk muat ulang'
              : 'Tarik untuk muat ulang'}
        </span>
      </div>
    </div>
  );
}
