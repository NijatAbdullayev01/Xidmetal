# Başlanğıc Bələdçisi

Bu sənəd Xidmətal layihəsini local mühitdə işə salmaq üçün addım-addım təlimat verir.

> **Portlar (cari):** Web `3020`, Admin `3021`, API `4000`, Postgres host `5434`, Redis host `6380`.

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
| `DATABASE_URL` | PostgreSQL | `postgresql://xidmetal:xidmetal_dev@localhost:5434/xidmetal` |
| `REDIS_URL` | Redis (throttler + Socket.IO adapter + BullMQ dispatch; boş = in-memory / dev timeout fallback) | `redis://localhost:6380` |
| `NODE_ENV` | `development` / `production` | `development` |
| `JWT_SECRET` | JWT imzalama açarı (prod-da uzun random) | Dəyişdirin! |
| `API_PORT` | Backend port | `4000` |
| `CORS_ORIGIN` | İcazəli frontend origin-lər (vergüllə) | `http://localhost:3020,http://localhost:3021` |
| `NEXT_PUBLIC_API_URL` | Boş = cookie rewrite (local); prod-da API URL | `""` |
| `NEXT_PUBLIC_APP_URL` | Marketplace URL | `http://localhost:3020` |
| `NEXT_PUBLIC_ADMIN_URL` | Admin panel URL | `http://localhost:3021` |
| `SMTP_*` | E-poçt (verify / şifrə bərpası). **Prod-da məcburi** | local-da boş olar |
| `STORAGE_DRIVER` | `local` və ya `s3` | `local` |
| `STORAGE_PUBLIC_BASE_URL` | Yüklənən şəkillərin ictimai bazası | `http://localhost:4000/uploads` |
| `GEOCODER_PROVIDER` | `mock` və ya `nominatim` | `mock` |
| `GEOCODER_BASE_URL` | Nominatim base (opsional) | OSM default |
| `GEOCODER_USER_AGENT` | Nominatim User-Agent | `Xidmetal/1.0 …` |
| `NEXT_PUBLIC_WS_URL` | Socket.IO origin (birbaşa API) | `http://localhost:4000` |
| `GOOGLE_MAPS_API_KEY` | Server Directions ETA + traffic (boş = Mapbox/haversine) | `""` |
| `MAPBOX_ACCESS_TOKEN` | Server Directions ETA (opsional; boş = Google/haversine) | `""` |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps JS (konum seçici + canlı tracking + client Directions; Directions API aktiv olsun) | `""` |
| `DISPATCH_SEARCH_WINDOW_SEC` | Təcili sifariş axtarış pəncərəsi (saniyə); tək təklif timeout yox | `600` |
| `DISPATCH_REDISCOVERY_INTERVAL_SEC` | Yeni ONLINE üçün yenidən axtarış intervalı | `30` |
| `DISPATCH_DECLINE_REOFFER_COOLDOWN_SEC` | İmtina sonrası eyni xidmət verənə yenidən təklif gözləməsi | `120` |
| `DISPATCH_QUEUE_PREFIX` | BullMQ Redis prefix (opsional) | `xidmetal:dispatch` |

Mövcud `.env` varsa, portları yuxarıdakı ilə uyğunlaşdırın. Production-da `NODE_ENV=production`, güclü `JWT_SECRET` və işlək `SMTP_*` təyin edin.

## 4. Verilənlər bazasını işə salmaq

```bash
docker compose up -d
docker compose ps
```

> Postgres image: **PostGIS** (`postgis/postgis:16-3.5`). Əvvəl `postgres:16-alpine` volume istifadə olunubsa: `docker compose down -v && docker compose up -d` (data silinir).

### Full stack (api + web + admin)

Production-like konteynerlər (migration on boot):

```bash
pnpm docker:prod
# default: API ×3 + nginx LB (5k concurrent — docs/CAPACITY.md)
# API_REPLICAS=4 pnpm docker:prod
```

Konteyner daxilində DB/Redis host adları `postgres` / `redis`-dir — `DATABASE_URL_DOCKER` / `REDIS_URL_DOCKER` (bax: `.env.example`). Dayandırmaq: `pnpm docker:prod:down`. Host API portu **nginx** (`api-proxy`) vasitəsilədir.

CD: GitHub Actions `Deploy images` — GHCR push; `deploy_runtime=true` + `DEPLOY_HOST` / `DEPLOY_USER` / `DEPLOY_SSH_KEY` ilə host-da compose pull+up.

## 5. Database schema

```bash
pnpm db:generate
pnpm db:migrate:deploy   # production / təmiz mühit
pnpm --filter @xidmetal/database seed
```

**Mövcud local DB** əvvəl `db:push` ilə yaradılıbsa (migration history yoxdursa):

```bash
pnpm db:push
pnpm --filter @xidmetal/database exec prisma migrate resolve --applied 20260806120000_init
```

Lokal yeni dəyişiklik üçün: `pnpm db:migrate` (`prisma migrate dev`).

Faza 5 migration (ödəniş/device/idempotency): `20260807190000_payments_device_tokens_idempotency`.
Production: `pnpm db:migrate:deploy`.

> **Ödəniş:** `PAYMENTS_ENABLED=false` (default) — marketplace ödənişsiz qalır. Push üçün `.env.example`-də `FCM_*` bax.

## 6. Development serverləri

```bash
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
| Marketplace | http://localhost:3020 |
| Admin panel | http://localhost:3021 |
| API Health | http://localhost:4000/api/v1/health |
| Metrics | http://localhost:4000/api/v1/metrics |
| Swagger | http://localhost:4000/docs |
| DB Studio | `pnpm db:studio` |

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
curl -X POST http://localhost:4000/api/v1/auth/register \
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
curl http://localhost:4000/api/v1/categories
```

## Problemlərin həlli

### Port artıq istifadədədir

```bash
lsof -i :3020
lsof -i :4000
lsof -i :5434
```

### Database connection error

`DATABASE_URL`-də host portunun **5434** olduğunu yoxlayın (`docker-compose.yml` map: `5434:5432`).

```bash
docker compose logs postgres
docker compose restart postgres
```

### CORS / login problemləri

`CORS_ORIGIN` həm marketplace, həm admin origin-lərini əhatə etməlidir:
`http://localhost:3020,http://localhost:3021`. Admin üçün `NEXT_PUBLIC_ADMIN_URL=http://localhost:3021`.

### Prisma client tapılmır

```bash
pnpm db:generate
```

### node_modules problemləri

```bash
pnpm clean
pnpm install
```
