# API Sənədləşməsi

**Base URL:** `http://localhost:4000/api/v1`

**Swagger UI:** http://localhost:4000/docs (dev; production-da default bağlı — `SWAGGER_ENABLED=true`)

> **Son yenilənmə:** 2026-08 — cari Nest modul səthinə uyğun.

## Autentifikasiya

Protected endpoint-lər `Authorization: Bearer <access_token>` **və ya** httpOnly cookie tələb edir.

Brauzer (marketplace/admin): login/register/refresh **yalnız cookie** qoyur — JSON cavabda `tokens` **yoxdur** (XSS səthi bağlanıb).
`clientApp`: `marketplace` | `admin` (body və ya `x-xidmetal-client` header) — yanlış app-də session yaradılmır və cookie silinir.
Swagger / xarici klientlər Bearer header dəstəklənir. Access default: `15m`.

🔒 = JWT tələb olunur (cookie və ya Bearer). Rəllər `@Roles` və ya service-layer yoxlaması ilə tətbiq olunur.

---

## Auth

### POST /auth/register

Yeni istifadəçi. `role`: `CUSTOMER` | `PROVIDER` (`ADMIN` qeydiyyatı qadağandır).
**Məhsul qərarı:** rol qeydiyyatda seçilir və dəyişmir; `CUSTOMER` → `PROVIDER` upgrade endpoint-i yoxdur (ayrı hesab lazımdır).
Qeydiyyatdan sonra e-poçt təsdiq kodu göndərilir (`isVerified: false` qalır — soft verify; girişə mane olmur).

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

**Response:** `201/200` — `{ user }` (+ opsional `mailDelivered` / `previewCode` DEV). Token-lər `Set-Cookie`.

### POST /auth/login

**Body:** `{ "email", "password", "clientApp?: "marketplace"|"admin" }`

**Response:** `{ user }` + cookies. `clientApp=marketplace` + ADMIN → `403` (cookie clear). `clientApp=admin` + qeyri-ADMIN → `403`.

### POST /auth/refresh

**Body:** `{ "refreshToken": "..." }` (opsional — cookie üstünlük).

Reuse aşkarlananda istifadəçinin **bütün** refresh tokenləri ləğv olunur.

### POST /auth/logout

Cari refresh tokeni serverdə silir (sessiya revoke).

**Body:** `{ "refreshToken": "..." }`

### POST /auth/logout-all 🔒

İstifadəçinin bütün refresh tokenlərini silir.

### POST /auth/forgot-password

Şifrə bərpası kodu (6 rəqəm). İstifadəçi olmasa da eyni generic mesaj qaytarılır.

**Body:** `{ "email": "user@example.com" }`

### POST /auth/reset-password

Kod + yeni şifrə. Uğurdan sonra bütün sessiyalar ləğv olunur; `passwordChangedAt` yenilənir (köhnə access JWT keçərsiz).

**Body:** `{ "email": "...", "code": "123456", "newPassword": "SecurePass1" }`

### POST /auth/verify-email/request

E-poçt təsdiq kodunu (yenidən) göndər.

### POST /auth/verify-email/confirm

Kod ilə `isVerified: true`.

**Body:** `{ "email": "...", "code": "123456" }`

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

> Admin yazma: `POST/PATCH /admin/categories` (silmə yoxdur). Seed də mövcuddur.

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

Yeni xidmət. Qiymət, kateqoriya, təsvir, şəkillər (**http(s) URL** — `POST /uploads`), `serviceVenue`, (yükdaşıma) `vehicleLength` / `vehicleWidth` / `vehicleHeight`, `cargoRouteScope`. E-poçt təsdiqi məcburidir. `ACTIVE` status üçün provider admin-təsdiqli olmalıdır.

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

Sifarişlər siyahısı (rol üzrə filtr).

### GET /bookings/:id 🔒

Sifariş detalları — yalnız iştirakçı və ya ADMIN.

### POST /bookings 🔒 (+ email verified)

Rola görə siyahı. Query: `page`, `limit`, `status`.

### POST /bookings 🔒

**Body (nümunə):**
```json
{
  "serviceId": "uuid",
  "scheduledAt": "2026-08-15T10:00:00.000Z",
  "notes": "3 otaqlı mənzil",
  "address": "Bakı, Nəsimi rayonu",
  "imageUrl": "https://api.example/uploads/bookings/userId/uuid.jpg"
}
```

Slot `availability` ilə yoxlanır (transaction + `pg_advisory_xact_lock`); gələcək tarix məcburidir. E-poçt təsdiqi + təsdiqlənmiş provider tələb olunur.

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

Tamamlanmış sifarişə rəy; status **`PENDING`** (admin moderation → `APPROVED`/`REJECTED`). Aggregate yalnız `APPROVED` olduqda yenilənir. E-poçt təsdiqi məcburidir.

### GET /reviews/received 🔒 PROVIDER

Provider-ə gələn rəylər (default: `PENDING` + `APPROVED`). Query: `status`, `serviceId`, `page`, `limit`.

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

Typing indicator (DB `typing_presences`; multi-instance; ~4s TTL). E-poçt təsdiqi məcburidir.

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

> Booking/reschedule axınları DB-yə yazır. Admin platforma bildirişi: `POST /admin/announcements`.
> Emit olunanlar: `BOOKING_CREATED`, `BOOKING_CONFIRMED`, `BOOKING_CANCELLED` (ləğv + rədd), `BOOKING_COMPLETED`, `BOOKING_RESCHEDULE_PROPOSED`, `REVIEW_RECEIVED`, `MESSAGE_RECEIVED` (söhbət üzrə dedupe), `ADMIN_ANNOUNCEMENT`.
> Review unread: `GET/POST …/review-unread-count` / `review-read-all`.

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

## Uploads

### POST /uploads 🔒

Multipart şəkil yükləmə. `folder`: `services` | `avatars` | `bookings`.
Cavab: `{ "url": "https://..." }` — DB-yə yalnız URL yazılır (base64 yox).
Limit: 10 req/dəq, 30/saat/user; e-poçt təsdiqi məcburi; orphan TTL 24 saat.

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
