export const RITUAL_LEND_ABI = [
  { type: 'function', name: 'deposit', stateMutability: 'payable', inputs: [], outputs: [{ name: 'shares', type: 'uint256' }] },
  { type: 'function', name: 'withdraw', stateMutability: 'nonpayable', inputs: [{ name: 'shares', type: 'uint256' }], outputs: [{ name: 'ritualOut', type: 'uint256' }] },
  { type: 'function', name: 'borrow', stateMutability: 'nonpayable', inputs: [{ name: 'amount', type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'repay', stateMutability: 'payable', inputs: [], outputs: [] },
  { type: 'function', name: 'liquidate', stateMutability: 'payable', inputs: [
    { name: 'borrower', type: 'address' }, { name: 'repayAmount', type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: '', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', name: 'totalSupply', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', name: 'totalCash', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', name: 'totalBorrows', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', name: 'borrowBalance', stateMutability: 'view', inputs: [{ name: 'user', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', name: 'collateralUnderlying', stateMutability: 'view', inputs: [{ name: 'user', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', name: 'healthFactor', stateMutability: 'view', inputs: [{ name: 'user', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', name: 'utilization', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', name: 'getBorrowRatePerMs', stateMutability: 'view', inputs: [{ name: 'user', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', name: 'getSupplyRatePerMs', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
] as const;

export const CREDIT_SCORE_ABI = [
  { type: 'function', name: 'scoreOf', stateMutability: 'view', inputs: [{ name: 'user', type: 'address' }], outputs: [{ name: '', type: 'uint16' }] },
  { type: 'function', name: 'tier', stateMutability: 'view', inputs: [{ name: 'user', type: 'address' }], outputs: [
    { name: 't', type: 'uint8' }, { name: 'maxLtv', type: 'uint256' }, { name: 'rateMul', type: 'uint256' }] },
  { type: 'function', name: 'profiles', stateMutability: 'view', inputs: [{ name: '', type: 'address' }], outputs: [
    { name: 'score', type: 'uint16' }, { name: 'repays', type: 'uint16' }, { name: 'defaults', type: 'uint16' },
    { name: 'lastTouched', type: 'uint64' }, { name: 'initialized', type: 'bool' }] },
  { type: 'function', name: 'lastTickBlock', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', name: 'activeBorrowerCount', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', name: 'scheduledJobId', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
] as const;
