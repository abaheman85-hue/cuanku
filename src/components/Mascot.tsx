import type { CSSProperties } from 'react';

export type MascotMood = 'happy' | 'panic' | 'sleepy' | 'cheering';

const INK = '#141414';
const MINT = '#B9F5D8';
const MINT_DEEP = '#8fe8be';
const PAPER = '#FFFDF6';
const PINK = '#FFC2E2';
const LIME = '#C8F560';
const YELLOW = '#FFD166';
const BLUE = '#A9D6FF';

const LABELS: Record<MascotMood, string> = {
  happy: 'Maskot Cuan tersenyum senang',
  panic: 'Maskot Cuan panik',
  sleepy: 'Maskot Cuan mengantuk',
  cheering: 'Maskot Cuan bersorak gembira',
};

interface MascotProps {
  mood?: MascotMood;
  className?: string;
  style?: CSSProperties;
  decorative?: boolean;
}

export function Mascot({ mood = 'happy', className, style, decorative = false }: MascotProps) {
  const eyes =
    mood === 'sleepy' ? (
      <g fill="none" stroke={INK} strokeWidth={5.5} strokeLinecap="round">
        <path d="M71 101q17 13 34 0" />
        <path d="M135 101q17 13 34 0" />
      </g>
    ) : mood === 'cheering' ? (
      <g stroke={INK} strokeWidth={4.5} strokeLinejoin="round">
        <path
          d="M88 86l4.4 9.6L103 97l-7.5 7 1.9 10.4L88 109l-9.4 5.4L80.5 104 73 97l10.6-1.4z"
          fill={YELLOW}
        />
        <path
          d="M152 86l4.4 9.6L167 97l-7.5 7 1.9 10.4L152 109l-9.4 5.4L142.5 104 138 97l10.6-1.4z"
          fill={YELLOW}
        />
      </g>
    ) : (
      <g>
        <circle cx={88} cy={100} r={mood === 'panic' ? 18 : 16} fill={PAPER} stroke={INK} strokeWidth={5} />
        <circle cx={152} cy={100} r={mood === 'panic' ? 18 : 16} fill={PAPER} stroke={INK} strokeWidth={5} />
        <circle cx={mood === 'panic' ? 90 : 89} cy={mood === 'panic' ? 98 : 102} r={mood === 'panic' ? 5 : 7} fill={INK} />
        <circle cx={mood === 'panic' ? 154 : 153} cy={mood === 'panic' ? 98 : 102} r={mood === 'panic' ? 5 : 7} fill={INK} />
        <circle cx={mood === 'panic' ? 92 : 91} cy={mood === 'panic' ? 96 : 99} r={2.4} fill={PAPER} />
        <circle cx={mood === 'panic' ? 156 : 155} cy={mood === 'panic' ? 96 : 99} r={2.4} fill={PAPER} />
      </g>
    );

  const mouth =
    mood === 'panic' ? (
      <g>
        <ellipse cx={120} cy={129} rx={14} ry={18} fill={PAPER} stroke={INK} strokeWidth={5} />
        <ellipse cx={120} cy={137} rx={7.5} ry={7} fill={PINK} />
      </g>
    ) : mood === 'sleepy' ? (
      <path d="M111 126h18" fill="none" stroke={INK} strokeWidth={5} strokeLinecap="round" />
    ) : mood === 'cheering' ? (
      <g>
        <path d="M97 117q23 33 46 0z" fill={PAPER} stroke={INK} strokeWidth={5} strokeLinejoin="round" />
        <path d="M110 130q10 13 20 0z" fill={PINK} />
      </g>
    ) : (
      <path d="M101 119q19 19 38 0" fill="none" stroke={INK} strokeWidth={5.5} strokeLinecap="round" />
    );

  const arms =
    mood === 'cheering' || mood === 'panic' ? (
      <g fill={MINT} stroke={INK} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round">
        <path d="M25 84c-7-13-5-25 5-33" fill="none" />
        <path d="M215 84c7-13 5-25-5-33" fill="none" />
        <circle cx={30} cy={47} r={9} />
        <circle cx={210} cy={47} r={9} />
      </g>
    ) : (
      <g fill={MINT} stroke={INK} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round">
        <path d="M25 98c-8 5-11 14-10 25" fill="none" />
        <path d="M215 98c8 5 11 14 10 25" fill="none" />
        <circle cx={15} cy={128} r={9} />
        <circle cx={225} cy={128} r={9} />
      </g>
    );

  return (
    <svg
      viewBox="0 0 240 200"
      className={className}
      style={style}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : LABELS[mood]}
      aria-hidden={decorative || undefined}
      xmlns="http://www.w3.org/2000/svg"
    >
      {mood === 'cheering' ? (
        <g aria-hidden="true">
          <rect x={16} y={24} width={9} height={16} rx={2} fill={YELLOW} stroke={INK} strokeWidth={3} transform="rotate(-18 20 32)" />
          <rect x={214} y={20} width={9} height={16} rx={2} fill={PINK} stroke={INK} strokeWidth={3} transform="rotate(16 218 28)" />
          <rect x={206} y={128} width={9} height={16} rx={2} fill={LIME} stroke={INK} strokeWidth={3} transform="rotate(24 210 136)" />
          <circle cx={26} cy={144} r={5} fill={BLUE} stroke={INK} strokeWidth={3} />
          <path d="M198 70l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill={LIME} stroke={INK} strokeWidth={2.5} />
        </g>
      ) : null}

      {/* kaki */}
      <g fill="none" stroke={INK} strokeWidth={6} strokeLinecap="round">
        <path d={mood === 'cheering' ? 'M94 152v12' : 'M92 153v16'} />
        <path d={mood === 'cheering' ? 'M146 152v12' : 'M148 153v16'} />
        <path d={mood === 'cheering' ? 'M82 168h24' : 'M81 173h22'} />
        <path d={mood === 'cheering' ? 'M134 168h24' : 'M137 173h22'} />
      </g>

      {arms}

      {/* badan uang kertas */}
      <rect x={24} y={51} width={192} height={103} rx={24} fill={MINT} stroke={INK} strokeWidth={6} />
      <rect
        x={37}
        y={64}
        width={166}
        height={77}
        rx={14}
        fill="none"
        stroke={INK}
        strokeWidth={2.5}
        strokeDasharray="7 8"
        opacity={0.22}
      />

      {/* tunas */}
      <g stroke={INK} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M120 52V33" fill="none" />
        <path d="M120 37c-14 0-24-8-24-21 14 0 24 9 24 21z" fill={MINT_DEEP} />
        <path d="M120 31c0-12 10-20 24-20 0 12-10 20-24 20z" fill={LIME} />
      </g>

      {/* pipi */}
      <g fill={PINK} opacity={0.92}>
        <ellipse cx={64} cy={118} rx={12} ry={7.5} />
        <ellipse cx={176} cy={118} rx={12} ry={7.5} />
      </g>

      {eyes}
      {mouth}

      {mood === 'panic' ? (
        <g>
          <path
            d="M196 62c-5 9-8 13-8 17.5a8 8 0 0 0 16 0c0-4.5-3-8.5-8-17.5z"
            fill={BLUE}
            stroke={INK}
            strokeWidth={4}
            strokeLinejoin="round"
          />
          <g stroke={INK} strokeWidth={4.5} strokeLinecap="round">
            <path d="M66 76l-10-7" />
            <path d="M174 76l10-7" />
          </g>
        </g>
      ) : null}

      {mood === 'sleepy' ? (
        <g fill="none" stroke={INK} strokeLinecap="round" strokeLinejoin="round">
          <path d="M183 34h17l-17 18h17" strokeWidth={4.5} />
          <path d="M202 20h11l-11 12h11" strokeWidth={3.5} />
        </g>
      ) : null}

      {mood === 'happy' ? (
        <g stroke={INK} strokeWidth={2.5} strokeLinejoin="round">
          <path d="M198 42l2.6 5.4 5.4 2.6-5.4 2.6L198 58l-2.6-5.4L190 50l5.4-2.6z" fill={YELLOW} />
        </g>
      ) : null}
    </svg>
  );
}

/** Ikon ringkas untuk logo, favicon, dan placeholder. */
export function CuanMark({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      style={style}
      role="img"
      aria-label="Logo CuanKu"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g stroke={INK} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round">
        <path d="M32 14V9" fill="none" />
        <path d="M32 12c-6 0-10-3.5-10-9 6 0 10 3.8 10 9z" fill={MINT_DEEP} />
        <path d="M32 9c0-4.5 4-7.5 10-7.5C42 6 38 9 32 9z" fill={LIME} />
        <rect x={5} y={14} width={54} height={38} rx={12} fill={MINT} />
        <ellipse cx={19} cy={39} rx={4.5} ry={3} fill={PINK} stroke="none" />
        <ellipse cx={45} cy={39} rx={4.5} ry={3} fill={PINK} stroke="none" />
        <circle cx={23} cy={31} r={3.6} fill={INK} stroke="none" />
        <circle cx={41} cy={31} r={3.6} fill={INK} stroke="none" />
        <path d="M27 40q5 5 10 0" fill="none" strokeWidth={3.5} />
      </g>
    </svg>
  );
}
