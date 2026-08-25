#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

pids=()

kill_tree() {
  local pid="$1"
  local child

  while read -r child; do
    [[ -n "$child" ]] && kill_tree "$child"
  done < <(pgrep -P "$pid" 2>/dev/null || true)

  kill "$pid" 2>/dev/null || true
}

shutdown() {
  local status="${1:-$?}"

  trap - EXIT INT TERM

  if ((${#pids[@]} > 0)); then
    for pid in "${pids[@]}"; do
      kill_tree "$pid"
    done
    wait "${pids[@]}" 2>/dev/null || true
  fi

  exit "$status"
}

start() {
  local name="$1"
  shift

  echo "Starting $name..."
  "$@" </dev/null &
  pids+=("$!")
}

wait_for_first_exit() {
  local pid

  while :; do
    for pid in "${pids[@]}"; do
      if ! kill -0 "$pid" 2>/dev/null; then
        wait "$pid"
        return "$?"
      fi
    done
    sleep 1
  done
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
wait_for_first_exit
status=$?
set -e

shutdown "$status"
