#!/usr/bin/env bash
# xidmetal.com DNS + zone settings (proxied A records → this VPS).
#
# Token: Cloudflare dashboard → My Profile → API Tokens
# Permission: Zone.DNS Edit, Zone.Zone Settings Edit, Zone.Zone Read
# (zone xidmetal.com)
#
#   export CLOUDFLARE_API_TOKEN="..."
#   ./ops/cloudflare/provision-dns.sh
set -euo pipefail

ZONE_NAME="${ZONE_NAME:-xidmetal.com}"
ORIGIN_IP="${ORIGIN_IP:-77.42.42.63}"
TOKEN="${CLOUDFLARE_API_TOKEN:-${CF_API_TOKEN:-}}"

if [[ -z "$TOKEN" ]]; then
  echo "CLOUDFLARE_API_TOKEN təyin olunmayıb." >&2
  echo "Dashboard: https://dash.cloudflare.com → xidmetal.com → DNS" >&2
  echo "  A  @      ${ORIGIN_IP}  Proxied" >&2
  echo "  A  www    ${ORIGIN_IP}  Proxied" >&2
  echo "  A  admin  ${ORIGIN_IP}  Proxied" >&2
  echo "SSL/TLS: Full; Always Use HTTPS: ON; WebSockets: ON" >&2
  exit 2
fi

api() {
  local method="$1" path="$2" data="${3:-}"
  if [[ -n "$data" ]]; then
    curl -fsS -X "$method" "https://api.cloudflare.com/client/v4${path}" \
      -H "Authorization: Bearer ${TOKEN}" \
      -H "Content-Type: application/json" \
      --data "$data"
  else
    curl -fsS -X "$method" "https://api.cloudflare.com/client/v4${path}" \
      -H "Authorization: Bearer ${TOKEN}" \
      -H "Content-Type: application/json"
  fi
}

zone_json="$(api GET "/zones?name=${ZONE_NAME}&status=active")"
zone_id="$(python3 -c 'import json,sys; d=json.load(sys.stdin); r=d.get("result") or [];
print(r[0]["id"] if r else "")' <<<"$zone_json")"

if [[ -z "$zone_id" ]]; then
  echo "Zone tapılmadı: ${ZONE_NAME} (token zone-a baxa bilmir və ya zone yoxdur)" >&2
  exit 1
fi

echo "zone=${ZONE_NAME} id=${zone_id} origin=${ORIGIN_IP}"

upsert_a() {
  local name="$1"
  local list
  list="$(api GET "/zones/${zone_id}/dns_records?type=A&name=${name}")"
  local rec_id
  rec_id="$(python3 -c 'import json,sys; d=json.load(sys.stdin); r=d.get("result") or [];
print(r[0]["id"] if r else "")' <<<"$list")"
  local payload
  payload="$(python3 -c "import json; print(json.dumps({
    'type':'A','name':'''${name}''','content':'''${ORIGIN_IP}''','proxied':True,'ttl':1,
    'comment':'xidmetal origin'
  }))")"
  if [[ -n "$rec_id" ]]; then
    api PUT "/zones/${zone_id}/dns_records/${rec_id}" "$payload" >/dev/null
    echo "updated A ${name} → ${ORIGIN_IP} (proxied)"
  else
    api POST "/zones/${zone_id}/dns_records" "$payload" >/dev/null
    echo "created A ${name} → ${ORIGIN_IP} (proxied)"
  fi
}

upsert_a "${ZONE_NAME}"
upsert_a "www.${ZONE_NAME}"
upsert_a "admin.${ZONE_NAME}"

patch_setting() {
  local id="$1" value="$2"
  api PATCH "/zones/${zone_id}/settings/${id}" "{\"value\":\"${value}\"}" >/dev/null \
    && echo "setting ${id}=${value}" \
    || echo "setting ${id} dəyişmədi (token permission / plan)" >&2
}

patch_setting ssl full
patch_setting always_use_https on
patch_setting websockets on
patch_setting min_tls_version "1.2"
patch_setting opportunistic_https on

echo "hazır: https://${ZONE_NAME}  https://admin.${ZONE_NAME}"
