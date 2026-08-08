# API Sənədləşməsi

**Base URL:** `http://localhost:4000/api/v1`

**Swagger UI:** http://localhost:4000/docs (dev; production-da default bağlı — `SWAGGER_ENABLED=true`)

> **Son yenilənmə:** 2026-08 — cari Nest modul səthinə uyğun.

## Autentifikasiya

Protected endpoint-lər `Authorization: Bearer <access_token>` **və ya** httpOnly cookie tələb edir.

Brauzer (marketplace/admin): login/register/refresh **yalnız cookie** qoyur — JSON cavabda `tokens` **yoxdur** (XSS səthi bağlanıb).
`clientApp`: `marketplace` | `admin` (body və ya `x-xidmetal-client` header) — yanlış app-də session yaradılmır və cookie silinir.
Cookie adları app-scoped-dir (`xidmetal_access_marketplace` / `xidmetal_access_admin`) — eyni API host-da sessiyalar bir-birini üstünə yazmır.
Swagger / xarici klientlər Bearer header dəstəklənir. Access default: `15m`.

🔒 = JWT tələb olunur (cookie və ya Bearer). Rəllər `@Roles` və ya service-layer yoxlaması ilə tətbiq olunur.

---

## Auth

### POST /auth/register

Yeni istifadəçi. `role`: `CUSTOMER` | `PROVIDER` (`ADMIN` qeydiyyatı qadağandır).
**Məhsul qərarı:** rol qeydiyyatda seçilir və dəyişmir; `CUSTOMER` → `PROVIDER` upgrade endpoint-i yoxdur (ayrı hesab lazımdır).
Qeydiyyatdan sonra e-poçt təsdiq kodu göndərilir (`isVerified: false` qalır — soft verify; girişə mane olmur).
Opsional `captchaToken` — `TURNSTILE_SECRET_KEY` setdirsə məcburidir.

**Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass1",
  "firstName": "Əli",
  "lastName": "Məmmədov",
  "phone": "+994501234567",
  "role": "CUSTOMER",
  "captchaToken": "…"
}
```

**Response:** `201/200` — `{ user }` (+ opsional `mailDelivered` / `previewCode` DEV). Token-lər `Set-Cookie`.

### POST /auth/login

**Body:** `{ "email", "password", "clientApp": "marketplace"|"admin", "captchaToken?" }`

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

### GET /users/me/dashboard-stats 🔒 PROVIDER

Kabinet statistikası: `activeServices`, `totalServices`, `pendingBookings`, `completedBookings`, `rating`, `reviewCount`.

### PATCH /users/me 🔒

Profil yeniləmə (ad, telefon, avatar; provider: `bio`, `location`, `experience`).

### PATCH /users/me/password 🔒

Şifrə dəyişimi.

### POST /users/me/heartbeat 🔒

Onlayn presence (`lastSeenAt`); throttled. `ProviderAvailability` domain field-indən ayrıdır (bax: `/geo/me/availability`).

### POST /users/me/email/request-change 🔒

Yeni e-poçt üçün kod (SMTP varsa mail; yoxdursa dev log).

### POST /users/me/email/confirm-change 🔒

Kod ilə e-poçt təsdiqi.

### POST /users/me/phone/request-verify 🔒

Telefon OTP (SMS; `SMS_PROVIDER=noop` olduqda `previewCode`).

### POST /users/me/phone/confirm-verify 🔒

Kod ilə `phoneVerifiedAt` təsdiqi.

### GET /users/me/export 🔒

Şəxsi məlumatların JSON ixracı (profil, sifarişlər, bildirişlər, maskalanmış device token-lər).

### DELETE /users/me 🔒

Hesab soft-delete (şifrə + `SIL` təsdiqi).

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

Yeni xidmət. Qiymət, kateqoriya, təsvir, şəkillər (**http(s) URL** — `POST /uploads`), `serviceVenue`, (yükdaşıma) `vehicleLength` / `vehicleWidth` / `vehicleHeight`, `cargoRouteScope`. E-poçt təsdiqi məcburidir. `ACTIVE` birbaşa təyin olunmur — `POST /services/:id/submit-review` ilə `PENDING_REVIEW`; admin təsdiqindən sonra görünür.

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

Sifarişlər siyahısı (rol üzrə filtr). Query: `page`, `limit`, `status`.

### GET /bookings/:id 🔒

Sifariş detalları — yalnız iştirakçı və ya ADMIN.

### POST /bookings 🔒 CUSTOMER (+ email verified)

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

Header: `Idempotency-Key` (opsional, tövsiyə — double-submit / INSTANT təkrarını eyni sifarişə bağlayır).

Slot `availability` ilə yoxlanır (transaction + `pg_advisory_xact_lock`) — **yalnız SCHEDULED**. E-poçt təsdiqi + təsdiqlənmiş provider tələb olunur. Opsional `type`: `SCHEDULED` (default) | `INSTANT`.

**INSTANT:** `destLat`/`destLng` məcburi; `scheduledAt` opsional (server ~15 dəq ofset); slot lock yoxdur; create sonrası `dispatch` yaxın ONLINE provider-lərə sequential offer göndərir.

Opsional geo (SCHEDULED): `destLat`/`destLng`, `originLat`/`originLng` (cüt göndərilməlidir; ünvan string qalır).

### Dispatch (Faza 4) 🔒 PROVIDER / ADMIN

| Method | Path | İzah |
|--------|------|------|
| GET | `/dispatch/offers/pending` | Provider: aktiv PENDING təkliflər |
| POST | `/dispatch/offers/:id/accept` | Qəbul → booking CONFIRMED (race-safe) |
| POST | `/dispatch/offers/:id/reject` | Rədd → növbəti namizəd |
| GET | `/dispatch/offers?bookingId=` | Admin: sifariş üzrə bütün təkliflər |

Env: `DISPATCH_RADIUS_M` (default 15000), `DISPATCH_OFFER_TIMEOUT_SEC` (default 30), `REDIS_URL` (BullMQ; yoxdursa dev setTimeout).

### PATCH /bookings/:id/status 🔒

**Body:** `{ "status": "EN_ROUTE" }` (ləğv üçün `cancelReason` məcburi)

**Statuslar:** `PENDING`, `CONFIRMED`, `EN_ROUTE`, `ARRIVED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`, `REJECTED`

İcazəli keçidlər (qısaca; mənbə: shared `booking-lifecycle`):
- Provider: `PENDING→CONFIRMED|REJECTED`, `CONFIRMED→EN_ROUTE|CANCELLED`, `EN_ROUTE→ARRIVED|CANCELLED`, `ARRIVED→IN_PROGRESS|CANCELLED`, `IN_PROGRESS→COMPLETED`
- Customer: `PENDING|CONFIRMED|EN_ROUTE|ARRIVED→CANCELLED`
- Admin: bypass

Lifecycle timestamp-lər: `acceptedAt`, `enRouteAt`, `arrivedAt`, `startedAt`, `completedAt`, `cancelledAt`.

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

> Mesajlar üçün WS hələ yox — frontend polling; sifariş tracking üçün Socket.IO (aşağıya bax).

---

## Geo (Faza 2)

Geocoder: `GEOCODER_PROVIDER=mock` (default) və ya `nominatim` (`GEOCODER_BASE_URL`, `GEOCODER_USER_AGENT`). Hardcoded API key yoxdur.

### GET /geo/geocode

**Query:** `q` (min 2 simvol). Ünvan → koordinat siyahısı.

### GET /geo/reverse

**Query:** `lat`, `lng`. Koordinat → ünvan.

### GET /geo/nearby

**Query:** `lat`, `lng`, `radiusKm` (default 10, max 100), `categoryId?`, `limit?` (max 50).

Yalnız `ONLINE` + aktiv xidməti olan providerlər. Cavab: `{ items, engine: "postgis" | "haversine" }`.
Web UI: `/services` səhifəsində «Yaxınımdakı xidmət verənlər» (`NearbyProvidersSection`).

### POST /geo/me/location 🔒 PROVIDER

**Body:** `{ "lat", "lng", "heading?", "availability?" }` — mövqe + opsional əlçatanlıq; PostGIS `last_location` sinxron.

### PATCH /geo/me/availability 🔒 PROVIDER

**Body:** `{ "availability": "ONLINE" | "OFFLINE" | "BUSY" }`.

---

## Realtime & Tracking (Faza 3)

Socket.IO eyni API prosesində (`http://localhost:4000/socket.io`). CORS: `CORS_ORIGIN` / app URL-lər. Redis adapter: `REDIS_URL` (yoxdursa in-memory).

### GET /realtime/socket-token 🔒

httpOnly cookie (və ya Bearer) access JWT-ni WS `auth.token` üçün qaytarır.

**Response:** `{ "token": "<jwt>" }`

### GET /bookings/:id/location-pings 🔒

