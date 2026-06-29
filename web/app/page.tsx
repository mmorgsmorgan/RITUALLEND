'use client';

import Link from 'next/link';
import { useMarket, useTickInfo } from '@/lib/hooks';
import { MarketStatsCard } from '@/components/MarketStatsCard';
import { RateCurveChart } from '@/components/RateCurveChart';
import { Marquee } from '@/components/Marquee';
import { LocalClock } from '@/components/LocalClock';
import { TIERS, LEND_ADDRESS } from '@/lib/ritual';

export default function HomePage() {
  const { tvl, borrows, utilization, supplyRatePerMs } = useMarket();
  const tick = useTickInfo();
  const utilPct = Number(utilization) / 1e18 * 100;
  const short = `${LEND_ADDRESS.slice(0, 6)}…${LEND_ADDRESS.slice(-4)}`;

  return (
    <main>
      <Marquee text={`◇ Live on Ritual Chain · scheduler job #${tick.jobId || '—'} · last tick block ${tick.lastTickBlock || '—'} · ${tick.activeBorrowerCount} active borrowers ◇`} />

      {/* HERO */}
      <section className="l-wrapper relative">
        <div className="l-grid pt-12 sm:pt-16 lg:pt-24 pb-8 sm:pb-12">
          <div className="col-span-4 lg:col-span-12">
            <h1 className="text-hero">
              The credit-tiered<br />
              <span className="font-serif italic" style={{ fontWeight: 400 }}>RITUAL</span>
              <span className="accent">.</span> money market
            </h1>
          </div>

          <p className="col-span-4 lg:col-span-7 mt-8 lg:mt-12 text-base muted">
            Deposit native RITUAL to earn yield. Borrow against your receipt tokens — your
            credit tier sets the LTV cap and a multiplier on the interest rate. Scores
            update automatically via the Ritual Scheduler. No oracle, no admin.
          </p>

          <div className="col-span-4 lg:col-span-3 lg:col-start-9 mt-8 lg:mt-12 flex flex-col gap-3">
            <LocalClock />
            <div className="flex flex-col gap-1">
              <span className="text-xs faint uppercase" style={{ letterSpacing: '0.08em' }}>Market</span>
              <span className="text-sm font-mono">{short}</span>
            </div>
          </div>

          <div className="col-span-4 lg:col-span-12 mt-8 lg:mt-12 flex flex-col sm:flex-row gap-3 sm:gap-4">
            <Link href="/lend" className="btn btn-accent btn-xl">
              Start Lending
              <span className="arrow">→</span>
            </Link>
            <Link href="/borrow" className="btn btn-outline-accent btn-xl">
              Borrow RITUAL
            </Link>
            <Link href="/credit" className="btn btn-xl">
              View Credit Tiers
            </Link>
          </div>
        </div>

        <div className="hairline" />

        {/* numbered nav + CTA mirror reference layout */}
        <div className="l-grid py-8 lg:py-10">
          <div className="col-span-4 lg:col-span-3">
            <p className="text-xs faint uppercase mb-3" style={{ letterSpacing: '0.08em' }}>[Menu]</p>
            <ul className="flex flex-col gap-2">
              <NavItem n="01" href="/lend"   label="Lend RITUAL"     />
              <NavItem n="02" href="/borrow" label="Borrow & manage" />
              <NavItem n="03" href="/credit" label="Your credit"     />
              <NavItem n="04" href="https://explorer.ritualfoundation.org" external label="On explorer" />
            </ul>
          </div>

          <div className="col-span-4 lg:col-span-3 lg:col-start-5 mt-8 lg:mt-0">
            <p className="text-xs faint uppercase mb-3" style={{ letterSpacing: '0.08em' }}>[Version]</p>
            <span className="text-sm">RitualLend · v1 · chain 1979</span>
          </div>

          <div className="col-span-4 lg:col-span-4 lg:col-start-9 mt-8 lg:mt-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 lg:justify-end">
            <Link href="/lend" className="btn btn-accent btn-lg">
              Start Lending
              <span className="arrow">→</span>
            </Link>
            <Link href="/borrow" className="btn btn-outline-accent btn-lg">
              Borrow
            </Link>
          </div>
        </div>
      </section>

      <Marquee text={`◇ TVL ${(Number(tvl) / 1e18).toFixed(2)} RITUAL · supply APR live · single-asset overcollateralized · MIT licensed ◇`} />

      {/* MARKET STATS */}
      <section className="l-wrapper pt-12 lg:pt-16">
        <Heading num="01" eyebrow="Market" title="Live state" />
        <div className="mt-6">
          <MarketStatsCard tvl={tvl} borrows={borrows} utilization={utilization} supplyRatePerMs={supplyRatePerMs} />
        </div>
      </section>

      {/* RATE CURVE + TIERS */}
      <section className="l-wrapper pt-12 lg:pt-16">
        <Heading num="02" eyebrow="Mechanics" title="Rate curve & tiers" />
        <div className="l-grid mt-6 gap-y-6">
          <div className="col-span-4 lg:col-span-7">
            <RateCurveChart currentUtilizationPct={utilPct} />
          </div>
          <div className="col-span-4 lg:col-span-5">
            <div className="card h-full">
              <span className="kpi-label">Credit tiers</span>
              <div className="mt-4 flex flex-col gap-px">
                {TIERS.map((t) => (
                  <div key={t.id} className="grid grid-cols-12 items-baseline py-3 rule-bottom last:border-b-0 gap-2">
                    <span className="menu-num text-xs col-span-2" style={{ color: t.color }}>{String(t.id).padStart(2, '0')}</span>
                    <span className="text-sm col-span-4">{t.name}</span>
                    <span className="text-xs muted col-span-3 tab-nums">{t.range}</span>
                    <span className="text-sm tab-nums col-span-1 text-right">{t.ltvPct}%</span>
                    <span className="text-xs muted col-span-2 tab-nums text-right">{(t.ratePct / 100).toFixed(2)}×</span>
                  </div>
                ))}
              </div>
              <p className="text-xs muted mt-4">
                New wallets start at 500 → tier 1. Repay on time +25. Default −200. The Ritual
                Scheduler decays scores toward 500 every ~6 minutes.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
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

function NavItem({ n, href, label, external }: { n: string; href: string; label: string; external?: boolean }) {
  const Cmp: any = external ? 'a' : Link;
  const extra = external ? { target: '_blank', rel: 'noreferrer' } : {};
  return (
    <li>
      <Cmp href={href} {...extra} className="flex items-baseline gap-3 group">
        <span className="menu-num text-xs">{n}</span>
        <span className="text-base group-hover:accent transition-colors">{label}</span>
      </Cmp>
    </li>
  );
}

function Footer() {
  return (
    <footer className="l-wrapper pt-16 lg:pt-24 pb-10">
      <div className="hairline mb-6" />
      <div className="l-grid">
        <div className="col-span-4 lg:col-span-12">
          <span className="font-serif text-base" style={{ letterSpacing: '0.08em' }}>RITUALLEND</span>
          <p className="text-xs muted mt-1">credit-tiered RITUAL market</p>
        </div>
      </div>
      <div className="hairline mt-10 mb-4" />
      <p
        className="text-xs uppercase text-center"
        style={{ letterSpacing: '0.18em', fontWeight: 700 }}
      >
        Built by <span className="accent">BDH</span>
      </p>
    </footer>
  );
}
