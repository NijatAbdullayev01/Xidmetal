# API Sənədləşməsi

**Base URL:** `http://localhost:4000/api/v1`

**Swagger UI:** http://localhost:4000/docs

## Autentifikasiya

Protected endpoint-lər `Authorization: Bearer <access_token>` header tələb edir.

Token-lər `/auth/register` və `/auth/login` endpoint-lərindən alınır.

---

## Auth

### POST /auth/register

Yeni istifadəçi qeydiyyatı.

**Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass1",
  "firstName": "Əli",
  "lastName": "Məmmədov",
  "phone": "+994501234567",
  "role": "CUSTOMER"
}
```

**Response:** `200`
```json
{
  "user": { "id": "...", "email": "...", "role": "CUSTOMER", ... },
  "tokens": { "accessToken": "...", "refreshToken": "..." }
}
```

### POST /auth/login

Sistemə daxil ol.

**Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass1"
}
```

### POST /auth/refresh

Access token yenilə.

**Body:**
```json
{
  "refreshToken": "..."
}
```

---

## Users

### GET /users/me 🔒

Cari istifadəçi profili.

---

## Categories

### GET /categories

Bütün aktiv kateqoriyalar.

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Təmizlik",
    "slug": "temizlik",
    "description": "...",
    "icon": "🧹",
    "serviceCount": 0
  }
]
```

### GET /categories/:slug

Kateqoriya detalları.

---

## Services

### GET /services

Xidmətlər siyahısı (paginated).

**Query params:**
| Param | Tip | Təsvir |
|-------|-----|--------|
| `page` | number | Səhifə (default: 1) |
| `limit` | number | Limit (default: 20, max: 100) |
| `categoryId` | uuid | Kateqoriya filter |
| `providerId` | uuid | Provider filter |
| `search` | string | Axtarış |

**Response:**
```json
{
  "items": [...],
  "total": 100,
  "page": 1,
  "limit": 20,
  "totalPages": 5
}
```

### GET /services/:id

Xidmət detalları.

### POST /services 🔒 PROVIDER

Yeni xidmət yarat.

**Body:**
```json
{
  "title": "Ev təmizliyi",
  "description": "Peşəkar ev təmizliyi xidməti",
  "categoryId": "uuid",
  "price": 50,
  "priceUnit": "FIXED",
  "isRemote": false
}
```

### PATCH /services/:id 🔒 PROVIDER/ADMIN

Xidməti yenilə.

---

## Bookings

### GET /bookings 🔒

Sifarişlər siyahısı (rola görə filter).

### POST /bookings 🔒

Yeni sifariş yarat.

**Body:**
```json
{
  "serviceId": "uuid",
  "scheduledAt": "2026-07-15T10:00:00.000Z",
  "notes": "3 otaqlı mənzil",
  "address": "Bakı, Nəsimi rayonu"
}
```

### PATCH /bookings/:id/status 🔒

Sifariş statusunu yenilə.

**Body:**
```json
{
  "status": "CONFIRMED"
}
```

**Status dəyərləri:** `PENDING`, `CONFIRMED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`, `REJECTED`

---

## Health

### GET /health

API sağlamlıq yoxlaması.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-07-10T...",
  "service": "xidmetal-api"
}
```

---

## Xəta kodları

| Kod | Məna |
|-----|------|
| 400 | Yanlış sorğu (validation error) |
| 401 | Autentifikasiya tələb olunur |
| 403 | İcazə yoxdur |
| 404 | Tapılmadı |
| 409 | Konflikt (məs: email artıq mövcuddur) |
| 429 | Rate limit aşıldı |
| 500 | Server xətası |

**Xəta response formatı:**
```json
{
  "statusCode": 400,
  "message": ["validation error messages"],
  "error": "Bad Request"
}
```
