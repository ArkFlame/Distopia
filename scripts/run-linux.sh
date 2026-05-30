#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/package-manager.sh

if [ ! -f .env ]; then
  cp .env.example .env
fi

mkdir -p data data/cdn public/uploads
export NODE_OPTIONS="${NODE_OPTIONS:-} --experimental-sqlite"
export NODE_NO_WARNINGS=1

if [ ! -d node_modules ]; then
  echo "[Distopia] Installing dependencies with pnpm..."
  run_pnpm install --frozen-lockfile=false
else
  echo "[Distopia] node_modules found. Skipping dependency install."
  echo "[Distopia] To reinstall cleanly: rm -rf node_modules pnpm-lock.yaml && ./scripts/run-linux.sh"
fi

echo "[Distopia] Seeding local SQLite database..."
run_pnpm db:seed

echo "[Distopia] Starting development server at http://localhost:3000"
echo "[Distopia] This process stays open while the server runs. Press Ctrl+C to stop."
run_pnpm dev
