#!/usr/bin/env bash
# Real Cloudflare Turnstile widget (sitekey + secret) — dummy/test açarlarını əvəz edir.
#
# Token: Cloudflare dashboard → My Profile → API Tokens
# Permission: Account.Turnstile Edit, Account.Account Settings Read
#
#   export CLOUDFLARE_API_TOKEN="..."
#   ./ops/cloudflare/provision-turnstile.sh
#
# WRITE_ENV=1 olarsa .env-ə NEXT_PUBLIC_TURNSTILE_SITE_KEY və TURNSTILE_SECRET_KEY yazır
# (secret stdout-a çap olunmur).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ZONE_NAME="${ZONE_NAME:-xidmetal.com}"
WIDGET_NAME="${WIDGET_NAME:-xidmetal}"
TOKEN="${CLOUDFLARE_API_TOKEN:-${CF_API_TOKEN:-}}"
ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-}"
WRITE_ENV="${WRITE_ENV:-0}"
ENV_FILE="${ENV_FILE:-${ROOT}/.env}"

if [[ -z "$TOKEN" ]]; then
  echo "CLOUDFLARE_API_TOKEN təyin olunmayıb." >&2
  echo "Dashboard: https://dash.cloudflare.com/?to=/:account/turnstile" >&2
  echo "Token icazəsi: Account.Turnstile Edit" >&2
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

if [[ -z "$ACCOUNT_ID" ]]; then
  accounts_json="$(api GET "/accounts?per_page=50")"
  ACCOUNT_ID="$(python3 -c 'import json,sys
d=json.load(sys.stdin)
rows=d.get("result") or []
print(rows[0]["id"] if rows else "")' <<<"$accounts_json")"
fi

if [[ -z "$ACCOUNT_ID" ]]; then
  echo "Cloudflare account tapılmadı (token Account.Account Settings Read lazımdır)." >&2
  exit 1
fi

echo "account=${ACCOUNT_ID} widget=${WIDGET_NAME} domains=${ZONE_NAME},www.${ZONE_NAME},admin.${ZONE_NAME}"

list_json="$(api GET "/accounts/${ACCOUNT_ID}/challenges/widgets")"
sitekey="$(python3 -c 'import json,sys
name=sys.argv[1]
zone=sys.argv[2]
d=json.load(sys.stdin)
rows=d.get("result") or []
match=""
for w in rows:
    domains=set(w.get("domains") or [])
    if w.get("name")==name or zone in domains or ("www."+zone) in domains:
        match=w.get("sitekey") or w.get("id") or ""
        break
print(match)' "$WIDGET_NAME" "$ZONE_NAME" <<<"$list_json")"

payload="$(python3 -c "import json; print(json.dumps({
  'name': '''${WIDGET_NAME}''',
  'domains': ['''${ZONE_NAME}''', '''www.${ZONE_NAME}''', '''admin.${ZONE_NAME}''', 'localhost', '127.0.0.1'],
  'mode': 'managed',
}))")"

if [[ -z "$sitekey" ]]; then
  created="$(api POST "/accounts/${ACCOUNT_ID}/challenges/widgets" "$payload")"
  sitekey="$(python3 -c 'import json,sys
d=json.load(sys.stdin)
r=d.get("result") or {}
print(r.get("sitekey") or r.get("id") or "")' <<<"$created")"
  secret="$(python3 -c 'import json,sys
d=json.load(sys.stdin)
r=d.get("result") or {}
print(r.get("secret") or "")' <<<"$created")"
  echo "created widget sitekey=${sitekey}"
else
  existing="$(api GET "/accounts/${ACCOUNT_ID}/challenges/widgets/${sitekey}")"
  secret="$(python3 -c 'import json,sys
d=json.load(sys.stdin)
r=d.get("result") or {}
print(r.get("secret") or "")' <<<"$existing")"
  echo "existing widget sitekey=${sitekey}"
fi

if [[ -z "$sitekey" || -z "$secret" ]]; then
  echo "Widget sitekey/secret alınmadı." >&2
  exit 1
fi

python3 - <<'PY' "$sitekey"
import sys
key=sys.argv[1]
dummy={"1x00000000000000000000AA","1x00000000000000000000BB","2x00000000000000000000AB","3x00000000000000000000FF"}
if key in dummy:
    raise SystemExit("Dummy/test sitekey qaytdı — real widget yaradılmadı.")
print("sitekey_ok")
PY

if [[ "$WRITE_ENV" == "1" ]]; then
  python3 - <<'PY' "$ENV_FILE" "$sitekey" "$secret"
from pathlib import Path
import sys
path = Path(sys.argv[1])
sitekey = sys.argv[2]
secret = sys.argv[3]
text = path.read_text() if path.exists() else ""

def upsert(src: str, key: str, value: str) -> str:
    import re
    line = f'{key}="{value}"'
    pattern = rf'(?m)^{re.escape(key)}=.*$'
    if re.search(pattern, src):
        return re.sub(pattern, line, src)
    return src.rstrip() + "\n" + line + "\n"

text = upsert(text, "NEXT_PUBLIC_TURNSTILE_SITE_KEY", sitekey)
text = upsert(text, "TURNSTILE_SECRET_KEY", secret)
path.write_text(text)
print(f"wrote {path} (sitekey + secret)")
PY
fi

echo "hazır: NEXT_PUBLIC_TURNSTILE_SITE_KEY=${sitekey}"
echo "TURNSTILE_SECRET_KEY .env-ə yazmaq üçün: WRITE_ENV=1 $0"
echo "Web image NEXT_PUBLIC_* bake edir — yenidən build lazımdır."
