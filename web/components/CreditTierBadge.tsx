'use client';

import { TIERS } from '@/lib/ritual';

export function CreditTierBadge({ tierIdx, score }: { tierIdx: number; score?: number }) {
  const t = TIERS[tierIdx] ?? TIERS[1];
  const num = String(t.id + 1).padStart(2, '0');
  return (
    <span
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
      style={{ border: '1px solid var(--color-rule-strong)', letterSpacing: '0.06em' }}
    >
      <span className="menu-num">{num}</span>
      <span className="uppercase tab-nums">{t.name}</span>
      {score !== undefined && <span className="muted tab-nums">· {score}</span>}
    </span>
  );
}
