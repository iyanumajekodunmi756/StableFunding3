# Orange Belt Crowdfund

A Soroban smart contract crowdfunding campaign with a React/Next.js frontend, deployed on Stellar Testnet.

- **Smart Contract (Testnet):** `CCLJ4FEXKXEZKS6UCROBEKLIVDOPFVP6Z75QS3AV5CUS2WAM3EBQNL7W`
- **Live Demo Link:** https://stellar-orange-belt-crowdfund-inyxwywvi.vercel.app/
- **Stack:** Soroban (Rust), Next.js, Tailwind CSS, `@creit.tech/stellar-wallets-kit`, GitHub Actions, Vitest
- **Wallets Supported:** Freighter, xBull, Albedo

## Repository Layout

```
.
├── .github/workflows/ci.yml   # CI/CD: contract tests + frontend lint/tests/build
├── contracts/
│   └── crowdfund/             # Soroban smart contract (source of truth)
│       ├── Cargo.toml         # Contract manifest (soroban-sdk 23)
│       ├── Makefile           # build / test / deploy helpers
│       └── src/
│           ├── lib.rs         # Contract logic: initialize, fund, claim, get_status (SAC-backed)
│           └── test.rs        # 5 unit tests (incl. panic cases + snapshots)
├── Cargo.toml                 # Rust workspace (members: contracts/*)
├── Cargo.lock                 # Locked Rust dependency versions
├── scripts/
│   └── deploy.sh              # Smart contract deployment workflow
├── src/                       # Next.js frontend
│   ├── app/                   # Pages & layout
│   ├── components/            # ProgressBar, CountdownTimer, ContributeForm, ClaimFunds, RecentActivity, ...
│   ├── context/               # CrowdfundContext (wallet, contract client, event streaming)
│   ├── contracts/crowdfund-client/   # Generated TS bindings for the contract
│   ├── types/                 # CampaignState, TxState, ContributionEvent
│   ├── utils/errors.ts        # 3-tier error handling
│   └── *.test.ts(x)           # Vitest frontend tests (14 tests)
├── vitest.config.ts           # Frontend test config
└── package.json               # Next.js app
```

## 1. Smart Contract

The contract lives in [`contracts/crowdfund/src/lib.rs`](contracts/crowdfund/src/lib.rs) (no_std, Soroban SDK 23).

### Custom logic

| Function | Signature | Behavior |
| --- | --- | --- |
| `initialize` | `(target: u32, deadline: u64, token: Address)` | Sets the fundraising target (XLM), deadline (unix ledger timestamp), and the campaign token (Stellar Asset Contract). Panics if already initialized. |
| `fund` | `(donor: Address, amount: u32) -> u32` | Requires donor auth. Rejects contributions after the deadline. **Inter-contract call:** escrows `amount` of the campaign token from the donor into the contract via the SAC. Tracks per-donor balances (persistent storage) and `total_raised` (instance storage). Emits a `FundEvent`. Returns the new total. |
| `claim` | `(caller: Address) -> u32` | Requires caller auth. Panics if the deadline has not passed, the target was not reached, or funds were already claimed. **Inter-contract call:** pays out the escrowed `total_raised` to the caller via the SAC. Marks the campaign claimed (idempotent guard) and emits a `ClaimEvent`. |
| `get_status` | `() -> Vec<u64>` | Returns `[total_raised, target, deadline, deadline_passed(0|1), is_claimed(0|1)]` for the frontend. |

### Inter-contract communication

`fund()` and `claim()` call the **Stellar Asset Contract (SAC)** through `token::Client` (`soroban_sdk::token`):

- **Escrow:** `fund` transfers `amount` of the campaign token from the donor to the contract address (`env.current_contract_address()`), so real XLM moves on-chain and is held by the campaign.
- **Payout:** `claim` transfers the escrowed `total_raised` from the contract to the caller.

The token address is injected at `initialize` (default: native XLM on testnet). Unit tests mint tokens, contribute, and **assert on-chain token balances** to prove the transfers execute.

Contract events are emitted with explicit `#[topic]` / `#[data]` attributes for a deterministic on-chain encoding:

- `FundEvent` — topics: `[fund_event, donor]`, data: `[amount, total_raised, target]`
- `ClaimEvent` — topics: `[claim_event, caller]`, data: `[total_raised, target]`

## 2. Contract Tests

Tests are in [`contracts/crowdfund/src/test.rs`](contracts/crowdfund/src/test.rs) (5 tests, mocked auth via `soroban-sdk` testutils, snapshots in `test_snapshots/`):

1. `test_contribution_tracking` — two donors fund 200 + 300; total reaches 500; **contract token balance == 500** (escrow verified).
2. `test_claim_after_target_met_and_deadline_passed` — full happy path: fund to target, advance ledger, claim; **contract balance drops to 0, caller receives 500** (payout verified).
3. `test_premature_claim_before_deadline_panics` — `should_panic("Campaign deadline has not yet passed")`.
4. `test_double_claim_panics` — `should_panic("Funds have already been claimed")`.
5. `test_fund_after_deadline_panics` — `should_panic("Campaign deadline has passed")`.

### Run the contract tests

```bash
cargo test  # from the repo root (Rust workspace); requires a toolchain compatible with soroban-sdk 23
# or: cd contracts/crowdfund && make test
```

## 3. Frontend Tests

Vitest + Testing Library cover the UI logic — **14 tests across 4 files**:

