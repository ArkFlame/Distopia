#!/usr/bin/env bash
set -euo pipefail

DISTOPIA_PNPM_VERSION="${DISTOPIA_PNPM_VERSION:-10.12.1}"

ensure_pnpm() {
  if command -v pnpm >/dev/null 2>&1; then
    return 0
  fi

  if ! command -v corepack >/dev/null 2>&1; then
    echo "[Distopia] pnpm is not installed and corepack was not found." >&2
    echo "[Distopia] Install pnpm once, then rerun this script:" >&2
    echo "  curl -fsSL https://get.pnpm.io/install.sh | sh -" >&2
    exit 1
  fi

  echo "[Distopia] pnpm not found. Activating pnpm ${DISTOPIA_PNPM_VERSION} through corepack..."
  corepack enable >/dev/null 2>&1 || true
  corepack prepare "pnpm@${DISTOPIA_PNPM_VERSION}" --activate

  if ! command -v pnpm >/dev/null 2>&1; then
    echo "[Distopia] corepack activated pnpm, but pnpm is still not in PATH." >&2
    echo "[Distopia] Open a new terminal or run:" >&2
    echo "  corepack pnpm --version" >&2
    exit 1
  fi
}

run_pnpm() {
  ensure_pnpm
  pnpm "$@"
}
