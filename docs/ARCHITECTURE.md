# Xidmətal Arxitekturası

> **Son yenilənmə:** 2026-08 — cari kod bazasına uyğun (scheduled marketplace MVP).
> On-demand / canlı izləmə hədəfi üçün: [TARGET_ARCHITECTURE.md](./TARGET_ARCHITECTURE.md), [ROADMAP.md](./ROADMAP.md).

## Ümumi baxış

Xidmətal **monorepo** arxitekturası ilə qurulub. Bu yanaşma kod paylaşımını, tip təhlükəsizliyini və vahid development workflow-unu təmin edir.

**Hazırkı məhsul tipi:** planlaşdırılmış (scheduled) randevu marketplace + **on-demand INSTANT dispatch** (Faza 4) — müştəri tarix/slot bron edir və ya «İndi çağır» ilə yaxın ONLINE provider-lərə təklif göndərir; chat/bildiriş REST polling + Socket.IO (tracking/status/dispatch). Platforma **ödənişsizdir** (cash-only; `PAYMENTS_ENABLED=false` — Faza 5 scaffolding).

```
┌─────────────────────────────────────────────────────────┐
│                      CLIENTS                            │
│              (Browser / Mobile Web)                     │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS
┌────────────────────────▼────────────────────────────────┐
│                   apps/web (Next.js 15)                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │  Pages   │  │Components│  │  Store   │              │
│  │ App Router│ │  + UI    │  │ (Zustand)│              │
│  └──────────┘  └──────────┘  └──────────┘              │
└────────────────────────┬────────────────────────────────┘
                         │ REST + WSS (Socket.IO) + TanStack Query poll
┌────────────────────────▼────────────────────────────────┐
│                   apps/api (NestJS 11)                  │
│  ┌──────────────────────────────────────────────────┐  │
│  │              Presentation Layer                   │  │
│  │   Controllers + DTOs + Guards + Socket.IO GW     │  │
│  └──────────────────────┬───────────────────────────┘  │
│  ┌──────────────────────▼───────────────────────────┐  │
│  │              Application Layer                    │  │
│  │              Services (Business Logic)            │  │
│  └──────────────────────┬───────────────────────────┘  │
│  ┌──────────────────────▼───────────────────────────┐  │
│  │              Infrastructure Layer                 │  │
│  │         Prisma ORM + PostgreSQL (+ PostGIS)       │  │
│  │         Redis: throttler + Socket.IO adapter      │  │
│  │         Mail: SMTP/Nodemailer (prod məcburi)      │  │
│  │         Observability: pino + Sentry + Prometheus │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│              packages/shared + packages/database        │
│         (Types, Schemas, Prisma Client, Enums)         │
└─────────────────────────────────────────────────────────┘
```

## Arxitektura prinsipləri

### 1. Domain-Driven Design (DDD)

Backend modulları (`apps/api/src/modules/`) — **cari status:**

| Modul | Məsuliyyət | Status |
|-------|------------|--------|
| `auth` | Qeydiyyat, login, JWT + refresh rotation, logout/revoke, şifrə bərpası, e-poçt verify | ✅ |
| `users` | Profil, şifrə, email dəyişimi, presence heartbeat | ✅ |
| `categories` | Kateqoriya siyahısı (yalnız oxu; seed ilə doldurulur) | ✅ oxu |
| `services` | Xidmət elanları CRUD, şəkillər, filtrlər | ✅ |
| `availability` | İş saatları, override, boş slotlar | ✅ |
| `bookings` | Sifariş, status keçidləri (`EN_ROUTE`/`ARRIVED`), `BookingType`, tarix təklifi | ✅ |
| `dispatch` | On-demand: yaxın provider, `DispatchOffer`, BullMQ timeout, sequential reassign | ✅ |
| `payments` | Intent/hold/capture/refund scaffolding; `PAYMENTS_ENABLED=false` default (501) | ✅ flag OFF |
| `reviews` | Rəy yaratma + rating aggregate (dərhal APPROVED; admin REJECT mümkündür) | ✅ |
| `messages` | Müştəri↔provider söhbət (REST; TypingPresence DB) | ✅ |
| `notifications` | In-app + best-effort push (FCM/noop) | ✅ |
| `devices` | DeviceToken register/unregister (JWT) | ✅ |
| `reports` | İstifadəçi şikayətləri + admin moderation | ✅ |
| `contact` | İctimai əlaqə formu | ✅ |
| `health` | Sağlamlıq yoxlaması | ✅ |
| `metrics` (common) | Prometheus `/api/v1/metrics` — HTTP + business counters; prod-da `METRICS_TOKEN` məcburi | ✅ |
| `geo` | Geokodlaşdırma (mock/Nominatim), PostGIS `ST_DWithin` yaxınlıq, provider mövqe/availability | ✅ |
| `realtime` | Socket.IO gateway, JWT handshake, otaqlar (`booking`/`user`/`provider`), Redis adapter | ✅ |
| `tracking` | `location:push` → yayım + ETA + `LocationPing` sampling; REST pings | ✅ |

