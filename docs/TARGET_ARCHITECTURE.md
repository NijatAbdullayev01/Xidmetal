# Hədəf Arxitektura — On-Demand Xidmət & Canlı İzləmə

Bu sənəd Xidmətal-ın **real-time, on-demand** platformaya çevrilməsi üçün lazım olan hədəf arxitekturanı təsvir edir.

> **Kontekst:** İstifadəçi xidməti rezerv edir → xidmət verəni çağırır → xidmət verən yolda olduqda xəritədə **canlı izlənir** → iş bitdikdə tamamlanır → xidmət alan **rəy verir**.
>
> Mövcud arxitektura klassik "randevu/booking" platformasıdır. Bu sənəd aradakı boşluğu bağlayan hədəf vəziyyəti müəyyən edir. Mövcud vəziyyət üçün [ARCHITECTURE.md](./ARCHITECTURE.md)-ə baxın.

---

## 1. Yüksək səviyyəli baxış

```
┌──────────────────────────────────────────────────────────────────┐
│                            CLIENTS                                 │
│   Customer Web/PWA        Provider Web/PWA (GPS)      Admin Panel  │
└───────────┬───────────────────────┬────────────────────┬─────────┘
            │ HTTPS (REST)           │ WSS (Socket.IO)     │
            ▼                        ▼                     ▼
┌──────────────────────────────────────────────────────────────────┐
│                        API Gateway / apps/api                     │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │ REST (v1)  │  │ WS Gateway   │  │ Dispatch     │               │
│  │ Controllers│  │ (Socket.IO)  │  │ Engine       │               │
│  └─────┬──────┘  └──────┬───────┘  └──────┬───────┘               │
│        │                │                 │                        │
│  ┌─────▼────────────────▼─────────────────▼──────┐                │
│  │              Application Services              │                │
│  └─────┬───────────────┬───────────────┬─────────┘                │
│        │               │               │                          │
│  ┌─────▼─────┐  ┌───────▼──────┐  ┌─────▼──────┐                   │
│  │  Prisma   │  │  Redis       │  │  BullMQ    │                   │
│  │ PostgreSQL│  │  (pub/sub,   │  │  (jobs,    │                   │
│  │ + PostGIS │  │   presence)  │  │   timeout) │                   │
│  └───────────┘  └──────────────┘  └────────────┘                  │
└──────────────────────────────────────────────────────────────────┘
        │                    │                    │
   ┌────▼────┐        ┌──────▼──────┐      ┌───────▼───────┐
   │ Maps /  │        │ Push (FCM)  │      │ Payment PSP   │
   │Directions│       │ + Email     │      │ (Stripe/local)│
   └─────────┘        └─────────────┘      └───────────────┘
```

---

## 2. Texnologiya əlavələri

Mövcud stack (Next.js 15, NestJS 11, Prisma, PostgreSQL, Redis) saxlanılır. Aşağıdakılar **əlavə olunur**:

| Sahə | Texnologiya | Səbəb |
|------|-------------|-------|
| Real-time | `@nestjs/websockets` + Socket.IO + `@socket.io/redis-adapter` | Canlı lokasiya, status, bildiriş |
| Geospatial | PostgreSQL **PostGIS** (`geography` tipi, GiST index) | Yaxınlıqdakı provider axtarışı, məsafə |
| Xəritə / ETA | **Mapbox GL JS** (və ya Google Maps) + Directions API | Canlı xəritə, marşrut, ETA |
| Background jobs | **BullMQ** (Redis üzərində) | Dispatch timeout, bildiriş, rating aggregate |
| Push bildiriş | **Firebase Cloud Messaging** (FCM) | Mobil/web push |
| Email | **Resend/SendGrid** / SMTP | Təsdiq, status mail |
| Ödəniş | **Stripe** və ya yerli PSP (payment intent + hold/capture) | Marketplace ödənişləri, komissiya |
| Fayl saxlama | **S3 / Cloudflare R2** | Avatar, xidmət şəkilləri, sənədlər |
| Observability | **Sentry** + structured logging (`pino`) + metrics | Xəta izləmə, monitorinq |
| Test | **Vitest** (unit), **Supertest** (e2e API), **Playwright** (E2E) | Regressiyanın qarşısını almaq |

