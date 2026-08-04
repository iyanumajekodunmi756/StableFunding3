# Orange Belt Crowdfund

A Soroban smart contract crowdfunding campaign with a React/Next.js frontend, deployed on Stellar Testnet.

- **Smart Contract (Testnet):** `CCLJ4FEXKXEZKS6UCROBEKLIVDOPFVP6Z75QS3AV5CUS2WAM3EBQNL7W`
- **Live Demo Link:** https://stellar-orange-belt-crowdfund-inyxwywvi.vercel.app/
- **Stack:** Soroban (Rust), Next.js, Tailwind CSS, `@creit.tech/stellar-wallets-kit`
- **Wallets Supported:** Freighter, xBull, Albedo

## Repository Layout

```
.
├── contracts/
│   └── crowdfund/              # Soroban smart contract (source of truth)
│       ├── Cargo.toml          # Contract manifest (soroban-sdk 23)
│       ├── Makefile            # build / test / fmt helpers
│       └── src/
│           ├── lib.rs          # Contract logic: initialize, fund, claim, get_status
│           └── test.rs         # 5 unit tests (incl. panic cases + snapshots)
├── Cargo.toml                  # Rust workspace (members: contracts/*)
├── Cargo.lock                  # Locked Rust dependency versions
├── src/                        # Next.js frontend
│   ├── app/                    # Pages & layout
│   ├── components/             # ProgressBar, CountdownTimer, ContributeForm, ...
│   ├── context/                # CrowdfundContext (wallet + contract client)
│   ├── contracts/crowdfund-client/   # Generated TS bindings for the contract
│   ├── types/                  # CampaignState, TxState
│   └── utils/errors.ts         # 3-tier error handling
└── package.json                # Next.js app
```

## 1. Smart Contract

The contract lives in [`contracts/crowdfund/src/lib.rs`](contracts/crowdfund/src/lib.rs) (no_std, Soroban SDK 23).

### Custom logic

| Function | Signature | Behavior |
| --- | --- | --- |
| `initialize` | `(target: u32, deadline: u64)` | Sets the fundraising target (XLM) and deadline (unix ledger timestamp). Panics if already initialized. |
| `fund` | `(donor: Address, amount: u32) -> u32` | Requires donor auth. Rejects contributions after the deadline. Tracks per-donor balances in persistent storage and the running `total_raised` in instance storage. Emits a `FundEvent`. Returns the new total. |
| `claim` | `(caller: Address) -> u32` | Requires caller auth. Panics if the deadline has not passed, if the target was not reached, or if funds were already claimed. Marks the campaign claimed (idempotent guard) and emits a `ClaimEvent`. |
| `get_status` | `() -> Vec<u64>` | Returns `[total_raised, target, deadline, deadline_passed(0|1), is_claimed(0|1)]` for the frontend. |

> Note: contribution amounts are recorded on-chain as `u32` ledger values; this challenge's contract tracks funding state rather than performing actual token (SAC) transfers.

State is stored via `env.storage()` — instance storage for campaign-wide values (`TARGET`, `DEADLINE`, `TOTAL_RAISED`, `CLAIMED`) and persistent storage for per-donor contributions.

## 2. Contract Tests

Tests are in [`contracts/crowdfund/src/test.rs`](contracts/crowdfund/src/test.rs) (5 tests, run with mocked auth via `soroban-sdk` testutils):

1. `test_contribution_tracking` — two donors fund 200 + 300, total reaches 500, status matches.
2. `test_claim_after_target_met_and_deadline_passed` — full happy path: fund to target, advance ledger, claim, `is_claimed` flips to 1.
3. `test_premature_claim_before_deadline_panics` — `should_panic("Campaign deadline has not yet passed")`.
4. `test_double_claim_panics` — `should_panic("Funds have already been claimed")`.
5. `test_fund_after_deadline_panics` — `should_panic("Campaign deadline has passed")`.

Snapshot files under `contracts/crowdfund/test_snapshots/` capture the verified simulation outputs from a passing `cargo test` run.

### Run the contract tests

```bash
cargo test  # from the repo root (Rust workspace); requires a Rust toolchain compatible with soroban-sdk 23
# or: cd contracts/crowdfund && make test
```

## 3. Frontend ↔ Contract Function Matching

The frontend talks to the deployed contract through generated TypeScript bindings in [`src/contracts/crowdfund-client/src/index.ts`](src/contracts/crowdfund-client/src/index.ts) (`@stellar/stellar-sdk/contract` client). The wiring lives in [`src/context/CrowdfundContext.tsx`](src/context/CrowdfundContext.tsx):

| Contract fn | TS client method | Frontend usage |
| --- | --- | --- |
| `get_status` | `client.get_status()` | `refreshCampaign()` maps the five return fields (`totalRaised`, `target`, `deadline`, `deadlinePassed`, `isClaimed`) into `CampaignState` — using `totalRaised`/`target`/`deadline`/`isClaimed` to drive `ProgressBar`, `CountdownTimer`, and claimed state. Results are cached in localStorage with a 5-minute TTL. |
| `fund` | `client.fund({ donor, amount })` | `contribute(amount)` simulates, then `signAndSend()`s the transaction and shows step-by-step status (awaiting approval → validating → success/failure) plus a Stellar Expert explorer link. |
| `claim` | `client.claim({ caller })` | Wired into the generated client (bound for future campaign-owner flows). |
| `initialize` | `client.initialize({ target, deadline })` | Exposed in the client; the deployed campaign was initialized on-chain at deploy time. |

Error mapping in `src/utils/errors.ts` defines three error classes — `WalletNotFound`, `UserRejected` (signature declined), `InsufficientFunds` (budget/fee failures) — with the latter two actively mapped from transaction failures alongside raw errors.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Optional env vars (defaults shown):

```bash
NEXT_PUBLIC_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_CONTRACT_ID=CCLJ4FEXKXEZKS6UCROBEKLIVDOPFVP6Z75QS3AV5CUS2WAM3EBQNL7W
```

## Features

- Connect wallet (Freighter / xBull / Albedo)
- View campaign progress bar and live countdown timer
- Contribute XLM to the campaign
- Step-by-step transaction status feedback
- 3-tier error handling (WalletNotFound, UserRejected, InsufficientFunds)
- localStorage caching with 5-minute TTL
