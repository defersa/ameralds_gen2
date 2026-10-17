#!/usr/bin/env bash
set -euo pipefail

CONTAINER_NAME="ameralds-mailpit"

if sudo docker container inspect "$CONTAINER_NAME" >/dev/null 2>&1; then
  sudo docker start "$CONTAINER_NAME" >/dev/null
else
  sudo docker run --detach \
    --name "$CONTAINER_NAME" \
    --publish 127.0.0.1:1025:1025 \
    --publish 127.0.0.1:8025:8025 \
    axllent/mailpit >/dev/null
fi

echo "Mailpit web UI: http://localhost:8025"
echo "Mailpit SMTP: 127.0.0.1:1025"
