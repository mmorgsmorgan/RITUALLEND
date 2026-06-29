'use client';

import { fmtRitual } from '@/lib/hooks';
import { formatPct, ratePerMsToApr } from '@/lib/ritual';

export function MarketStatsCard({
  tvl, borrows, utilization, supplyRatePerMs,
}: { tvl: bigint; borrows: bigint; utilization: bigint; supplyRatePerMs: bigint }) {
  const supplyApr = ratePerMsToApr(supplyRatePerMs);
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-[color:var(--color-rule)] rule-top rule-bottom">
      <Stat label="TVL"            value={fmtRitual(tvl, 2)}            suffix="RITUAL" />
      <Stat label="Total Borrows"  value={fmtRitual(borrows, 2)}        suffix="RITUAL" />
      <Stat label="Utilization"    value={formatPct(utilization)} />
      <Stat label="Supply APR"     value={formatPct(supplyApr)}         accent />
    </div>
  );
}

function Stat({ label, value, suffix, accent }: { label: string; value: string; suffix?: string; accent?: boolean }) {
  return (
    <div className="bg-[color:var(--color-bg)] p-5 sm:p-6 flex flex-col gap-2">
      <span className="kpi-label">{label}</span>
      <span className="kpi-value tab-nums" style={accent ? { color: 'var(--color-accent)' } : undefined}>
        {value}
        {suffix && <span className="muted text-sm ml-2" style={{ fontWeight: 400 }}>{suffix}</span>}
      </span>
    </div>
  );
}
