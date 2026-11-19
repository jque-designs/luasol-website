'use client';

import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletReadyState } from '@solana/wallet-adapter-base';
import { PublicKey, SystemProgram, Transaction, TransactionInstruction, type Connection } from '@solana/web3.js';
import { useMemo, useState } from 'react';
import { short } from '@/lib/constants';

/**
 * One-click claim for Jito BAM subsidies. The program only pays the validator identity
 * (it must sign as claimant), so this works when the connected wallet IS the identity key.
 * Proofs come from /api/bam/claim; the wallet builds, signs and sends everything itself.
 */

const PROGRAM_ID = new PublicKey('BoostxbPp2ENYHGcTLYt1obpcY13HE4NojdqNWdzqSSb');
const JITOSOL_MINT = new PublicKey('J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn');
const TOKEN_PROGRAM = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const ATA_PROGRAM = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
const CLAIM_DISCRIMINATOR = [62, 198, 214, 193, 213, 159, 108, 210];
const MAX_TX_BYTES = 1232;

type ClaimItem = { epoch: number; amount: string; proof: string[]; distributor: string; from: string; claimStatus: string; claimBy: number };
type Plan = { validator: string; to: string; items: ClaimItem[] };

type Phase =
  | { kind: 'idle' }
  | { kind: 'preparing' }
  | { kind: 'signing'; n: number }
  | { kind: 'sending'; done: number; total: number }
  | { kind: 'done'; sigs: string[]; epochs: number[] }
  | { kind: 'error'; msg: string };

const hex = (h: string) => Uint8Array.from(h.match(/../g)!.map((b) => parseInt(b, 16)));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function claimData(amount: string, proof: string[]) {
  const buf = new Uint8Array(8 + 8 + 4 + proof.length * 32);
  const dv = new DataView(buf.buffer);
  buf.set(CLAIM_DISCRIMINATOR, 0);
  dv.setBigUint64(8, BigInt(amount), true);
  dv.setUint32(16, proof.length, true);
  proof.forEach((p, i) => buf.set(hex(p), 20 + i * 32));
  return buf;
}

function claimIx(claimant: PublicKey, to: PublicKey, it: ClaimItem) {
  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: new PublicKey(it.distributor), isSigner: false, isWritable: true },
      { pubkey: new PublicKey(it.claimStatus), isSigner: false, isWritable: true },
      { pubkey: new PublicKey(it.from), isSigner: false, isWritable: true },
      { pubkey: to, isSigner: false, isWritable: true },
      { pubkey: claimant, isSigner: true, isWritable: true },
      { pubkey: TOKEN_PROGRAM, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(claimData(it.amount, it.proof)),
  });
}

/** createAssociatedTokenAccountIdempotent for the identity's JitoSOL account. */
function ataIx(owner: PublicKey, ata: PublicKey) {
  return new TransactionInstruction({
    programId: ATA_PROGRAM,
    keys: [
      { pubkey: owner, isSigner: true, isWritable: true },
      { pubkey: ata, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: false, isWritable: false },
      { pubkey: JITOSOL_MINT, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM, isSigner: false, isWritable: false },
    ],
    data: Buffer.from([1]),
  });
}

const fits = (tx: Transaction) => {
  try {
    return tx.serialize({ requireAllSignatures: false, verifySignatures: false }).length <= MAX_TX_BYTES;
  } catch {
    return false;
  }
};

/** Packs as many epoch claims into each transaction as fit, so most validators sign once. */
export function pack(claimant: PublicKey, plan: Plan, blockhash: string, lastValidBlockHeight: number) {
  const to = new PublicKey(plan.to);
  const txs: { tx: Transaction; epochs: number[] }[] = [];
  const fresh = (first: boolean) => {
    const tx = new Transaction({ feePayer: claimant, blockhash, lastValidBlockHeight });
    if (first) tx.add(ataIx(claimant, to));
    return { tx, epochs: [] as number[] };
  };
  let cur = fresh(true);
  for (const it of plan.items) {
    const ix = claimIx(claimant, to, it);
    cur.tx.add(ix);
    if (!fits(cur.tx)) {
      cur.tx.instructions.pop();
      if (cur.epochs.length) txs.push(cur);
      cur = fresh(false);
      cur.tx.add(ix);
    }
    cur.epochs.push(it.epoch);
  }
  if (cur.epochs.length) txs.push(cur);
  return txs;
}

async function confirmSig(connection: Connection, sig: string, lastValidBlockHeight: number) {
  for (;;) {
    const { value } = await connection.getSignatureStatuses([sig]);
    const st = value[0];
    if (st?.err) throw new Error('A claim transaction failed on-chain. Nothing in it was claimed.');
    if (st && (st.confirmationStatus === 'confirmed' || st.confirmationStatus === 'finalized')) return;
    const height = await connection.getBlockHeight('confirmed');
    if (height > lastValidBlockHeight) throw new Error('The transaction expired before it landed. Try again.');
    await sleep(1500);
  }
}

function errorMessage(e: unknown) {
  const m = e instanceof Error ? e.message : String(e);
  if (/reject|denied|cancel/i.test(m)) return 'Cancelled in your wallet.';
  if (/insufficient|0x1\b/i.test(m)) return 'The identity wallet needs a little SOL for fees.';
  return m.length > 200 ? `${m.slice(0, 200)}…` : m;
}

