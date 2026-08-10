# Tutum & Miqyaslama — 5000 eyni anda aktiv

> Hədəf: saytda **ən azı 5000** eyni anda aktiv istifadəçi xidmətlərdən istifadə edəndə platforma çökməsin.
> Bu sənəd cari mühəndislik qərarlarını və deploy tövsiyələrini təsvir edir.

## Nə dəyişdi (kod)

| Sahə | Əvvəl | İndi |
|------|-------|------|
| `location:push` | Hər 3s: DB update + PostGIS + await ETA + LocationPing | WS **dərhal**; geo/PostGIS **15s**; ping **15s**; ETA haversine hot-path, Mapbox arxa plan |
| Throttle / sample / presence | Process-local `Map` | **Redis** `SET NX` / `INCR` (multi-instance) |
| Prisma pool | Default | `connection_limit=15` / proses (`PRISMA_CONNECTION_LIMIT`) |
| HTTP throttle | 100/dəq | **300/dəq** (`THROTTLE_LIMIT`) + `TRUST_PROXY` |
| Frontend poll | 4–8s hətta WS olanda | WS → **90s** fallback; dashboard siyahı **20s** |
| Prod compose | 1 API, birbaşa port | **nginx** + `--scale api=N` (default 3) |
| Postgres / Redis | Default | `max_connections=300`, shared_buffers; Redis `maxmemory` |

## Hədəf tutum modeli

5000 “aktiv” = qarışıq yük (hamısı eyni anda canlı izləmə deyil):

| Seqment (təxmin) | Say | Yük |
|------------------|-----|-----|
| Dashboard / axtarış | ~3500–4000 | seyrək REST + 1 WS |
| Mesaj / sifariş siyahısı | ~500–800 | WS + 90s poll |
| Canlı izləmə (sifariş cütü) | ~200–400 nəfər ≈ 100–200 trip | 3s WS location |

**Tövsiyə olunan minimal prod:**

- API replicas: **3–4** (4+ vCPU host və ya ayrı VM-lər)
- Postgres: **2+ vCPU, 4+ GB RAM**, PostGIS
- Redis: **512 MB+**
- Upload: multi-host üçün **S3/R2** (`STORAGE_DRIVER=s3`) — local volume yalnız tək host

## Deploy

```bash
# .env: REDIS_URL, TRUST_PROXY=true, DATABASE_URL (+ connection_limit)
API_REPLICAS=3 pnpm docker:prod
# eyni:
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env \
  up -d --build --scale api=3
```

Host port **4000** → `api-proxy` (nginx). Web/admin SSR `API_URL_INTERNAL=http://api-proxy:4000`.

Pool riyaziyyatı: `15 × 3 = 45` Prisma bağlantı ≪ `max_connections=300`.

## Yük testi

```bash
pnpm load:smoke
pnpm load:stress
pnpm load:capacity   # ramp → 5000 VU (HTTP public endpoints)
pnpm load:realtime   # Socket.IO handshake smoke
```

`load:capacity` real 5000 brauzer deyil — nginx/API/DB dayanıqlığı. Tam WS tracking üçün ayrıca Artillery/k6 WS ssenarisi tövsiyə olunur.

## Monitorinq

- `GET /api/v1/metrics` — `xidmetal_ws_connections`, HTTP histogram
- `docker compose -f docker-compose.monitoring.yml --profile monitoring up -d`

## Əlavə (gələcək)

- Ayrı BullMQ worker prosesi (API event loop-dan ayırmaq)
- PgBouncer (çok replica / serverless)
- Read replica public siyahılar üçün
- LocationPing batch insert / TTL partition

## Qısa cavab

Kod və compose **5k eyni anda aktiv** üçün hazırlanıb: hot-path DB yükü ~5× azalıb, API horizontal scale + Redis paylaşılan state, frontend HTTP fırtınası kəsilib. Real host-da `API_REPLICAS≥3`, Redis və `pnpm load:capacity` ilə doğrulayın.