### 2. Clean Architecture qatları

```
Controller → Service → Prisma
     ↓           ↓         ↓
   DTO       Business   Database
  Validation   Logic     Access
```

- **Controller:** HTTP request/response, validation
- **Service:** Biznes qaydaları, orchestration
- **Prisma:** Data access layer

### 3. Shared Package

`packages/shared` frontend və backend arasında tip təhlükəsizliyini təmin edir:

- **Enums:** `UserRole`, `BookingStatus`, `ServiceStatus`, `NotificationType`, `CargoRouteScope`, …
- **Schemas:** Zod (register, login, createService, booking, review, …)
- **Types:** `UserProfile`, `ServiceSummary`, booking/message/notification tipləri
- **Constants / domain helpers:** brend, pagination, locations, service venues, vehicle-cargo

### 4. Frontend arxitekturası

```
src/
├── app/              # Next.js App Router (pages)
├── components/
│   ├── ui/           # Atomic UI komponentləri
│   └── …             # services, bookings, messages, …
├── lib/              # Utilities, API client, axtarış
├── hooks/            # Auth, notifications poll, presence
└── store/            # Zustand (auth)
```

**State management:**
- **Server state:** TanStack Query (API data; mesaj/bildiriş/sifariş **polling** + WS invalidate)
- **Client state:** Zustand (auth)
- **Form state:** React Hook Form + Zod (shared schemas)

**Əsas marşrutlar:**
- İctimai: `/`, `/services`, `/categories/[slug]`, marketing/legal səhifələr
- Auth: `/login`, `/register`
- Customer: `/dashboard/customer` (+ bookings, messages, notifications, settings)
- Provider: `/dashboard/provider` (+ services, calendar, bookings, messages, notifications, ratings, settings)
- Xidmət detal: `/services/[id]` (SSR səhifə)
- Admin UI: **ayrı app** (`apps/admin`, port `3021`) — marketplace (`apps/web`) daxilində deyil

## Data Model

```
User ──┬── ProviderProfile (availability, lastLat/lng + PostGIS last_location)
       ├── Service (provider) ── ServiceImage / WorkingHours / Overrides
       ├── Booking (customer / provider; dest/origin coords) ── Review?
       │                              └── Conversation?
       ├── Notification
       └── Conversation / Message
```

Kateqoriyalar seed ilə; `Service`-də venue, (yükdaşıma üçün) ölçü və `cargoRouteScope` sahələri dəstəklənir.

**Geospatial (Faza 2):** Docker `postgis/postgis:16-3.5`; `ProviderAvailability` (`OFFLINE`/`ONLINE`/`BUSY`) domain field-dir — `User.lastSeenAt` presence heartbeat-indən ayrıdır. WS connect/disconnect provider ONLINE→OFFLINE (BUSY toxunulmur); heartbeat `lastSeenAt` saxlayır. Yaxınlıq: PostGIS `ST_DWithin`; extension yoxdursa haversine fallback. Geocoder: `GEOCODER_PROVIDER=mock|nominatim`.

