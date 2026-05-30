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
export NODE_OPTIONS="${NODE_OPTIONS:-} --experimental-sqlite"
export NODE_NO_WARNINGS=1

echo "[Distopia] Installing dependencies with yarn..."
yarn install

echo "[Distopia] Seeding local SQLite database..."
yarn db:seed

echo "[Distopia] Building production bundle..."
yarn build

echo "[Distopia] Starting production server at http://localhost:3000"
echo "[Distopia] This process stays open while the server runs. Press Ctrl+C to stop."
yarn start
