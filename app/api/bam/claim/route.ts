import { NextRequest, NextResponse } from 'next/server';
import { claimPlan } from '@/lib/bam';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

/** Merkle proofs + accounts for every claimable epoch. Read-only; the wallet signs and sends. */
export async function GET(req: NextRequest) {
  const validator = (req.nextUrl.searchParams.get('validator') || '').trim();
  if (!BASE58.test(validator)) {
    return NextResponse.json({ error: 'That doesn’t look like a Solana address.' }, { status: 400 });
  }
  try {
    const plan = await claimPlan(validator);
    return NextResponse.json(plan, { headers: { 'cache-control': 'no-store' } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `Couldn’t prepare the claim: ${msg}` }, { status: 502 });
  }
}
