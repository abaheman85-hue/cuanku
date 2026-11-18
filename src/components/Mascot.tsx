import type { CSSProperties } from 'react';
import mascotSrc from '../assets/mascot-coin.png';

interface MascotProps {
  className?: string;
  style?: CSSProperties;
  decorative?: boolean;
  alt?: string;
}

/**
 * Maskot CuanKu: karakter koin emas (satu pose).
 * Selalu ditampilkan tanpa bingkai; latar transparan agar menyatu dengan kartu.
 */
export function Mascot({ className, style, decorative = false, alt }: MascotProps) {
  return (
    <img
      src={mascotSrc}
      className={className}
      style={style}
      alt={decorative ? '' : (alt ?? 'Maskot Cuan, karakter koin emas')}
      aria-hidden={decorative || undefined}
      draggable={false}
    />
  );
}

/** Logo ringkas untuk header/sidebar — memakai maskot yang sama. */
export function CuanMark({ className, style }: { className?: string; style?: CSSProperties }) {
  return <Mascot className={className} style={style} decorative />;
}
