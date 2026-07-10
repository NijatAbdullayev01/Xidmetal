# Kod Konvensiyaları

Bu sənəd Xidmetal layihəsində kod yazarkən riayət edilməli standartları müəyyən edir.

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
- Responsive: mobile-first (`sm:`, `md:`, `lg:`)
- `cn()` utility ilə conditional classes

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

## Test (gələcək)

- **Unit:** Vitest (shared, services)
- **Integration:** Supertest (API endpoints)
- **E2E:** Playwright (critical user flows)

## Import sırası

```typescript
// 1. External packages
import { Injectable } from '@nestjs/common';

// 2. Internal packages
import { UserRole } from '@xidmetal/shared';

// 3. Relative imports
import { PrismaService } from '../../common/database/prisma.service';
```
