# Data Model — Tələb Olunan Dəyişikliklər

Bu sənəd on-demand + canlı izləmə axını üçün `packages/database/prisma/schema.prisma`-da lazım olan **additive** dəyişiklikləri təsvir edir.

> **Cari schema (2026-08 Faza 5):** User, Service, Booking, Review, Message, Notification, ProviderProfile (geo), DispatchOffer, LocationPing, **Payment**, **DeviceToken**, **IdempotencyRecord**.

> **Qayda:** Mövcud sahələr silinmir/dəyişdirilmir. Yeni sahələr optional (`?`) və ya default dəyərlə əlavə olunur ki, köhnə data və kod sınmasın. Bax: [.cursor/rules/safe-changes.mdc].

---

## 1. PostGIS extension — ✅ (Faza 2)

```sql
-- migration: 20260807160000_geospatial_postgis
CREATE EXTENSION IF NOT EXISTS postgis;
```

Prisma PostGIS tiplərini native dəstəkləmir, ona görə `Unsupported("geography(Point,4326)")` + `$queryRaw` / `$executeRaw` istifadə olunur. `lastLat`/`lastLng` Prisma oxusu üçün; `last_location` `ST_DWithin` üçün — geo service sinxron saxlayır. PostGIS yoxdursa yaxınlıq **haversine** fallback.

Local Docker: `postgis/postgis:16-3.5` (`docker-compose.yml`). Köhnə `postgres:16-alpine` volume-dan keçid üçün: `docker compose down -v && docker compose up -d`.

---

## 2. Provider — mövqe & əlçatanlıq — ✅ (Faza 2)

`ProviderProfile`-a əlavə (canlı izləmə və dispatch üçün):

```prisma
enum ProviderAvailability {
  OFFLINE
  ONLINE
  BUSY
}

model ProviderProfile {
  // ... mövcud sahələr ...

  availability       ProviderAvailability @default(OFFLINE)
  lastLat            Float?               @map("last_lat")
  lastLng            Float?               @map("last_lng")
  lastHeading        Float?               @map("last_heading")   // 0-360°
  locationUpdatedAt  DateTime?            @map("location_updated_at")

  // PostGIS (raw SQL ilə idarə olunur) — schema-da Unsupported:
  lastLocation  Unsupported("geography(Point, 4326)")? @map("last_location")

  @@index([availability])
}
```

> `lastLat/lastLng` sürətli oxu üçün; `geography(Point)` isə `ST_DWithin` yaxınlıq sorğuları üçün. İkisi sinxron saxlanılır.
> **Qeyd:** `ProviderAvailability` ≠ `User.lastSeenAt` (presence heartbeat). Presence: WS connect yeniləyir `lastSeenAt`; son WS disconnect ONLINE→OFFLINE (BUSY saxlanılır).

---

## 3. Booking — geo, tip və zaman xətti — ✅ (Faza 1–2)

`Booking`-ə əlavə:

```prisma
enum BookingType {
  INSTANT     // indi çağır
  SCHEDULED   // planlaşdırılmış
}

model Booking {
  // ... mövcud sahələr ...

  type           BookingType @default(SCHEDULED)

  // Geolokasiya (xidmətin göstəriləcəyi ünvan + opsional mənşə)
  destLat        Float?      @map("dest_lat")
  destLng        Float?      @map("dest_lng")
  originLat      Float?      @map("origin_lat")
  originLng      Float?      @map("origin_lng")

  // Zaman xətti (audit + UI üçün) — ✅ Faza 1
  acceptedAt     DateTime?   @map("accepted_at")
  enRouteAt      DateTime?   @map("en_route_at")
  arrivedAt      DateTime?   @map("arrived_at")
  startedAt      DateTime?   @map("started_at")
  completedAt    DateTime?   @map("completed_at")
  cancelledAt    DateTime?   @map("cancelled_at")
  cancelReason   String?     @map("cancel_reason")
  cancelledBy    String?     @map("cancelled_by")   // userId

  // Hədəf (Phase 3–5):
  locationPings  LocationPing[]
  payment        Payment?
}
```

> `scheduledAt` `SCHEDULED` üçün məcburidir; `INSTANT`-da server ofset təyin edir (slot lock yox). Ünvan string (`address`) qalır; INSTANT üçün `destLat`/`destLng` məcburidir.

---

## 4. LocationPing — marşrut tarixçəsi — ✅ Phase 3

Canlı izləmə əsasən WS-dən keçir, amma audit/marşrut yenidən oynatma üçün seçilmiş nöqtələr saxlanılır:

