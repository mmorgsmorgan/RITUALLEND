'use client';

import { LineChart, Line, XAxis, YAxis, ReferenceLine, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const BASE = 0.02;
const MULT = 0.10;
const JUMP = 2.00;
const KINK = 0.80;

function borrowApr(u: number): number {
  if (u <= KINK) return BASE + u * MULT;
  return BASE + KINK * MULT + (u - KINK) * JUMP;
}

const data = Array.from({ length: 51 }, (_, i) => {
  const u = i / 50;
  return { u: u * 100, borrow: borrowApr(u) * 100, supply: u * borrowApr(u) * 100 };
});

const INK = '#111111';
const ACCENT = '#e56a44';
const MUTED = '#9a9a9a';
const RULE = '#1111111a';

export function RateCurveChart({ currentUtilizationPct }: { currentUtilizationPct?: number }) {
  return (
    <div className="card flex flex-col gap-4 h-full">
      <div className="flex items-baseline justify-between">
        <span className="kpi-label">Rate curve</span>
        <span className="text-xs faint uppercase tab-nums" style={{ letterSpacing: '0.08em' }}>
          KINK {Math.round(KINK * 100)}%
        </span>
      </div>
      <div style={{ width: '100%', height: 240 }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="2 2" stroke={RULE} />
            <XAxis dataKey="u" tickFormatter={(v) => `${v}%`} stroke={MUTED}
              tick={{ fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={(v) => `${v.toFixed(0)}%`} stroke={MUTED}
              tick={{ fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: '#f4f1ec', border: `1px solid ${RULE}`, fontFamily: 'JetBrains Mono', fontSize: 11, borderRadius: 2 }}
              formatter={(v: number) => `${v.toFixed(2)}%`}
              labelFormatter={(v) => `Util ${v}%`}
            />
            <ReferenceLine x={KINK * 100} stroke={MUTED} strokeDasharray="3 3" />
            {currentUtilizationPct !== undefined && (
              <ReferenceLine x={currentUtilizationPct} stroke={ACCENT} strokeWidth={1.5} />
            )}
            <Line type="monotone" dataKey="borrow" stroke={INK} strokeWidth={1.5} dot={false} name="Borrow APR" />
            <Line type="monotone" dataKey="supply" stroke={ACCENT} strokeWidth={1.5} dot={false} name="Supply APR" />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center gap-4 text-xs">
        <span className="flex items-center gap-2"><span className="w-3 h-px bg-[color:var(--color-ink)] inline-block" /> Borrow</span>
        <span className="flex items-center gap-2"><span className="w-3 h-px bg-[color:var(--color-accent)] inline-block" /> Supply</span>
      </div>
    </div>
  );
}
