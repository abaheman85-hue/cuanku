import type { CSSProperties } from 'react';
import angrySrc from '../assets/mascot-angry.png';
import cheeringSrc from '../assets/mascot-cheering.png';
import happySrc from '../assets/mascot-happy.png';
import sleepySrc from '../assets/mascot-sleepy.png';
import worriedSrc from '../assets/mascot-worried.png';
import type { MascotMood } from '../lib/mascot-mood';

const MOOD_SOURCES: Record<MascotMood, string> = {
  netral: happySrc,
  sleepy: sleepySrc,
  angry: angrySrc,
  worried: worriedSrc,
  cheering: cheeringSrc,
  happy: happySrc,
};

const MOOD_LABELS: Record<MascotMood, string> = {
  netral: 'Maskot Cuan siap membantu',
  sleepy: 'Maskot Cuan mengantuk',
  angry: 'Maskot Cuan marah',
  worried: 'Maskot Cuan khawatir',
  cheering: 'Maskot Cuan bersorak gembira',
  happy: 'Maskot Cuan tersenyum senang',
};

interface MascotProps {
  mood?: MascotMood;
  className?: string;
  style?: CSSProperties;
  decorative?: boolean;
  alt?: string;
}

/**
 * Maskot CuanKu: karakter koin dengan lima gambar ekspresi lokal.
 * Ekspresi `netral` memakai gambar `happy` saat data masih dimuat atau saat
 * aplikasi menampilkan dialog konfirmasi.
 * Semua aset sudah transparan dan dipotong dengan bingkai yang sama.
 */
export function Mascot({
  mood = 'happy',
  className,
  style,
  decorative = false,
  alt,
}: MascotProps) {
  return (
    <span
      className={['mascot', `mascot--${mood}`, className].filter(Boolean).join(' ')}
      style={style}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : (alt ?? MOOD_LABELS[mood])}
      aria-hidden={decorative || undefined}
    >
      <img
        src={MOOD_SOURCES[mood]}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="mascot__body"
      />
    </span>
  );
}

/** Logo ringkas untuk header/sidebar — memakai maskot yang sama. */
export function CuanMark({ className, style }: { className?: string; style?: CSSProperties }) {
  return <Mascot className={className} style={style} decorative mood="happy" />;
}