```prisma
model LocationPing {
  id         String   @id @default(uuid())
  bookingId  String   @map("booking_id")
  lat        Float
  lng        Float
  heading    Float?
  speed      Float?
  recordedAt DateTime @default(now()) @map("recorded_at")

  booking Booking @relation(fields: [bookingId], references: [id], onDelete: Cascade)

  @@index([bookingId, recordedAt])
  @@map("location_pings")
}
```

---

## 5. Dispatch — təklif izləmə — ✅ Faza 4

```prisma
enum DispatchOfferStatus {
  PENDING
  ACCEPTED
  REJECTED
  EXPIRED
  CANCELLED
}

model DispatchOffer {
  id          String              @id @default(uuid())
  bookingId   String              @map("booking_id")
  providerId  String              @map("provider_id")
  status      DispatchOfferStatus @default(PENDING)
  distanceM   Float?              @map("distance_m")
  score       Float?
  expiresAt   DateTime            @map("expires_at")
  createdAt   DateTime            @default(now()) @map("created_at")
  respondedAt DateTime?           @map("responded_at")

  @@index([bookingId])
  @@index([providerId, status])
  @@index([status, expiresAt])
  @@map("dispatch_offers")
}
```

Migration: `20260807180000_dispatch_offers`.

---

## 6. Payment — ödəniş — ✅ Faza 5 (flag OFF)

> **Məhsul:** Marketplace axını ödənişsizdir. `PAYMENTS_ENABLED=true` olmadıqda API 501; booking PaymentIntent tələb etmir.

```prisma
enum PaymentStatus {
  REQUIRES_PAYMENT
  AUTHORIZED   // hold
  CAPTURED     // tutuldu
  REFUNDED
  FAILED
}

model Payment {
  id             String        @id @default(uuid())
  bookingId      String?       @unique @map("booking_id")
  amount         Decimal       @db.Decimal(10, 2)
  commission     Decimal       @db.Decimal(10, 2) @default(0)
  currency       String        @default("AZN")
  status         PaymentStatus @default(REQUIRES_PAYMENT)
  provider       String        // "noop" | "stripe" | "local_psp"
  externalId     String?       @map("external_id")
  idempotencyKey String?       @unique @map("idempotency_key")
  createdAt      DateTime      @default(now()) @map("created_at")
  updatedAt      DateTime      @updatedAt @map("updated_at")

  booking Booking? @relation(fields: [bookingId], references: [id], onDelete: SetNull)

  @@map("payments")
}
```

Migration: `20260807190000_payments_device_tokens_idempotency`.

---

## 7. Push cihaz token-ləri — ✅ Faza 5

`User`-ə əlaqəli:

```prisma
enum DevicePlatform {
  WEB
  ANDROID
  IOS
}

model DeviceToken {
  id        String         @id @default(uuid())
  userId    String         @map("user_id")
  token     String         @unique
  platform  DevicePlatform
  createdAt DateTime       @default(now()) @map("created_at")
  updatedAt DateTime       @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("device_tokens")
}
```

### IdempotencyRecord (ümumi)

```prisma
model IdempotencyRecord {
  id           String   @id @default(uuid())
  key          String
  userId       String   @map("user_id")
  route        String
  statusCode   Int      @map("status_code")
  responseBody Json?    @map("response_body")
  responseHash String?  @map("response_hash")
  createdAt    DateTime @default(now()) @map("created_at")
  expiresAt    DateTime @map("expires_at")

  @@unique([key, userId, route])
  @@index([expiresAt])
  @@map("idempotency_records")
}
```

> TTL cleanup: saatlıq job `IdempotencyService` daxilində (`expiresAt < now`).

---

## 8. Mövcud modellər

`Review`, `Notification`, `Payment`, `DeviceToken` schema + backend modulları mövcuddur.
- `notifications` — in-app + best-effort push/SMS kanalları.
- `payments` — flag-gated scaffolding.
- `devices` — DeviceToken register/unregister.

---

## 9. Migration qaydaları

1. Dəyişikliklər **additive** olsun (`?` və ya `@default`).
2. `pnpm db:generate` → Prisma client yenilə.
3. Development: `pnpm db:push`; **Production: `prisma migrate deploy`** (məlumat itkisi riskini yoxla).
4. PostGIS və index-lər üçün raw SQL migration.
5. Migration-dan sonra `packages/shared` enum/tiplərini sinxronlaşdır (`BookingType`, `PaymentStatus`, `ProviderAvailability`, `DevicePlatform`).

---

## 10. Yekun ER (hədəf)

```
User ──┬── ProviderProfile (availability, location)
       ├── Service
       ├── Booking (customer/provider) ──┬── LocationPing
       │                                 ├── Payment?
       │                                 └── Review
       ├── DeviceToken
       └── Notification

Booking ── DispatchOffer (INSTANT axını)
```
