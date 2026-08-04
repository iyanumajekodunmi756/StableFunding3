#!/usr/bin/env bash
#
# Smart contract deployment workflow for the crowdfund contract (Stellar Testnet).
#
# Prerequisites:
#   - soroban-cli / stellar-cli (https://github.com/stellar/stellar-cli)
#   - A testnet funded account secret key exported as ADMIN_SK
#
# Usage:
#   ADMIN_SK=S... bash scripts/deploy.sh
#
# Optional env vars (defaults shown):
#   RPC_URL            https://soroban-testnet.stellar.org
#   NETWORK_PASSPHRASE "Test SDF Network ; September 2015"
#   TOKEN              CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC  (native XLM on testnet)
#   TARGET             1000
#   DEADLINE           <now + 30 days, unix seconds>
#
# On success it prints the new CONTRACT_ID and regenerates the TypeScript
# bindings under src/contracts/crowdfund-client.
set -euo pipefail

RPC_URL="${RPC_URL:-https://soroban-testnet.stellar.org}"
NETWORK_PASSPHRASE="${NETWORK_PASSPHRASE:-Test SDF Network ; September 2015}"
ADMIN_SK="${ADMIN_SK:?Set ADMIN_SK to a funded testnet secret key}"
TOKEN="${TOKEN:-CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC}"
TARGET="${TARGET:-1000}"
DEADLINE="${DEADLINE:-$(($(date +%s) + 2592000))}"

cd "$(dirname "$0")/.."
WASM=target/wasm32v1-none/release/crowdfund.wasm

echo "==> [1/5] Building contract (wasm)"
stellar contract build

echo "==> [2/5] Installing wasm"
WASM_HASH="$(stellar contract install \
  --wasm "$WASM" \
  --source "$ADMIN_SK" \
  --rpc-url "$RPC_URL" \
  --network-passphrase "$NETWORK_PASSPHRASE" | tail -n 1)"

echo "==> [3/5] Deploying contract (wasm hash: $WASM_HASH)"
CONTRACT_ID="$(stellar contract deploy \
  --wasm-hash "$WASM_HASH" \
  --source "$ADMIN_SK" \
  --rpc-url "$RPC_URL" \
  --network-passphrase "$NETWORK_PASSPHRASE" | tail -n 1)"

echo "==> [4/5] Initializing campaign (target=$TARGET deadline=$DEADLINE token=$TOKEN)"
stellar contract invoke \
  --id "$CONTRACT_ID" \
  --source "$ADMIN_SK" \
  --rpc-url "$RPC_URL" \
  --network-passphrase "$NETWORK_PASSPHRASE" \
  initialize -- --target "$TARGET" --deadline "$DEADLINE" --token "$TOKEN"

echo "==> [5/5] Regenerating TypeScript bindings"
stellar contract bindings ts \
  --id "$CONTRACT_ID" \
  --rpc-url "$RPC_URL" \
  --network-passphrase "$NETWORK_PASSPHRASE" \
  --output-dir src/contracts/crowdfund-client \
  --overwrite

echo
echo "✅ Deployment complete!"
echo "   CONTRACT_ID=$CONTRACT_ID"
echo
echo "Next steps:"
echo "  1. Set networks.testnet.contractId in src/contracts/crowdfund-client/src/index.ts"
echo "  2. Set NEXT_PUBLIC_CONTRACT_ID on your Vercel deployment"
echo "  3. Update README.md with the new contract address"
