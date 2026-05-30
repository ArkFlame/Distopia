#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/package-manager.sh

if [ "${DISTOPIA_MODE:-production}" = "dev" ]; then
  exec bash scripts/dev-linux.sh
fi

if [ ! -f .env ]; then
  cp .env.example .env
fi

mkdir -p data data/cdn public/uploads
PORT="${DISTOPIA_PORT:-3928}"
export NODE_OPTIONS="${NODE_OPTIONS:-} --experimental-sqlite"
export NODE_NO_WARNINGS=1

if [ ! -d node_modules ]; then
  echo "[Distopia] Installing dependencies with pnpm..."
  run_pnpm install --frozen-lockfile=false
else
  echo "[Distopia] node_modules found. Skipping dependency install."
  echo "[Distopia] To reinstall cleanly: rm -rf node_modules pnpm-lock.yaml && ./scripts/run-linux.sh"
fi

echo "[Distopia] Preparing local SQLite database schema..."
run_pnpm db:seed

echo "[Distopia] Building production bundle..."
run_pnpm build

echo "[Distopia] Starting PRODUCTION server at http://localhost:${PORT}"
echo "[Distopia] No Next.js dev HMR websocket is used in this mode. Press Ctrl+C to stop."
run_pnpm start -H 0.0.0.0 -p "${PORT}"
