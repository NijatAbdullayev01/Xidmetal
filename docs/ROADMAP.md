# Yol Xəritəsi — On-Demand & Canlı İzləmə

Bu sənəd hədəf arxitekturaya çatmaq üçün mərhələli, prioritetləşdirilmiş planı verir. Hər mərhələ əvvəlkinin üzərində qurulur və **additive** dəyişikliklərlə mövcud funksionallığı sındırmır.

Əlaqəli sənədlər: [TARGET_ARCHITECTURE.md](./TARGET_ARCHITECTURE.md), [DATA_MODEL.md](./DATA_MODEL.md), [REALTIME_TRACKING.md](./REALTIME_TRACKING.md), [BOOKING_LIFECYCLE.md](./BOOKING_LIFECYCLE.md), [ARCHITECTURE.md](./ARCHITECTURE.md) (cari vəziyyət).

> **Cari baza (2026-08):** scheduled marketplace MVP — auth, services, availability, bookings (əsas state machine), reviews, messages (REST), in-app notifications. Aşağıdakı checkbox-lar hədəf on-demand yoluna nisbətən yenilənib.

---

## Faza 0 — Bünövrə & təhlükəsizlik (əvvəlcə)
- [ ] Test infrastrukturu: Vitest + Supertest qurulumu.
- [ ] CI: lint + typecheck + test (GitHub Actions).
- [ ] Structured logging (`pino`) + Sentry.
- [ ] Production migration axını: `prisma migrate deploy` (hazırda yalnız `db:push`).

## Faza 1 — Domain tamlığı (mövcud boşluqlar)
- [x] **Reviews modulu** — yaratma + rating aggregate (transaction); moderation hələ yox.
- [x] **Notifications modulu** — in-app siyahı + oxundu; push/SMS və bütün tip emit-ləri hələ natamam.
- [x] **Messages modulu** — REST chat (WebSocket ayrı fazada).
- [x] **Booking state machine (əsas)** — icazəli keçidlər + rol matrisi (`PENDING`…`COMPLETED`); admin bypass.
- [ ] Booking lifecycle tam hədəf: `EN_ROUTE`, `ARRIVED`; `BookingType` (INSTANT/SCHEDULED); timestamp sahələri.
- [ ] Bildiriş tamlığı: `BOOKING_COMPLETED`, `REVIEW_RECEIVED` (admin announce ✅).
- [x] Admin səthi: kateqoriya CRUD, provider verify, rəy moderation, stats, user/service idarə, announce API.
- [ ] Auth tamamlığı: logout/revoke, şifrə unutma, qeydiyyat email verify.

## Faza 2 — Geospatial
- [ ] PostGIS extension + `ProviderProfile` mövqe sahələri + availability.
- [ ] `geo` modulu: geokodlaşdırma, `ST_DWithin` yaxınlıq sorğuları.
- [ ] Booking-ə origin/dest koordinatları.

## Faza 3 — Real-time & tracking
- [ ] Socket.IO gateway + JWT handshake auth (hazırda mesaj/bildiriş **polling**).
- [ ] Redis adapter (miqyaslama) — Redis container var, API hələ bağlamayıb.
- [ ] `tracking` modulu: `location:push` → yayım + `LocationPing`.
- [ ] Frontend: canlı xəritə (Mapbox), provider marker, ETA.
- [ ] Provider PWA: `watchPosition` + throttle.

## Faza 4 — Dispatch (on-demand çağırış)
- [ ] `dispatch` modulu: yaxın provider tapma + sıralama.
- [ ] `DispatchOffer` + BullMQ timeout/reassign axını.
- [ ] Presence (online/offline) idarəetməsi (hazırda yalnız `heartbeat` / `lastSeenAt`).

## Faza 5 — Ödəniş & bildiriş kanalları
- [ ] `payments` modulu: intent + hold/capture + komissiya + refund.
- [ ] İdempotency açarları.
- [ ] Push (FCM) + SMS (OTP/status) inteqrasiyası.

## Faza 6 — Miqyas & keyfiyyət
- [ ] Fayl saxlama (S3/R2) — şəkillər (hazırda çox vaxt base64 DB-də).
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
