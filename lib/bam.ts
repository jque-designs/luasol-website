import 'server-only';
import { PublicKey } from '@solana/web3.js';
import { proofFor, type MerkleEntry } from './bamMerkle';

/**
 * Jito BAM (JIP-31) subsidy checker, ported from traderjque/bam-rewards-checker.
 * Allocations come from Jito's per-epoch merkle trees; claim status from the claim_status PDA on-chain.
 */

const RPC_URL = process.env.RPC_URL || 'https://api.mainnet-beta.solana.com';
const PROGRAM_ID = new PublicKey('BoostxbPp2ENYHGcTLYt1obpcY13HE4NojdqNWdzqSSb');
const JITOSOL_MINT = new PublicKey('J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn');
const GCS_BASE = 'https://storage.googleapis.com/jito-bam-boost/mainnet';
const CLAIM_STATUS_DISCRIMINATOR = Buffer.from([22, 183, 249, 157, 247, 95, 150, 96]);
const TOKEN_PROGRAM = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const ATA_PROGRAM = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
const FIRST_EPOCH = 911;

/**
 * claimed: claim_status PDA exists. claimable: distributor is open and its claim window hasn't passed.
 * expired: Jito clawed the allocation back (distributor closed or past its clawback epoch).
 */
export type BamStatus = 'claimed' | 'claimable' | 'expired';
export type BamEpoch = {
  epoch: number;
  amount: number;
  claimed: boolean;
  claimedAmount: number;
  claimPda: string;
  status: BamStatus;
  /** Last epoch a claim can land in (only for claimable rows). */
  claimBy: number | null;
};
export type BamResult = {
  validator: string;
  scanned: [number, number];
  epochs: BamEpoch[];
  current: number;
  summary: {
    allocated: number;
    claimed: number;
    /** Claimable now. */
    unclaimed: number;
    expired: number;
    eligible: number;
    epochsClaimed: number;
    epochsUnclaimed: number;
    epochsExpired: number;
    /** Soonest claim deadline among claimable epochs. */
    nextDeadline: number | null;
  };
};

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

function distributorPda(epoch: number) {
  const epochBuf = Buffer.alloc(8);
  epochBuf.writeBigUInt64LE(BigInt(epoch));
  return PublicKey.findProgramAddressSync([Buffer.from('merkle_distributor'), JITOSOL_MINT.toBuffer(), epochBuf], PROGRAM_ID)[0];
}

function ata(owner: PublicKey) {
  return PublicKey.findProgramAddressSync([owner.toBuffer(), TOKEN_PROGRAM.toBuffer(), JITOSOL_MINT.toBuffer()], ATA_PROGRAM)[0];
}

function claimPda(claimant: PublicKey, epoch: number) {
  const distributor = distributorPda(epoch);
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
    if (entry) hits.push({ epoch: range[i], amount: Number(entry.amount) });
  });

  const pdas = hits.map((h) => claimPda(claimant, h.epoch));
  const dists = hits.map((h) => distributorPda(h.epoch));
  const [infos, distInfos] = await Promise.all([getMany(pdas), getMany(dists)]);

  let allocated = 0;
  let claimed = 0;
  let unclaimed = 0;
  let expired = 0;
  let epochsClaimed = 0;
  let epochsExpired = 0;
  let nextDeadline: number | null = null;
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
    let status: BamStatus;
    let claimBy: number | null = null;
    if (isClaimed) {
      status = 'claimed';
      claimed += claimedAmount;
      epochsClaimed++;
    } else {
      const d = parseDistributor(distInfos[i]);
      if (d && !d.clawedBack && current <= d.endEpoch) {
        status = 'claimable';
        claimBy = d.endEpoch;
        unclaimed += amount;
        if (nextDeadline === null || claimBy < nextDeadline) nextDeadline = claimBy;
      } else {
        status = 'expired';
        expired += amount;
        epochsExpired++;
      }
    }
    return { epoch: h.epoch, amount, claimed: isClaimed, claimedAmount, claimPda: pdas[i].toBase58(), status, claimBy };
  });

  epochs.sort((a, b) => b.epoch - a.epoch);
  return {
    validator,
    scanned: [FIRST_EPOCH, current],
    current,
    epochs,
    summary: {
      allocated,
      claimed,
      unclaimed,
      expired,
      eligible: epochs.length,
      epochsClaimed,
      epochsUnclaimed: epochs.length - epochsClaimed - epochsExpired,
      epochsExpired,
      nextDeadline,
    },
  };
}

type AccountInfo = { data: [string, string] } | null;

async function getMany(keys: PublicKey[]): Promise<AccountInfo[]> {
  const out: AccountInfo[] = [];
  for (let i = 0; i < keys.length; i += 100) {
    const chunk = keys.slice(i, i + 100).map((p) => p.toBase58());
    const r = await rpc<{ value: AccountInfo[] }>('getMultipleAccounts', [chunk, { encoding: 'base64', commitment: 'confirmed' }]);
    out.push(...r.value);
  }
  return out;
}

/**
 * MerkleDistributor layout (verified against mainnet accounts): 8 discriminator, 1 bump, 32 root, 32 mint,
 * then u64 max_total_claim, max_num_nodes, total_amount_claimed, num_nodes_claimed, epoch, end_epoch,
 * clawback_start_epoch, then 32 clawback receiver and a 1-byte clawed_back flag.
 */
function parseDistributor(info: AccountInfo) {
  if (!info) return null;
  const buf = Buffer.from(info.data[0], 'base64');
  if (buf.length < 162) return null;
  const u64 = (i: number) => Number(buf.readBigUInt64LE(73 + i * 8));
  return { root: buf.subarray(9, 41), epoch: u64(4), endEpoch: u64(5), clawbackStart: u64(6), clawedBack: buf[161] === 1 };
}

export type ClaimItem = {
  epoch: number;
  /** Lamports, as a string to keep u64 precision. */
  amount: string;
  proof: string[]; // hex
  distributor: string;
  from: string;
  claimStatus: string;
  claimBy: number;
};

/**
 * Everything a wallet needs to build claim instructions for every claimable epoch.
 * Proofs are rebuilt from Jito's published tree and checked against the root stored on-chain.
 */
export async function claimPlan(validator: string): Promise<{ validator: string; to: string; items: ClaimItem[] }> {
  const res = await checkBam(validator);
  const claimant = new PublicKey(validator);
  const todo = res.epochs.filter((e) => e.status === 'claimable');
  const dists = todo.map((e) => distributorPda(e.epoch));
  const distInfos = await getMany(dists);
  const items: ClaimItem[] = [];
  for (let i = 0; i < todo.length; i++) {
    const e = todo[i];
    const tree = await fetchTree(e.epoch);
    const d = parseDistributor(distInfos[i]);
    if (!tree || !d) continue;
    const p = proofFor(tree, validator);
    if (!p || !p.root.equals(d.root)) throw new Error(`Merkle proof for epoch ${e.epoch} doesn't match the on-chain root`);
    items.push({
      epoch: e.epoch,
      amount: p.amount.toString(),
      proof: p.proof.map((b) => b.toString('hex')),
      distributor: dists[i].toBase58(),
      from: ata(dists[i]).toBase58(),
      claimStatus: claimPda(claimant, e.epoch).toBase58(),
      claimBy: e.claimBy ?? d.endEpoch,
    });
  }
  return { validator, to: ata(claimant).toBase58(), items };
}
