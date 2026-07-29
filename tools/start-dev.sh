#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

pids=()

shutdown() {
  local status="${1:-$?}"

  trap - EXIT INT TERM

  if ((${#pids[@]} > 0)); then
    for pid in "${pids[@]}"; do
      kill -- "-$pid" 2>/dev/null || kill "$pid" 2>/dev/null || true
    done
    wait "${pids[@]}" 2>/dev/null || true
  fi

  exit "$status"
}

start() {
  local name="$1"
  shift

  echo "Starting $name..."
  setsid "$@" </dev/null &
  pids+=("$!")
}

trap 'shutdown $?' EXIT
trap 'shutdown 130' INT
trap 'shutdown 143' TERM

if command -v sudo >/dev/null 2>&1; then
  sudo -v
fi

echo "Starting database..."
AM_BD_DETACH=1 bash apps/am-bd/_up.sh
start "backend" npm run am:back:start:dev
start "frontend" npm run am:front:start

set +e
wait -n "${pids[@]}"
status=$?
set -e

shutdown "$status"
