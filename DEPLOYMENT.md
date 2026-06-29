# RitualLend — Mainnet Deployment

**Network:** Ritual Chain (chainId 1979) — RPC `https://rpc.ritualfoundation.org`

## Live addresses

| Contract            | Address                                      | Notes                                |
|---------------------|----------------------------------------------|--------------------------------------|
| `InterestRateModel` | `0x9E72D7412089390eF18495656ea37CED270B5Fd0` | 2% base / 10% slope / 200% jump / 80% kink |
| `CreditScore`       | `0x2cf867D77b15C59DB1cAc839814De5dD51a8119C` | self-registers scheduler job         |
| `RitualLend`        | `0x7C1fD42202eB41caa85bca412C32937aE68536DE` | money market                         |

**Deployer / owner:** `0xa6C63b0C66D78e4524909Ed557fb1d58466a1d6b`

## Scheduler job

- **Job ID:** `2849608`
- **Frequency:** every 1000 blocks (~5.8 min at 350 ms)
- **numCalls:** 10 (≈ one hour of ticks)
- **First tick:** block 39157517 (fired ✓ — `lastTickBlock` confirmed on-chain)
- **Gas budget:** 0.04 RITUAL remaining in RitualWallet for CreditScore (300k gas × 2 gwei × 10 calls = 0.006 RITUAL needed, plenty)

## How to re-register more ticks

After the 10 calls finish, the schedule transitions to `COMPLETED`. To re-up:

```bash
START_BLOCK=$(($(cast block-number --rpc-url https://rpc.ritualfoundation.org) + 100))
cast send 0x2cf867D77b15C59DB1cAc839814De5dD51a8119C \
  'registerJob(uint32,uint32,uint32,uint32,uint32,uint256,uint256)' \
  300000 $START_BLOCK 10 1000 100 2000000000 0 \
  --rpc-url https://rpc.ritualfoundation.org --private-key $PK
```

## Two scheduler gotchas discovered the hard way

These are NOT in the skill docs and cost a few wasted txs:

1. **`SenderNotContract()` (`0xbe541de4`)** — the scheduler precompile rejects EOA callers. `forge script` cannot call `schedule()` directly from the broadcaster account. The target contract (the one that should receive callbacks) must call `schedule()` itself, because the scheduler calls back `msg.sender`.
2. **`0x88abf714` (unidentified)** — fires when the payer is undercapitalised at schedule time. Empirical rule: the payer's RitualWallet balance must cover at least `gasLimit × maxFeePerGas × numCalls`. With `gasLimit=300k`, `maxFee=2 gwei`, `numCalls=10` the minimum is 0.006 RITUAL; depositing 0.05 RITUAL gave clean headroom.

## Sunk costs (acknowledged)

Two abandoned contracts from the first deployment that we ate the cost on:

- `CreditScore@0x1fa22f85722f1fdD616e7c407cF1680c2Dc647aC` — old, no `registerJob`
- `RitualLend@0xdC347F60dB6F135a669B7210Fb1149d6cAE6D0B7` — wired to the old CreditScore
- **0.5 RITUAL permanently locked** in RitualWallet for the old CreditScore — the old CreditScore has no function to call `RitualWallet.withdraw()` so this is gone

Mistake was deploying with a sealed-in scheduler call before testing the call would even succeed.

## Frontend

`web/.env.local` is already populated with the live mainnet addresses. To run:

```bash
cd web && pnpm dev
```

Then open `http://localhost:3000` — wallet should be on Ritual Chain (chainId 1979).