İştirakçı (customer/provider) və ya admin. Sampling tarixçəsi (`LocationPing`).

**Query:** `limit` (default 100, max 500).

### Socket.IO event-lər

| İstiqamət | Event | Qeyd |
|-----------|-------|------|
| C→S | `booking:subscribe` / `booking:unsubscribe` | `{ bookingId }` — server room auth |
| C→S | `location:push` | Provider; status `EN_ROUTE`/`ARRIVED`/`IN_PROGRESS`; ~3s throttle |
| S→C | `location:update` | `booking:{id}` otağı + ETA |
| S→C | `booking:status` | Status dəyişəndə |
| S→C | `notification:new` | Opsional `user:{id}` |

Env: `NEXT_PUBLIC_WS_URL`, `NEXT_PUBLIC_MAPBOX_TOKEN`, `MAPBOX_ACCESS_TOKEN` (Directions; boş = haversine ETA).

---

## Notifications

### GET /notifications 🔒

Yalnız admin/platforma elanları (`ADMIN_ANNOUNCEMENT`). Sifariş və mesaj bildirişləri bu siyahıda yoxdur.

### GET /notifications/unread-count 🔒

Admin/platforma tipləri (zəng ikonu + Bildirişlər səhifəsi).

### GET /notifications/booking-unread-count 🔒

Sifariş hadisələri (nav badge — inbox-dan ayrı).

### PATCH /notifications/:id/read 🔒

### POST /notifications/read-all 🔒

Yalnız admin inbox bildirişlərini oxundu edir.

### POST /notifications/booking-read-all 🔒

> Booking/reschedule axınları DB-yə yazır. Admin platforma bildirişi: `POST /admin/announcements`.
> **Kanal qaydası:** zəng / `/notifications` = yalnız `ADMIN_*`; sifariş = booking badge; mesaj = söhbət; rəy = review badge.
> Emit olunanlar: `BOOKING_CREATED`, `BOOKING_CONFIRMED`, `BOOKING_REJECTED`, `BOOKING_CANCELLED`, `BOOKING_IN_PROGRESS`, `BOOKING_COMPLETED`, `BOOKING_RESCHEDULE_PROPOSED`, `BOOKING_RESCHEDULE_REJECTED` (tarix təklifi rədd — sifariş PENDING qalır), `REVIEW_RECEIVED`, `MESSAGE_RECEIVED` (söhbət üzrə dedupe), `ADMIN_ANNOUNCEMENT`. Admin `CONFIRMED`/`REJECTED` keçidləri də müştəriyə in-app bildiriş göndərir.
> Review unread: `GET/POST …/review-unread-count` / `review-read-all`.
> In-app create-dən sonra best-effort **push** (DeviceToken + FCM/noop). Kritik statuslar üçün **SMS** yalnız `SMS_STATUS_ENABLED=true` və `user.phone` olduqda.

---

## Devices (Faza 5)

### GET /devices/tokens 🔒

Qeydiyyatlı cihaz tokenləri (maskalanmış preview).

### POST /devices/tokens 🔒

Body: `{ token, platform: WEB|ANDROID|IOS }`. Upsert (eyni token → user/platform yenilənir).

### DELETE /devices/tokens 🔒

Body: `{ token }`.

---

## Payments (Faza 5 — flag-gated)

> **`PAYMENTS_ENABLED=true` olmadıqda** bütün `/payments/*` → **501** `"Ödəniş hələ aktiv deyil"`. Booking axını ödəniş tələb etmir. `NEXT_PUBLIC_PAYMENTS_ENABLED` default `false` — checkout UI yoxdur.

### POST /payments/intents 🔒 CUSTOMER

Intent yarat. **`bookingId` məcburi**; məbləğ serverdə `booking.totalPrice`-dan götürülür (`amount` göndərilsə uyğun olmalıdır). Header: `Idempotency-Key` (opsional). Body: `{ bookingId, amount?, currency?, idempotencyKey? }`.

### GET /payments/:id 🔒 CUSTOMER | PROVIDER | ADMIN

Yalnız sifariş iştirakçısı / admin. `bookingId=null` orphan ödəniş əlçatan deyil.

### POST /payments/:id/authorize 🔒 CUSTOMER

### POST /payments/:id/capture 🔒 CUSTOMER

### POST /payments/:id/refund 🔒 ADMIN

Provider: `PAYMENT_PROVIDER=noop|stripe` (stripe = skeleton, real charge / webhook hələ yox).

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

