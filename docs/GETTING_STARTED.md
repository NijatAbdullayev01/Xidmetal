# Başlanğıc Bələdçisi

Bu sənəd Xidmətal layihəsini local mühitdə işə salmaq üçün addım-addım təlimat verir.

> **Portlar (cari):** Web `3020`, Admin `3021`, API `4000`, Postgres host `5434`, Redis host `6380`.

## 1. Sistem tələbləri

| Alət | Minimum versiya |
|------|-----------------|
| Node.js | 20.x |
| pnpm | 9.x |
| Docker | 24.x |
| Docker Compose | 2.x |

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

`.env` dəyərləri (`.env.example` ilə eyni):

| Dəyişən | Təsvir | Default (local Docker) |
|---------|--------|-------------------------|
| `DATABASE_URL` | PostgreSQL | `postgresql://xidmetal:xidmetal_dev@localhost:5434/xidmetal` |
| `REDIS_URL` | Redis (API hələ istifadə etmir) | `redis://localhost:6380` |
| `JWT_SECRET` | JWT imzalama açarı | Dəyişdirin! |
| `API_PORT` | Backend port | `4000` |
| `CORS_ORIGIN` | İcazəli frontend origin-lər (vergüllə) | `http://localhost:3020,http://localhost:3021` |
| `NEXT_PUBLIC_API_URL` | API URL (web + admin) | `http://localhost:4000` |
| `NEXT_PUBLIC_APP_URL` | Marketplace URL | `http://localhost:3020` |
| `NEXT_PUBLIC_ADMIN_URL` | Admin panel URL | `http://localhost:3021` |
| `NEXT_PUBLIC_API_URL` | Frontend → API | `http://localhost:4000` |
| `NEXT_PUBLIC_APP_URL` | Frontend URL | `http://localhost:3020` |

Mövcud `.env` varsa, portları yuxarıdakı ilə uyğunlaşdırın.

## 4. Verilənlər bazasını işə salmaq

```bash
docker compose up -d
docker compose ps
```

## 5. Database schema

Hazırda production migration history yoxdur — local üçün `db:push` istifadə olunur.

```bash
pnpm db:generate
pnpm db:push
pnpm --filter @xidmetal/database seed
```

## 6. Development serverləri

```bash
pnpm dev
```

Və ya ayrı-ayrı:

```bash
pnpm --filter @xidmetal/api dev
pnpm --filter @xidmetal/web dev
pnpm --filter @xidmetal/admin dev
```

## 7. Yoxlama

| Test | URL / Əmr |
|------|-----------|
| Marketplace | http://localhost:3020 |
| Admin panel | http://localhost:3021 |
| API Health | http://localhost:4000/api/v1/health |
| Swagger | http://localhost:4000/docs |
| DB Studio | `pnpm db:studio` |

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
lsof -i :3020
lsof -i :4000
lsof -i :5434
```

### Database connection error

`DATABASE_URL`-də host portunun **5434** olduğunu yoxlayın (`docker-compose.yml` map: `5434:5432`).

```bash
docker compose logs postgres
docker compose restart postgres
```

### CORS / login problemləri

`CORS_ORIGIN` həm marketplace, həm admin origin-lərini əhatə etməlidir:
`http://localhost:3020,http://localhost:3021`. Admin üçün `NEXT_PUBLIC_ADMIN_URL=http://localhost:3021`.

### Prisma client tapılmır

```bash
pnpm db:generate
```

### node_modules problemləri

```bash
pnpm clean
pnpm install
```
