import { defineChain, type Address } from 'viem';

export const ritualChain = defineChain({
  id: Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 1979),
  name: 'Ritual Chain',
  nativeCurrency: { name: 'RITUAL', symbol: 'RITUAL', decimals: 18 },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_RPC_URL ?? 'https://rpc.ritualfoundation.org'],
    },
  },
  blockExplorers: {
    default: { name: 'Ritual Explorer', url: 'https://explorer.ritualfoundation.org' },
  },
});

export const LEND_ADDRESS    = (process.env.NEXT_PUBLIC_RITUAL_LEND_ADDRESS ?? '0x0000000000000000000000000000000000000000') as Address;
export const CREDIT_ADDRESS  = (process.env.NEXT_PUBLIC_CREDIT_SCORE_ADDRESS ?? '0x0000000000000000000000000000000000000000') as Address;
export const IRM_ADDRESS     = (process.env.NEXT_PUBLIC_IRM_ADDRESS ?? '0x0000000000000000000000000000000000000000') as Address;

export const SCHEDULER_ADDRESS     = '0x56e776BAE2DD60664b69Bd5F865F1180ffB7D58B' as Address;
export const RITUAL_WALLET_ADDRESS = '0x532F0dF0896F353d8C3DD8cc134e8129DA2a3948' as Address;

export const WAD = 10n ** 18n;
export const MS_PER_YEAR = 365n * 86_400n * 1000n;

export function formatPct(wadValue: bigint, digits = 2): string {
  // 1e18 = 100%
  const num = Number(wadValue) / 1e18;
  return (num * 100).toFixed(digits) + '%';
}

export function ratePerMsToApr(ratePerMs: bigint): bigint {
  return ratePerMs * MS_PER_YEAR;
}

export const TIERS = [
  { id: 0, name: 'Restricted', color: 'var(--color-danger)',     range: '0–299',    ltvPct: 50, ratePct: 120 },
  { id: 1, name: 'Standard',   color: 'var(--color-ink-muted)',  range: '300–599',  ltvPct: 65, ratePct: 100 },
  { id: 2, name: 'Trusted',    color: 'var(--color-positive)',   range: '600–799',  ltvPct: 75, ratePct: 85 },
  { id: 3, name: 'Sovereign',  color: 'var(--color-accent)',     range: '800–1000', ltvPct: 85, ratePct: 70 },
] as const;
