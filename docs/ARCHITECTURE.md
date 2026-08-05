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
| `auth` | Qeydiyyat, login, JWT + refresh rotation | ✅ |
| `users` | Profil, şifrə, email dəyişimi, presence heartbeat | ✅ |
| `categories` | Kateqoriya siyahısı (yalnız oxu; seed ilə doldurulur) | ✅ oxu |
| `services` | Xidmət elanları CRUD, şəkillər, filtrlər | ✅ |
| `availability` | İş saatları, override, boş slotlar | ✅ |
| `bookings` | Sifariş, status keçidləri, tarix təklifi | ✅ (scheduled) |
| `reviews` | Rəy yaratma + rating aggregate (auto-APPROVED) | ✅ |
| `messages` | Müştəri↔provider söhbət (REST; typing in-memory) | ✅ |
| `notifications` | In-app bildirişlər (oxundu / say) | ✅ qismən |
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

### Booking status (cari)

`PENDING` → `CONFIRMED` / `REJECTED` / `CANCELLED` → `IN_PROGRESS` → `COMPLETED`  
Keçidlər `bookings.service` daxilində rol matrisi ilə yoxlanır. Hədəf statuslar (`EN_ROUTE`, `ARRIVED`) və `BookingType` hələ schema-da yoxdur — bax: [BOOKING_LIFECYCLE.md](./BOOKING_LIFECYCLE.md).

## Təhlükəsizlik

- **JWT** access + refresh token rotation (DB-də refresh token)
- **bcrypt** password hashing (12 rounds)
- **Helmet** HTTP security headers
- **Rate limiting** (Throttler: 100 req/min; email dəyişimi daha sərt)
- **CORS** origin whitelist (`CORS_ORIGIN`)
- **Input validation** (class-validator + Zod)
- **RBAC** (`@Roles` + service-layer yoxlamalar)

**Qeyd:** server-side logout/revoke, şifrə unutma, qeydiyyatda email verify axınları hələ yoxdur. Şəkillər çox vaxt `data:image/...` kimi DB-də saxlanılır (S3/R2 yoxdur).

## Scalability planı

### Hazırkı (MVP)
- Monolith API + PostgreSQL (`db:push`; migration history yoxdur)
- Redis container var, API kodu istifadə etmir
- Single Next.js frontend (dev port **3020**)
- Real-time: HTTP polling (Socket.IO yoxdur)
- Test / CI: hələ qurulmayıb

### Gələcək
- **File storage:** S3/Cloudflare R2
- **Search:** Elasticsearch/Meilisearch
- **Real-time:** WebSocket (Socket.io)
- **Payment:** Stripe/local payment gateway
- **Email:** SMTP artıq opsional; production üçün SendGrid/Resend
- **Monitoring:** Sentry + Prometheus
- **CI/CD:** GitHub Actions
- **Deployment:** Docker + Kubernetes / Vercel + Railway

Ətraflı mərhələlər: [ROADMAP.md](./ROADMAP.md).

## API versiyalaşdırma

Bütün endpoint-lər `/api/v1` prefix-i altındadır. Breaking change olduqda `/api/v2` yaradılacaq. Canlı siyahı: [API.md](./API.md) və Swagger `http://localhost:4000/docs`.
