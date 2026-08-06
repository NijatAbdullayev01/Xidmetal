# Xidmətal Arxitekturası

> **Son yenilənmə:** 2026-08 — cari kod bazasına uyğun (scheduled marketplace MVP).
> On-demand / canlı izləmə hədəfi üçün: [TARGET_ARCHITECTURE.md](./TARGET_ARCHITECTURE.md), [ROADMAP.md](./ROADMAP.md).

## Ümumi baxış

Xidmətal **monorepo** arxitekturası ilə qurulub. Bu yanaşma kod paylaşımını, tip təhlükəsizliyini və vahid development workflow-unu təmin edir.

**Hazırkı məhsul tipi:** planlaşdırılmış (scheduled) randevu marketplace — müştəri xidmət seçir, tarix/slot bron edir, provider təsdiqləyir; chat və rəy REST + polling ilə işləyir. On-demand çağırış, canlı xəritə və ödəniş **hələ yoxdur**.

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
                         │ REST API (JSON) + TanStack Query poll
┌────────────────────────▼────────────────────────────────┐
│                   apps/api (NestJS 11)                  │
│  ┌──────────────────────────────────────────────────┐  │
│  │              Presentation Layer                   │  │
│  │         Controllers + DTOs + Guards              │  │
│  └──────────────────────┬───────────────────────────┘  │
│  ┌──────────────────────▼───────────────────────────┐  │
│  │              Application Layer                    │  │
│  │              Services (Business Logic)            │  │
│  └──────────────────────┬───────────────────────────┘  │
│  ┌──────────────────────▼───────────────────────────┐  │
│  │              Infrastructure Layer                 │  │
│  │         Prisma ORM + PostgreSQL                   │  │
│  │         (Redis docker-da var, API hələ istifadə   │  │
│  │          etmir; mail: opsional SMTP/Nodemailer)   │  │
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
| `bookings` | Sifariş, status keçidləri, tarix təklifi | ✅ (scheduled) |
| `reviews` | Rəy yaratma + rating aggregate (PENDING → admin APPROVED) | ✅ |
| `messages` | Müştəri↔provider söhbət (REST; typing in-memory) | ✅ |
| `notifications` | In-app bildirişlər (booking/review/admin emit + oxundu) | ✅ |
| `health` | Sağlamlıq yoxlaması | ✅ |
| `payments` / `geo` / `realtime` / `tracking` / `dispatch` | Hədəf arxitektura | ❌ |

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
- **Server state:** TanStack Query (API data; mesaj/bildiriş/sifariş **polling**)
- **Client state:** Zustand (auth)
- **Form state:** React Hook Form + Zod (shared schemas)

**Əsas marşrutlar:**
- İctimai: `/`, `/services`, `/categories/[slug]`, marketing/legal səhifələr
- Auth: `/login`, `/register`
- Customer: `/dashboard/customer` (+ bookings, messages, settings)
- Provider: `/dashboard/provider` (+ services, calendar, bookings, messages, ratings, settings)
- Xidmət detal: ayrıca `/services/[id]` səhifəsi yoxdur — kart + preview dialog
- Admin UI: **ayrı app** (`apps/admin`, port `3021`) — marketplace (`apps/web`) daxilində deyil

## Data Model

```
User ──┬── ProviderProfile
       ├── Service (provider) ── ServiceImage / WorkingHours / Overrides
       ├── Booking (customer / provider) ── Review?
       │                              └── Conversation?
       ├── Notification
       └── Conversation / Message
```

Kateqoriyalar seed ilə; `Service`-də venue, (yükdaşıma üçün) ölçü və `cargoRouteScope` sahələri dəstəklənir.

### Rollar

| Rol | İcazələr (cari) |
|-----|-----------------|
| `CUSTOMER` | Axtar, sifariş ver, rəy yaz, mesajlaş |
| `PROVIDER` | Xidmət/təqvim idarə et, sifariş qəbul/rədd et, mesajlaş |
| `ADMIN` | Ayrı admin app (`apps/admin`); qeydiyyatla yaradıla bilməz (seed); marketplace login-da rədd |

> **Məhsul qərarı:** bir hesab = bir rol. `CUSTOMER` → `PROVIDER` upgrade, dual-role və ya eyni hesabda rol dəyişimi **yoxdur** və planlaşdırılmır. Xidmət verən olmaq üçün ayrıca `PROVIDER` hesabı (ayrı e-poçt) lazımdır. UI: `BecomeProviderLink` mövcud müştəriyə bunu izah edir. Agent/kod bu axını “boşluq” kimi əlavə etməsin.

### Booking status (cari)

`PENDING` → `CONFIRMED` / `REJECTED` / `CANCELLED` → `IN_PROGRESS` → `COMPLETED`  
Keçidlər `bookings.service` daxilində rol matrisi ilə yoxlanır. Hədəf statuslar (`EN_ROUTE`, `ARRIVED`) və `BookingType` hələ schema-da yoxdur — bax: [BOOKING_LIFECYCLE.md](./BOOKING_LIFECYCLE.md).

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

**Qeyd:** server-side logout/revoke, şifrə unutma və e-poçt verify mövcuddur. Login soft qalır (unverified user daxil ola bilir); **yazma** əməliyyatları (sifariş, mesaj, rəy, upload, xidmət yarat/yenilə/sil) `@RequireEmailVerified` ilə qorunur. Provider `isVerified` olmadan xidməti `ACTIVE` edə bilməz. Şəkillər `POST /uploads` ilə saxlanır (local və ya S3/R2); DB-də yalnız URL. Soft-delete: `User.deletedAt`; provider hard-delete `Restrict` (xidmətləri gizli silmir).

## Scalability planı

### Hazırkı (MVP)
- Monolith API + PostgreSQL (`prisma migrate deploy` + local `db:push` fallback)
- Redis container var; typing DB-də (multi-instance), Redis API hələ bağlamayıb
- Next.js marketplace (**3020**) + ayrı admin (**3021**)
- Real-time: HTTP polling (Socket.IO yoxdur)
- CI: GitHub Actions (lint + typecheck + unit test + build)
- Upload: throttle + per-user quota + orphan TTL təmizlik
- Booking: `pg_advisory_xact_lock` + slot re-check (double-book race bağlı)

### Gələcək
- **Search:** Elasticsearch/Meilisearch
- **Real-time:** WebSocket (Socket.io)
- **Payment:** Stripe/local payment gateway (məhsul qərarı)
- **Email:** SMTP artıq opsional; production üçün SendGrid/Resend
- **Monitoring:** Sentry + Prometheus
- **CI/CD:** E2E + deploy pipeline
- **Deployment:** Docker + Kubernetes / Vercel + Railway

Ətraflı mərhələlər: [ROADMAP.md](./ROADMAP.md).

## API versiyalaşdırma

Bütün endpoint-lər `/api/v1` prefix-i altındadır. Breaking change olduqda `/api/v2` yaradılacaq. Canlı siyahı: [API.md](./API.md) və Swagger `http://localhost:4000/docs` (production-da default bağlı; `SWAGGER_ENABLED=true` ilə açılır).
