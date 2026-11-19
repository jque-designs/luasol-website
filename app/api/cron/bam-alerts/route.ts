import { NextRequest, NextResponse } from 'next/server';
import { checkBam, type BamResult } from '@/lib/bam';
import { esc, sendTelegram } from '@/lib/telegram';
import { IDENTITY, SITE, short } from '@/lib/constants';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Within this many epochs of a claim deadline the alert is marked urgent. */
const URGENT_EPOCHS = 3;

const f4 = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 4 });

function message(r: BamResult) {
  const open = r.epochs.filter((e) => e.status === 'claimable').sort((a, b) => a.epoch - b.epoch);
  const left = r.summary.nextDeadline !== null ? r.summary.nextDeadline - r.current : null;
  const urgent = left !== null && left <= URGENT_EPOCHS;
  const lines = [
    `${urgent ? '⚠️' : '🟢'} <b>BAM subsidy ready to claim</b>`,
    `Validator <code>${esc(short(r.validator, 5))}</code>`,
    `<b>${f4(r.summary.unclaimed)} JitoSOL</b> across ${open.length} epoch${open.length > 1 ? 's' : ''}: ${open.map((e) => e.epoch).join(', ')}`,
  ];
  if (left !== null) lines.push(`${urgent ? '<b>' : ''}Oldest one expires after epoch ${r.summary.nextDeadline} (${left} epoch${left === 1 ? '' : 's'} left)${urgent ? '</b>' : ''}`);
  lines.push(`Current epoch ${r.current}`, '', `Claim: ${SITE}/tools?validator=${r.validator}#bam`);
  return lines.join('\n');
}

/**
 * Vercel Cron (see vercel.json). Sends one Telegram message per watched validator that has
 * anything claimable. Quiet when everything is claimed. ?force=1 sends a status even when empty
 * (handy to test the bot).
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const force = req.nextUrl.searchParams.get('force') === '1';
  const watched = (process.env.BAM_ALERT_VALIDATORS || IDENTITY)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const results: { validator: string; sent: boolean; claimable?: number; error?: string }[] = [];
  for (const v of watched) {
    try {
      const r = await checkBam(v);
      if (r.summary.epochsUnclaimed > 0) {
        await sendTelegram(message(r));
        results.push({ validator: v, sent: true, claimable: r.summary.unclaimed });
      } else {
        if (force) await sendTelegram(`✅ <b>BAM</b> <code>${esc(short(v, 5))}</code>: nothing to claim (epoch ${r.current}).`);
        results.push({ validator: v, sent: force, claimable: 0 });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push({ validator: v, sent: false, error: msg });
    }
  }
  const failed = results.some((r) => r.error);
  return NextResponse.json({ results }, { status: failed ? 500 : 200 });
}
