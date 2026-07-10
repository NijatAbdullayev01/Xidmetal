# Xidmetal

**Xidmət verənlərlə xidmət alanları bir araya gətirən veb platforma.**

Xidmetal, provider (xidmət verən) və customer (xidmət alan) rollarını birləşdirən marketplace tipli platformadır. İstifadəçilər xidmət axtara, sifariş verə, rəy yaza və provider kimi xidmət təklif edə bilərlər.

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

# Verilənlər bazasını işə salın
docker compose up -d

# Prisma migrate & seed
pnpm db:generate
pnpm db:push
pnpm --filter @xidmetal/database seed

# Development serverləri işə salın
pnpm dev
```

### URL-lər

| Servis | URL |
|--------|-----|
| Web (Frontend) | http://localhost:3001 |
| API (Backend) | http://localhost:4000/api/v1 |
| Swagger Docs | http://localhost:4000/docs |
| Prisma Studio | `pnpm db:studio` |

## Layihə strukturu

```
xidmetal/
├── apps/
│   ├── web/          # Next.js frontend
│   └── api/          # NestJS backend
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
pnpm dev          # Bütün appları development rejimində işə sal
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
