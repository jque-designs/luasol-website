'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { IDENTITY, LINKS, short } from '@/lib/constants';

type BamEpoch = { epoch: number; amount: number; claimed: boolean; claimedAmount: number; claimPda: string };
type BamResult = {
  validator: string;
  scanned: [number, number];
  epochs: BamEpoch[];
  summary: { allocated: number; claimed: number; unclaimed: number; eligible: number; epochsClaimed: number; epochsUnclaimed: number };
};

type Dir = { n: string; i: string; v: string; img: string | null; s: number; b: boolean };
type Recent = { k: string; n: string };

const RECENT_KEY = 'lsl:bam:recent';
const RECENT_MAX = 6;
const LIST_MAX = 60;
const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

const loadRecent = (): Recent[] => {
  try {
    const j = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    return Array.isArray(j) ? j.filter((r) => r && typeof r.k === 'string').slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
};
const saveRecent = (r: Recent[]) => {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(r));
  } catch {
    /* storage blocked */
  }
};

const fStake = (n: number) =>
  n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : n.toLocaleString('en-US');

function Avatar({ v }: { v: Dir }) {
  const [bad, setBad] = useState(false);
  if (v.img && !bad)
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="vp-av" src={v.img} alt="" loading="lazy" onError={() => setBad(true)} />;
  return <span className="vp-av vp-mono">{(v.n || v.i).slice(0, 1).toUpperCase()}</span>;
}

const f4 = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 4, minimumFractionDigits: 0 });

function Cmd({ epoch }: { epoch: number }) {
  const [done, setDone] = useState(false);
  const text = `cargo r -p jito-bam-boost-cli -- bam-boost merkle-distributor claim --network mainnet --epoch ${epoch} --rpc-url <RPC_URL> --signer <IDENTITY_KEYPAIR>`;
  return (
    <div className="cmd">
      cargo r -p jito-bam-boost-cli -- bam-boost merkle-distributor claim --network mainnet --epoch {epoch} --rpc-url <b>&lt;RPC_URL&gt;</b> --signer <b>&lt;IDENTITY_KEYPAIR&gt;</b>
      <button
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            setDone(true);
            setTimeout(() => setDone(false), 1400);
          } catch {
            /* clipboard unavailable */
          }
        }}
      >
        {done ? 'copied' : 'copy'}
      </button>
    </div>
  );
}

