# Başlanğıc Bələdçisi

Bu sənəd Xidmətal layihəsini local mühitdə işə salmaq üçün addım-addım təlimat verir.

## 1. Sistem tələbləri

| Alət | Minimum versiya |
|------|-----------------|
| Node.js | 20.x |
| pnpm | 9.x |
| Docker | 24.x |
| Docker Compose | 2.x |

Node.js versiyasını yoxlamaq:

```bash
node --version   # v20.x.x və ya yuxarı
pnpm --version   # 9.x.x
```

## 2. Repozitoriyanı hazırlamaq

```bash
git clone <repo-url> xidmetal
cd xidmetal
pnpm install
```

## 3. Environment konfiqurasiyası

```bash
cp .env.example .env
```

`.env` faylında aşağıdakı dəyərləri yoxlayın:

| Dəyişən | Təsvir | Default |
|---------|--------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://xidmetal:xidmetal_dev@localhost:5432/xidmetal` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `JWT_SECRET` | JWT imzalama açarı | Dəyişdirin! |
| `API_PORT` | Backend port | `4000` |
| `NEXT_PUBLIC_API_URL` | Frontend-in API URL-i | `http://localhost:4000` |

## 4. Verilənlər bazasını işə salmaq

```bash
# PostgreSQL və Redis container-larını başlat
docker compose up -d

# Container-ların hazır olmasını gözləyin
docker compose ps
```

## 5. Database migration

```bash
# Prisma client generate
pnpm db:generate

# Schema-nı DB-yə push et
pnpm db:push

# Seed data (kateqoriyalar)
pnpm --filter @xidmetal/database seed
```

## 6. Development serverləri

```bash
# Hər iki app eyni vaxtda
pnpm dev
```

Və ya ayrı-ayrı:

```bash
# Terminal 1 — API
pnpm --filter @xidmetal/api dev

# Terminal 2 — Web
pnpm --filter @xidmetal/web dev
```

## 7. Yoxlama

| Test | URL / Əmr |
|------|-----------|
| Frontend | http://localhost:3001 |
| API Health | http://localhost:4000/api/v1/health |
| Swagger | http://localhost:4000/docs |
| DB Studio | `pnpm db:studio` → http://localhost:5555 |

## 8. İlk API sorğuları

### Qeydiyyat

```bash
curl -X POST http://localhost:4000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass1",
    "firstName": "Test",
    "lastName": "User",
    "role": "CUSTOMER"
  }'
```

### Kateqoriyalar

```bash
curl http://localhost:4000/api/v1/categories
```

## Problemlərin həlli

### Port artıq istifadədədir

```bash
# Hansı proses portu tutur
lsof -i :3001
lsof -i :4000
lsof -i :5432
```

### Database connection error

```bash
# Container statusunu yoxla
docker compose logs postgres

# Container-i restart et
docker compose restart postgres
```

### Prisma client tapılmır

```bash
pnpm db:generate
```

### node_modules problemləri

```bash
pnpm clean
pnpm install
```
