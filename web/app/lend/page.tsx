'use client';

import { useState } from 'react';
import { parseEther } from 'viem';
import { useWriteContract, useAccount, useBalance } from 'wagmi';
import { LEND_ADDRESS, formatPct, ratePerMsToApr } from '@/lib/ritual';
import { RITUAL_LEND_ABI } from '@/lib/abi';
import { useMarket, useMyPosition, fmtRitual } from '@/lib/hooks';
import { MarketStatsCard } from '@/components/MarketStatsCard';
import { TxStatusToast } from '@/components/TxStatusToast';
import { Marquee } from '@/components/Marquee';

export default function LendPage() {
  const { address } = useAccount();
  const wallet = useBalance({ address });
  const market = useMarket();
  const me = useMyPosition();
  const { writeContract, data: hash, isPending } = useWriteContract();
  const [depositAmt, setDepositAmt] = useState('');
  const [withdrawShares, setWithdrawShares] = useState('');

  const supplyApr = ratePerMsToApr(market.supplyRatePerMs);

  return (
    <main>
      <Marquee text="◇ Lend RITUAL · earn yield · receive rRITUAL · withdraw anytime ◇" />

      <section className="l-wrapper pt-10 lg:pt-16">
        <div className="l-grid items-end pb-6 rule-bottom">
          <div className="col-span-3 lg:col-span-2 flex items-baseline gap-3">
            <span className="menu-num text-xs">02</span>
            <span className="text-xs uppercase muted" style={{ letterSpacing: '0.08em' }}>Lend</span>
          </div>
          <h1 className="col-span-4 lg:col-span-10 text-xl lg:text-2xl font-serif italic mt-2 lg:mt-0 lg:text-right">
            Deposit RITUAL · earn <span className="accent tab-nums">{formatPct(supplyApr)}</span> APR
          </h1>
        </div>

        <div className="mt-6">
          <MarketStatsCard tvl={market.tvl} borrows={market.borrows} utilization={market.utilization} supplyRatePerMs={market.supplyRatePerMs} />
        </div>

        <div className="l-grid mt-10 gap-y-6">
          <div className="col-span-4 lg:col-span-6">
            <div className="card flex flex-col gap-4 h-full">
              <div className="flex items-baseline justify-between">
                <span className="kpi-label">Deposit</span>
                <span className="text-xs muted">native RITUAL → rRITUAL</span>
              </div>
              <input
                className="input"
                value={depositAmt}
                onChange={(e) => setDepositAmt(e.target.value)}
                placeholder="0.0  amount in RITUAL"
                inputMode="decimal"
              />
              <button
                className="btn btn-accent btn-lg"
                disabled={isPending || !address || !depositAmt}
                onClick={() => writeContract({
                  address: LEND_ADDRESS,
                  abi: RITUAL_LEND_ABI,
                  functionName: 'deposit',
                  value: parseEther(depositAmt || '0'),
                })}
              >
                {isPending ? 'Submitting' : 'Deposit RITUAL'}
                {!isPending && <span className="arrow">→</span>}
              </button>
              <div className="hairline" />
              <Row label="Wallet" value={`${wallet.data ? fmtRitual(wallet.data.value, 4) : '0'} RITUAL`} />
            </div>
          </div>

          <div className="col-span-4 lg:col-span-6">
            <div className="card flex flex-col gap-4 h-full">
              <div className="flex items-baseline justify-between">
                <span className="kpi-label">Your position</span>
                <span className="text-xs muted">withdraw rRITUAL</span>
              </div>
              <div className="flex flex-col gap-px rule-top rule-bottom -mx-1">
                <Row label="rRITUAL balance"      value={`${fmtRitual(me.shares)} rRITUAL`} />
                <Row label="Underlying"           value={`${fmtRitual(me.collateralUnderlying)} RITUAL`} />
                <Row label="Outstanding debt"     value={`${fmtRitual(me.debt)} RITUAL`} />
              </div>
              <input
                className="input"
                value={withdrawShares}
                onChange={(e) => setWithdrawShares(e.target.value)}
                placeholder="0.0  shares to withdraw"
                inputMode="decimal"
              />
              <button
                className="btn btn-lg"
                disabled={isPending || !address || !withdrawShares}
                onClick={() => writeContract({
                  address: LEND_ADDRESS,
                  abi: RITUAL_LEND_ABI,
                  functionName: 'withdraw',
                  args: [parseEther(withdrawShares || '0')],
                })}
              >
                {isPending ? 'Submitting' : 'Withdraw'}
                {!isPending && <span className="arrow">→</span>}
              </button>
            </div>
          </div>
        </div>
      </section>

      <TxStatusToast
        hash={hash}
        onSuccess={() => { me.refetch(); market.refetch(); wallet.refetch(); }}
      />
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-baseline py-3 px-1 rule-bottom last:border-b-0">
      <span className="text-xs muted uppercase" style={{ letterSpacing: '0.06em' }}>{label}</span>
      <span className="text-sm font-mono tab-nums">{value}</span>
    </div>
  );
}