export default function BamClaim({ validator, total, count, onClaimed }: { validator: string; total: number; count: number; onClaimed: () => void }) {
  const { connection } = useConnection();
  const { wallets, select, wallet, publicKey, connected, connecting, disconnect, sendTransaction, signAllTransactions } = useWallet();
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [picker, setPicker] = useState(false);

  const installed = useMemo(
    () => wallets.filter((w) => w.readyState === WalletReadyState.Installed || w.readyState === WalletReadyState.Loadable),
    [wallets],
  );
  const isIdentity = !!publicKey && publicKey.toBase58() === validator;
  const busy = phase.kind === 'preparing' || phase.kind === 'signing' || phase.kind === 'sending';

  const claim = async () => {
    if (!publicKey || !isIdentity || busy) return;
    setPhase({ kind: 'preparing' });
    try {
      const res = await fetch(`/api/bam/claim?validator=${encodeURIComponent(validator)}`);
      const plan: Plan & { error?: string } = await res.json();
      if (!res.ok) throw new Error(plan.error || 'Couldn’t prepare the claim');
      if (!plan.items.length) throw new Error('Nothing left to claim. It may have just been claimed, or the window closed.');

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
      const txs = pack(publicKey, plan, blockhash, lastValidBlockHeight);
      setPhase({ kind: 'signing', n: txs.length });

      const sigs: string[] = [];
      if (signAllTransactions && txs.length > 1) {
        const signed = await signAllTransactions(txs.map((t) => t.tx));
        setPhase({ kind: 'sending', done: 0, total: signed.length });
        for (let i = 0; i < signed.length; i++) {
          const sig = await connection.sendRawTransaction(signed[i].serialize(), { maxRetries: 3 });
          await confirmSig(connection, sig, lastValidBlockHeight);
          sigs.push(sig);
          setPhase({ kind: 'sending', done: i + 1, total: signed.length });
        }
      } else {
        for (let i = 0; i < txs.length; i++) {
          const sig = await sendTransaction(txs[i].tx, connection, { maxRetries: 3 });
          setPhase({ kind: 'sending', done: i, total: txs.length });
          await confirmSig(connection, sig, lastValidBlockHeight);
          sigs.push(sig);
        }
      }
      setPhase({ kind: 'done', sigs, epochs: plan.items.map((i) => i.epoch) });
      onClaimed();
    } catch (e) {
      setPhase({ kind: 'error', msg: errorMessage(e) });
    }
  };

  let cta = `Claim all · ${total.toLocaleString('en-US', { maximumFractionDigits: 4 })} JitoSOL`;
  if (!connected) cta = connecting ? 'Connecting…' : 'Connect identity wallet';
  else if (!isIdentity) cta = 'Wrong wallet';
  else if (phase.kind === 'preparing') cta = 'Building proofs…';
  else if (phase.kind === 'signing') cta = phase.n > 1 ? `Approve ${phase.n} transactions…` : 'Approve in your wallet…';
  else if (phase.kind === 'sending') cta = `Confirming ${phase.done}/${phase.total}…`;

  return (
    <div className="claim-box stack gap-12">
      <span className="mono" style={{ fontSize: 11, letterSpacing: '.12em', color: 'var(--grey)' }}>
        ONE-CLICK CLAIM · {count} EPOCH{count > 1 ? 'S' : ''}
      </span>
      <p style={{ fontSize: 15, color: 'var(--ink-2)' }}>
        Jito only pays the validator identity, so the identity key has to sign. If it’s in a browser wallet (or a
        hardware wallet), connect it and claim every open epoch at once. Tokens land in the identity’s JitoSOL account.
      </p>

      <div className="claim-row">
        <button
          className="claim-btn"
          disabled={busy || (connected && !isIdentity) || phase.kind === 'done'}
          onClick={() => (connected ? claim() : setPicker(true))}
        >
          {phase.kind === 'done' ? 'Claimed' : cta}
        </button>
        {connected && publicKey && (
          <span className="mono claim-who">
            {wallet?.adapter.name ? `${wallet.adapter.name} · ` : ''}
            {short(publicKey.toBase58(), 4)}{' '}
            <button className="linkish" onClick={() => disconnect()}>
              disconnect
            </button>
          </span>
        )}
      </div>

      {connected && !isIdentity && (
        <div className="bam-err">
          This wallet is {short(publicKey!.toBase58(), 5)}, not the validator identity {short(validator, 5)}. Only the
          identity can claim. Connect that key, or use the CLI commands below.
        </div>
      )}
      {phase.kind === 'error' && <div className="bam-err">{phase.msg}</div>}
      {phase.kind === 'done' && (
        <div className="claim-ok">
          Claimed epochs {phase.epochs.join(', ')}.{' '}
          {phase.sigs.map((s, i) => (
            <a key={s} href={`https://solscan.io/tx/${s}`} target="_blank" rel="noreferrer">
              {phase.sigs.length > 1 ? `tx ${i + 1}` : 'View transaction'} ↗{' '}
            </a>
          ))}
        </div>
      )}
      <span className="bam-note">
        Keeping your identity key off the browser is safer. Only import it into a wallet you trust, and remove it after
        claiming if you don’t use it there otherwise.
      </span>

      {picker && !connected && (
        <div className="picker-backdrop" onClick={(e) => e.target === e.currentTarget && setPicker(false)}>
          <div className="picker" role="dialog" aria-modal="true" aria-label="Choose a wallet">
            <h3>Connect the identity wallet</h3>
            {installed.length > 0 ? (
              installed.map((w) => (
                <button
                  key={w.adapter.name}
                  className="wallet-btn"
                  onClick={() => {
                    select(w.adapter.name);
                    setPicker(false);
                  }}
                >
                  {w.adapter.name}
                </button>
              ))
            ) : (
              <p className="muted-ink">No Solana wallet found in this browser.</p>
            )}
            <button className="linkish" onClick={() => setPicker(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
