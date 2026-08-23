# Başlanğıc Bələdçisi

Bu sənəd Xidmətal layihəsini local mühitdə işə salmaq üçün addım-addım təlimat verir.

> **İki mühit, ayrı portlar.** `pnpm dev` canlı xidmetal.com-u (3020/3021/4000) tutmur.
>
> | | Web | Admin | API | Postgres | Redis |
> |---|---|---|---|---|---|
> | **Production** (xidmetal.com, `pnpm docker:prod`) | `127.0.0.1:3020` | `127.0.0.1:3021` | `127.0.0.1:4000` | host `5434` | host `6380` |
> | **Development** (`pnpm docker:dev` + `pnpm dev`) | `127.0.0.1:3120` | `127.0.0.1:3121` | `127.0.0.1:4100` | host `5435` | host `6381` |
>
> `pnpm docker:prod:down` və `docker compose down` **canlı saytı dayandırır** — inkişaf üçün `pnpm docker:dev:down` istifadə edin.

## 1. Sistem tələbləri

| Alət | Minimum versiya |
|------|-----------------|
| Node.js | 20.x |
| pnpm | 9.x |
| Docker | 24.x |
| Docker Compose | 2.x |

```bash
node --version   # v20.x.x və ya yuxarı
pnpm --version   # 9.x.x
```

## 2. Repozitoriyanı hazırlamaq

```bash
git clone <repo-url> xidmetal
cd xidmetal
pnpm install
```

## 3. Environment konfiqurasiyası

```bash
cp .env.example .env
```

`.env` dəyərləri (`.env.example` ilə eyni):

| Dəyişən | Təsvir | Default (local Docker) |
|---------|--------|-------------------------|
| `DATABASE_URL` | PostgreSQL | prod: `…localhost:5434/xidmetal`; **dev:** `.env.development` → `:5435` |
| `REDIS_URL` | Redis (throttler + Socket.IO adapter + BullMQ dispatch; boş = in-memory / dev timeout fallback) | prod `:6380`; **dev:** `:6381` |
| `NODE_ENV` | `development` / `production` | `development` |
| `JWT_SECRET` | JWT imzalama açarı (prod-da uzun random) | Dəyişdirin! |
| `API_PORT` | Backend port | prod `4000`; **`pnpm dev`:** `4100` |
| `CORS_ORIGIN` | İcazəli frontend origin-lər (vergüllə) | prod `http://localhost:3020,http://localhost:3021`; **dev:** `3120`/`3121` |
| `NEXT_PUBLIC_API_URL` | Boş = cookie rewrite (local); prod-da API URL | `""` |
| `NEXT_PUBLIC_APP_URL` | Marketplace URL | prod `http://localhost:3020`; **dev:** `http://localhost:3120` |
| `NEXT_PUBLIC_ADMIN_URL` | Admin panel URL | prod `http://localhost:3021`; **dev:** `http://localhost:3121` |
| `SMTP_*` | E-poçt (verify / şifrə bərpası). **Prod-da məcburi** | local-da boş olar |
| `STORAGE_DRIVER` | `local` və ya `s3` | `local` |
| `STORAGE_PUBLIC_BASE_URL` | Yüklənən şəkillərin ictimai bazası | prod `http://localhost:4000/uploads`; **dev:** `:4100` |
| `GEOCODER_PROVIDER` | `mock` və ya `nominatim` | `mock` |
| `GEOCODER_BASE_URL` | Nominatim base (opsional) | OSM default |
| `GEOCODER_USER_AGENT` | Nominatim User-Agent | `Xidmetal/1.0 …` |
| `NEXT_PUBLIC_WS_URL` | Socket.IO origin (birbaşa API) | prod `http://localhost:4000`; **dev:** `:4100` |
| `GOOGLE_MAPS_API_KEY` | Server Directions ETA + traffic (boş = Mapbox/haversine) | `""` |
| `MAPBOX_ACCESS_TOKEN` | Server Directions ETA (opsional; boş = Google/haversine) | `""` |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps JS (konum seçici + canlı tracking + client Directions; Directions API aktiv olsun) | `""` |
| `DISPATCH_SEARCH_WINDOW_SEC` | Təcili sifariş axtarış pəncərəsi (saniyə); tək təklif timeout yox | `600` |
| `DISPATCH_REDISCOVERY_INTERVAL_SEC` | Yeni ONLINE üçün yenidən axtarış intervalı | `30` |
| `DISPATCH_DECLINE_REOFFER_COOLDOWN_SEC` | İmtina sonrası eyni xidmət verənə yenidən təklif gözləməsi | `120` |
| `DISPATCH_QUEUE_PREFIX` | BullMQ Redis prefix (opsional) | `xidmetal:dispatch` |

