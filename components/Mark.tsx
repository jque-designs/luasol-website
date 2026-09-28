/**
 * The Lua Sol mark, rebuilt as vector from the original logo.png geometry:
 * outer crescent = C1 − C2, inner crescent = C3 − C4, sun = C5, seven rays on a 22.5° fan.
 * Gradients live once in <MarkDefs/> (rendered in the root layout) and are referenced by id.
 */

type Variant = 'day' | 'night' | 'ink' | 'mist';

const RAYS: [number, number, number, number][] = [
  [236.5, 49, 236.5, 15],
  [166.5, 62.9, 160.7, 49.1],
  [107.1, 102.6, 83.1, 78.6],
  [67.4, 162, 53.6, 156.2],
  [53.5, 232, 19.5, 232],
  [67.4, 302, 53.6, 307.8],
  [107.1, 361.4, 83.1, 385.4],
];
const RAY_DAY = ['#F89741', '#E05963', '#A83979', '#843A87', '#362D7E', '#343080', '#2F2C7B'];
const RAY_NIGHT = ['#F89741', '#E05963', '#A83979', '#A553B0', '#6D62D6', '#675CD0', '#6157CA'];
const OUTER = 'M278.1 81.9 A159.7 159.7 0 1 0 385.3 302.3 A136.8 136.8 0 1 1 278.1 81.9 Z';
const INNER = 'M289 105 A114.3 114.3 0 1 0 376 275.7 A96.4 96.4 0 1 1 289 105 Z';

export function MarkDefs() {
  const c = ['#2A2873', '#45388B', '#7E3A88', '#B3447F', '#D85868', '#EE7362'];
  const nn = ['#5B50C9', '#6E4FBE', '#9446A0', '#C04C86', '#E0606C', '#F07A64'];
  const off = [0, 0.2, 0.45, 0.6, 0.8, 1];
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="lsl-day" x1="110" y1="350" x2="340" y2="120" gradientUnits="userSpaceOnUse">
          {c.map((col, i) => <stop key={i} offset={off[i]} stopColor={col} />)}
        </linearGradient>
        <linearGradient id="lsl-night" x1="110" y1="350" x2="340" y2="120" gradientUnits="userSpaceOnUse">
          {nn.map((col, i) => <stop key={i} offset={off[i]} stopColor={col} />)}
        </linearGradient>
        <linearGradient id="lsl-sun" x1="270" y1="250" x2="360" y2="130" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#D94679" />
          <stop offset="0.45" stopColor="#F2835A" />
          <stop offset="1" stopColor="#FBB232" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function Mark({
  variant = 'day',
  size = 40,
  rays = true,
  title,
  className,
}: {
  variant?: Variant;
  size?: number | string;
  rays?: boolean;
  title?: string;
  className?: string;
}) {
  const flat = variant === 'ink' ? '#2E2366' : variant === 'mist' ? '#F3EFF8' : null;
  const crescent = flat ?? (variant === 'night' ? 'url(#lsl-night)' : 'url(#lsl-day)');
  const sun = flat ?? 'url(#lsl-sun)';
  const rayCols = variant === 'night' ? RAY_NIGHT : RAY_DAY;
  return (
    <svg
      viewBox={rays ? '0 0 415 415' : '70 70 330 330'}
      width={size}
      height={size}
      className={className}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {rays &&
        RAYS.map(([x1, y1, x2, y2], i) => (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={flat ?? rayCols[i]}
            strokeWidth={12}
            strokeLinecap="round"
          />
        ))}
      <path d={OUTER} fill={crescent} />
      <path d={INNER} fill={crescent} />
      <circle cx={321.9} cy={195.8} r={73.2} fill={sun} />
    </svg>
  );
}

export function Wordmark({ stacked = false, accent }: { stacked?: boolean; accent?: string }) {
  if (stacked) {
    return (
      <span className="wm wm-stack">
        <span>LUA SOL</span>
        <span className="wm-labs">LABS</span>
      </span>
    );
  }
  return (
    <span className="wm">
      LUA SOL <span style={{ fontWeight: 500, color: accent }}>LABS</span>
    </span>
  );
}
