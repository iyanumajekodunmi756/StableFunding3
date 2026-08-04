# Demo Video Script — Crowdfund on Stellar (Orange Belt)

**Target length:** 1:30 (1–2 min budget) · **Format:** 16:9 landscape, 1080p, 30fps
**App:** https://stellar-orange-belt-crowdfund-gamma.vercel.app/ · **Contract (testnet):** `CBOWCRF6GCFFTJ2IRQDO27UM4BTE4GPCB763H4R543BIJHKERFFC2GX5`

---

## Setup checklist (before you press record)

- [ ] Freighter extension installed, connected to **Stellar Testnet**, funded via [Friendbot](https://friendbot.stellar.org/) (`S...` address).
- [ ] Open the live demo in a clean browser window (no other tabs, notifications off).
- [ ] Do a **dry run** of the contribution once so the wallet popup behavior is familiar (then start a fresh contribution for the real take).
- [ ] Optional but nice: keep a second window open with [Stellar Expert](https://stellar.expert/explorer/testnet) so the tx-hash click lands instantly.
- [ ] Mute system notifications, use a quiet room or decent mic.

---

## Script

| Time | Visual (what's on screen) | Narration |
| --- | --- | --- |
| **0:00–0:08** | App loads. Hero header "Crowdfund Campaign" with a **Connect Wallet** button; dashed placeholder card below. | "This is a crowdfunding campaign built as a Soroban smart contract on the Stellar testnet, with a React and Next.js frontend." |
| **0:08–0:20** | Click **Connect Wallet** → modal lists **Freighter, xBull, Albedo**. Pick Freighter → approve in the extension. Header now shows your truncated address. | "Let's connect a Stellar wallet — Freighter, xBull, or Albedo are supported. Once connected, the app reads the campaign straight from the contract." |
| **0:20–0:34** | Progress bar card: `25 / 1,000 XLM` at `2.5%` with the gradient bar. Countdown card ticks live (`29d 23h 59m 58s`…). | "On-chain `get_status` drives this UI: the progress bar and a live countdown to the campaign deadline. There's also a Refresh button and 30-second polling, so this stays current." |
| **0:34–0:52** | Type `10` in **Amount (XLM)**, click **Contribute**. Status flips to "Awaiting Wallet Approval…" → approve in Freighter → "Validating Block Ledger…" → green success alert "Contribution recorded on-chain!" with the tx hash. | "I'll contribute 10 XLM. The app shows each step — wallet approval, then validation. Here's the transaction hash — this is a real on-chain transaction, not a mock." |
| **0:52–1:00** | Click the tx-hash link → Stellar Expert shows the confirmed payment in the explorer. | "And here it is on the Stellar testnet explorer — the XLM moved into the campaign's escrow via the Stellar Asset Contract." |
| **1:00–1:12** | Back in the app: **Recent Activity** card with the pulsing **Live** badge shows `…4f2d contributed +10 XLM · Ledger #…`; the progress bar now reads `35 / 1,000 XLM`. | "Back on the app, the live activity feed streamed the contribution in from the RPC, and the progress bar updated — real-time event streaming, plus polling while connected." |
| **1:12–1:22** | Scroll to **Claim Funds** card: "Claiming opens once the campaign deadline passes." Button is greyed out as **Unavailable**. | "When the deadline passes *and* the target is met, the contract lets the creator claim the raised funds. Until then, the smart contract enforces the rules — this button stays locked." |
| **1:22–1:30** | Final shot: page header + address chip. (Optional: repo/CI tab.) | "The contract is covered by 5 Rust unit tests, the frontend by 19 Vitest tests, all running in CI on every push. That's the whole loop — on-chain, verifiable crowdfunding." |

**Total:** ~1:30.

---

## Optional extended scenes (pick and drop in to fill 2:00)

| Scene | What to show | Narration |
| --- | --- | --- |
| **Claim end-to-end (advanced)** | Deploy a throwaway demo campaign with a short deadline (see `scripts/deploy.sh`: `TARGET=50 DEADLINE=<now+2min>`), contribute to pass the target, wait for the deadline to pass, then click **Claim Funds** → success "Funds claimed successfully!" + claimed badge. | "To show the full lifecycle I pre-deployed a small test campaign with a two-minute deadline — the target was reached, and once the deadline passed the Claim button unlocked and paid out the escrow." |
| **Code walkthrough** | Show `contracts/crowdfund/src/lib.rs` (`initialize`, `fund`, `claim`, `get_status`), then `src/context/CrowdfundContext.tsx` wiring. | "On-chain: `fund` escrows XLM through the Stellar Asset Contract, `claim` pays out only if the target was met and the deadline passed. The frontend calls the generated TypeScript client." |
| **CI/CD evidence** | Open the repo's **Actions** tab showing `contract-tests` and `frontend` passing. | "Every push runs the full pipeline — contract tests, lint, frontend tests, and a production build." |

---

## Recording tips

- Record the contribution in one continuous take if possible — the hash link + explorer transition is the strongest moment.
- Keep narration to ~150 words/minute; pause between scene changes so edits are easy.
- If the wallet popup steals focus, that's fine — it's part of the demo (proves it's real).
- No personal info: the testnet address is public test data, so it's safe on screen.
- Thumbnail idea: pause at the green **"Contribution recorded on-chain!"** alert with the tx hash — it's the payoff shot.
