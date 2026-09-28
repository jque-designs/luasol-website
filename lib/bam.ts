import 'server-only';
import { PublicKey } from '@solana/web3.js';

/**
 * Jito BAM (JIP-31) subsidy checker, ported from traderjque/bam-rewards-checker.
 * Allocations come from Jito's per-epoch merkle trees; claim status from the claim_status PDA on-chain.
 */

const RPC_URL = process.env.RPC_URL || 'https://api.mainnet-beta.solana.com';
const PROGRAM_ID = new PublicKey('BoostxbPp2ENYHGcTLYt1obpcY13HE4NojdqNWdzqSSb');
const JITOSOL_MINT = new PublicKey('J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn');
const GCS_BASE = 'https://storage.googleapis.com/jito-bam-boost/mainnet';
const CLAIM_STATUS_DISCRIMINATOR = Buffer.from([22, 183, 249, 157, 247, 95, 150, 96]);
const FIRST_EPOCH = 911;

export type BamEpoch = { epoch: number; amount: number; claimed: boolean; claimedAmount: number; claimPda: string };
export type BamResult = {
  validator: string;
  scanned: [number, number];
  epochs: BamEpoch[];
  summary: { allocated: number; claimed: number; unclaimed: number; eligible: number; epochsClaimed: number; epochsUnclaimed: number };
};

type MerkleEntry = { pubkey: string; amount: number };

async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  const res = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`${method} ${res.status}`);
  const j = await res.json();
  if (j.error) throw new Error(j.error.message);
  return j.result as T;
}

/** Closed epochs never change, so trees are cached for a day at the data layer. */
async function fetchTree(epoch: number): Promise<MerkleEntry[] | null> {
  try {
    const res = await fetch(`${GCS_BASE}/${epoch}/merkle_tree.json`, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    return (await res.json()) as MerkleEntry[];
  } catch {
    return null;
  }
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return out;
}

function claimPda(claimant: PublicKey, epoch: number) {
  const epochBuf = Buffer.alloc(8);
  epochBuf.writeBigUInt64LE(BigInt(epoch));
  const [distributor] = PublicKey.findProgramAddressSync(
    [Buffer.from('merkle_distributor'), JITOSOL_MINT.toBuffer(), epochBuf],
    PROGRAM_ID,
  );
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('claim_status'), claimant.toBuffer(), distributor.toBuffer()],
    PROGRAM_ID,
  );
  return pda;
}

export async function checkBam(validator: string): Promise<BamResult> {
  const claimant = new PublicKey(validator); // throws on invalid input
  const { epoch: current } = await rpc<{ epoch: number }>('getEpochInfo', [{ commitment: 'confirmed' }]);
  const range: number[] = [];
  for (let e = FIRST_EPOCH; e <= current; e++) range.push(e);

  const trees = await mapLimit(range, 16, fetchTree);
  const hits: { epoch: number; amount: number }[] = [];
  trees.forEach((t, i) => {
    const entry = t?.find((x) => x.pubkey === validator);
    if (entry) hits.push({ epoch: range[i], amount: entry.amount });
  });

  const pdas = hits.map((h) => claimPda(claimant, h.epoch));
  const infos: ({ data: [string, string] } | null)[] = [];
  for (let i = 0; i < pdas.length; i += 100) {
    const chunk = pdas.slice(i, i + 100).map((p) => p.toBase58());
    const r = await rpc<{ value: ({ data: [string, string] } | null)[] }>('getMultipleAccounts', [
      chunk,
      { encoding: 'base64', commitment: 'confirmed' },
    ]);
    infos.push(...r.value);
  }

  let allocated = 0;
  let claimed = 0;
  let unclaimed = 0;
  let epochsClaimed = 0;
  const epochs: BamEpoch[] = hits.map((h, i) => {
    const info = infos[i];
    let isClaimed = false;
    let claimedAmount = 0;
    if (info) {
      const buf = Buffer.from(info.data[0], 'base64');
      if (buf.length >= 48 && buf.subarray(0, 8).equals(CLAIM_STATUS_DISCRIMINATOR)) {
        isClaimed = true;
        claimedAmount = Number(buf.readBigUInt64LE(40)) / 1e9;
      }
    }
    const amount = h.amount / 1e9;
    allocated += amount;
    if (isClaimed) {
      claimed += claimedAmount;
      epochsClaimed++;
    } else {
      unclaimed += amount;
    }
    return { epoch: h.epoch, amount, claimed: isClaimed, claimedAmount, claimPda: pdas[i].toBase58() };
  });

  epochs.sort((a, b) => b.epoch - a.epoch);
  return {
    validator,
    scanned: [FIRST_EPOCH, current],
    epochs,
    summary: {
      allocated,
      claimed,
      unclaimed,
      eligible: epochs.length,
      epochsClaimed,
      epochsUnclaimed: epochs.length - epochsClaimed,
    },
  };
}
