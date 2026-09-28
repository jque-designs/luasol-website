/**
 * Donation ledger. Every entry is an on-chain transfer from the donations wallet,
 * paid through The Giving Block (single-use deposit address per donation).
 * Add new donations to the top.
 */

export const DONATION_WALLET = 'LUa1tmkAeC4zoWh4veLdWbRD4McowhYLbjgJ1Z2EXZp';

export type Donation = {
  date: string; // ISO date (UTC)
  charity: string;
  url: string;
  cause: string;
  amount: number; // token units
  asset: 'USDC' | 'SOL';
  usd: number;
  tx: string;
  post?: string; // announcement on X
};

export const DONATIONS: Donation[] = [
  {
    date: '2026-01-14',
    charity: 'National Pediatric Cancer Foundation',
    url: 'https://nationalpcf.org',
    cause: 'Childhood cancer research',
    amount: 1000,
    asset: 'USDC',
    usd: 1000,
    tx: 'NVVzX2sPj1cR3k8knr8bSkK2hfhq9GcdwFwNj2tj7zpXE888TXjJ3PMueRNU3UNjL9ic8j872XtRgjjJDkwwMTf',
    post: 'https://x.com/LuaSol_Labs/status/2011471496774930604',
  },
  {
    date: '2026-01-14',
    charity: 'Ollie Hinkle Heart Foundation',
    url: 'https://theohhf.org',
    cause: 'Congenital heart disease',
    amount: 1000,
    asset: 'USDC',
    usd: 1000,
    tx: 'gxS9sdSp9M32vh459ZHUgsvUosiHu6cfjog9X21M1K3EfKvSjYwqe3qu4H1Lu9iTLSmyevnRhQsRypar6v43eR3',
    post: 'https://x.com/LuaSol_Labs/status/2011471496774930604',
  },
  {
    date: '2025-11-26',
    charity: 'Action Against Hunger',
    url: 'https://www.actionagainsthunger.org',
    cause: 'Child malnutrition',
    amount: 500,
    asset: 'USDC',
    usd: 500,
    tx: '35KFGYuxuVGSXDRKK7kxKPyKNvoH8zp7v1swhrehV9XT7jysq29muVSCi3UJmeapHr4kC2ifYn54vNod4z1QxyVD',
  },
];

export const DONATED_USD = DONATIONS.reduce((s, d) => s + d.usd, 0);
export const CHARITIES_FUNDED = new Set(DONATIONS.map((d) => d.charity)).size;
