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
2. Eyni xidmət növü (kateqoriya + başlıq) + şəhər + ONLINE + verified
3. Sıralama: məsafə ASC (mövqe varsa), rating DESC
4. Bütün uyğun namizədlərə fan-out DispatchOffer (PENDING) — tək təklif timeout YOX
   expiresAt = booking.createdAt + DISPATCH_SEARCH_WINDOW_SEC
5. Accept (race-safe): booking CONFIRMED + providerId/serviceId yenilənir,
   digər PENDING → CANCELLED, provider BUSY
6. Reject → digər namizədlər gözləməyə davam edir; imtina edən xidmət verənə
   `DISPATCH_DECLINE_REOFFER_COOLDOWN_SEC` (default 2 dəq) sonra yenidən təklif
   (axtarış pəncərəsi açıq qaldıqca və sifariş qəbul olunmayana qədər təkrarlanır).
   Rediscovery yeni ONLINE tutur.
6b. Müştəri CONFIRMED-də (iş başlamazdan əvvəl) «Başqa xidmət verən axtar»:
   qəbul etmiş icraçı SKIPPED, sifariş yenidən PENDING, axtarış pəncərəsi yenilənir,
   digər onlayn namizədlərə yenidən təklif. Limit: `DISPATCH.MAX_CUSTOMER_PROVIDER_SKIPS`.
7. Axtarış pəncərəsi bitib + hələ PENDING → auto-CANCELLED + müştəri bildirişi
```

**SCHEDULED toxunulmur:** advisory lock + `assertSlotIsFree` yalnız SCHEDULED create/reschedule-də.

**INSTANT əl ilə PENDING→CONFIRMED:** bloklanıb — yalnız `POST /dispatch/offers/:id/accept`.

---

## 6. Hadisə yayımı (side effects)

Hər status dəyişikliyi:
1. DB update (transaction daxilində timestamp + status).
2. In-app notification + push/WS.
3. Müştəriyə best-effort e-poçt yalnız **təsdiq** (`CONFIRMED` — SCHEDULED status + INSTANT offer accept) və **tamamlanma** (`COMPLETED`) zamanı.
4. Ləğv (`CANCELLED`) — qarşı tərəfə best-effort e-poçt (mövcud axın).
5. Ödəniş — məhsul qərarı / Phase 5.

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

## 8b. Mesaj qapısı

Sifarişə bağlı söhbət (`POST /messages/conversations` + `bookingId`) yalnız **xidmət verən qəbul etdikdən sonra, tamamlanana qədər** açıqdır — təcili (`INSTANT`) və rezervasiya (`SCHEDULED`) eyni qayda:

| Status | Mesaj |
|--------|-------|
| `PENDING` (axtarış / təsdiq gözlənilir) | ✗ |
| `CONFIRMED` / `EN_ROUTE` / `ARRIVED` / `IN_PROGRESS` | ✓ |
| `COMPLETED` / `CANCELLED` / `REJECTED` | ✗ |

Mənbə: `packages/shared` `isBookingMessagingEnabled`. UI «Mesaj yaz» düyməsi `PENDING`-də görünür, amma deaktivdir; `COMPLETED`-də gizlidir.

Tarix təklifi (`reschedule`) PENDING-də sistem mesajı yaza bilər; müştəri söhbəti «Mesaj yaz» ilə aça bilməz.

## 8c. Qiymət görünürlüyü

Sifariş qiyməti **xidmət verən tərəfdə göstərilmir**. Müştəridə yalnız xidmət verən qəbul etdikdən sonra görünür (`isBookingPriceVisibleToCustomer`).

| Tərəf / status | Qiymət |
|----------------|--------|
| Xidmət verən (bütün statuslar, o cümlədən dispatch təklifi) | ✗ |
| Müştəri `PENDING` / `REJECTED` / qəbuldan əvvəl `CANCELLED` | ✗ |
| Müştəri `CONFIRMED`+ (və ya `acceptedAt` dolu) | ✓ |

---

## 9. Tətbiq qeydləri

- State machine `packages/shared` + `bookings.service.ts`.
- Slot bloklayan statuslar: `ACTIVE_BOOKING_STATUSES` (EN_ROUTE/ARRIVED daxil).
- Bütün error mesajları Azərbaycan dilində.
