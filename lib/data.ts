import 'server-only';
import { MEV_COMMISSION_PCT, VOTE_ACCOUNT } from './constants';

const RPC_URL = process.env.RPC_URL || 'https://api.mainnet-beta.solana.com';

export type Validator = {
  activeStake: number; // SOL
  activatingStake: number | null; // SOL
  commissionPct: number;
  mevCommissionPct: number | null;
  skipRate: number; // %
  voteSuccess: number; // %
  uptime: number; // %
  version: string;
  firstEpoch: number;
  city: string | null;
  country: string | null;
  delinquent: boolean;
  isJito: boolean;
  apy: number | null; // % (Stakewiz total APY estimate)
  wizScore: number | null;
};

export type Epoch = { epoch: number; slotIndex: number; slotsInEpoch: number; pct: number };

async function rpc<T>(method: string, params: unknown[] = []): Promise<T> {
  const res = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error(`${method} ${res.status}`);
  const j = await res.json();
  if (j.error) throw new Error(j.error.message);
  return j.result as T;
}

const n = (v: unknown) => (v == null || v === '' || Number.isNaN(Number(v)) ? null : Number(v));

async function getActivating(): Promise<number | null> {
  try {
    const res = await fetch(`https://api.stakewiz.com/validator_epoch_stakes/${VOTE_ACCOUNT}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const j = await res.json();
    const row = Array.isArray(j) ? j[0] : j;
    return n(row?.activating_stake);
  } catch {
    return null;
  }
}

export async function getValidator(): Promise<Validator | null> {
  try {
    const [res, activatingStake] = await Promise.all([
      fetch(`https://api.stakewiz.com/validator/${VOTE_ACCOUNT}`, { next: { revalidate: 300 } }),
      getActivating(),
    ]);
    if (!res.ok) return null;
    const v = await res.json();
    // Stakewiz reports commission in basis points (500 = 5%); older payloads used whole percent.
    const c = Number(v.commission);
    return {
      activeStake: Number(v.activated_stake),
      activatingStake,
      commissionPct: c > 100 ? c / 100 : c,
      mevCommissionPct: MEV_COMMISSION_PCT,
      skipRate: Number(v.skip_rate ?? v.wiz_skip_rate ?? 0),
      voteSuccess: Number(v.vote_success),
      uptime: Number(v.uptime),
      version: String(v.version ?? ''),
      firstEpoch: Number(v.first_epoch_with_stake),
      city: v.ip_city ?? null,
      country: v.ip_country ?? null,
      delinquent: Boolean(v.delinquent),
      isJito: Boolean(v.is_jito),
      apy: n(v.total_apy),
      wizScore: n(v.wiz_score),
    };
  } catch {
    return null;
  }
}

export async function getEpoch(): Promise<Epoch | null> {
  try {
    const e = await rpc<{ epoch: number; slotIndex: number; slotsInEpoch: number }>('getEpochInfo', [
      { commitment: 'confirmed' },
    ]);
    return { ...e, pct: (e.slotIndex / e.slotsInEpoch) * 100 };
  } catch {
    return null;
  }
}

export async function getAll() {
  const [validator, epoch] = await Promise.all([getValidator(), getEpoch()]);
  return { validator, epoch };
}

export const num = (v: number, d = 0) =>
  v.toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: d });
