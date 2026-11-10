#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"
CONTAINER_NAME="ambd-postgres_container"
STARTED_BY_SCRIPT=0

cd "$ROOT_DIR"

# Останавливает только запущенную этим скриптом БД, сохраняя код ошибки миграции или прерывания.
cleanup() {
  local status=$?

  trap - EXIT INT TERM

  if [[ "$STARTED_BY_SCRIPT" == "1" ]]; then
    echo "Останавливаем временно запущенную БД..."

    if ! sudo docker stop "$CONTAINER_NAME" >/dev/null; then
      echo "Не удалось остановить контейнер БД." >&2

      if [[ "$status" == "0" ]]; then
        status=1
      fi
    fi
  fi

  exit "$status"
}

# Ожидает готовность PostgreSQL до двух минут, используя настройки внутри контейнера.
wait_for_database() {
  local attempt

  for ((attempt = 0; attempt < 120; attempt++)); do
    if sudo docker exec "$CONTAINER_NAME" sh -c 'pg_isready --quiet --username="$POSTGRES_USER" --dbname="$POSTGRES_DB"'; then
      return 0
    fi

    sleep 1
  done

  echo "PostgreSQL не стал готов к подключениям за 120 секунд." >&2
  return 1
}

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Не найден $ENV_FILE. Создайте его из .env.example и настройте подключение к БД." >&2
  exit 1
fi

# Отдельно проверяем Docker, чтобы недоступный daemon не воспринимался как отсутствие контейнера.
sudo docker info >/dev/null

RUNNING="$(sudo docker container inspect --format '{{.State.Running}}' "$CONTAINER_NAME" 2>/dev/null || true)"

trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

if [[ "$RUNNING" == "true" ]]; then
  echo "БД уже запущена: после миграций контейнер останется работать."
else
  STARTED_BY_SCRIPT=1

  if [[ "$RUNNING" == "false" ]]; then
    echo "Запускаем существующий контейнер БД..."
    sudo docker start "$CONTAINER_NAME" >/dev/null
  else
    echo "Создаём и запускаем контейнер БД..."
    sudo docker compose --env-file "$ENV_FILE" -f "$ROOT_DIR/apps/am-bd/docker-compose.yml" up --detach --no-deps ambd-postgres
  fi
fi

wait_for_database
npm run am:back:typeorm:migration:run
