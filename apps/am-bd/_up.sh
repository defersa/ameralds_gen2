#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"
ENV_EXAMPLE_FILE="$ROOT_DIR/.env.example"

if [[ ! -f "$ENV_FILE" ]]; then
  if [[ ! -f "$ENV_EXAMPLE_FILE" ]]; then
    echo "Error: $ENV_EXAMPLE_FILE not found" >&2
    exit 1
  fi

  cp "$ENV_EXAMPLE_FILE" "$ENV_FILE"
  echo "Created $ENV_FILE from $ENV_EXAMPLE_FILE"
fi

compose_args=(up)

if [[ "${AM_BD_DETACH:-}" == "1" ]]; then
  compose_args+=(--detach)
fi

sudo docker compose --env-file "$ENV_FILE" -f "$SCRIPT_DIR/docker-compose.yml" "${compose_args[@]}"
