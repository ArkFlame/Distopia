#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/package-manager.sh

if [ ! -f .env ]; then
  cp .env.example .env
fi

mkdir -p data data/cdn public/uploads
PORT="${DISTOPIA_PORT:-3928}"
export NODE_OPTIONS="${NODE_OPTIONS:-} --experimental-sqlite"
export NODE_NO_WARNINGS=1

LAN_IPS="$(hostname -I 2>/dev/null | tr ' ' '
' | grep -E '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$' | paste -sd, - || true)"
DEFAULT_DEV_ORIGINS="localhost,127.0.0.1,0.0.0.0,distopia.arkflame.com"
if [ -n "${LAN_IPS}" ]; then
  DEFAULT_DEV_ORIGINS="${DEFAULT_DEV_ORIGINS},${LAN_IPS}"
fi
export DISTOPIA_DEV_ORIGINS="${DISTOPIA_DEV_ORIGINS:-${DEFAULT_DEV_ORIGINS}}"

if [ ! -d node_modules ]; then
  echo "[Distopia] Installing dependencies with pnpm..."
  run_pnpm install --frozen-lockfile=false
else
  echo "[Distopia] node_modules found. Skipping dependency install."
fi

echo "[Distopia] Preparing local SQLite database schema..."
run_pnpm db:seed

echo "[Distopia] Starting DEVELOPMENT server at http://localhost:${PORT}"
echo "[Distopia] Allowed dev origins: ${DISTOPIA_DEV_ORIGINS}"
echo "[Distopia] This process stays open while the server runs. Press Ctrl+C to stop."
run_pnpm dev -H 0.0.0.0 -p "${PORT}"
