# API Sənədləşməsi

**Base URL:** `http://localhost:4000/api/v1`

**Swagger UI:** http://localhost:4000/docs (həmişə ən güncəl mənbə)

> **Son yenilənmə:** 2026-08 — cari Nest modul səthinə uyğun.

## Autentifikasiya

Protected endpoint-lər `Authorization: Bearer <access_token>` header tələb edir.

Token-lər `/auth/register` və `/auth/login`-dən alınır; yeniləmə `/auth/refresh`.

🔒 = JWT tələb olunur. Rəllər `@Roles` və ya service-layer yoxlaması ilə tətbiq olunur.

---

## Auth

### POST /auth/register

Yeni istifadəçi. `role`: `CUSTOMER` | `PROVIDER` (`ADMIN` qeydiyyatı qadağandır).

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

**Response:** `200` — `{ user, tokens: { accessToken, refreshToken } }`

### POST /auth/login

### POST /auth/refresh

**Body:** `{ "refreshToken": "..." }`

> Server-side logout / token revoke endpoint-i hələ yoxdur.

---

## Users

### GET /users/me 🔒

Cari profil (`providerProfile` daxil ola bilər).

### PATCH /users/me 🔒

Profil yeniləmə (ad, telefon, avatar və s.).

### PATCH /users/me/password 🔒

Şifrə dəyişimi.

### POST /users/me/heartbeat 🔒

Onlayn presence (`lastSeenAt`); throttled.

### POST /users/me/email/request-change 🔒

Yeni e-poçt üçün kod (SMTP varsa mail; yoxdursa dev log).

### POST /users/me/email/confirm-change 🔒

Kod ilə e-poçt təsdiqi.

---

## Categories

### GET /categories

Aktiv kateqoriyalar (+ `serviceCount`).

### GET /categories/:slug

Kateqoriya detalları.

> Yazma (CRUD) API-si yoxdur — seed ilə idarə olunur.

---

## Services

### GET /services

Paginated siyahı.

**Əsas query params:** `page`, `limit`, `categoryId`, `providerId`, `search`, status/filter sahələri (Swagger-ə baxın).

### GET /services/mine 🔒 PROVIDER

Öz xidmətləri.

### GET /services/:id

Xidmət detalları (şəkillər, venue, yük ölçüləri / `cargoRouteScope` və s.).

### POST /services 🔒 PROVIDER

Yeni xidmət. Qiymət, kateqoriya, təsvir, şəkillər (`data:image/...` və ya URL), `serviceVenue`, (yükdaşıma) `vehicleLength` / `vehicleWidth` / `vehicleHeight`, `cargoRouteScope`.

### PATCH /services/:id 🔒 PROVIDER/ADMIN

### DELETE /services/:id 🔒 PROVIDER/ADMIN

---

## Availability (path: `/services/:serviceId/...`)

### GET /services/:serviceId/availability

Boş/dolu slotlar (public). Query: `from`, `to` (ISO date).

### GET /services/:serviceId/working-hours 🔒 PROVIDER

### PUT /services/:serviceId/working-hours 🔒 PROVIDER

Həftəlik iş saatlarını yenilə.

### GET /services/:serviceId/availability/overrides 🔒 PROVIDER

### POST /services/:serviceId/availability/overrides 🔒 PROVIDER

### DELETE /services/:serviceId/availability/overrides/:overrideId 🔒 PROVIDER

---

## Bookings

### GET /bookings 🔒

Rola görə siyahı. Query: `page`, `limit`, `status`.

### POST /bookings 🔒

**Body (nümunə):**
```json
{
  "serviceId": "uuid",
  "scheduledAt": "2026-08-15T10:00:00.000Z",
  "notes": "3 otaqlı mənzil",
  "address": "Bakı, Nəsimi rayonu",
  "imageUrl": "data:image/jpeg;base64,..."
}
```

Slot `availability` ilə yoxlanır; gələcək tarix məcburidir.

### PATCH /bookings/:id/status 🔒

**Body:** `{ "status": "CONFIRMED" }`

**Statuslar:** `PENDING`, `CONFIRMED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`, `REJECTED`

İcazəli keçidlər (qısaca):
- Provider: `PENDING→CONFIRMED|REJECTED`, `CONFIRMED→IN_PROGRESS|CANCELLED`, `IN_PROGRESS→COMPLETED`
- Customer: `PENDING|CONFIRMED→CANCELLED`
- Admin: bypass

