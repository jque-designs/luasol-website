import { createHash } from 'crypto';
import { PublicKey } from '@solana/web3.js';

/**
 * Rebuilds a Jito BAM boost merkle tree from the published entries, exactly as
 * jito-bam-boost-cli does: duplicate claimants are merged (first position kept),
 * leaf = sha256(0x00 || sha256(claimant || amount_le)), parents use sorted pairs
 * sha256(0x01 || min || max), and an odd node is paired with itself.
 */

export type MerkleEntry = { pubkey: string; amount: number | string };

const sha = (...parts: Buffer[]) => {
  const h = createHash('sha256');
  for (const p of parts) h.update(p);
  return h.digest();
};
const LEAF = Buffer.from([0]);
const MID = Buffer.from([1]);

function u64le(n: bigint) {
  const b = Buffer.alloc(8);
  b.writeBigUInt64LE(n);
  return b;
}

function mergeEntries(entries: MerkleEntry[]) {
  const map = new Map<string, bigint>();
  for (const e of entries) map.set(e.pubkey, (map.get(e.pubkey) ?? 0n) + BigInt(e.amount));
  return [...map.entries()].map(([pubkey, amount]) => ({ pubkey, amount }));
}

function parent(l: Buffer, r: Buffer) {
  return Buffer.compare(l, r) <= 0 ? sha(MID, l, r) : sha(MID, r, l);
}

/** Root plus the proof and amount (lamports) for one claimant, or null if it isn't in the tree. */
export function proofFor(entries: MerkleEntry[], claimant: string) {
  const nodes = mergeEntries(entries);
  const index = nodes.findIndex((n) => n.pubkey === claimant);
  if (index < 0) return null;

  let level: Buffer[] = nodes.map((n) => sha(LEAF, sha(new PublicKey(n.pubkey).toBuffer(), u64le(n.amount))));
  let idx = index;
  const proof: Buffer[] = [];
  while (level.length > 1) {
    const sib = idx % 2 === 0 ? (idx + 1 < level.length ? level[idx + 1] : level[idx]) : level[idx - 1];
    proof.push(sib);
    const next: Buffer[] = [];
    for (let i = 0; i < level.length; i += 2) next.push(parent(level[i], i + 1 < level.length ? level[i + 1] : level[i]));
    level = next;
    idx = Math.floor(idx / 2);
  }
  return { root: level[0], proof, amount: nodes[index].amount };
}
