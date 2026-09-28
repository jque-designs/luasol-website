import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RPC_URL = process.env.RPC_URL || 'https://api.mainnet-beta.solana.com';

// Only what the stake widget needs. Keeps the private RPC key from being used as an open relay.
const ALLOWED = new Set([
  'getLatestBlockhash',
  'getBalance',
  'getMinimumBalanceForRentExemption',
  'sendTransaction',
  'simulateTransaction',
  'getSignatureStatuses',
  'getBlockHeight',
  'getFeeForMessage',
  'isBlockhashValid',
  'getAccountInfo',
  'getEpochInfo',
  'getTokenAccountsByOwner',
  'getTokenAccountBalance',
]);

type RpcReq = { method?: unknown; jsonrpc?: unknown; id?: unknown; params?: unknown };

export async function POST(req: NextRequest) {
  let body: RpcReq | RpcReq[];
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 });
  }
  const calls = Array.isArray(body) ? body : [body];
  if (calls.length === 0 || calls.length > 10) {
    return NextResponse.json({ error: 'bad batch' }, { status: 400 });
  }
  for (const c of calls) {
    if (typeof c?.method !== 'string' || !ALLOWED.has(c.method)) {
      return NextResponse.json(
        { jsonrpc: '2.0', id: c?.id ?? null, error: { code: -32601, message: 'method not allowed' } },
        { status: 403 },
      );
    }
  }
  const upstream = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}