---

## 3. Backend modulları

**Artıq mövcud (2026-08):** `auth`, `users`, `categories`, `services`, `availability`, `bookings`, `reviews`, `messages`, `notifications`, `health`.

Cari vəziyyət üçün: [ARCHITECTURE.md](./ARCHITECTURE.md). Aşağıdakı cədvəl **hədəfə qalan** və ya **tamamlanmamış** hissələri göstərir.

| Modul | Məsuliyyət | Status (cari) |
|-------|------------|----------------|
| `reviews` | Rəy yaratma + rating aggregate | ✅ MVP (dərhal APPROVED; admin REJECT) |
| `notifications` | In-app oxu/siyahı + push kanalları | ✅ (FCM adapter; default noop) |
| `messages` | Xidmət alan↔provider chat | ✅ REST + polling (WS typing hələ yox; TypingPresence DB) |
| `realtime` (gateway) | Socket.IO gateway, otaqlar; provider presence | ✅ |
| `tracking` | Provider lokasiya axını, marşrut, ETA, LocationPing | ✅ |
| `dispatch` | On-demand provider tapma/təklif/timeout (BullMQ) | ✅ |
| `geo` | Geokodlaşdırma, yaxınlıq sorğuları (PostGIS) | ✅ |
| `payments` | Intent/hold/capture/refund scaffolding | ✅ flag OFF (`PAYMENTS_ENABLED`) |
| `devices` | DeviceToken register/unregister | ✅ |
| `metrics` (common) | Prometheus `/api/v1/metrics` + Grafana/k6 ops | ✅ Faza 6 |
| Admin panel / CRUD | Kateqoriya yazma, verify, moderation | ✅ (`/api/v1/admin/*` + ayrı `apps/admin`) |

Hər yeni modul mövcud konvensiyaya tabedir: `Controller → Service → Prisma`, DTO validation (class-validator), AZ dilində error mesajları. Bax: [.cursor/rules/backend.mdc].

---

## 4. Real-time qat

Canlı izləmə üçün REST **kifayət deyil** (saniyəlik location update-ləri DB-ni və şəbəkəni yükləyər). Socket.IO gateway istifadə olunur.

- **Handshake auth:** JWT WS handshake-də (`auth.token`) yoxlanılır.
- **Otaqlar (rooms):** `booking:{id}`, `user:{id}`, `provider:{id}`.
- **Event-lər:** `location:update`, `booking:status`, `notification:new`, `dispatch:offer`.
- **Miqyaslama:** Çoxlu instans üçün Socket.IO **Redis adapter** (pub/sub).
- **Throttling:** Provider lokasiyası ~3-5 saniyədə bir göndərilir; DB-yə yalnız seçilmiş nöqtələr yazılır (audit/marşrut üçün).

Ətraflı: [REALTIME_TRACKING.md](./REALTIME_TRACKING.md).

---

## 5. On-demand dispatch (çağırış məntiqi)

Sifarişin iki tipi olur: `INSTANT` (indi çağır) və `SCHEDULED` (planlaşdırılmış).

`INSTANT` axını:
1. Xidmət alan sifariş yaradır (koordinatlar ilə).
2. Dispatch engine PostGIS ilə **yaxın + online + uyğun** provider-ləri tapır.
3. Eyni xidmət növü + şəhər üzrə ONLINE provider-lərə təklif (tək timeout yox; axtarış ~10 dəq).
4. Xidmət verən qəbul edir → `CONFIRMED`; rədd → 2 dəq sonra eyni xidmət verənə yenidən təklif (10 dəq pəncərə / qəbul olunana qədər).
5. Axtarış pəncərəsi bitəndə qəbul yoxdursa → xidmət alana bildiriş.