Mövcud `.env` varsa, production portları yuxarıdakı **Production** sətiri ilə uyğunlaşdırın. `pnpm dev` avtomatik `.env.development` oxuyur. Production-da `NODE_ENV=production`, güclü `JWT_SECRET` və işlək `SMTP_*` təyin edin.

## 4. Verilənlər bazasını işə salmaq

**İnkişaf (xidmetal.com-a toxunmur):**

```bash
pnpm docker:dev
docker compose -f docker-compose.dev.yml ps
```

> Ayrı Compose layihəsi (`xidmetal-dev`): Postgres `127.0.0.1:5435`, Redis `127.0.0.1:6381`.
> `docker compose up -d` (faylsız) **production** Postgres/Redis-i yenidən qaldırır — bu VPS-də işlətməyin.

### Full stack (api + web + admin) — canlı sayt

Production-like konteynerlər (migration on boot):

```bash
pnpm docker:prod
# default: API ×3 + nginx LB (5k concurrent — docs/CAPACITY.md)
# API_REPLICAS=4 pnpm docker:prod
```

Konteyner daxilində DB/Redis host adları `postgres` / `redis`-dir — `DATABASE_URL_DOCKER` / `REDIS_URL_DOCKER` (bax: `.env.example`). Dayandırmaq: `pnpm docker:prod:down` (**canlı xidmetal.com sönür**). Host API portu **nginx** (`api-proxy`) vasitəsilədir.

CD: GitHub Actions `Deploy images` — GHCR push; `deploy_runtime=true` + `DEPLOY_HOST` / `DEPLOY_USER` / `DEPLOY_SSH_KEY` ilə host-da compose pull+up.

### Cloudflare domain (xidmetal.com)

Marketplace, admin və API eyni VPS-də qalır; Cloudflare yalnız DNS + TLS + proxy-dir (Pages/Workers yox).

**Bu VPS** (`77.42.42.63`) artıq host nginx ilə `it-market.org` xidmət edir — `pnpm docker:prod:cloudflare` burada işlədilməməlidir (`:80/:443` toqquşması). Origin vhost: `ops/nginx/xidmetal.com.conf`.

```bash
sudo cp ops/nginx/cloudflare-realip.conf /etc/nginx/snippets/cloudflare-realip.conf
sudo cp ops/nginx/xidmetal.com.conf /etc/nginx/sites-available/xidmetal.com
sudo ln -sf /etc/nginx/sites-available/xidmetal.com /etc/nginx/sites-enabled/xidmetal.com
sudo nginx -t && sudo systemctl reload nginx
CLOUDFLARE_API_TOKEN=… ./ops/cloudflare/provision-dns.sh
WRITE_ENV=1 CLOUDFLARE_API_TOKEN=… ./ops/cloudflare/provision-turnstile.sh
```

`.env` (ictimai origin-lər):

```bash
WEB_HOST="xidmetal.com"
WWW_HOST="www.xidmetal.com"
ADMIN_HOST="admin.xidmetal.com"
CORS_ORIGIN="https://xidmetal.com,https://www.xidmetal.com,https://admin.xidmetal.com"
NEXT_PUBLIC_APP_URL="https://xidmetal.com"
NEXT_PUBLIC_ADMIN_URL="https://admin.xidmetal.com"
NEXT_PUBLIC_API_URL=""
NEXT_PUBLIC_WS_URL=""
TRUST_PROXY="true"
```

Cloudflare DNS (proxied / orange cloud): `@`, `www`, `admin` → `77.42.42.63`. SSL/TLS: **Full** (origin self-signed kifayətdir). **Full (strict)** üçün Origin CA: `ops/certs/origin.pem` + `origin.key`. Dashboard: WebSockets ON, Always Use HTTPS ON.

Ayrıca, boş 80/443 olan dedicated origin-də: `pnpm docker:prod:cloudflare`. Image-də `NEXT_PUBLIC_*` build-time-dır — domain dəyişəndə web/admin yenidən build/restart olunmalıdır.

## 5. Database schema

```bash
pnpm db:generate
pnpm db:migrate:apply    # dev DB (:5435) — production 5434-ə getmir
pnpm db:seed
```

Production / CI: `pnpm db:migrate:deploy` (konteyner `DATABASE_URL` ilə).

**Mövcud local DB** əvvəl `db:push` ilə yaradılıbsa (migration history yoxdursa):

