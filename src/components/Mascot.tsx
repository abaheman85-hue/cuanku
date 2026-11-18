import type { CSSProperties, ReactNode } from 'react';
import mascotSrc from '../assets/mascot-coin.png';
import type { MascotMood } from '../lib/mascot-mood';

const INK = '#141414';
const PAPER = '#FFFDF6';
const PINK = '#FFC2E2';
const RED = '#FF8FA3';
const BLUE = '#A9D6FF';
const YELLOW = '#FFD166';
const LIME = '#C8F560';
const TOSKA = '#5ED4C7';

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

function star(cx: number, cy: number, r: number, fill: string): ReactNode {
  const points = Array.from({ length: 10 }, (_, index) => {
    const angle = (Math.PI / 5) * index - Math.PI / 2;
    const radius = index % 2 === 0 ? r : r * 0.45;
    return `${cx + Math.cos(angle) * radius},${cy + Math.sin(angle) * radius}`;
  }).join(' ');
  return <polygon points={points} fill={fill} stroke={INK} strokeWidth={3} strokeLinejoin="round" />;
}

function eyesFor(mood: MascotMood): ReactNode {
  if (mood === 'sleepy') {
    return (
      <g fill="none" stroke={INK} strokeWidth={6} strokeLinecap="round">
        <path d="M150 94q14 16 28 0" />
        <path d="M211 94q14 16 28 0" />
      </g>
    );
  }

  if (mood === 'happy') {
    return (
      <g fill="none" stroke={INK} strokeWidth={6} strokeLinecap="round">
        <path d="M150 97q14 -17 28 0" />
        <path d="M211 97q14 -17 28 0" />
      </g>
    );
  }

  if (mood === 'cheering') {
    return (
      <g>
        {star(164, 91, 17, YELLOW)}
        {star(225, 91, 17, YELLOW)}
      </g>
    );
  }

  const angry = mood === 'angry';
  const worried = mood === 'worried';
  return (
    <g>
      <ellipse
        cx={164}
        cy={91}
        rx={worried ? 12 : 11}
        ry={angry ? 8 : worried ? 14 : 12}
        fill={PAPER}
        stroke={INK}
        strokeWidth={4}
      />
      <ellipse
        cx={225}
        cy={91}
        rx={worried ? 12 : 11}
        ry={angry ? 8 : worried ? 14 : 12}
        fill={PAPER}
        stroke={INK}
        strokeWidth={4}
      />
      <circle cx={angry ? 168 : 166} cy={angry ? 93 : 94} r={5} fill={INK} />
      <circle cx={angry ? 229 : 227} cy={angry ? 93 : 94} r={5} fill={INK} />
    </g>
  );
}

function mouthFor(mood: MascotMood): ReactNode {
  if (mood === 'sleepy') {
    return <ellipse cx={195} cy={170} rx={8} ry={10} fill={INK} />;
  }

  if (mood === 'angry') {
    return (
      <path
        d="M176 180q19 -17 38 0"
        fill="none"
        stroke={INK}
        strokeWidth={6}
        strokeLinecap="round"
      />
    );
  }

  if (mood === 'worried') {
    return (
      <path
        d="M177 170q9 -8 18 0t18 0"
        fill="none"
        stroke={INK}
        strokeWidth={5}
        strokeLinecap="round"
      />
    );
  }

  if (mood === 'cheering' || mood === 'happy') {
    return (
      <g>
        <path
          d="M170 160q25 34 50 0z"
          fill={PAPER}
          stroke={INK}
          strokeWidth={5}
          strokeLinejoin="round"
        />
        <path d="M184 177q11 13 22 0z" fill={PINK} />
      </g>
    );
  }

  return (
    <path
      d="M177 168q18 13 36 0"
      fill="none"
      stroke={INK}
      strokeWidth={5}
      strokeLinecap="round"
    />
  );
}

function extrasFor(mood: MascotMood): ReactNode {
  if (mood === 'angry') {
    return (
      <g>
        <path
          d="M195 48l-7 14h8l-5 12 14-17h-8l6-9z"
          fill={RED}
          stroke={INK}
          strokeWidth={3}
          strokeLinejoin="round"
        />
        <path d="M145 72l28 12" stroke={INK} strokeWidth={6} strokeLinecap="round" />
        <path d="M245 72l-28 12" stroke={INK} strokeWidth={6} strokeLinecap="round" />
      </g>
    );
  }

  if (mood === 'worried') {
    return (
      <g>
        <path d="M146 69q16 -10 32 0" fill="none" stroke={INK} strokeWidth={5} strokeLinecap="round" />
        <path d="M216 69q16 -10 32 0" fill="none" stroke={INK} strokeWidth={5} strokeLinecap="round" />
        <path
          d="M266 86c-6 11-10 16-10 21a10 10 0 0 0 20 0c0-5-4-10-10-21z"
          fill={BLUE}
          stroke={INK}
          strokeWidth={3.5}
          strokeLinejoin="round"
        />
      </g>
    );
  }

  if (mood === 'sleepy') {
    return (
      <g fill={INK} fontFamily="'Space Grotesk', sans-serif" fontWeight="700">
        <text x="264" y="74" fontSize="24">
          Z
        </text>
        <text x="282" y="54" fontSize="16">
          z
        </text>
      </g>
    );
  }

  if (mood === 'cheering') {
    return (
      <g>
        <rect x="122" y="58" width="9" height="18" rx="2" fill={YELLOW} stroke={INK} strokeWidth={2.5} transform="rotate(-18 126 67)" />
        <rect x="276" y="104" width="9" height="18" rx="2" fill={PINK} stroke={INK} strokeWidth={2.5} transform="rotate(22 280 113)" />
        <rect x="140" y="214" width="9" height="18" rx="2" fill={TOSKA} stroke={INK} strokeWidth={2.5} transform="rotate(28 144 223)" />
        {star(102, 106, 11, LIME)}
        {star(306, 190, 11, YELLOW)}
      </g>
    );
  }

  if (mood === 'happy') {
    return (
      <g>
        {star(102, 84, 11, YELLOW)}
        {star(302, 132, 9, LIME)}
      </g>
    );
  }

  return null;
}

/**
 * Maskot CuanKu: karakter koin emas dengan enam ekspresi.
 * Badan memakai satu PNG transparan yang sama; wajah digambar ulang sebagai
 * lapisan SVG sehingga bentuk karakter selalu konsisten di semua mood.
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
      <img src={mascotSrc} alt="" aria-hidden="true" draggable={false} className="mascot__body" />
      <svg className="mascot__face" viewBox="0 0 444 401" aria-hidden="true" focusable="false">
        {/* Menutup wajah lama supaya ekspresi baru tidak bertumpuk. */}
        <ellipse cx={195} cy={124} rx={76} ry={84} fill="#E7DC86" />
        <ellipse cx={195} cy={117} rx={69} ry={76} fill="#F1E7A0" />

        <g opacity={mood === 'sleepy' ? 0.35 : 0.75}>
          <ellipse cx={140} cy={132} rx={13} ry={8} fill={PINK} />
          <ellipse cx={250} cy={132} rx={13} ry={8} fill={PINK} />
        </g>

        {extrasFor(mood)}
        {eyesFor(mood)}
        {mouthFor(mood)}
      </svg>
    </span>
  );
}

/** Logo ringkas untuk header/sidebar — memakai maskot yang sama. */
export function CuanMark({ className, style }: { className?: string; style?: CSSProperties }) {
  return <Mascot className={className} style={style} decorative mood="happy" />;
}
