# luasol.io

Website for **Lua Sol Labs**: tools, apps and infrastructure for Solana, plus the Lua Sol mainnet validator.

- `/` home: live validator stats, native stake widget, what we do, giving
- `/tools` tools index and the **BAM Subsidy Checker** (Jito JIP-31)

## Stack

Next.js 15 (App Router) · React 19 · `@solana/web3.js` v1 · `@solana/wallet-adapter-react` (Wallet Standard auto-detect, no bundled adapters). Fonts via `next/font`: Bricolage Grotesque (display), Martian Mono (data), Montserrat (wordmark).

## Live data (ISR, 60 s)

| What | Source |
| --- | --- |
| Active stake, activating stake, commission, MEV commission, skip rate, vote success, uptime, client, location, APY, Wiz score | Stakewiz API |
| Epoch + progress (drives the terminator line on the hero) | `getEpochInfo` over RPC |

Everything falls back to `—` if a source is down.

## Native stake widget

Builds `createAccount` + `delegate` to vote account `Lua298Wo…f6tJ` in the browser; the user keeps stake and withdraw authority. Wallet RPC goes through `/api/rpc`, a proxy with a method allowlist so a private RPC key is never exposed. Confirmation is polled over HTTP.

## BAM Subsidy Checker

`/api/bam?validator=<identity>` — ported from `traderjque/bam-rewards-checker`. Reads Jito's per-epoch merkle trees (cached 24 h) and batch-reads `claim_status` PDAs with `getMultipleAccounts`.

## Env

- `RPC_URL`: private mainnet RPC recommended (public endpoint works but is rate-limited).

## Dev

```bash
npm i
npm run dev
```

## Brand

The mark is the original Lua Sol logo rebuilt as vector (`components/Mark.tsx`): outer crescent C1−C2, inner crescent C3−C4, sun C5, seven rays on a 22.5° fan. Colours from the logo gradient: Lua `#2A2873`, Sol `#F2835A`, terminator `#B3447F`, ink `#2E2366`, mist `#F3EFF8`, amber `#FBB232`.