Body: `{ "isVerified": boolean }`. Təsdiq ləğvində aktiv xidmətlər `PAUSED`, əlçatanlıq `OFFLINE` olur və xidmət verənə bildiriş göndərilir.

### GET /admin/categories

Bütün kateqoriyalar (aktiv + deaktiv).

### POST /admin/categories

### PATCH /admin/categories/:id

### GET /admin/services

Query: `page`, `limit`, `status`, `categoryId`, `search`.

### PATCH /admin/services/:id/status

Body: `{ "status": "ACTIVE" | "PAUSED" | "ARCHIVED" | … }`. `ACTIVE` → `approveService` ilə eyni (profil təsdiqi tələb olunur).

### PATCH /admin/services/:id/approve

Yoxlamada olan xidməti təsdiqləyir (`ACTIVE`), xidmət verənə bildiriş göndərir.

### PATCH /admin/services/:id/request-revision

Body: `{ "note": string }` (min 5). Status → `NEEDS_REVISION`; qeyd xidmət verənə görünür.

### POST /services/:id/submit-review

Xidmət verən: `DRAFT` / `NEEDS_REVISION` → `PENDING_REVIEW`. Hesab təsdiqi məcburidir.

### GET /admin/bookings

### GET /admin/reviews

Query: `status` (`PENDING`|`APPROVED`|`REJECTED`).

### PATCH /admin/reviews/:id/status

Body: `{ "status": "APPROVED"|"REJECTED" }` — reytinq aggregate yenilənir.

### GET /admin/reports

Query: `status` (`PENDING`|`RESOLVED`|`DISMISSED`).

### PATCH /admin/reports/:id/status

Body: `{ "status": "RESOLVED"|"DISMISSED", "adminNote?" }` — şikayəti bağlayır.

### POST /admin/announcements

Body: `{ "title", "body", "roles?": ["CUSTOMER"|"PROVIDER"] }` — boş `roles` = bütün aktiv istifadəçilər.

---

## Reports (şikayət)

### POST /reports 🔒

İstifadəçi şikayəti. E-poçt təsdiqi məcburi. Throttle: 5/dəq.

**Body:**
```json
{
  "targetType": "BOOKING"|"SERVICE"|"USER"|"MESSAGE"|"OTHER",
  "targetId": "uuid (OTHER üçün opsional)",
  "reason": "SPAM"|"FRAUD"|"ABUSE"|"INAPPROPRIATE"|"NO_SHOW"|"OTHER",
  "description": "Ən azı 10 simvol"
}
```

**Response:** `201` — `ReportSummary`. Admin inbox-a best-effort e-poçt.

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

### GET /health/ready

DB + Redis readiness. `REDIS_URL` varsa Redis ping; production-da `REDIS_URL` yoxdursa **503** (`redis: "missing"`). Dev-də Redis olmadan `redis: "not_configured"` ilə ok ola bilər.

---

## Metrics

### GET /metrics 🌐

Prometheus exposition format (`text/plain; version=0.0.4` / OpenMetrics). Prefix: global `/api/v1` → tam yol **`GET /api/v1/metrics`**.

- **Auth:** Development-də `METRICS_TOKEN` boşdursa açıq. **Production-da token məcburidir** (`Authorization: Bearer <token>`). Prometheus scrape üçün `ops/prometheus/prometheus.yml` nümunəsinə baxın.
- **Throttle:** skip (`@SkipThrottle`) — scrape rate-limit-ə düşməsin.
- **Cardinality:** HTTP route label-ləri parametrləri normalize edir (`/bookings/:id`, UUID yox).
- Nümunə seriyalar: `xidmetal_http_request_duration_seconds`, `xidmetal_bookings_created_total{type}`, `xidmetal_dispatch_offers_total{result}`, `xidmetal_ws_connections`, `xidmetal_payments_intents_total`, default process (`xidmetal_process_*`).

```bash
curl -s http://localhost:4000/api/v1/metrics | head
# Production:
# curl -s -H "Authorization: Bearer $METRICS_TOKEN" http://localhost:4000/api/v1/metrics
```

---

## Contact

### POST /contact 🌐

Public əlaqə formu. Body: `name`, `email`, `phone?`, `subject`, `message`, `captchaToken?`, `website?` (honeypot).
Throttle: 5/dəq. `TURNSTILE_SECRET_KEY` setdirsə captcha məcburidir. Mesaj `CONTACT_INBOX_EMAIL` (və ya `SMTP_FROM`) ünvanına göndərilir.

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
