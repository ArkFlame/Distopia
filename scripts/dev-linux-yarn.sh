#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

if ! command -v yarn >/dev/null 2>&1; then
  if command -v corepack >/dev/null 2>&1; then
    echo "[Distopia] yarn not found. Activating yarn through corepack..."
    corepack enable >/dev/null 2>&1 || true
    corepack prepare yarn@stable --activate
  else
    echo "[Distopia] yarn is not installed and corepack was not found." >&2
    exit 1
  fi
fi

if [ ! -f .env ]; then
  cp .env.example .env
fi

mkdir -p data data/cdn public/uploads
PORT="${DISTOPIA_PORT:-3928}"
export NODE_OPTIONS="${NODE_OPTIONS:-} --experimental-sqlite"
export NODE_NO_WARNINGS=1

LAN_IPS="$(hostname -I 2>/dev/null | tr ' ' '\n' | grep -E '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$' | paste -sd, - || true)"
DEFAULT_DEV_ORIGINS="localhost,127.0.0.1,0.0.0.0,distopia.arkflame.com"
if [ -n "${LAN_IPS}" ]; then
  DEFAULT_DEV_ORIGINS="${DEFAULT_DEV_ORIGINS},${LAN_IPS}"
fi
export DISTOPIA_DEV_ORIGINS="${DISTOPIA_DEV_ORIGINS:-${DEFAULT_DEV_ORIGINS}}"

echo "[Distopia] Installing dependencies with yarn..."
yarn install

echo "[Distopia] Preparing local SQLite database schema..."
yarn db:seed

echo "[Distopia] Starting DEVELOPMENT server at http://localhost:${PORT}"
echo "[Distopia] Allowed dev origins: ${DISTOPIA_DEV_ORIGINS}"
yarn dev -H 0.0.0.0 -p "${PORT}"