### PATCH /bookings/:id/reschedule 🔒 PROVIDER

Yeni tarix təklifi + müştəriyə mesaj.

### PATCH /bookings/:id/reschedule/confirm 🔒

### PATCH /bookings/:id/reschedule/reject 🔒

---

## Reviews

### GET /reviews/provider/:providerId

İctimai rəylər (qismən anonim ad).

### POST /reviews 🔒

Tamamlanmış sifarişə rəy; provider rating aggregate transaction-da yenilənir. Status birbaşa `APPROVED`.

### GET /reviews/received 🔒 PROVIDER

Provider-ə gələn rəylər.

---

## Messages

### GET /messages/unread-count 🔒

### GET /messages/conversations 🔒

### POST /messages/conversations 🔒

Söhbət aç / tap (customer–provider cütü).

### GET /messages/conversations/:id 🔒

### DELETE /messages/conversations/:id 🔒

Soft-delete (yalnız öz siyahısından).

### GET /messages/conversations/:id/messages 🔒

### POST /messages/conversations/:id/messages 🔒

### POST /messages/conversations/:id/read 🔒

### POST /messages/conversations/:id/typing 🔒

Typing indicator (in-memory; multi-instance üçün uyğun deyil).

> Real-time WebSocket yoxdur — frontend polling istifadə edir.

---

## Notifications

### GET /notifications 🔒

### GET /notifications/unread-count 🔒

Admin/platforma tipləri (zəng ikonu).

### GET /notifications/booking-unread-count 🔒

Sifariş hadisələri.

### PATCH /notifications/:id/read 🔒

### POST /notifications/read-all 🔒

### POST /notifications/booking-read-all 🔒

> Booking/reschedule axınları DB-yə yazır. Admin platforma bildirişi: `POST /admin/announcements`. `BOOKING_COMPLETED` / `REVIEW_RECEIVED` enum-da var, lakin hələ emit olunmur.

---

## Admin 🔒 ADMIN

Bütün endpoint-lər `@Roles(ADMIN)` tələb edir. Admin qeydiyyatla yaradıla bilməz — seed (`ADMIN_EMAIL` / `ADMIN_PASSWORD`). UI ayrıca app-dədir: `apps/admin` → `http://localhost:3021` (marketplace `apps/web` daxilində deyil).

### GET /admin/stats

Platforma icmalı (istifadəçi, xidmət, sifariş, rəy, kateqoriya sayları).

### GET /admin/users

Query: `page`, `limit`, `role`, `isActive`, `search`.

### GET /admin/users/:id

### PATCH /admin/users/:id/active

Body: `{ "isActive": boolean }` — deaktivdə refresh token-lər silinir.

### PATCH /admin/providers/:userId/verify

Body: `{ "isVerified": boolean }`.

### GET /admin/categories

Bütün kateqoriyalar (aktiv + deaktiv).

### POST /admin/categories

### PATCH /admin/categories/:id

### GET /admin/services

Query: `page`, `limit`, `status`, `categoryId`, `search`.

### PATCH /admin/services/:id/status

Body: `{ "status": "DRAFT"|"ACTIVE"|"PAUSED"|"ARCHIVED" }`.

### GET /admin/bookings

### GET /admin/reviews

Query: `status` (`PENDING`|`APPROVED`|`REJECTED`).

### PATCH /admin/reviews/:id/status

Body: `{ "status": "APPROVED"|"REJECTED" }` — reytinq aggregate yenilənir.

### POST /admin/announcements

Body: `{ "title", "body", "roles?": ["CUSTOMER"|"PROVIDER"] }` — boş `roles` = bütün aktiv istifadəçilər.

---

## Health

### GET /health

```json
{
  "status": "ok",
  "timestamp": "...",
  "service": "xidmetal-api"
}
```

---

## Xəta kodları

| Kod | Məna |
|-----|------|
| 400 | Yanlış sorğu (validation) |
| 401 | Autentifikasiya tələb olunur |
| 403 | İcazə yoxdur |
| 404 | Tapılmadı |
| 409 | Konflikt (məs. email mövcuddur) |
| 429 | Rate limit |
| 500 | Server xətası |

```json
{
  "statusCode": 400,
  "message": ["validation error messages"],
  "error": "Bad Request"
}
```
