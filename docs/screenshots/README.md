# Submission Screenshots

All three required screenshots are captured and linked from the root
`README.md` (Submission Evidence section).

| File name | What it shows | Status |
| --- | --- | --- |
| `mobile-responsive-ui.png` | The app at mobile width (375px viewport) with a connected wallet — progress bar (`25 / 1,000 XLM`, 2.5%), live countdown, contribute form, locked Claim Funds card, and the live Recent Activity feed showing the real on-chain contribution (`+25 XLM`). | ✅ |
| `ci-pipeline.png` | GitHub Actions run #9 on `orange-belt-dev` (latest commit) — both jobs (`Contract tests (cargo test)` and `Frontend (lint + build)`) passing. | ✅ |
| `test-output.png` | Terminal output of `cargo test` (5 passing) and `npm test` (19 passing) — rendered from the real output. | ✅ |

Regenerate instructions:

- Mobile: open the Vercel demo, connect a wallet, use DevTools device toolbar → iPhone 14 (375×812), full-page screenshot.
- CI: GitHub → **Actions** → latest run → screenshot the two green jobs.
- Tests: run `cargo test` and `npm test` in your terminal and screenshot the results.
