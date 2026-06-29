'use client';

import { useReadContract, useAccount } from 'wagmi';
import { LEND_ADDRESS, CREDIT_ADDRESS, TIERS } from './ritual';
import { RITUAL_LEND_ABI, CREDIT_SCORE_ABI } from './abi';
import { formatUnits } from 'viem';

export function useMarket() {
  const cash = useReadContract({ address: LEND_ADDRESS, abi: RITUAL_LEND_ABI, functionName: 'totalCash' });
  const borrows = useReadContract({ address: LEND_ADDRESS, abi: RITUAL_LEND_ABI, functionName: 'totalBorrows' });
  const util = useReadContract({ address: LEND_ADDRESS, abi: RITUAL_LEND_ABI, functionName: 'utilization' });
  const supplyRate = useReadContract({ address: LEND_ADDRESS, abi: RITUAL_LEND_ABI, functionName: 'getSupplyRatePerMs' });
  return {
    cash: cash.data ?? 0n,
    borrows: borrows.data ?? 0n,
    tvl: (cash.data ?? 0n) + (borrows.data ?? 0n),
    utilization: util.data ?? 0n,
    supplyRatePerMs: supplyRate.data ?? 0n,
    refetch: () => { cash.refetch(); borrows.refetch(); util.refetch(); supplyRate.refetch(); },
  };
}

export function useMyPosition() {
  const { address } = useAccount();
  const shares = useReadContract({
    address: LEND_ADDRESS, abi: RITUAL_LEND_ABI, functionName: 'balanceOf',
    args: address ? [address] : undefined, query: { enabled: !!address },
  });
  const collateral = useReadContract({
    address: LEND_ADDRESS, abi: RITUAL_LEND_ABI, functionName: 'collateralUnderlying',
    args: address ? [address] : undefined, query: { enabled: !!address },
  });
  const debt = useReadContract({
    address: LEND_ADDRESS, abi: RITUAL_LEND_ABI, functionName: 'borrowBalance',
    args: address ? [address] : undefined, query: { enabled: !!address },
  });
  const health = useReadContract({
    address: LEND_ADDRESS, abi: RITUAL_LEND_ABI, functionName: 'healthFactor',
    args: address ? [address] : undefined, query: { enabled: !!address },
  });
  const myBorrowRate = useReadContract({
    address: LEND_ADDRESS, abi: RITUAL_LEND_ABI, functionName: 'getBorrowRatePerMs',
    args: address ? [address] : undefined, query: { enabled: !!address },
  });
  return {
    address,
    shares: shares.data ?? 0n,
    collateralUnderlying: collateral.data ?? 0n,
    debt: debt.data ?? 0n,
    healthFactor: health.data ?? 0n,
    borrowRatePerMs: myBorrowRate.data ?? 0n,
    refetch: () => { shares.refetch(); collateral.refetch(); debt.refetch(); health.refetch(); myBorrowRate.refetch(); },
  };
}

export function useMyCredit() {
  const { address } = useAccount();
  const score = useReadContract({
    address: CREDIT_ADDRESS, abi: CREDIT_SCORE_ABI, functionName: 'scoreOf',
    args: address ? [address] : undefined, query: { enabled: !!address },
  });
  const tierData = useReadContract({
    address: CREDIT_ADDRESS, abi: CREDIT_SCORE_ABI, functionName: 'tier',
    args: address ? [address] : undefined, query: { enabled: !!address },
  });
  const profile = useReadContract({
    address: CREDIT_ADDRESS, abi: CREDIT_SCORE_ABI, functionName: 'profiles',
    args: address ? [address] : undefined, query: { enabled: !!address },
  });
  const tierIdx = tierData.data?.[0] ?? 1;
  const tier = TIERS[tierIdx];
  return {
    score: Number(score.data ?? 500),
    tierIdx,
    tier,
    maxLtv: tierData.data?.[1] ?? 0n,
    rateMul: tierData.data?.[2] ?? 0n,
    repays: profile.data?.[1] ?? 0,
    defaults: profile.data?.[2] ?? 0,
    lastTouched: Number(profile.data?.[3] ?? 0),
    refetch: () => { score.refetch(); tierData.refetch(); profile.refetch(); },
  };
}

export function useTickInfo() {
  const lastTick = useReadContract({
    address: CREDIT_ADDRESS, abi: CREDIT_SCORE_ABI, functionName: 'lastTickBlock',
  });
  const active = useReadContract({
    address: CREDIT_ADDRESS, abi: CREDIT_SCORE_ABI, functionName: 'activeBorrowerCount',
  });
  const jobId = useReadContract({
    address: CREDIT_ADDRESS, abi: CREDIT_SCORE_ABI, functionName: 'scheduledJobId',
  });
  return {
    lastTickBlock: Number(lastTick.data ?? 0),
    activeBorrowerCount: Number(active.data ?? 0),
    jobId: Number(jobId.data ?? 0),
  };
}

export function fmtRitual(wei: bigint, digits = 4): string {
  return Number(formatUnits(wei, 18)).toFixed(digits);
}
