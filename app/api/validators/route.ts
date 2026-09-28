import { NextResponse } from 'next/server';
import { IDENTITY } from '@/lib/constants';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * Slim, searchable validator directory for the BAM checker picker.
 * Names/stake come from Stakewiz; `b` flags validators that appear in one of the
 * two most recent Jito BAM merkle trees (i.e. currently earning the subsidy).
 */

type Wiz = {
  identity: string;
  vote_identity: string;
  name: string | null;
  image: string | null;
  activated_stake: number;
  delinquent: boolean;
  epoch: number;
};

export type DirEntry = { n: string; i: string; v: string; img: string | null; s: number; b: boolean };

const GCS_BASE = 'https://storage.googleapis.com/jito-bam-boost/mainnet';

let memo: { at: number; body: DirEntry[] } | null = null;
const TTL = 30 * 60 * 1000;

async function bamSet(epoch: number): Promise<Set<string>> {
  const set = new Set<string>();
  const trees = await Promise.all(
    [epoch - 1, epoch - 2].map(async (e) => {
      try {
        const r = await fetch(`${GCS_BASE}/${e}/merkle_tree.json`, { next: { revalidate: 86400 } });
        return r.ok ? ((await r.json()) as { pubkey: string }[]) : [];
      } catch {
        return [];
      }
    }),
  );
  trees.flat().forEach((x) => set.add(x.pubkey));
  return set;
}

async function build(): Promise<DirEntry[]> {
  // The full Stakewiz list is ~2 MB, over Next's data-cache limit, so it's cached here and at the CDN instead.
  const r = await fetch('https://api.stakewiz.com/validators', { cache: 'no-store' });
  if (!r.ok) throw new Error(`Stakewiz ${r.status}`);
  const all = ((await r.json()) as Wiz[]).filter((v) => !v.delinquent && v.identity);
  const epoch = all.reduce((m, v) => Math.max(m, v.epoch || 0), 0);
  const bam = epoch ? await bamSet(epoch) : new Set<string>();
  return all
    .map((v) => ({
      // On-chain validator-info may still carry the old name until it's republished.
      n: v.identity === IDENTITY ? 'Lua Sol Labs' : (v.name || '').trim(),
      i: v.identity,
      v: v.vote_identity,
      img: v.image || null,
      s: Math.round(v.activated_stake || 0),
      b: bam.has(v.identity),
    }))
    .sort((a, b) => Number(b.b) - Number(a.b) || b.s - a.s);
}

export async function GET() {
  try {
    if (!memo || Date.now() - memo.at > TTL) memo = { at: Date.now(), body: await build() };
    return NextResponse.json(memo.body, {
      headers: { 'cache-control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
    });
  } catch (e) {
    if (memo) return NextResponse.json(memo.body);
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
