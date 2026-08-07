# Sifariş Həyat Dövrü & State Machine

Bu sənəd sifarişin **rezervdən rəyə** qədər keçdiyi tam axını və status keçidləri qaydalarını müəyyən edir.

> **Cari kod (2026-08):** `EN_ROUTE` / `ARRIVED`, `BookingType`, lifecycle timestamp-lər, on-demand **avto-dispatch** (INSTANT → `DispatchOffer` + BullMQ timeout) schema + API/UI-də mövcuddur. Canlı xəritə Phase 3.

---

## 1. Uçtan-uca axın

```
Müştəri                    Sistem / Dispatch            Provider
  │                                                        │
  ├─ sifariş yarat (INSTANT/SCHEDULED) ─► PENDING          │
  │                                                        │
  │            ┌── INSTANT: dispatch ── offer ──►──────────┤ qəbul et  (Phase 4)
  │            │                                           │
  │◄─ təsdiq   └────────────────────► CONFIRMED ◄──────────┤
  │                                                        │
  │◄─ "provider yoldadır"             ◄─ EN_ROUTE ◄────────┤ yola çıx
  │                                                        │
  │◄─ "provider gəldi" ◄─────────────── ARRIVED ◄──────────┤ gəldim
  │                                                        │
  │◄─ iş başladı ◄───────────────────── IN_PROGRESS ◄──────┤ başla
  │                                                        │
  │◄─ iş bitdi ◄─────────────────────── COMPLETED ◄────────┤ bitir
  │                                                        │
  ├─ rəy ver ─► Review                                     │
```

---

## 2. Statuslar

| Status | İzah |
|--------|------|
| `PENDING` | Yaradıldı, təsdiq/dispatch gözləyir |
| `CONFIRMED` | Provider qəbul etdi |
| `EN_ROUTE` | Provider yola çıxdı (canlı izləmə Phase 3) |
| `ARRIVED` | Provider ünvana çatdı |
| `IN_PROGRESS` | İş gedir |
| `COMPLETED` | İş bitdi |
| `CANCELLED` | Ləğv edildi (müştəri/provider/admin) |
| `REJECTED` | Provider rədd etdi |

`BookingType`: `SCHEDULED` (default) | `INSTANT` (avto-dispatch).

---

## 3. İcazə verilən keçidlər (state machine)

Mənbə: `packages/shared/src/booking-lifecycle.ts` (`isBookingTransitionAllowed`).

```
PENDING    → CONFIRMED (provider) | REJECTED (provider) | CANCELLED (müştəri)
CONFIRMED  → EN_ROUTE (provider)  | CANCELLED (müştəri/provider)
EN_ROUTE   → ARRIVED (provider)   | CANCELLED (müştəri/provider)
ARRIVED    → IN_PROGRESS (provider) | CANCELLED
IN_PROGRESS→ COMPLETED (provider)
COMPLETED  → (son — dəyişməz)
CANCELLED  → (son)
REJECTED   → (son)
```

> Provider üçün `CONFIRMED → IN_PROGRESS` **birbaşa yoxdur** — `EN_ROUTE` → `ARRIVED` vasitəsilə.

### Rol matrisi

| Keçid | CUSTOMER | PROVIDER | ADMIN |
|-------|:--------:|:--------:|:-----:|
| PENDING → CONFIRMED | ✗ | ✓ | ✓ |
| PENDING → REJECTED | ✗ | ✓ | ✓ |
| CONFIRMED → EN_ROUTE | ✗ | ✓ | ✓ |
| EN_ROUTE → ARRIVED | ✗ | ✓ | ✓ |
| ARRIVED → IN_PROGRESS | ✗ | ✓ | ✓ |
| IN_PROGRESS → COMPLETED | ✗ | ✓ | ✓ |
| PENDING/CONFIRMED/EN_ROUTE/ARRIVED → CANCELLED | ✓ | ✓* | ✓ |

\* Provider `PENDING`-dən ləğv etmir (rədd `REJECTED`); `CONFIRMED`+ üçün ləğv edə bilər.

Admin API-də bypass (istənilən keçid).

---

## 4. Zaman xətti (timestamps)

Hər keçiddə müvafiq `Booking` sahəsi doldurulur:
`acceptedAt`, `enRouteAt`, `arrivedAt`, `startedAt`, `completedAt`, `cancelledAt`.

---

## 5. On-demand dispatch (INSTANT) — ✅ Faza 4

```
1. Booking (INSTANT) → PENDING (destLat/destLng məcburi; slot lock YOX)
   scheduledAt = now + DISPATCH_INSTANT_SCHEDULED_OFFSET_MIN (display window)
2. geo.findNearby: ST_DWithin + ONLINE + eyni category ACTIVE service
3. Sıralama: məsafə ASC, rating DESC (`rankDispatchCandidates`)
4. Bir anda bir DispatchOffer (PENDING) → provider:{id} `dispatch:offer`
5. BullMQ delayed job → expiresAt (default 30s) → EXPIRED → növbəti
6. Accept (race-safe updateMany): booking CONFIRMED + providerId/serviceId yenilənir,
   digər PENDING → CANCELLED, provider BUSY
7. Reject → növbəti namizəd
8. Namizəd yox / tükənib → auto-CANCELLED (cancelReason, cancelledBy=SYSTEM) + müştəri bildirişi
```

**SCHEDULED toxunulmur:** advisory lock + `assertSlotIsFree` yalnız SCHEDULED create/reschedule-də.

**INSTANT əl ilə PENDING→CONFIRMED:** bloklanıb — yalnız `POST /dispatch/offers/:id/accept`.

---

## 6. Hadisə yayımı (side effects)

Hər status dəyişikliyi:
1. DB update (transaction daxilində timestamp + status).
2. In-app notification (+ best-effort e-poçt).
3. WS yayımı — Phase 3.
4. Ödəniş — məhsul qərarı / Phase 5.

---

## 7. Ləğv

| Nə vaxt ləğv | Nəticə |
|--------------|--------|
| PENDING/CONFIRMED/EN_ROUTE/ARRIVED | `cancelReason` + `cancelledBy` məcburi |
| IN_PROGRESS | Provider/müştəri ləğv edə bilməz (yalnız admin bypass) |

---

## 8. Rəy (review) qapısı

- Rəy yalnız `COMPLETED` sifarişə yazıla bilər.
- Yalnız həmin sifarişin **müştərisi** rəy yaza bilər.
- Bir sifarişə bir rəy (`Review.bookingId @unique`).

---

## 9. Tətbiq qeydləri

- State machine `packages/shared` + `bookings.service.ts`.
- Slot bloklayan statuslar: `ACTIVE_BOOKING_STATUSES` (EN_ROUTE/ARRIVED daxil).
- Bütün error mesajları Azərbaycan dilində.
