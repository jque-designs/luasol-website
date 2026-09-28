/**
 * The terminator split: Lua (night indigo) meets Sol (sunset) along a curved line.
 * The magenta line doubles as a live epoch progress bar (amber overlay drawn to `pct`).
 * `orient` switches between the desktop (vertical line) and mobile (horizontal line) layouts.
 */
export default function Terminator({
  pct,
  orient = 'v',
  className,
}: {
  pct?: number | null;
  orient?: 'v' | 'h';
  className?: string;
}) {
  const p = pct == null ? 0 : Math.max(0, Math.min(100, pct));
  if (orient === 'h') {
    const d = 'M0 380 C120 310 270 310 390 380';
    return (
      <svg viewBox="0 0 390 760" preserveAspectRatio="none" className={className} aria-hidden="true">
        <rect width="390" height="760" fill="#2A2873" />
        <path d={`${d} L390 760 L0 760 Z`} fill="#F2835A" />
        <path d={d} fill="none" stroke="#B3447F" strokeWidth={6} vectorEffect="non-scaling-stroke" />
        {pct != null && (
          <path d={d} fill="none" stroke="#FBB232" strokeWidth={6} pathLength={100} strokeDasharray={`${p} 100`} vectorEffect="non-scaling-stroke" />
        )}
      </svg>
    );
  }
  const d = 'M760 0 C650 260 650 640 760 900';
  return (
    <svg viewBox="0 0 1440 900" preserveAspectRatio="none" className={className} aria-hidden="true">
      <rect width="1440" height="900" fill="#2A2873" />
      <path d={`${d} L1440 900 L1440 0 Z`} fill="#F2835A" />
      <path d={d} fill="none" stroke="#B3447F" strokeWidth={8} vectorEffect="non-scaling-stroke" />
      {pct != null && (
        <path d={d} fill="none" stroke="#FBB232" strokeWidth={8} pathLength={100} strokeDasharray={`${p} 100`} vectorEffect="non-scaling-stroke" />
      )}
    </svg>
  );
}

/** Small decorative split used on cards and banners. */
export function MiniSplit({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 600 150" preserveAspectRatio="none" className={className} aria-hidden="true">
      <rect width="600" height="150" fill="#2A2873" />
      <path d="M360 0 C325 45 325 105 360 150 L600 150 L600 0 Z" fill="#F2835A" />
      <path d="M360 0 C325 45 325 105 360 150" fill="none" stroke="#B3447F" strokeWidth={5} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
