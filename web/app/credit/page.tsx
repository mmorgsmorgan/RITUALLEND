'use client';

import { useMyCredit, useTickInfo } from '@/lib/hooks';
import { CreditTierBadge } from '@/components/CreditTierBadge';
import { TIERS } from '@/lib/ritual';
import { Marquee } from '@/components/Marquee';

export default function CreditPage() {
  const credit = useMyCredit();
  const tick = useTickInfo();
  const tierColor = TIERS[credit.tierIdx]?.color ?? 'var(--color-ink)';

  return (
    <main>
      <Marquee text={`◇ Credit score · scheduler job #${tick.jobId || '—'} · last tick block ${tick.lastTickBlock || '—'} · ${tick.activeBorrowerCount} active ◇`} />

      <section className="l-wrapper pt-10 lg:pt-16">
        <div className="l-grid items-end pb-6 rule-bottom">
          <div className="col-span-3 lg:col-span-2 flex items-baseline gap-3">
            <span className="menu-num text-xs">04</span>
            <span className="text-xs uppercase muted" style={{ letterSpacing: '0.08em' }}>Credit</span>
          </div>
          <h1 className="col-span-4 lg:col-span-7 text-xl lg:text-2xl font-serif italic mt-2 lg:mt-0">
            Your on-chain reputation.
          </h1>
          <div className="col-span-4 lg:col-span-3 mt-2 lg:mt-0 lg:text-right">
            <CreditTierBadge tierIdx={credit.tierIdx} score={credit.score} />
          </div>
        </div>

        <div className="l-grid mt-8 gap-y-6">
          <div className="col-span-4 lg:col-span-5">
            <div className="card flex flex-col gap-5 h-full">
              <span className="kpi-label">Score</span>
              <div className="flex items-baseline gap-3">
                <span className="text-hero tab-nums" style={{ color: tierColor }}>{credit.score}</span>
                <span className="text-sm muted tab-nums">/ 1000</span>
              </div>
              <div className="meter">
                <div className="meter__fill" style={{ width: `${(credit.score / 1000) * 100}%`, background: tierColor }} />
              </div>
              <div className="flex justify-between text-xs faint tab-nums">
                <span>0</span><span>300</span><span>600</span><span>800</span><span>1000</span>
              </div>
            </div>
          </div>

          <div className="col-span-4 lg:col-span-7">
            <div className="card flex flex-col gap-px h-full">
              <span className="kpi-label">History</span>
              <div className="mt-2 flex flex-col gap-px rule-top">
                <Row label="On-time repayments" value={String(credit.repays)} />
                <Row label="Defaults" value={String(credit.defaults)} alert={Number(credit.defaults) > 0} />
                <Row label="Last score update" value={credit.lastTouched ? new Date(credit.lastTouched).toLocaleString() : 'never'} />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10">
          <div className="card flex flex-col gap-4">
            <div className="flex items-baseline justify-between flex-wrap gap-2">
              <span className="kpi-label flex items-center gap-2">
                <span className="dot-accent pulse" /> Scheduler
              </span>
              <span className="text-xs muted">tick() every ~1000 blocks · ~6 min</span>
            </div>
            <div className="flex flex-col gap-px rule-top">
              <Row label="Job id"            value={tick.jobId ? `#${tick.jobId}` : 'not registered'} />
              <Row label="Active borrowers"  value={String(tick.activeBorrowerCount)} />
              <Row label="Last tick @ block" value={tick.lastTickBlock ? `#${tick.lastTickBlock}` : 'never'} />
            </div>
            <p className="text-xs muted">
              The Ritual Scheduler precompile calls <span className="font-mono">CreditScore.tick()</span> autonomously.
              Each tick decays scores above 500 by 5 and grants a +1 streak bonus to active borrowers with no defaults.
            </p>
          </div>
        </div>

        <div className="mt-10">
          <Heading num="05" eyebrow="Tiers" title="What your score unlocks" />
          <div className="mt-6 flex flex-col gap-px rule-top rule-bottom">
            {TIERS.map((t) => {
              const isMe = t.id === credit.tierIdx;
              return (
                <div
                  key={t.id}
                  className="grid grid-cols-12 items-baseline py-4 px-1 rule-bottom last:border-b-0 gap-2"
                  style={isMe ? { background: 'var(--color-bg-soft)' } : undefined}
                >
                  <span className="menu-num text-xs col-span-2" style={{ color: t.color }}>{String(t.id).padStart(2, '0')}</span>
                  <span className="text-sm col-span-4">{t.name}{isMe && <span className="muted text-xs ml-2">(you)</span>}</span>
                  <span className="text-xs muted col-span-3 tab-nums">{t.range}</span>
                  <span className="text-sm tab-nums col-span-1 text-right">{t.ltvPct}%</span>
                  <span className="text-xs muted col-span-2 tab-nums text-right">{(t.ratePct / 100).toFixed(2)}×</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}

function Heading({ num, eyebrow, title }: { num: string; eyebrow: string; title: string }) {
  return (
    <div className="flex items-baseline gap-4 rule-bottom pb-4">
      <span className="menu-num text-xs">{num}</span>
      <span className="text-xs uppercase muted" style={{ letterSpacing: '0.08em' }}>{eyebrow}</span>
      <span className="text-lg ml-auto font-serif italic">{title}</span>
    </div>
  );
}

function Row({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className="flex justify-between items-baseline py-3 px-1 rule-bottom last:border-b-0">
      <span className="text-xs muted uppercase" style={{ letterSpacing: '0.06em' }}>{label}</span>
      <span className="text-sm font-mono tab-nums" style={alert ? { color: 'var(--color-danger)' } : undefined}>{value}</span>
    </div>
  );
}
