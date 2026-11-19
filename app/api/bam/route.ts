import { NextRequest, NextResponse } from 'next/server';
import { checkBam } from '@/lib/bam';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export async function GET(req: NextRequest) {
  const validator = (req.nextUrl.searchParams.get('validator') || '').trim();
  if (!BASE58.test(validator)) {
    return NextResponse.json({ error: 'That doesn’t look like a Solana address.' }, { status: 400 });
  }
  try {
    const result = await checkBam(validator);
    return NextResponse.json(result, {
      headers: { 'cache-control': 'public, s-maxage=120, stale-while-revalidate=600' },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `Couldn’t complete the check: ${msg}` }, { status: 502 });
  }
}