**Dispatch (Faza 4):** `INSTANT` sifariş → eyni xidmət növü (kateqoriya + başlıq) + şəhər + ONLINE xidmət verənlərə fan-out `DispatchOffer` (tək təklif timeout yox) → axtarış pəncərəsi (`DISPATCH_SEARCH_WINDOW_SEC`, default 10 dəq) bitəndə hələ qəbul yoxdursa auto-cancel + müştəri bildirişi. İmtina edən xidmət verənə `DISPATCH_DECLINE_REOFFER_COOLDOWN_SEC` (default 2 dəq) sonra yenidən təklif (pəncərə açıq qaldıqca). Rediscovery yeni ONLINE-ları tutur. Redis yoxdursa development-də in-process `setTimeout`.

### Rollar

| Rol | İcazələr (cari) |
|-----|-----------------|
| `CUSTOMER` | Axtar, sifariş ver, rəy yaz, mesajlaş |
| `PROVIDER` | Xidmət/təqvim idarə et, sifariş qəbul/rədd et, mesajlaş |
| `ADMIN` | Ayrı admin app (`apps/admin`); qeydiyyatla yaradıla bilməz (seed); marketplace login-da rədd |

> **Məhsul qərarı:** bir hesab = bir rol. `CUSTOMER` → `PROVIDER` upgrade, dual-role və ya eyni hesabda rol dəyişimi **yoxdur** və planlaşdırılmır. Xidmət verən olmaq üçün ayrıca `PROVIDER` hesabı (ayrı e-poçt) lazımdır. UI: `BecomeProviderLink` mövcud müştəriyə bunu izah edir. Agent/kod bu axını “boşluq” kimi əlavə etməsin.

### Booking status (cari)

`PENDING` → `CONFIRMED` / `REJECTED` / `CANCELLED` → `EN_ROUTE` → `ARRIVED` → `IN_PROGRESS` → `COMPLETED`  
Keçidlər shared `booking-lifecycle` + `bookings.service` rol matrisi ilə yoxlanır. `BookingType` (`SCHEDULED`/`INSTANT`): SCHEDULED = slot lock + əl ilə təsdiq; INSTANT = dest coords + avto-dispatch (`dispatch` modulu). Ətraflı: [BOOKING_LIFECYCLE.md](./BOOKING_LIFECYCLE.md).

## Təhlükəsizlik

- **JWT** access + refresh token rotation (DB-də refresh token); brauzerdə **yalnız httpOnly cookie** (JSON-da token yox)
- **bcrypt** password hashing (12 rounds); login timing pad; `passwordChangedAt` ilə köhnə access JWT ləğvi
- **Klient audience:** `clientApp` / `x-xidmetal-client` — marketplace↔admin session sızması bağlı
- **Helmet** HTTP security headers
- **Rate limiting** (Throttler: 100 req/min; email dəyişimi daha sərt); `TRUST_PROXY=true` ilə real IP
- **CORS** origin whitelist (`CORS_ORIGIN`)
- **Input validation** (class-validator + Zod); media URL yalnız öz storage host
- **RBAC** (`@Roles` + service-layer yoxlamalar)
- **Health:** `/health` liveness, `/health/ready` DB readiness
- **Metrics:** `/api/v1/metrics` Prometheus exposition (lokal açıq; prod-da `METRICS_TOKEN` məcburi)