Ətraflı: [BOOKING_LIFECYCLE.md](./BOOKING_LIFECYCLE.md).

---

## 6. Geospatial data

- PostGIS extension (`CREATE EXTENSION postgis`).
- Provider-in son mövqeyi (`ProviderProfile.lastLocation geography(Point)`).
- Booking-in origin/destination koordinatları.
- GiST index ilə `ST_DWithin` yaxınlıq sorğuları.

Prisma PostGIS-i native dəstəkləmədiyi üçün `Unsupported("geography(Point,4326)")` tipi + raw SQL (`$queryRaw`) istifadə olunur. Ətraflı: [DATA_MODEL.md](./DATA_MODEL.md).

---

## 7. Ödəniş

> **Cari məhsul qərarı:** Platforma ödənişsizdir. Modulu **scaffolding + `PAYMENTS_ENABLED=false`** ilə mövcuddur; aktivləşdirmə gələcək məhsul qərarındandır.

- Hədəf model: xidmət alan ödəyir → platforma komissiya tutur → provider-ə payout.
- `PaymentIntent` → **hold** → **capture**; Noop + Stripe stub adapter.
- İdempotency: `Payment.idempotencyKey` + `IdempotencyRecord` + `Idempotency-Key` header.
- Booking create/confirm/complete **PaymentIntent tələb etmir** (flag off).

---

## 8. Bildiriş kanalları

| Kanal | İstifadə | Status |
|-------|----------|--------|
| In-app | Status, inbox/badge | ✅ |
| Push (FCM) | App/brauzer bağlı olduqda | ✅ adapter (noop default; credentials → real FCM HTTP v1/legacy) |
| Email | Status mail | ✅ best-effort |

In-app create-dən sonra push best-effort. SMS kanalı yoxdur.

---

## 9. Mobil / PWA

Canlı izləmə praktikada provider tərəfdə arxa planda GPS tələb edir:
- **MVP (cari):** Provider Web tətbiqi **PWA** + `navigator.geolocation.watchPosition` + web push.
- **Sonra (deferred):** React Native — arxa plan lokasiya, native push. `apps/mobile` hələ yoxdur; plan: [MOBILE.md](./MOBILE.md).

Frontend `apps/web` cari qalır; native app yalnız runnable + CI + shared wiring hazır olanda əlavə olunacaq.

---

## 10. Observability & DevOps

- **Logging:** `pino` structured JSON, request-id korrelyasiyası.
- **Errors:** Sentry (backend + frontend).
- **Metrics:** Prometheus exposition `GET /api/v1/metrics` (`prom-client`; default process + HTTP histogram + business counters). Auth: opsional `METRICS_TOKEN` Bearer; lokal default açıq. Dashboard: `ops/grafana/`; scrape: `ops/prometheus/prometheus.yml`; opsional compose profile `monitoring`.
- **Load test:** k6 (`ops/load/`, `pnpm load:smoke`) — CI default-da yox; əl ilə / `workflow_dispatch`.
- **CI/CD:** GitHub Actions — lint, typecheck, test, build, `prisma migrate deploy`.
- **Migration:** Production-da `db:push` deyil, **`prisma migrate deploy`**.
- **Deployment:** Konteynerlər (Docker) → Railway/Fly/Kubernetes; frontend Vercel.

---

## 11. Prinsiplər

1. **Additive dəyişiklik** — mövcud API/schema sındırılmır, yeni sahələr optional/əlavə olunur. Bax: [.cursor/rules/safe-changes.mdc].
2. **Contract stabilliyi** — `packages/shared` tipləri backend və frontend arasında yeganə həqiqət mənbəyidir.
3. **Event-driven** — status dəyişiklikləri event yayımlayır (WS + notification + job).
4. **Modern kod** — deprecated pattern istifadə olunmur. Bax: [.cursor/rules/no-legacy-code.mdc].
