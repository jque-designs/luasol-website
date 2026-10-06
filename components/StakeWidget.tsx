'use client';

import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletReadyState } from '@solana/wallet-adapter-base';
import { Authorized, Keypair, LAMPORTS_PER_SOL, PublicKey, StakeProgram, Transaction, type Connection } from '@solana/web3.js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FEE_RESERVE_SOL, LINKS, MIN_STAKE_SOL, VOTE_ACCOUNT, short } from '@/lib/constants';
import Mark from './Mark';
import { MiniSplit } from './Terminator';

type Phase =
  | { kind: 'idle' }
  | { kind: 'signing' }
  | { kind: 'confirming'; sig: string }
  | { kind: 'done'; sig: string; amount: string }
  | { kind: 'error'; msg: string };

const fmt = (n: number, d = 4) => n.toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: 0 });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function confirmSig(connection: Connection, sig: string, lastValidBlockHeight: number) {
  for (;;) {
    const { value } = await connection.getSignatureStatuses([sig]);
    const st = value[0];
    if (st?.err) throw new Error('The transaction failed on-chain. Nothing was staked.');
    if (st && (st.confirmationStatus === 'confirmed' || st.confirmationStatus === 'finalized')) return;
    const height = await connection.getBlockHeight('confirmed');
    if (height > lastValidBlockHeight) throw new Error('The transaction expired before it landed. Your SOL did not move. Try again.');
    await sleep(1500);
  }
}

function errorMessage(e: unknown) {
  const m = e instanceof Error ? e.message : String(e);
  if (/reject|denied|cancel/i.test(m)) return 'Cancelled in your wallet.';
  if (/insufficient|0x1\b/i.test(m)) return 'Not enough SOL to cover this plus fees.';
  return m.length > 180 ? `${m.slice(0, 180)}…` : m;
}

