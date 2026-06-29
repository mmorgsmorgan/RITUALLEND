'use client';

import { useState } from 'react';
import { parseEther } from 'viem';
import { useWriteContract, useAccount, useBalance } from 'wagmi';
import { LEND_ADDRESS, formatPct, ratePerMsToApr } from '@/lib/ritual';
import { RITUAL_LEND_ABI } from '@/lib/abi';
import { useMyPosition, useMyCredit, useMarket, fmtRitual } from '@/lib/hooks';
import { HealthFactorMeter } from '@/components/HealthFactorMeter';
import { CreditTierBadge } from '@/components/CreditTierBadge';
import { TxStatusToast } from '@/components/TxStatusToast';
import { Marquee } from '@/components/Marquee';

export default function BorrowPage() {
  const { address } = useAccount();
  const wallet = useBalance({ address });
  const me = useMyPosition();
  const credit = useMyCredit();
  const market = useMarket();
  const { writeContract, data: hash, isPending } = useWriteContract();
  const [borrowAmt, setBorrowAmt] = useState('');
  const [repayAmt, setRepayAmt] = useState('');

  const borrowApr = ratePerMsToApr(me.borrowRatePerMs);
  const maxBorrowable = (me.collateralUnderlying * credit.maxLtv) / 10n ** 18n;
  const available = maxBorrowable > me.debt ? maxBorrowable - me.debt : 0n;

  return (
    <main>
      <Marquee text="◇ Borrow against rRITUAL · LTV scales with credit tier · repay anytime ◇" />

      <section className="l-wrapper pt-10 lg:pt-16">
        <div className="l-grid items-end pb-6 rule-bottom">
          <div className="col-span-3 lg:col-span-2 flex items-baseline gap-3">
            <span className="menu-num text-xs">03</span>
            <span className="text-xs uppercase muted" style={{ letterSpacing: '0.08em' }}>Borrow</span>
          </div>
          <h1 className="col-span-4 lg:col-span-7 text-xl lg:text-2xl font-serif italic mt-2 lg:mt-0">
            Borrow RITUAL · pay <span className="accent tab-nums">{formatPct(borrowApr)}</span> APR
          </h1>
          <div className="col-span-4 lg:col-span-3 mt-2 lg:mt-0 lg:text-right">
            <CreditTierBadge tierIdx={credit.tierIdx} score={credit.score} />
          </div>
        </div>

        <div className="l-grid mt-8 gap-y-6">
          <div className="col-span-4 lg:col-span-4">
            <HealthFactorMeter value={me.healthFactor} />
          </div>
          <div className="col-span-4 lg:col-span-8">
            <div className="card h-full">
              <span className="kpi-label">Position</span>
              <div className="mt-4 flex flex-col gap-px rule-top">
                <Row label="Collateral underlying"      value={`${fmtRitual(me.collateralUnderlying)} RITUAL`} />
                <Row label="Max borrowable @ tier"      value={`${fmtRitual(maxBorrowable)} RITUAL`} />
                <Row label="Outstanding debt"           value={`${fmtRitual(me.debt)} RITUAL`} />
                <Row label="Remaining capacity"         value={`${fmtRitual(available)} RITUAL`} accent />
                <Row label="Wallet"                     value={`${wallet.data ? fmtRitual(wallet.data.value, 4) : '0'} RITUAL`} />
              </div>
            </div>
          </div>
        </div>

        <div className="l-grid mt-10 gap-y-6">
          <div className="col-span-4 lg:col-span-6">
            <div className="card flex flex-col gap-4 h-full">
              <div className="flex items-baseline justify-between">
                <span className="kpi-label">Borrow</span>
                <span className="text-xs muted">tier {credit.tier?.ltvPct}% LTV</span>
              </div>
              <input
                className="input"
                value={borrowAmt}
                onChange={(e) => setBorrowAmt(e.target.value)}
                placeholder="0.0  amount in RITUAL"
                inputMode="decimal"
              />
              <button
                className="btn btn-accent btn-lg"
                disabled={isPending || !address || !borrowAmt}
                onClick={() => writeContract({
                  address: LEND_ADDRESS,
                  abi: RITUAL_LEND_ABI,
                  functionName: 'borrow',
                  args: [parseEther(borrowAmt || '0')],
                })}
              >
                {isPending ? 'Submitting' : 'Borrow RITUAL'}
                {!isPending && <span className="arrow">→</span>}
              </button>
            </div>
          </div>
          <div className="col-span-4 lg:col-span-6">
            <div className="card flex flex-col gap-4 h-full">
              <div className="flex items-baseline justify-between">
                <span className="kpi-label">Repay</span>
                <span className="text-xs muted">+25 score on full repay</span>
              </div>
              <input
                className="input"
                value={repayAmt}
                onChange={(e) => setRepayAmt(e.target.value)}
                placeholder="0.0  amount in RITUAL"
                inputMode="decimal"
              />
              <button
                className="btn btn-lg"
                disabled={isPending || !address || !repayAmt}
                onClick={() => writeContract({
                  address: LEND_ADDRESS,
                  abi: RITUAL_LEND_ABI,
                  functionName: 'repay',
                  value: parseEther(repayAmt || '0'),
                })}
              >
                {isPending ? 'Submitting' : 'Repay'}
                {!isPending && <span className="arrow">→</span>}
              </button>
            </div>
          </div>
        </div>
      </section>

      <TxStatusToast
        hash={hash}
        onSuccess={() => { me.refetch(); credit.refetch(); market.refetch(); wallet.refetch(); }}
      />
    </main>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between items-baseline py-3 rule-bottom last:border-b-0">
      <span className="text-xs muted uppercase" style={{ letterSpacing: '0.06em' }}>{label}</span>
      <span className="text-sm font-mono tab-nums" style={accent ? { color: 'var(--color-accent)' } : undefined}>{value}</span>
    </div>
  );
}
