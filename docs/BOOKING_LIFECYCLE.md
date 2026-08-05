# Sifariş Həyat Dövrü & State Machine

Bu sənəd sifarişin **rezervdən rəyə** qədər keçdiyi tam axını və status keçidləri qaydalarını müəyyən edir.

> **Cari kod (2026-08):** `bookings.service.ts` içində əsas rol matrisi var — müştəri `COMPLETED` edə bilmir; provider `PENDING→CONFIRMED|REJECTED`, `CONFIRMED→IN_PROGRESS|CANCELLED`, `IN_PROGRESS→COMPLETED`. Bu sənəd isə **hədəf** axını təyin edir (`EN_ROUTE` / `ARRIVED`, `BookingType`, timestamp-lər, dispatch) — onlar hələ schema/API-də yoxdur.

---

## 1. Uçtan-uca axın

```
Müştəri                    Sistem / Dispatch            Provider
  │                                                        │
  ├─ sifariş yarat (INSTANT/SCHEDULED) ─► PENDING          │
  │                                                        │
  │            ┌── INSTANT: dispatch ── offer ──►──────────┤ qəbul et
  │            │                                           │
  │◄─ təsdiq   └────────────────────► CONFIRMED ◄──────────┤
  │                                                        │
  │◄─ "provider yoldadır" (canlı xəritə) ◄─ EN_ROUTE ◄─────┤ yola çıx
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

Mövcud enum-a əlavə olunmalı statuslar **qalın** göstərilib:

| Status | İzah |
|--------|------|
| `PENDING` | Yaradıldı, təsdiq/dispatch gözləyir |
| `CONFIRMED` | Provider qəbul etdi |
| **`EN_ROUTE`** | Provider yola çıxdı (canlı izləmə başlayır) |
| **`ARRIVED`** | Provider ünvana çatdı |
| `IN_PROGRESS` | İş gedir |
| `COMPLETED` | İş bitdi |
| `CANCELLED` | Ləğv edildi (müştəri/provider) |
| `REJECTED` | Provider rədd etdi |

> `EN_ROUTE` və `ARRIVED` `BookingStatus` enum-una (schema + `packages/shared`) əlavə olunmalıdır. Additive dəyişiklikdir.

---

## 3. İcazə verilən keçidlər (state machine)

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

### Rol matrisi

| Keçid | CUSTOMER | PROVIDER | ADMIN |
|-------|:--------:|:--------:|:-----:|
| PENDING → CONFIRMED | ✗ | ✓ | ✓ |
| PENDING → REJECTED | ✗ | ✓ | ✓ |
| CONFIRMED → EN_ROUTE | ✗ | ✓ | ✓ |
| EN_ROUTE → ARRIVED | ✗ | ✓ | ✓ |
| ARRIVED → IN_PROGRESS | ✗ | ✓ | ✓ |
| IN_PROGRESS → COMPLETED | ✗ | ✓ | ✓ |
| * → CANCELLED (COMPLETED-dən əvvəl) | ✓ | ✓ | ✓ |

> Tətbiq: keçid + rol yoxlaması service-də mərkəzləşdirilmiş `assertTransition(from, to, role)` funksiyası ilə. Yanlış keçid → `BadRequestException('Bu status keçidinə icazə yoxdur')`.

---

## 4. Zaman xətti (timestamps)

Hər keçiddə müvafiq `Booking` sahəsi doldurulur (bax [DATA_MODEL.md](./DATA_MODEL.md)):
`acceptedAt`, `enRouteAt`, `arrivedAt`, `startedAt`, `completedAt`, `cancelledAt`.

Bu, UI-da "provider 5 dəq əvvəl yola çıxdı" kimi məlumat və analitika üçündür.

---

## 5. On-demand dispatch (INSTANT)

```
1. Booking (INSTANT) → PENDING
2. geo: ST_DWithin ilə yaxın + ONLINE + uyğun kateqoriya provider-lər
3. Sıralama: məsafə + rating
4. DispatchOffer yarat → provider:{id} otağına dispatch:offer
5. BullMQ delayed job → expiresAt (məs. 30s)
   ├─ qəbul: booking → CONFIRMED, digər offer-lər EXPIRED
   ├─ rədd/timeout: növbəti provider-ə keç
   └─ provider qalmadı: müştəriyə "uyğun icraçı tapılmadı"
```

---

## 6. Hadisə yayımı (side effects)

Hər status dəyişikliyi **atomik** olaraq bunları tetikləyir:
1. DB update (transaction daxilində timestamp + status).
2. WS yayımı → `booking:{id}` otağına `booking:status`.
3. Notification yaradılması + push/SMS (BullMQ job).
4. Ödəniş addımı (lazımdırsa): `IN_PROGRESS`-də hold, `COMPLETED`-də capture.

---

## 7. Ləğv & refund siyasəti

| Nə vaxt ləğv | Nəticə |
|--------------|--------|
| PENDING/CONFIRMED | Ödəniş yoxdur/hold ləğv, cərimə yoxdur |
| EN_ROUTE/ARRIVED | Qismən cərimə (siyasətə görə) |
| IN_PROGRESS | Ləğv yox (yalnız tamamlama/mübahisə) |

`cancelReason` və `cancelledBy` mütləq yazılır.

---

## 8. Rəy (review) qapısı

- Rəy yalnız `COMPLETED` sifarişə yazıla bilər.
- Yalnız həmin sifarişin **müştərisi** rəy yaza bilər.
- Bir sifarişə bir rəy (`Review.bookingId @unique`).
- Rəy yazıldıqda `ProviderProfile.rating` və `reviewCount` **transaction** ilə yenilənir.

---

## 9. Tətbiq qeydləri

- State machine məntiqi `bookings.service.ts`-də mərkəzləşdirilir; controller yalnız HTTP mapping edir.
- Mövcud `updateStatus` refaktor edilərkən köhnə davranışa güvənən yerlər yoxlanılır (bax [.cursor/rules/safe-changes.mdc]).
- Bütün error mesajları Azərbaycan dilində.
