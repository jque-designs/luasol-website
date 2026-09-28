'use client';

import { useState } from 'react';

export default function CopyButton({ value, label, tone = 'light' }: { value: string; label: string; tone?: 'light' | 'dark' }) {
  const [done, setDone] = useState(false);
  return (
    <div className={`keyrow keyrow-${tone}`}>
      <span className="keyrow-label mono">{label}</span>
      <span className="keyrow-value mono">{value}</span>
      <button
        className="keyrow-btn"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setDone(true);
            setTimeout(() => setDone(false), 1400);
          } catch {
            /* clipboard unavailable */
          }
        }}
        aria-label={`Copy ${label.toLowerCase()}`}
      >
        {done ? (
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <rect x="8" y="8" width="12" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        )}
      </button>
    </div>
  );
}
