# Xidmətal Arxitekturası

## Ümumi baxış

Xidmətal **monorepo** arxitekturası ilə qurulub. Bu yanaşma kod paylaşımını, tip təhlükəsizliyini və vahid development workflow-unu təmin edir.

```
┌─────────────────────────────────────────────────────────┐
│                      CLIENTS                            │
│              (Browser / Mobile Web)                     │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS
┌────────────────────────▼────────────────────────────────┐
│                   apps/web (Next.js)                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │  Pages   │  │Components│  │  Store   │              │
│  │ App Router│ │  + UI    │  │ (Zustand)│              │
│  └──────────┘  └──────────┘  └──────────┘              │
└────────────────────────┬────────────────────────────────┘
                         │ REST API (JSON)
┌────────────────────────▼────────────────────────────────┐
│                   apps/api (NestJS)                     │
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
│  │         Prisma ORM + PostgreSQL + Redis          │  │
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

Backend modulları biznes domain-lərinə görə ayrılıb:

| Modul | Məsuliyyət |
|-------|------------|
| `auth` | Autentifikasiya, JWT, refresh token |
| `users` | İstifadəçi profilləri |
| `categories` | Xidmət kateqoriyaları |
| `services` | Xidmət elanları (CRUD) |
| `bookings` | Sifariş idarəetməsi |
| `reviews` | Rəy sistemi (planlaşdırılıb) |
| `notifications` | Bildirişlər (planlaşdırılıb) |

### 2. Clean Architecture qatları

```
Controller → Service → Repository (Prisma)
     ↓           ↓            ↓
   DTO       Business     Database
  Validation   Logic       Access
```

- **Controller:** HTTP request/response, validation
- **Service:** Biznes qaydaları, orchestration
- **Prisma:** Data access layer

### 3. Shared Package

`packages/shared` frontend və backend arasında tip təhlükəsizliyini təmin edir:

- **Enums:** `UserRole`, `BookingStatus`, `ServiceStatus`
- **Schemas:** Zod validation (register, login, createService)
- **Types:** `UserProfile`, `ServiceSummary`, `ApiResponse`
- **Constants:** Brend rəngləri, API prefix, pagination

### 4. Frontend arxitekturası

```
src/
├── app/              # Next.js App Router (pages)
├── components/
│   ├── ui/           # Atomic UI komponentləri
│   └── layout/       # Header, Footer, Sidebar
├── lib/              # Utilities, API client
└── store/            # Zustand state management
```

**State management strategiyası:**
- **Server state:** TanStack Query (API data, caching)
- **Client state:** Zustand (auth, UI preferences)
- **Form state:** React Hook Form + Zod

## Data Model

```
User ──┬── ProviderProfile
       ├── Service (provider)
       ├── Booking (customer / provider)
       ├── Review
       └── Notification

Category ── Service ── Booking ── Review
```

### Rollar

| Rol | İcazələr |
|-----|----------|
| `CUSTOMER` | Xidmət axtar, sifariş ver, rəy yaz |
| `PROVIDER` | Xidmət yarat/idarə et, sifariş qəbul et |
| `ADMIN` | Tam idarəetmə |

## Təhlükəsizlik

- **JWT** access + refresh token rotation
- **bcrypt** password hashing (12 rounds)
- **Helmet** HTTP security headers
- **Rate limiting** (Throttler: 100 req/min)
- **CORS** origin whitelist
- **Input validation** (class-validator + Zod)
- **Role-based access control** (RBAC)

## Scalability planı

### Hazırkı (MVP)
- Monolith API + PostgreSQL + Redis
- Single Next.js frontend

### Gələcək
- **File storage:** S3/Cloudflare R2 (service images)
- **Search:** Elasticsearch/Meilisearch
- **Real-time:** WebSocket (Socket.io) — chat, notifications
- **Payment:** Stripe/local payment gateway
- **Email:** SendGrid/Resend
- **Monitoring:** Sentry + Prometheus
- **CI/CD:** GitHub Actions
- **Deployment:** Docker + Kubernetes / Vercel + Railway

## API versiyalaşdırma

Bütün endpoint-lər `/api/v1` prefix-i altındadır. Breaking change olduqda `/api/v2` yaradılacaq.
