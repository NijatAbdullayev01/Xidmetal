# Xidmətal — Cursor Agent Qaydaları

Bu layihə xidmət verənlərlə xidmət alanları birləşdirən marketplace platformasıdır.

## Layihə konteksti

- **Monorepo:** pnpm workspaces + Turborepo
- **Frontend:** `apps/web` — Next.js 15 App Router, Tailwind CSS 4, TypeScript
- **Backend:** `apps/api` — NestJS 11, Prisma, PostgreSQL
- **Shared:** `packages/shared` — types, Zod schemas, enums, constants
- **Database:** `packages/database` — Prisma schema
- **Brend rəngi:** `#FFCC00` (Tailwind: `brand`, `brand-dark`, `brand-light`)

## Kod yazarkən

1. **Scope-u minimal saxla** — yalnız tələb olunan dəyişiklikləri et
2. **Mövcud konvensiyalara riayət et** — `docs/CONVENTIONS.md` oxu
3. **Shared package istifadə et** — frontend/backend arasında tip paylaşımı üçün
4. **TypeScript strict** — `any` istifadə etmə
5. **Error mesajları Azərbaycan dilində** olsun (user-facing)
6. **Swagger decorator-ları** yeni API endpoint-lərə əlavə et
7. **Responsivlik mütləqdir** — UI kodu yazılarkən mobil və desktop dizaynları düzgün yığılmalıdır

## Arxitektura

- Backend: Controller → Service → Prisma (Clean Architecture)
- Modullar domain-ə görə ayrılıb: auth, users, services, categories, availability, bookings, reviews, messages, notifications, health
- RBAC: CUSTOMER, PROVIDER, ADMIN rolları (admin UI: ayrı `apps/admin` app, port 3021)
- JWT auth + refresh token rotation
- API prefix: `/api/v1`

## Frontend

- **Marketplace:** `apps/web` — Next.js 15 App Router, Tailwind CSS 4, TypeScript (port 3020)
- **Admin:** `apps/admin` — ayrı Next.js app (port 3021); marketplace daxilində admin UI yoxdur
- Server Components default, `'use client'` yalnız interaktiv UI üçün
- Tailwind brend rəngləri: `bg-brand`, `text-brand-foreground`, `hover:bg-brand-dark`
- State: Zustand (auth), TanStack Query (server data)
- **Responsivlik mütləqdir:** mobile-first (`sm:`, `md:`, `lg:`), mobil (~375px) və desktop (~1280px) görünüşlər düzgün yığılmalıdır; touch-friendly düymələr, overflow idarəsi, `max-w-*` ilə geniş ekran məhdudiyyəti

## Database

- Prisma schema: `packages/database/prisma/schema.prisma`
- Migration: `pnpm db:migrate`
- Schema dəyişikliyindən sonra: `pnpm db:generate`

## Fayl strukturu

Yeni backend modul:
```
apps/api/src/modules/{name}/
├── {name}.module.ts
├── {name}.controller.ts
├── {name}.service.ts
└── dto/index.ts
```

Yeni frontend səhifə:
```
apps/web/src/app/{route}/page.tsx
```

## Qadağanlar

- `.env` fayllarını commit etmə
- `any` type istifadə etmə
- Biznes məntiqini controller-ə yazma
- Hardcoded API URL-ləri (env variable istifadə et)
- İngilis dilində user-facing mesajlar (AZ istifadə et)

## Faydalı əmrlər

```bash
pnpm dev              # Development
pnpm build            # Build
pnpm typecheck        # TypeScript check
pnpm db:generate      # Prisma generate
pnpm db:push          # DB schema push
docker compose up -d  # PostgreSQL + Redis
```

## Sənədlər

- Arxitektura: `docs/ARCHITECTURE.md`
- API: `docs/API.md`
- Konvensiyalar: `docs/CONVENTIONS.md`
- Başlanğıc: `docs/GETTING_STARTED.md`
