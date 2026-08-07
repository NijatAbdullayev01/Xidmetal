#!/usr/bin/env bash
# Fail-soft: k6 yoxdursa xəbərdarlıq + exit 0 (CI default run etmir).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SCRIPT_NAME="${1:-smoke}"
SCRIPT_PATH="$ROOT/ops/load/${SCRIPT_NAME}.js"

if [[ ! -f "$SCRIPT_PATH" ]]; then
  echo "Skript tapılmadı: $SCRIPT_PATH" >&2
  exit 1
fi

if ! command -v k6 >/dev/null 2>&1; then
  echo "k6 tapılmadı — yük testi atlandı."
  echo "Quraşdırma: https://grafana.com/docs/k6/latest/set-up/install-k6/"
  echo "Sonra: BASE_URL=http://localhost:4000 pnpm load:${SCRIPT_NAME}"
  exit 0
fi

mkdir -p "$ROOT/ops/load/results"
export BASE_URL="${BASE_URL:-http://localhost:4000}"

echo "k6 ${SCRIPT_NAME} → BASE_URL=${BASE_URL}"
exec k6 run \
  --summary-export "$ROOT/ops/load/results/${SCRIPT_NAME}-summary.json" \
  "$SCRIPT_PATH"