export default function StakeWidget({ apy, nextEpoch }: { apy: number | null; nextEpoch: number | null }) {
  const { connection } = useConnection();
  const { wallets, select, wallet, publicKey, connected, connecting, disconnect, sendTransaction } = useWallet();

  const [amount, setAmount] = useState('10');
  const [balance, setBalance] = useState<number | null>(null); // lamports
  const [rent, setRent] = useState<number | null>(null); // lamports
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const n = parseFloat(amount);
  const valid = Number.isFinite(n) && n > 0;
  const lamports = valid ? Math.round(n * LAMPORTS_PER_SOL) : 0;
  const belowMin = valid && n < MIN_STAKE_SOL;
  const busy = phase.kind === 'signing' || phase.kind === 'confirming';

  const refreshBalance = useCallback(async () => {
    if (!publicKey) return setBalance(null);
    try {
      setBalance(await connection.getBalance(publicKey, 'confirmed'));
    } catch {
      setBalance(null);
    }
  }, [connection, publicKey]);

  useEffect(() => {
    refreshBalance();
  }, [refreshBalance]);

  useEffect(() => {
    connection
      .getMinimumBalanceForRentExemption(StakeProgram.space)
      .then(setRent)
      .catch(() => setRent(2_282_880));
  }, [connection]);

  useEffect(() => {
    if (connected) setPickerOpen(false);
  }, [connected]);

  useEffect(() => {
    if (pickerOpen) pickerRef.current?.querySelector<HTMLElement>('button, a')?.focus();
  }, [pickerOpen]);

  const reserve = FEE_RESERVE_SOL * LAMPORTS_PER_SOL + (rent ?? 0);
  const insufficient = balance != null && valid && lamports + reserve > balance;

  const setMax = () => {
    if (balance == null) return;
    const max = Math.max(0, balance - reserve) / LAMPORTS_PER_SOL;
    setAmount(max > 0 ? String(Math.floor(max * 1e4) / 1e4) : '0');
  };

  const installed = useMemo(
    () => wallets.filter((w) => w.readyState === WalletReadyState.Installed || w.readyState === WalletReadyState.Loadable),
    [wallets],
  );

  const act = async () => {
    if (!connected || !publicKey) return setPickerOpen(true);
    if (!valid || belowMin || insufficient || busy) return;
    setPhase({ kind: 'signing' });
    try {
      const stake = Keypair.generate();
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
      const tx = new Transaction({ feePayer: publicKey, blockhash, lastValidBlockHeight });
      tx.add(
        StakeProgram.createAccount({
          fromPubkey: publicKey,
          stakePubkey: stake.publicKey,
          authorized: new Authorized(publicKey, publicKey),
          lamports: lamports + (rent ?? 0),
        }),
        StakeProgram.delegate({
          stakePubkey: stake.publicKey,
          authorizedPubkey: publicKey,
          votePubkey: new PublicKey(VOTE_ACCOUNT),
        }),
      );
      const sig = await sendTransaction(tx, connection, { signers: [stake], maxRetries: 3 });
      setPhase({ kind: 'confirming', sig });
      await confirmSig(connection, sig, lastValidBlockHeight);
      setPhase({ kind: 'done', sig, amount });
      refreshBalance();
    } catch (e) {
      setPhase({ kind: 'error', msg: errorMessage(e) });
    }
  };

  let cta = valid ? `Stake ${fmt(n)} SOL with Lua Sol Labs` : 'Stake with Lua Sol Labs';
  if (!connected) cta = connecting ? 'Connecting…' : 'Connect wallet';
  else if (phase.kind === 'signing') cta = 'Approve in your wallet…';
  else if (phase.kind === 'confirming') cta = 'Confirming on-chain…';
  else if (!valid) cta = 'Enter an amount';
  else if (belowMin) cta = `Minimum is ${MIN_STAKE_SOL} SOL`;
  else if (insufficient) cta = 'Not enough SOL';
  const ctaDisabled = connected && (busy || !valid || belowMin || insufficient);

  const phantomBrowse =
    typeof window !== 'undefined'
      ? `https://phantom.app/ul/browse/${encodeURIComponent(window.location.href)}?ref=${encodeURIComponent(window.location.origin)}`
      : LINKS.phantom;

  const yearly = valid && apy != null ? (n * apy) / 100 : null;

  const header = (
    <div className="sw-head">
      <MiniSplit className="sw-head-bg" />
      <div className="sw-head-id">
        <span className="sw-badge">
          <Mark size={48} />
        </span>
        <span className="stack">
          <span className="sw-title">Native stake</span>
          <span className="mono sw-sub">DIRECT TO {short(VOTE_ACCOUNT).toUpperCase()}</span>
        </span>
      </div>
      {apy != null && <span className="mono sw-apy">EST. APY {apy.toFixed(2)}%</span>}
    </div>
  );

  if (phase.kind === 'done') {
    return (
      <section className="sw" aria-label="Stake widget">
        {header}
        <div className="sw-body sw-done">
          <span className="mono eyebrow-mist">DELEGATED · {phase.amount} SOL</span>
          <h3>You’re staking with Lua Sol Labs.</h3>
          <p>
            It activates at the next epoch boundary{nextEpoch ? ` (${nextEpoch})` : ''} and earns from then on. A share of
            what it earns goes to charities funding kids’ causes.
          </p>
          <div className="row gap-8 flexwrap">
            <a className="btn btn-sun" href={`https://solscan.io/tx/${phase.sig}`} target="_blank" rel="noreferrer">
              View on Solscan ↗
            </a>
            <button className="btn btn-ghost-mist" onClick={() => setPhase({ kind: 'idle' })}>
              Stake more
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="sw" aria-label="Stake widget">
      {header}
      <div className="sw-body">
        <div className="sw-well">
          <div className="sw-well-head mono">
            <label htmlFor="stake-amt">YOU STAKE</label>
            {connected && publicKey ? (
              <span className="row gap-8">
                <span>balance {balance == null ? '—' : fmt(balance / LAMPORTS_PER_SOL)} SOL</span>
                <button className="linkish" onClick={() => disconnect()} title="Disconnect wallet">
                  {wallet?.adapter.name ? `${wallet.adapter.name} · ` : ''}
                  {short(publicKey.toBase58())} ✕
                </button>
              </span>
            ) : (
              <span>wallet not connected</span>
            )}
          </div>
          <div className="sw-amount">
            <input
              id="stake-amt"
              inputMode="decimal"
              autoComplete="off"
              value={amount}
              disabled={busy}
              onChange={(e) => {
                const v = e.target.value.replace(/,/g, '.').replace(/[^0-9.]/g, '');
                if ((v.match(/\./g) || []).length <= 1) setAmount(v);
              }}
              aria-describedby="stake-hint"
            />
            <span className="sw-token">◎ SOL</span>
          </div>
          <div className="row gap-8 flexwrap">
            {['1', '10', '100'].map((v) => (
              <button key={v} className={amount === v ? 'chip on' : 'chip'} onClick={() => setAmount(v)} disabled={busy}>
                {v}
              </button>
            ))}
            <button className="chip" onClick={setMax} disabled={busy || balance == null}>
              MAX
            </button>
          </div>
        </div>

        <dl className="sw-rows">
          <div>
            <dt>Validator</dt>
            <dd>
              Lua Sol Labs · <span className="mono">{short(VOTE_ACCOUNT)}</span>
            </dd>
          </div>
          <div>
            <dt>Stake account rent (refunded)</dt>
            <dd className="mono">{rent == null ? '—' : fmt(rent / LAMPORTS_PER_SOL, 5)} SOL</dd>
          </div>
          <div>
            <dt>Total leaving wallet</dt>
            <dd className="mono">{valid && rent != null ? fmt((lamports + rent) / LAMPORTS_PER_SOL, 5) : '—'} SOL</dd>
          </div>
          <div>
            <dt>Est. yearly rewards</dt>
            <dd className="mono">{yearly != null ? `≈${fmt(yearly, 2)} SOL` : '—'}</dd>
          </div>
          <div>
            <dt>Starts earning</dt>
            <dd>{nextEpoch ? `Epoch ${nextEpoch}` : 'Next epoch'}</dd>
          </div>
        </dl>

        {phase.kind === 'error' && (
          <p className="sw-warn" role="alert">
            {phase.msg}
          </p>
        )}

        <button className="sw-cta" onClick={act} disabled={!!ctaDisabled} aria-busy={busy}>
          {busy && (
            <svg viewBox="0 0 24 24" width="20" height="20" className="spin" aria-hidden="true">
              <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity=".25" strokeWidth="3" />
              <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="14 50" />
            </svg>
          )}
          {cta}
        </button>
        <p id="stake-hint" className="mono sw-hint">
          {phase.kind === 'confirming'
            ? `sig ${short(phase.sig)} · polling until confirmed`
            : 'You keep stake and withdraw authority. Unstaking takes about one epoch.'}
        </p>
      </div>

      {pickerOpen && (
        <div
          className="picker-backdrop"
          onClick={(e) => e.target === e.currentTarget && setPickerOpen(false)}
          onKeyDown={(e) => e.key === 'Escape' && setPickerOpen(false)}
        >
          <div className="picker" role="dialog" aria-modal="true" aria-label="Choose a wallet" ref={pickerRef}>
            <div className="row between">
              <h3>Pick a wallet</h3>
              <button className="icon-btn" onClick={() => setPickerOpen(false)} aria-label="Close">
                ✕
              </button>
            </div>
            {installed.length > 0 ? (
              <ul>
                {installed.map((w) => (
                  <li key={w.adapter.name}>
                    <button className="wallet-btn" onClick={() => select(w.adapter.name)}>
                      {w.adapter.icon && <img src={w.adapter.icon} alt="" width={28} height={28} />}
                      <span>{w.adapter.name}</span>
                      <span className="mono muted-ink sm">DETECTED</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="stack gap-12">
                <p className="muted-ink">No Solana wallet found in this browser.</p>
                <a className="wallet-btn" href={phantomBrowse}>
                  <span>Open in Phantom (mobile)</span>
                </a>
                <a className="wallet-btn" href={LINKS.phantom} target="_blank" rel="noreferrer">
                  <span>Get Phantom</span>
                </a>
                <a className="wallet-btn" href={LINKS.solflare} target="_blank" rel="noreferrer">
                  <span>Get Solflare</span>
                </a>
                <a className="wallet-btn" href={LINKS.backpack} target="_blank" rel="noreferrer">
                  <span>Get Backpack</span>
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
