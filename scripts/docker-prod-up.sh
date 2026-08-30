#!/usr/bin/env bash
# Production stack: API replica-ları recreate olanda köhnə api-proxy
# Docker DNS-də stale/SERVFAIL qalır və compose «unhealthy» deyib web/admin-i
# qoşmur. Ona görə proxy API-lərdən sonra ayrıca force-recreate olunur.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env)
if [[ "${1:-}" == "cloudflare" ]]; then
  COMPOSE+=(-f docker-compose.cloudflare.yml)
fi

API_REPLICAS="${API_REPLICAS:-3}"

"${COMPOSE[@]}" build
"${COMPOSE[@]}" up -d --scale "api=${API_REPLICAS}" postgres redis api
"${COMPOSE[@]}" up -d --force-recreate --no-deps api-proxy
"${COMPOSE[@]}" up -d --scale "api=${API_REPLICAS}"
