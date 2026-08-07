# Kod Konvensiyaları

Bu sənəd Xidmətal layihəsində kod yazarkən riayət edilməli standartları müəyyən edir.

## Ümumi prinsiplər

1. **TypeScript strict mode** — `any` istifadə etməyin
2. **Single responsibility** — hər funksiya/modul bir iş görsün
3. **DRY** — təkrarlanan kodu shared package-ə çıxarın
4. **Explicit over implicit** — aydın adlandırma, explicit return types

## Adlandırma

| Element | Konvensiya | Nümunə |
|---------|------------|--------|
| Fayllar (component) | kebab-case | `service-card.tsx` |
| Fayllar (module) | kebab-case | `auth.service.ts` |
| Komponentlər | PascalCase | `ServiceCard` |
| Funksiyalar | camelCase | `findAllServices` |
| Constants | UPPER_SNAKE | `API_PREFIX` |
| Types/Interfaces | PascalCase | `UserProfile` |
| Enums | PascalCase | `BookingStatus` |
| Database tables | snake_case | `provider_profiles` |

## TypeScript

```typescript
// ✅ Explicit return type
async function findById(id: string): Promise<UserProfile> { ... }

// ✅ Interface for objects
interface CreateServiceDto {
  title: string;
  price: number;
}

// ❌ any istifadə etməyin
function process(data: any) { ... }

// ✅ unknown + type guard
function process(data: unknown) {
  if (isValidData(data)) { ... }
}
```

## Backend (NestJS)

### Modul strukturu

```
modules/services/
├── services.module.ts
├── services.controller.ts
├── services.service.ts
└── dto/
    └── index.ts
```

### Controller qaydaları

- Yalnız HTTP concern-ləri (request/response mapping)
- Biznes məntiqini service-ə delegasiya edin
- Swagger decorator-ları əlavə edin
- DTO validation class-validator ilə

```typescript
@ApiTags('Services')
@Controller('services')
export class ServicesController {
  @Public()
  @Get()
  @ApiOperation({ summary: 'Xidmətlər siyahısı' })
  findAll(@Query() query: ServiceQueryDto) {
    return this.servicesService.findAll(query);
  }
}
```

### Service qaydaları

- Biznes məntiqini burada yazın
- Prisma birbaşa service-də istifadə olunur (MVP üçün)
- NestJS exception-ları istifadə edin (`NotFoundException`, `ForbiddenException`)
- Error mesajları Azərbaycan dilində

## Frontend (Next.js)

### Komponent strukturu

```typescript
// Server Component (default)
export default async function ServicesPage() {
  const services = await api.services();
  return <ServiceList items={services.items} />;
}

// Client Component (yalnız lazım olduqda)
'use client';
export function SearchBar() { ... }
```

### Styling

- **Tailwind CSS** utility classes
- Brend rəngləri: `bg-brand`, `text-brand-foreground`, `hover:bg-brand-dark`
- `cn()` utility ilə conditional classes

### Responsivlik (mütləq)

Hər yeni UI komponenti və səhifə **mobil və desktop** üçün düzgün işləməlidir. Responsivlik sonradan əlavə edilən opsiya deyil — kod yazılarkən nəzərə alınmalıdır.

**Prinsiplər:**

1. **Mobile-first** — əvvəlcə mobil layout, sonra `sm:`, `md:`, `lg:`, `xl:` breakpoint-ləri ilə genişləndir
2. **Breakpoint-lər** — Tailwind standartları: `sm` (640px), `md` (768px), `lg` (1024px), `xl` (1280px)
3. **Layout uyğunluğu** — grid/flex sütun sayı, sidebar, naviqasiya və kart ölçüləri ekrana görə dəyişməlidir
4. **Touch-friendly** — mobil düymələr minimum `44×44px` toxunma sahəsi; hover-only interaksiya yox
5. **Overflow** — uzun mətn, cədvəl və form sahələri kiçik ekranda kəsilməməli (`overflow-x-auto`, `truncate`, `break-words`)
6. **Şəkillər** — `next/image` + uyğun `sizes`; sabit genişlikli konteynerlərdən çəkinin

**Yoxlama (hər UI dəyişikliyindən sonra):**

- Mobil görünüş (~375px) — məzmun oxunaqlı, scroll yox, düymələr əlçatan
- Tablet (~768px) — layout keçidi məntiqlidir
- Desktop (~1280px+) — boş sahə düzgün paylanır, məzmun çox genişlənmir (`max-w-*` istifadə edin)

```tsx
// ✅ Mobile-first grid
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">

// ✅ Responsive padding və tipografiya
<section className="px-4 py-6 md:px-8 md:py-10">

// ❌ Yalnız desktop üçün sabit layout
<div className="grid grid-cols-3 gap-8 w-[1200px]">
```

```tsx
<div className={cn(
  'rounded-lg border p-4',
  isActive && 'border-brand bg-brand/5',
)}>
```

### State management

| State tipi | Alət |
|------------|------|
| Server data | TanStack Query |
| Auth, UI | Zustand |
| Form | React Hook Form + Zod |

## Git

### Branch adlandırma

```
feature/add-review-system
fix/booking-status-update
refactor/auth-module
docs/api-documentation
```

### Commit mesajları (Conventional Commits)

```
feat: add review module
fix: booking status validation
refactor: extract pagination helper
docs: update API documentation
chore: upgrade dependencies
```

## Validation

Backend və frontend eyni qaydaları paylaşmalıdır:

- **Backend:** class-validator DTO-larda
- **Frontend:** Zod schemas (`packages/shared`)
- **Database:** Prisma schema constraints

## Error handling

```typescript
// Backend
throw new NotFoundException('Xidmət tapılmadı');

// Frontend
try {
  await apiClient('/services');
} catch (error) {
  if (error instanceof ApiError) {
    toast.error(error.message);
  }
}
```

## Test

- **Unit:** Vitest (`apps/api` helper/modul spec-ləri; `pnpm test`)
- **E2E:** Playwright — `apps/web/e2e` (`ci-auth`, `smoke`, `critical-flows`; CI-də hər üçü)
- **Load:** k6 (`pnpm load:smoke`) — əl ilə / `workflow_dispatch`
- **Integration (Supertest):** hələ genişləndirilməyib

## Import sırası

```typescript
// 1. External packages
import { Injectable } from '@nestjs/common';

// 2. Internal packages
import { UserRole } from '@xidmetal/shared';

// 3. Relative imports
import { PrismaService } from '../../common/database/prisma.service';
```
