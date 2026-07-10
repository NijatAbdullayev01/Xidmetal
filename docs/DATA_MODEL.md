# Data Model — Tələb Olunan Dəyişikliklər

Bu sənəd on-demand + canlı izləmə axını üçün `packages/database/prisma/schema.prisma`-da lazım olan **additive** dəyişiklikləri təsvir edir.

> **Qayda:** Mövcud sahələr silinmir/dəyişdirilmir. Yeni sahələr optional (`?`) və ya default dəyərlə əlavə olunur ki, köhnə data və kod sınmasın. Bax: [.cursor/rules/safe-changes.mdc].

---

## 1. PostGIS extension

```sql
-- migration (raw SQL)
CREATE EXTENSION IF NOT EXISTS postgis;
```

Prisma PostGIS tiplərini native dəstəkləmir, ona görə `Unsupported(...)` + `$queryRaw` istifadə olunur.

---

## 2. Provider — mövqe & əlçatanlıq

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

  // PostGIS (raw SQL ilə idarə olunur):
  // lastLocation  Unsupported("geography(Point, 4326)")?

  @@index([availability])
}
```

> `lastLat/lastLng` sürətli oxu üçün; `geography(Point)` isə `ST_DWithin` yaxınlıq sorğuları üçün. İkisi sinxron saxlanılır.

---

## 3. Booking — geo, tip və zaman xətti

`Booking`-ə əlavə:

```prisma
enum BookingType {
  INSTANT     // indi çağır
  SCHEDULED   // planlaşdırılmış
}

model Booking {
  // ... mövcud sahələr ...

  type           BookingType @default(SCHEDULED)

  // Geolokasiya (xidmətin göstəriləcəyi ünvan)
  destLat        Float?      @map("dest_lat")
  destLng        Float?      @map("dest_lng")

  // Zaman xətti (audit + UI üçün)
  acceptedAt     DateTime?   @map("accepted_at")
  enRouteAt      DateTime?   @map("en_route_at")
  arrivedAt      DateTime?   @map("arrived_at")
  startedAt      DateTime?   @map("started_at")
  completedAt    DateTime?   @map("completed_at")
  cancelledAt    DateTime?   @map("cancelled_at")
  cancelReason   String?     @map("cancel_reason")
  cancelledBy    String?     @map("cancelled_by")   // userId

  locationPings  LocationPing[]
  payment        Payment?
}
```

> `scheduledAt` `SCHEDULED` üçün optional olmalıdır (`INSTANT`-da lazım deyil). Bu breaking olmasın deyə migration-da mövcud sətirlər üçün default verilir.

---

## 4. LocationPing — marşrut tarixçəsi

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

## 5. Dispatch — təklif izləmə

```prisma
enum DispatchOfferStatus {
  PENDING
  ACCEPTED
  REJECTED
  EXPIRED
}

model DispatchOffer {
  id         String              @id @default(uuid())
  bookingId  String              @map("booking_id")
  providerId String              @map("provider_id")
  status     DispatchOfferStatus @default(PENDING)
  distanceM  Float?              @map("distance_m")
  expiresAt  DateTime            @map("expires_at")
  createdAt  DateTime            @default(now()) @map("created_at")
  respondedAt DateTime?          @map("responded_at")

  @@index([bookingId])
  @@index([providerId, status])
  @@map("dispatch_offers")
}
```

---

## 6. Payment — ödəniş

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
  bookingId      String        @unique @map("booking_id")
  amount         Decimal       @db.Decimal(10, 2)
  commission     Decimal       @db.Decimal(10, 2) @default(0)
  currency       String        @default("AZN")
  status         PaymentStatus @default(REQUIRES_PAYMENT)
  provider       String        // "stripe" | "local_psp"
  externalId     String?       @map("external_id")
  idempotencyKey String?       @unique @map("idempotency_key")
  createdAt      DateTime      @default(now()) @map("created_at")
  updatedAt      DateTime      @updatedAt @map("updated_at")

  booking Booking @relation(fields: [bookingId], references: [id])

  @@map("payments")
}
```

---

## 7. Push cihaz token-ləri

`User`-ə əlaqəli:

```prisma
model DeviceToken {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  token     String   @unique
  platform  String   // "web" | "ios" | "android"
  createdAt DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("device_tokens")
}
```

---

## 8. Mövcud modellər — implement olunmalı

`Review` və `Notification` modelləri artıq schema-dadır, amma **backend modulları yoxdur**. Yaradılmalı:
- `reviews` modulu — yalnız `COMPLETED` booking-ə rəy; yazıldıqda `ProviderProfile.rating`/`reviewCount` transaction ilə yenilənir.
- `notifications` modulu — CRUD + oxundu/oxunmadı + WS/push yayımı.

---

## 9. Migration qaydaları

1. Dəyişikliklər **additive** olsun (`?` və ya `@default`).
2. `pnpm db:generate` → Prisma client yenilə.
3. Development: `pnpm db:push`; **Production: `prisma migrate deploy`** (məlumat itkisi riskini yoxla).
4. PostGIS və index-lər üçün raw SQL migration.
5. Migration-dan sonra `packages/shared` enum/tiplərini sinxronlaşdır (`BookingType`, `PaymentStatus`, `ProviderAvailability`).

---

## 10. Yekun ER (hədəf)

```
User ──┬── ProviderProfile (availability, location)
       ├── Service
       ├── Booking (customer/provider) ──┬── LocationPing
       │                                 ├── Payment
       │                                 └── Review
       ├── DeviceToken
       └── Notification

Booking ── DispatchOffer (INSTANT axını)
```
