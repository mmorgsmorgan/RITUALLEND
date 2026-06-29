'use client';

export function HealthFactorMeter({ value }: { value: bigint }) {
  const num = value === 0n ? Infinity : Number(value) / 1e18;
  const isInf = !isFinite(num);
  const display = isInf ? '∞' : num.toFixed(2);

  let color: string;
  let label: string;
  if (num < 1)        { color = 'var(--color-danger)';   label = 'Liquidatable'; }
  else if (num < 1.5) { color = 'var(--color-warning)';  label = 'At risk'; }
  else                { color = 'var(--color-positive)'; label = 'Safe'; }

  const pct = Math.max(0, Math.min(100, (num / 3) * 100));

  return (
    <div className="card flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <span className="kpi-label">Health factor</span>
        <span className="text-xs uppercase" style={{ letterSpacing: '0.08em', color }}>{label}</span>
      </div>
      <div className="text-2xl tab-nums" style={{ color }}>{display}</div>
      <div className="meter">
        <div className="meter__fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="flex justify-between text-xs faint tab-nums">
        <span>0.00</span><span>1.00</span><span>3.00+</span>
      </div>
    </div>
  );
}
