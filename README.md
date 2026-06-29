# RitualLend

Credit-tiered, single-asset overcollateralized money market on **Ritual Chain**.

- Deposit native RITUAL → earn yield, receive `rRITUAL` receipt token
- Post `rRITUAL` as collateral → borrow native RITUAL
- LTV cap and interest rate scale with your on-chain **credit score**
- Credit scores are decayed periodically by a **Ritual Scheduler** job — no admin, no oracle

```
rituallend/
├── contracts/   Foundry contracts + scripts + tests
└── web/         Next.js 15 frontend
```

## Architecture

| Contract              | Role |
|-----------------------|------|
| `RitualLend.sol`      | Money market. Holds native RITUAL, mints/burns `rRITUAL`, accrues interest via index, exposes `deposit / withdraw / borrow / repay / liquidate`. |
| `CreditScore.sol`     | Per-user score (0..1000). Tier table (0–3) maps score → max LTV + rate multiplier. Receives `tick()` callbacks from the Ritual Scheduler. |
| `InterestRateModel.sol` | Two-slope kink curve at 80% utilization. Returns rates per millisecond (Ritual `block.timestamp` is ms). |

### Credit tiers

| Tier | Score range | Max LTV | Rate × |
|------|-------------|---------|--------|
| 0 — Restricted | 0–299    | 50%  | 1.20× |
| 1 — Standard   | 300–599  | 65%  | 1.00× |
| 2 — Trusted    | 600–799  | 75%  | 0.85× |
| 3 — Sovereign  | 800–1000 | 85%  | 0.70× |

New wallets start at score 500 (Standard). On-time repay +25, default −200, scheduler tick decays toward 500.

### Ritual primitives used

- **Scheduler precompile** `0x56e776BAE2DD60664b69Bd5F865F1180ffB7D58B` — registers periodic `tick()` callback
- **RitualWallet** `0x532F0dF0896F353d8C3DD8cc134e8129DA2a3948` — funds scheduler executor gas via `depositFor`
- `block.timestamp` is in **milliseconds** on Ritual — interest accrual divides by `MS_PER_YEAR = 365 * 86_400 * 1000`

## Quickstart

```bash
# 1. install deps
cp .env.example .env
cd contracts && forge install   # noop if libs are symlinked from /home/chief/lineage
cd ../web && pnpm install       # or npm install

# 2. test
cd ../contracts
forge build
forge test -vv

# 3. deploy (local anvil)
anvil --chain-id 1979 &
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast

# 4. deploy (Ritual testnet)
PRIVATE_KEY=0x... \
  forge script script/Deploy.s.sol --rpc-url ritual_testnet --broadcast

# 5. wire frontend env (paste addresses from deploy output into web/.env.local)
cat >> web/.env.local <<EOF
NEXT_PUBLIC_RITUAL_LEND_ADDRESS=0x...
NEXT_PUBLIC_CREDIT_SCORE_ADDRESS=0x...
NEXT_PUBLIC_IRM_ADDRESS=0x...
NEXT_PUBLIC_RPC_URL=https://rpc-testnet.ritualfoundation.org
NEXT_PUBLIC_CHAIN_ID=1979
EOF

# 6. run frontend
cd web && pnpm dev
```

## What "single-asset overcollateralized" means here

There's only one asset in the system — native RITUAL. Lenders deposit RITUAL and receive `rRITUAL`
shares. Borrowers post their `rRITUAL` as collateral and borrow native RITUAL. Because collateral
and debt are the same underlying asset, no price oracle is required: health factor reduces to

```
healthFactor = (collateralUnderlying × tierMaxLtv) / debt
```

This is a leverage primitive (deposit yield + borrow against shares) with credit-tier discounting
layered on top. There's no liquidation-cascade risk from price moves — only from the gap between
your borrow accrual and your supply yield.

## License

MIT
