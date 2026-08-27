# Xidmətal

**Xidmət verənlərlə xidmət alanları bir araya gətirən veb platforma.**

Xidmətal, provider (xidmət verən) və customer (xidmət alan) rollarını birləşdirən marketplace tipli platformadır. İstifadəçilər xidmət axtara, planlaşdırılmış sifariş verə, mesajlaşa, rəy yaza və provider kimi xidmət təklif edə bilərlər.

**Cari vəziyyət:** scheduled + on-demand marketplace MVP — auth, kateqoriya/xidmət, təqvim, sifariş lifecycle (`EN_ROUTE`/`ARRIVED`), INSTANT dispatch, realtime (Socket.IO, ETA), chat, in-app/push kanalları, rəy, admin panel. Ödəniş modul scaffolding var, default **OFF** (`PAYMENTS_ENABLED=false`). Native mobil deferred — bax: `docs/ROADMAP.md`, `docs/MOBILE.md`.

## Texnologiya yığını

| Layer | Texnologiya |
|-------|-------------|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS 4 |
| Backend | NestJS 11, TypeScript |
| Database | PostgreSQL 16, Prisma ORM |
| Cache | Redis 7 |
| Monorepo | pnpm workspaces + Turborepo |
| Shared | Zod schemas, types, enums |

## Brend

- **Əsas rəng:** `#FFCC00`
- **Tünd variant:** `#E6B800`
- **Açıq variant:** `#FFD633`

## Sürətli başlanğıc

### Tələblər

- Node.js ≥ 20
- pnpm ≥ 9
- Docker & Docker Compose

### Quraşdırma

```bash
# Repozitoriyanı klonlayın
git clone <repo-url> xidmetal
cd xidmetal

# Asılılıqları quraşdırın
pnpm install

# Environment faylını yaradın
cp .env.example .env

# Verilənlər bazasını işə salın (dev — production 5434-ə toxunmur)
pnpm docker:dev

# Prisma migrate & seed (dev DB :5435)
pnpm db:generate
pnpm db:migrate:apply
pnpm db:seed

# Development serverləri işə salın (3120 / 3121 / 4100)
pnpm dev
```

### URL-lər

| Servis | URL |
|--------|-----|
| Web (dev) | http://127.0.0.1:3120 |
| Admin (dev) | http://127.0.0.1:3121 |
| API (dev) | http://127.0.0.1:4100/api/v1 |
| Swagger (dev) | http://127.0.0.1:4100/docs |
| Canlı sayt | https://xidmetal.com (portlar 3020/3021/4000) |
| Prisma Studio | `pnpm db:studio` |
| PostgreSQL (dev Docker) | `127.0.0.1:5435` |
| Redis (dev Docker) | `127.0.0.1:6381` |

## Layihə strukturu

```
xidmetal/
├── apps/
│   ├── web/          # Next.js marketplace (prod 3020, dev 3120)
│   ├── admin/        # Next.js admin panel (prod 3021, dev 3121)
│   └── api/          # NestJS backend (prod 4000, dev 4100)
├── packages/
│   ├── shared/       # Paylaşılan types, schemas, constants
│   ├── database/     # Prisma schema & client
│   └── typescript-config/
├── docs/             # Sənədləşmə
├── .cursor/rules/    # Cursor AI qaydaları
├── docker-compose.yml
└── turbo.json
```

## Skriptlər

```bash
pnpm docker:dev   # Dev Postgres/Redis (5435/6381) — canlı sayta toxunmur
pnpm dev          # Bütün appları development rejimində işə sal (3120/3121/4100)
pnpm build        # Production build
pnpm lint         # Lint yoxlaması
pnpm typecheck    # TypeScript yoxlaması
pnpm db:migrate   # Database migration
pnpm db:studio    # Prisma Studio
```

## Sənədlər

### Mövcud
- [Arxitektura](./docs/ARCHITECTURE.md)
- [Başlanğıc bələdçisi](./docs/GETTING_STARTED.md)
- [API sənədləşməsi](./docs/API.md)
- [Kod konvensiyaları](./docs/CONVENTIONS.md)
- [Töhfə vermə](./docs/CONTRIBUTING.md)

### Hədəf arxitektura (on-demand & canlı izləmə)
- [Hədəf arxitektura](./docs/TARGET_ARCHITECTURE.md)
- [Data model dəyişiklikləri](./docs/DATA_MODEL.md)
- [Real-time & canlı izləmə](./docs/REALTIME_TRACKING.md)
- [Sifariş həyat dövrü](./docs/BOOKING_LIFECYCLE.md)
- [Yol xəritəsi](./docs/ROADMAP.md)

## Lisenziya

Proprietary — Bütün hüquqlar qorunur.
