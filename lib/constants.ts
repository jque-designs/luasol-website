export const VOTE_ACCOUNT = 'Lua298Woc4rgcswL64yfWAL4EW44FgBZeLsKforf6tJ';
export const IDENTITY = 'Lua1fxRRHCnjVAYdfGyv2GbUsRHGM2DN2wgpWuF2WSb';
export const SITE = 'https://luasol.io';

/** Keep this much SOL in the wallet for fees when the user hits MAX. */
export const FEE_RESERVE_SOL = 0.01;
export const MIN_STAKE_SOL = 0.01;

export const LINKS = {
  stakewiz: `https://stakewiz.com/validator/${VOTE_ACCOUNT}`,
  validatorsApp: `https://www.validators.app/validators/${IDENTITY}?locale=en&network=mainnet`,
  solscanVote: `https://solscan.io/account/${VOTE_ACCOUNT}`,
  decentra: `https://stats.decentra.cloud/validators/${VOTE_ACCOUNT}`,
  jito: `https://www.jito.network/validator/${VOTE_ACCOUNT}/`,
  x: 'https://x.com/LuaSol_Labs',
  telegram: 'https://t.me/therealjque',
  bamRepo: 'https://github.com/traderjque/bam-rewards-checker',
  bamCli: 'https://github.com/jito-foundation/jito-bam-boost-cli',
  givingBlock: 'https://thegivingblock.com',
  first: 'https://www.firstinspires.org',
  humanit: 'https://www.human-i-t.org',
  starlight: 'https://www.starlight.org',
  phantom: 'https://phantom.com/download',
  solflare: 'https://solflare.com/download',
  backpack: 'https://backpack.app/download',
};

/** MEV commission, set by Lua Sol Labs. Shown as-is on the site rather than read from Stakewiz/Jito. */
export const MEV_COMMISSION_PCT = 10;

export const short = (s: string, n = 4) => `${s.slice(0, n)}…${s.slice(-n)}`;