export default function BamChecker() {
  const [input, setInput] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'error' | 'done'>('idle');
  const [err, setErr] = useState('');
  const [note, setNote] = useState('');
  const [data, setData] = useState<BamResult | null>(null);

  const [dir, setDir] = useState<Dir[] | null>(null);
  const [dirErr, setDirErr] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [recent, setRecent] = useState<Recent[]>([]);
  const [typed, setTyped] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const byId = useMemo(() => new Map((dir ?? []).map((v) => [v.i, v])), [dir]);
  const byVote = useMemo(() => new Map((dir ?? []).map((v) => [v.v, v])), [dir]);
  const bamCount = useMemo(() => (dir ?? []).filter((v) => v.b).length, [dir]);

  const nameOf = (k: string) => byId.get(k)?.n || short(k, 5);

  const results = useMemo(() => {
    if (!dir) return [];
    const q = typed ? input.trim().toLowerCase() : '';
    if (!q) {
      const ours = byId.get(IDENTITY);
      const rest = dir.filter((v) => v.i !== IDENTITY);
      return (ours ? [ours, ...rest] : rest).slice(0, LIST_MAX);
    }
    const starts: Dir[] = [];
    const contains: Dir[] = [];
    for (const v of dir) {
      const n = v.n.toLowerCase();
      if (n.startsWith(q) || v.i.toLowerCase().startsWith(q) || v.v.toLowerCase().startsWith(q)) starts.push(v);
      else if (n.includes(q)) contains.push(v);
      if (starts.length >= LIST_MAX) break;
    }
    return [...starts, ...contains].slice(0, LIST_MAX);
  }, [dir, input, typed, byId]);

  useEffect(() => {
    setRecent(loadRecent());
    fetch('/api/validators')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j: Dir[]) => setDir(j))
      .catch(() => setDirErr(true));
    const q = new URLSearchParams(window.location.search).get('validator');
    if (q) run(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  useEffect(() => setActive(0), [input]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const remember = (k: string) => {
    setRecent((prev) => {
      const next = [{ k, n: byId.get(k)?.n || '' }, ...prev.filter((r) => r.k !== k)].slice(0, RECENT_MAX);
      saveRecent(next);
      return next;
    });
  };

  const forget = (k: string) => {
    setRecent((prev) => {
      const next = prev.filter((r) => r.k !== k);
      saveRecent(next);
      return next;
    });
  };

  const run = async (addr: string) => {
    let v = addr.trim();
    if (!v) return;
    setNote('');
    const asVote = byVote.get(v);
    if (asVote && asVote.i !== v) {
      v = asVote.i;
      setNote('That was a vote account, so we switched to its identity key.');
    }
    setInput(v);
    setTyped(false);
    setOpen(false);
    setState('loading');
    setErr('');
    try {
      const res = await fetch(`/api/bam?validator=${encodeURIComponent(v)}`);
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Check failed');
      setData(j);
      setState('done');
      remember(v);
      const url = new URL(window.location.href);
      url.searchParams.set('validator', v);
      window.history.replaceState(null, '', url.toString());
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setState('error');
    }
  };

  const submit = () => {
    const q = input.trim();
    if (open && typed && results[active]) return run(results[active].i);
    if (BASE58.test(q)) return run(q);
    if (results[0]) return run(results[0].i);
    setErr('No validator matches that search. Try a name, or paste an identity key.');
    setState('error');
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) setOpen(true);
      else setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const s = data?.summary;
  const unclaimed = data?.epochs.filter((e) => !e.claimed) ?? [];
  const shown = data ? byId.get(data.validator) : undefined;
  const listOpen = open && (results.length > 0 || !dir);

  return (
    <div className="bam-app">
      <form
        className="stack gap-12"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label htmlFor="bam-in" className="mono" style={{ fontSize: 11, letterSpacing: '.12em', color: 'var(--grey)' }}>
          VALIDATOR
        </label>
        <div className="bam-form">
          <div className="vp" ref={boxRef}>
            <input
              id="bam-in"
              role="combobox"
              aria-expanded={listOpen}
              aria-controls="vp-list"
              aria-autocomplete="list"
              aria-activedescendant={listOpen && results[active] ? `vp-opt-${active}` : undefined}
              placeholder="Search by name, or paste an identity key"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setTyped(true);
                setOpen(true);
              }}
              onFocus={(e) => {
                e.target.select();
                setOpen(true);
              }}
              onClick={() => setOpen(true)}
              onKeyDown={onKey}
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="button"
              className="vp-toggle"
              aria-label={open ? 'Close validator list' : 'Open validator list'}
              tabIndex={-1}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setOpen((o) => !o)}
            >
              <svg viewBox="0 0 12 8" width="12" height="8" aria-hidden="true" style={{ transform: open ? 'rotate(180deg)' : undefined }}>
                <path d="M1 1.5 6 6.5 11 1.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {listOpen && (
              <div className="vp-pop">
                <div className="vp-head mono">
                  {dir ? (
                    <>
                      <span>{typed && input.trim() ? `${results.length}${results.length === LIST_MAX ? '+' : ''} MATCHES` : `${dir.length.toLocaleString('en-US')} VALIDATORS`}</span>
                      <span>
                        <i className="vp-bam">BAM</i> {bamCount} EARNING NOW
                      </span>
                    </>
                  ) : (
                    <span>{dirErr ? 'VALIDATOR LIST UNAVAILABLE · PASTE A KEY' : 'LOADING VALIDATORS…'}</span>
                  )}
                </div>
                {results.length > 0 && (
                  <ul className="vp-list" id="vp-list" role="listbox" ref={listRef}>
                    {results.map((v, idx) => (
                      <li
                        key={v.i}
                        id={`vp-opt-${idx}`}
                        data-idx={idx}
                        role="option"
                        aria-selected={idx === active}
                        className={idx === active ? 'on' : undefined}
                        onMouseDown={(e) => e.preventDefault()}
                        onMouseEnter={() => setActive(idx)}
                        onClick={() => run(v.i)}
                      >
                        <Avatar v={v} />
                        <span className="vp-name">
                          <b>{v.n || 'Unnamed validator'}</b>
                          <span className="mono">{short(v.i, 5)}</span>
                        </span>
                        <span className="vp-meta mono">
                          {v.b && <i className="vp-bam">BAM</i>}
                          <span>{fStake(v.s)} SOL</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
          <button type="submit" disabled={state === 'loading' || !input.trim()}>
            {state === 'loading' ? 'Checking…' : 'Check'}
          </button>
        </div>
        {recent.length > 0 && (
          <div className="presets">
            <span className="mono presets-label">RECENT</span>
            {recent.map((r) => (
              <span key={r.k} className={`preset${data?.validator === r.k ? ' on' : ''}`}>
                <button type="button" onClick={() => run(r.k)} title={r.k}>
                  {r.n || nameOf(r.k)}
                </button>
                <button type="button" className="preset-x" aria-label={`Remove ${r.n || nameOf(r.k)} from recent`} onClick={() => forget(r.k)}>
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </form>

      {state === 'error' && <div className="bam-err">{err}</div>}

      {state === 'loading' && <div className="bam-empty">Scanning every BAM epoch and reading claim status on-chain…</div>}

      {state === 'idle' && (
        <div className="bam-empty">Pick a validator from the list, or paste an identity key. Validators you check are saved under Recent.</div>
      )}

      {state === 'done' && data && s && (
        <>
          <div className="bam-who">
            <span className="mono">SHOWING</span>
            <b>{shown?.n || short(data.validator, 6)}</b>
            <span className="mono">{short(data.validator, 6)}</span>
            {note && <span className="bam-who-note">{note}</span>}
          </div>
          <div className="bam-sum">
            <div className="bam-tile">
              <span className="mono">ELIGIBLE EPOCHS</span>
              <b>{s.eligible}</b>
            </div>
            <div className="bam-tile">
              <span className="mono">EARNED</span>
              <b>
                {f4(s.allocated)} <small>JitoSOL</small>
              </b>
            </div>
            <div className="bam-tile">
              <span className="mono">CLAIMED</span>
              <b>
                {f4(s.claimed)} <small>JitoSOL</small>
              </b>
            </div>
            <div className="bam-tile hot">
              <span className="mono">UNCLAIMED</span>
              <b>
                {f4(s.unclaimed)} <small>JitoSOL</small>
              </b>
            </div>
          </div>

          {data.epochs.length === 0 ? (
            <div className="bam-empty">
              No BAM allocations found for {short(data.validator, 6)} in epochs {data.scanned[0]}–{data.scanned[1]}.
            </div>
          ) : (
            <div className="bam-table">
              <div className="bam-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>EPOCH</th>
                      <th>ALLOCATION</th>
                      <th>STATUS</th>
                      <th style={{ textAlign: 'right' }}>CLAIMED</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.epochs.map((e) => (
                      <tr key={e.epoch}>
                        <td>{e.epoch}</td>
                        <td>{f4(e.amount)} JitoSOL</td>
                        <td>{e.claimed ? <span className="pill-ok">CLAIMED</span> : <span className="pill-un">UNCLAIMED</span>}</td>
                        <td style={{ textAlign: 'right' }}>{e.claimed ? f4(e.claimedAmount) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {unclaimed.length > 0 && (
            <div className="stack gap-12">
              <span className="mono" style={{ fontSize: 11, letterSpacing: '.12em', color: 'var(--grey)' }}>
                HOW TO CLAIM · {unclaimed.length} EPOCH{unclaimed.length > 1 ? 'S' : ''}
              </span>
              <p style={{ fontSize: 15, color: 'var(--ink-2)' }}>
                Build the{' '}
                <a href={LINKS.bamCli} target="_blank" rel="noreferrer" style={{ textDecoration: 'underline' }}>
                  jito-bam-boost-cli
                </a>
                , then run one command per epoch, signing with your validator identity keypair.
              </p>
              <div className="stack gap-8 bam-scroll" style={{ maxHeight: 260 }}>
                {unclaimed.map((e) => (
                  <Cmd key={e.epoch} epoch={e.epoch} />
                ))}
              </div>
            </div>
          )}
          <span className="bam-note">
            Scanned epochs {data.scanned[0]}–{data.scanned[1]} · allocations from Jito’s published merkle trees · claim status
            read from the claim_status PDA on-chain.
          </span>
        </>
      )}
    </div>
  );
}
