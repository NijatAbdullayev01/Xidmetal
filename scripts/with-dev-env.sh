#!/usr/bin/env bash
# Prisma / seed əmrlərini production `.env` əvəzinə `.env.development` ilə işə salır.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT/.env.development"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "with-dev-env: $ENV_FILE tapılmadı" >&2
  exit 1
fi
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a
exec "$@"
