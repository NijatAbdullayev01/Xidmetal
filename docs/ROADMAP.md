# Yol Xəritəsi — On-Demand & Canlı İzləmə

Bu sənəd hədəf arxitekturaya çatmaq üçün mərhələli, prioritetləşdirilmiş planı verir. Hər mərhələ əvvəlkinin üzərində qurulur və **additive** dəyişikliklərlə mövcud funksionallığı sındırmır.

Əlaqəli sənədlər: [TARGET_ARCHITECTURE.md](./TARGET_ARCHITECTURE.md), [DATA_MODEL.md](./DATA_MODEL.md), [REALTIME_TRACKING.md](./REALTIME_TRACKING.md), [BOOKING_LIFECYCLE.md](./BOOKING_LIFECYCLE.md).

---

## Faza 0 — Bünövrə & təhlükəsizlik (əvvəlcə)
- [ ] Test infrastrukturu: Vitest + Supertest qurulumu.
- [ ] CI: lint + typecheck + test (GitHub Actions).
- [ ] Structured logging (`pino`) + Sentry.
- [ ] Production migration axını: `prisma migrate deploy`.

## Faza 1 — Domain tamlığı (mövcud boşluqlar)
- [ ] **Booking state machine** — icazə verilən keçidlər + rol matrisi ([BOOKING_LIFECYCLE.md](./BOOKING_LIFECYCLE.md)).
- [ ] **Reviews modulu** — CRUD + rating aggregate (transaction).
- [ ] **Notifications modulu** — in-app CRUD + oxundu statusu.
- [ ] Schema: `BookingStatus`-a `EN_ROUTE`, `ARRIVED`; `BookingType` (INSTANT/SCHEDULED).
- [ ] `packages/shared` enum/tip sinxronizasiyası.

## Faza 2 — Geospatial
- [ ] PostGIS extension + `ProviderProfile` mövqe sahələri + availability.
- [ ] `geo` modulu: geokodlaşdırma, `ST_DWithin` yaxınlıq sorğuları.
- [ ] Booking-ə origin/dest koordinatları.

## Faza 3 — Real-time & tracking
- [ ] Socket.IO gateway + JWT handshake auth.
- [ ] Redis adapter (miqyaslama).
- [ ] `tracking` modulu: `location:push` → yayım + `LocationPing`.
- [ ] Frontend: canlı xəritə (Mapbox), provider marker, ETA.
- [ ] Provider PWA: `watchPosition` + throttle.

## Faza 4 — Dispatch (on-demand çağırış)
- [ ] `dispatch` modulu: yaxın provider tapma + sıralama.
- [ ] `DispatchOffer` + BullMQ timeout/reassign axını.
- [ ] Presence (online/offline) idarəetməsi.

## Faza 5 — Ödəniş & bildiriş kanalları
- [ ] `payments` modulu: intent + hold/capture + komissiya + refund.
- [ ] İdempotency açarları.
- [ ] Push (FCM) + SMS (OTP/status) inteqrasiyası.

## Faza 6 — Miqyas & keyfiyyət
- [ ] Fayl saxlama (S3/R2) — şəkillər.
- [ ] E2E testlər (Playwright) — kritik axınlar.
- [ ] Metrics/dashboards, yük testi.
- [ ] (Opsional) `apps/mobile` — React Native.

---

## Asılılıq qrafı

```
Faza 0 ─► Faza 1 ─► Faza 2 ─► Faza 3 ─► Faza 4
                                    └─► Faza 5 ─► Faza 6
```

## Ölçülər (Definition of Done)
Hər fazada: yeni kod tiplənib (`any` yoxdur), test var, `pnpm typecheck && pnpm lint` keçir, mövcud endpoint-lər sınmayıb, sənəd yenilənib.