```bash
pnpm db:push
pnpm --filter @xidmetal/database exec prisma migrate resolve --applied 20260806120000_init
```

Lokal yeni dəyişiklik üçün: `pnpm db:migrate` (`prisma migrate dev`) — bu əmr **dev** DB-yə (`:5435`) gedir, production `5434`-ə yox. Mövcud migration-ları tətbiq: `pnpm db:migrate:apply`.

Faza 5 migration (ödəniş/device/idempotency): `20260807190000_payments_device_tokens_idempotency`.
Production: `pnpm db:migrate:deploy`.

> **Ödəniş:** `PAYMENTS_ENABLED=false` (default) — marketplace ödənişsiz qalır. Push üçün `.env.example`-də `FCM_*` bax.

## 6. Development serverləri

Canlı sayt açıq qala bilər — `pnpm dev` 3120/3121/4100-də, yalnız `127.0.0.1`-də dinləyir.

```bash
pnpm docker:dev
pnpm db:migrate:apply
pnpm db:seed
pnpm dev
```

Və ya ayrı-ayrı:

```bash
pnpm --filter @xidmetal/api dev
pnpm --filter @xidmetal/web dev
pnpm --filter @xidmetal/admin dev
```

## 7. Yoxlama

| Test | URL / Əmr |
|------|-----------|
| Marketplace (dev) | http://127.0.0.1:3120 |
| Admin panel (dev) | http://127.0.0.1:3121 |
| API Health (dev) | http://127.0.0.1:4100/api/v1/health |
| Metrics (dev) | http://127.0.0.1:4100/api/v1/metrics |
| Swagger (dev) | http://127.0.0.1:4100/docs |
| Canlı sayt | https://xidmetal.com (3020/3021/4000 — toxunulmur) |
| DB Studio (dev) | `pnpm db:studio` |

## 7b. Monitoring (opsional)

Prometheus + Grafana əsas `docker-compose.yml`-ə toxunmur — ayrı fayl + profile:

```bash
# API host-da :4000 işləyərkən
docker compose -f docker-compose.yml -f docker-compose.monitoring.yml --profile monitoring up -d
```

| Servis | URL |
|--------|-----|
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3001 (admin / admin) |

Dashboard JSON: `ops/grafana/dashboards/xidmetal-api-dashboard.json`. Scrape: `ops/prometheus/prometheus.yml` → `host.docker.internal:4000/api/v1/metrics`.

Production-da `METRICS_TOKEN` təyin edin və Prometheus scrape-ə Bearer əlavə edin (bax: `.env.example`).

### Yük testi (k6, əl ilə)

```bash
# k6 quraşdırılmalıdır: https://grafana.com/docs/k6/latest/set-up/install-k6/
pnpm load:smoke    # ~30s
pnpm load:stress   # ramp
```

k6 yoxdursa skript fail-soft xəbərdarlıq verir. Ətraflı: `ops/load/README.md`. CI default-da load test **yoxdur** (`workflow_dispatch`: `.github/workflows/load-test.yml`).

## 8. İlk API sorğuları

### Qeydiyyat

```bash
curl -X POST http://localhost:4100/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass1",
    "firstName": "Test",
    "lastName": "User",
    "role": "CUSTOMER"
  }'
```

### Kateqoriyalar

```bash
curl http://localhost:4100/api/v1/categories
```

## Problemlərin həlli

### Port artıq istifadədədir

Dev toqquşması (3120/4100) — production 3020/4000 deyil:

```bash
ss -ltnp | grep -E '3120|3121|4100|5435'
```

Canlı sayt portları (bunları `pnpm dev` tutmamalıdır):

```bash
ss -ltnp | grep -E '3020|3021|4000|5434'
```

### Database connection error

`DATABASE_URL`-də **dev** host portunun **5435** olduğunu yoxlayın (`docker-compose.dev.yml` map: `5435:5432`). Production DB `5434`-dür — `pnpm db:migrate` ora getməməlidir.

```bash
docker compose -f docker-compose.dev.yml logs postgres
docker compose -f docker-compose.dev.yml restart postgres
```

### CORS / login problemləri

`CORS_ORIGIN` həm marketplace, həm admin origin-lərini əhatə etməlidir.
Dev: `http://localhost:3120,http://localhost:3121`. Admin üçün `NEXT_PUBLIC_ADMIN_URL=http://localhost:3121`.

### Prisma client tapılmır

```bash
pnpm db:generate
```

### node_modules problemləri

```bash
pnpm clean
pnpm install
```