**Qeyd:** server-side logout/revoke, şifrə unutma və e-poçt verify mövcuddur. Qeydiyyat/girişdən sonra marketplace kabineti yalnız `isVerified` olduqda açılır (`RequireAuth` → `/verify-email`). **Yazma** əməliyyatları (sifariş, mesaj, rəy, upload, xidmət yarat/yenilə/sil, təqvim yazıları, şikayət) əlavə olaraq `@RequireEmailVerified` ilə qorunur. Provider `providerProfile.isVerified` olmadan xidməti yoxlamaya göndərə, onlayn ola və ictimai siyahıda görünə bilməz. Xidmət paylaşımı: `DRAFT`/`NEEDS_REVISION` → `PENDING_REVIEW` → admin təsdiqi → `ACTIVE` (və ya düzəliş qeydi ilə `NEEDS_REVISION`). Admin təsdiqi ləğvində aktiv xidmətlər `PAUSED` olur. Şəkillər `POST /uploads` ilə saxlanır (local və ya S3/R2); DB-də yalnız URL. Soft-delete: `User.deletedAt`; provider hard-delete `Restrict` (xidmətləri gizli silmir).

## Scalability planı

### Hazırkı (MVP)
- Monolith API + PostgreSQL (`prisma migrate deploy` + local `db:push` fallback)
- Redis: Throttler storage (`REDIS_URL`); olmadıqda in-memory fallback
- Next.js marketplace (**3020**) + ayrı admin (**3021**)
- Real-time: Socket.IO (tracking/status/dispatch/`message:new`) + HTTP polling fallback
- CI: GitHub Actions (lint + typecheck + unit test + build)
- Upload: throttle + per-user quota + orphan TTL təmizlik
- Booking: `pg_advisory_xact_lock` + slot re-check (double-book race bağlı)
- Logging: pino (prod JSON); Sentry opsional (`SENTRY_DSN` API; `NEXT_PUBLIC_SENTRY_DSN` web/admin)
- Metrics: `prom-client` + Grafana/Prometheus ops (`ops/`, `docker-compose.monitoring.yml` profile)
- Load: k6 (`pnpm load:smoke` / `load:capacity`) + Socket.IO smoke (`pnpm load:realtime`) — əl ilə; CI ağır load default yox
- Tutum (5k concurrent): [CAPACITY.md](./CAPACITY.md) — Redis throttle/presence, API scale + nginx, deferred location DB
- E2E: Playwright smoke + kritik UI (`pnpm --filter @xidmetal/web test:e2e`, `E2E_BASE_URL`)
- Şikayət: `POST /reports` + admin moderation; sifariş statusları best-effort e-poçt + push (Faza 5)
- Ödəniş: scaffolding (`PAYMENTS_ENABLED=false`); DeviceToken + FCM adapter
- Mobile: deferred — [MOBILE.md](./MOBILE.md); PWA örtür
- Deploy: `docker-compose.prod.yml` + GHCR/SSH workflow

### Gələcək
- **Search:** Elasticsearch/Meilisearch (cari: Postgres `contains` / ilike filtrləri)
- **Payment:** real Stripe checkout / live charge (məhsul qərarı; flag ON) — scaffolding mövcuddur
- **Email:** managed provider (SendGrid/Resend); cari SMTP production-da işləyir
- **Mobile:** React Native (`apps/mobile`) — yalnız tam runnable app; plan: [MOBILE.md](./MOBILE.md)
- **Orchestration:** K8s/Vercel — compose + GHCR artıq var

### Deployment (cari)
- Docker images: `apps/{api,web,admin}/Dockerfile` (web: `NEXT_PUBLIC_WS_URL` / Mapbox / Turnstile / FCM bake-in)
- Lokal/full stack: `pnpm docker:prod` → `docker-compose.yml` + `docker-compose.prod.yml`
- CD: `.github/workflows/deploy.yml` — GHCR push + opsional SSH compose deploy (`deploy_runtime`, `DEPLOY_*` secrets)

> **Qeyd:** Turnstile captcha (env ilə) artıq mövcuddur.

Ətraflı mərhələlər: [ROADMAP.md](./ROADMAP.md).

## API versiyalaşdırma

Bütün endpoint-lər `/api/v1` prefix-i altındadır. Breaking change olduqda `/api/v2` yaradılacaq. Canlı siyahı: [API.md](./API.md) və Swagger `http://localhost:4000/docs` (production-da default bağlı; `SWAGGER_ENABLED=true` ilə açılır).