```bash
npm test   # → 4 files, 14 tests passing
```

- `src/utils/errors.test.ts` — transaction error mapping (UserRejected / InsufficientFunds / passthrough)
- `src/components/ProgressBar.test.tsx` — percentages, 100% cap, zero target
- `src/components/CountdownTimer.test.tsx` — expired vs. live countdown
- `src/components/TransactionAlert.test.tsx` — claim vs. contribute success messaging + failure state

## 4. Frontend ↔ Contract Function Matching

The frontend talks to the deployed contract through generated TypeScript bindings in [`src/contracts/crowdfund-client/src/index.ts`](src/contracts/crowdfund-client/src/index.ts) (`@stellar/stellar-sdk/contract` client). The wiring lives in [`src/context/CrowdfundContext.tsx`](src/context/CrowdfundContext.tsx):

| Contract fn | TS client method | Frontend usage |
| --- | --- | --- |
| `get_status` | `client.get_status()` | `refreshCampaign()` maps the five return fields into `CampaignState` — driving `ProgressBar`, `CountdownTimer`, claim-eligibility checks, and claimed state. Results are cached in localStorage with a 5-minute TTL. |
| `fund` | `client.fund({ donor, amount })` | `contribute(amount)` simulates, then `signAndSend()`s the transaction with step-by-step status (awaiting approval → validating → success/failure) plus a Stellar Expert explorer link. |
| `claim` | `client.claim({ caller })` | The `ClaimFunds` card lets the connected wallet claim the raised funds once the on-chain status shows `deadlinePassed && totalRaised >= target && !isClaimed`; on success the campaign refreshes and the card flips to a "Claimed" state. |
| `initialize` | `client.initialize({ target, deadline, token })` | Exposed in the client; the deployed campaign is initialized on-chain at deploy time (see `scripts/deploy.sh`). |

Error mapping in `src/utils/errors.ts` defines three error classes — `WalletNotFound`, `UserRejected`, `InsufficientFunds` — mapped from transaction failures via the shared `mapTransactionError()` helper.

## 5. Event Streaming & Real-Time Updates

- **Live activity feed:** `CrowdfundContext.refreshEvents()` queries Soroban RPC (`getEvents`) for recent `FundEvent`s, decodes them (handles both the new `#[topic]`/`#[data]` and legacy encodings), and renders a **Recent Activity** card with donor, amount, and ledger. Refreshed after each contribution and on connect.
- **Near real-time campaign state:** while a wallet is connected, `get_status` (and events) are **polled every 30 seconds**, so progress, countdown, and claim state stay current without manual refresh.

## 6. Smart Contract Deployment Workflow

[`scripts/deploy.sh`](scripts/deploy.sh) automates the full lifecycle (or `cd contracts/crowdfund && make deploy`):

```bash
# Requires the stellar-cli and a funded testnet secret key
ADMIN_SK=S... bash scripts/deploy.sh
```

It runs: **build → install wasm → deploy → initialize (target/deadline/token) → regenerate TS bindings**, printing the new `CONTRACT_ID`. Env vars: `RPC_URL`, `NETWORK_PASSPHRASE`, `TOKEN` (default native XLM on testnet), `TARGET`, `DEADLINE`.

> Note: the contract was recently upgraded to move real XLM via the SAC. Redeploy with `scripts/deploy.sh` to point the app at the new bytecode, then update `networks.testnet.contractId` and `NEXT_PUBLIC_CONTRACT_ID`.

## 7. CI/CD Pipeline

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on every push/PR:

- **contract-tests:** Rust toolchain → `cargo test` (5 tests)
- **frontend:** Node 22 → `npm ci` → `npm run lint` → `npm test` (14 tests) → `npm run build`

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

## Submission Requirements Coverage

| Requirement | Where |
| --- | --- |
| Advanced smart contract development | Custom logic, auth, storage, events, guards in `lib.rs` |
| Inter-contract communication | `fund`/`claim` call the Stellar Asset Contract (escrow + payout) |
| Event streaming & real-time updates | RPC `getEvents` feed + 30s polling |
| CI/CD pipeline | `.github/workflows/ci.yml` |
| Smart contract deployment workflow | `scripts/deploy.sh` + `make deploy` |
| Mobile responsive frontend | Tailwind responsive layout |
| Error handling & loading states | 3-tier errors, tx state machine, loading/error UI |
| Tests (contracts + frontend) | 5 contract tests (`cargo test`) + 14 frontend tests (`npm test`) |
| Production-ready architecture | TS strict, env fallbacks, caching, generated client, workspace layout |
| Documentation & demo | This README + live demo URL |

**Submission checklist status:** Public repo ✅ · README ✅ · 10+ commits ✅ · Live demo ✅ · Contract address ✅ · Transaction hash ⏳ (add from a contribution on Stellar Expert) · Screenshots ⏳ (mobile UI, CI run, test output) · Demo video ⏳ (1–2 min link)

## Features

- Connect wallet (Freighter / xBull / Albedo)
- View campaign progress bar and live countdown timer
- Contribute XLM to the campaign (escrowed on-chain via SAC)
- Live "Recent Activity" feed of contributions
- Claim raised funds from the UI after the deadline (when the target is met)
- Step-by-step transaction status feedback
- 3-tier error handling (WalletNotFound, UserRejected, InsufficientFunds)
- localStorage caching with 5-minute TTL + 30s real-time polling
