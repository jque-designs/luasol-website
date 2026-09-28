'use client';

import { useEffect, useState } from 'react';
import { IDENTITY, LINKS, short } from '@/lib/constants';

type BamEpoch = { epoch: number; amount: number; claimed: boolean; claimedAmount: number; claimPda: string };
type BamResult = {
  validator: string;
  scanned: [number, number];
  epochs: BamEpoch[];
  summary: { allocated: number; claimed: number; unclaimed: number; eligible: number; epochsClaimed: number; epochsUnclaimed: number };
};

const PRESETS: [string, string][] = [
  ['Lua Sol Labs', IDENTITY],
  ['DICS', 'CpNnGGhgVATJAbzHUXdrcGfpPiGuZyPka4QUmH7YgavX'],
];

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
  const [data, setData] = useState<BamResult | null>(null);

  const run = async (addr?: string) => {
    const v = (addr ?? input).trim();
    if (!v) return;
    setInput(v);
    setState('loading');
    setErr('');
    try {
      const res = await fetch(`/api/bam?validator=${encodeURIComponent(v)}`);
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Check failed');
      setData(j);
      setState('done');
      const url = new URL(window.location.href);
      url.searchParams.set('validator', v);
      window.history.replaceState(null, '', url.toString());
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setState('error');
    }
  };

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('validator');
    if (q) run(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const s = data?.summary;
  const unclaimed = data?.epochs.filter((e) => !e.claimed) ?? [];

  return (
    <div className="bam-app">
      <form
        className="stack gap-12"
        onSubmit={(e) => {
          e.preventDefault();
          run();
        }}
      >
        <label htmlFor="bam-in" className="mono" style={{ fontSize: 11, letterSpacing: '.12em', color: 'var(--grey)' }}>
          VALIDATOR IDENTITY
        </label>
        <div className="bam-form">
          <input
            id="bam-in"
            placeholder="Paste a validator identity pubkey"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
          <button type="submit" disabled={state === 'loading' || !input.trim()}>
            {state === 'loading' ? 'Checking…' : 'Check'}
          </button>
        </div>
        <div className="presets">
          {PRESETS.map(([name, key]) => (
            <button type="button" key={key} className="preset" onClick={() => run(key)}>
              {name}
            </button>
          ))}
        </div>
      </form>

      {state === 'error' && <div className="bam-err">{err}</div>}

      {state === 'loading' && <div className="bam-empty">Scanning every BAM epoch and reading claim status on-chain…</div>}

      {state === 'idle' && <div className="bam-empty">Paste an identity (not the vote account) or try one of the presets.</div>}

      {state === 'done' && data && s && (
        <>
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
