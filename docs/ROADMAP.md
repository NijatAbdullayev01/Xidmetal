# Yol Xəritəsi — On-Demand & Canlı İzləmə

Bu sənəd hədəf arxitekturaya çatmaq üçün mərhələli, prioritetləşdirilmiş planı verir. Hər mərhələ əvvəlkinin üzərində qurulur və **additive** dəyişikliklərlə mövcud funksionallığı sındırmır.

Əlaqəli sənədlər: [TARGET_ARCHITECTURE.md](./TARGET_ARCHITECTURE.md), [DATA_MODEL.md](./DATA_MODEL.md), [REALTIME_TRACKING.md](./REALTIME_TRACKING.md), [BOOKING_LIFECYCLE.md](./BOOKING_LIFECYCLE.md), [ARCHITECTURE.md](./ARCHITECTURE.md) (cari vəziyyət).

> **Cari baza (2026-08):** scheduled marketplace MVP — auth, services, availability, bookings (əsas state machine), reviews, messages (REST), in-app notifications. Aşağıdakı checkbox-lar hədəf on-demand yoluna nisbətən yenilənib.

> **Məhsul qərarı (rol):** bir hesab = bir rol (`CUSTOMER` **və ya** `PROVIDER`). Eyni hesabla müştəridən xidmət verənə keçid / dual-role **yoxdur** — bu boşluq deyil, qəsdən qərardır. Xidmət verən olmaq üçün ayrı qeydiyyat. Ətraflı: [ARCHITECTURE.md](./ARCHITECTURE.md) § Rollar.

---

## Faza 0 — Bünövrə & təhlükəsizlik (əvvəlcə)
- [x] Test infrastrukturu: Vitest (unit) qurulumu; kritik auth/storage helper-lər.
- [x] CI: lint + typecheck + test + build (GitHub Actions).
- [ ] Structured logging (`pino`) + Sentry.
- [x] Production migration axını: `prisma migrate deploy` (`pnpm db:migrate:deploy`).
- [x] Auth/security hardening: cookie-only tokens, clientApp audience, refresh family revoke, passwordChangedAt, JWT prod fail-fast, media URL allowlist, `/health/ready`, API Dockerfile.


## Faza 1 — Domain tamlığı (mövcud boşluqlar)
- [x] **Reviews modulu** — yaratma + rating aggregate (transaction); admin moderation var.
- [x] **Notifications modulu** — in-app siyahı + oxundu; push/SMS hələ yox.
- [x] **Messages modulu** — REST chat (WebSocket ayrı fazada).
- [x] **Booking state machine (əsas)** — icazəli keçidlər + rol matrisi (`PENDING`…`COMPLETED`); admin bypass.
- [ ] Booking lifecycle tam hədəf: `EN_ROUTE`, `ARRIVED`; `BookingType` (INSTANT/SCHEDULED); timestamp sahələri.
- [x] Bildiriş tamlığı: `BOOKING_COMPLETED`, `REVIEW_RECEIVED`, ləğv emit-ləri (admin announce ✅).
- [x] Admin səthi: kateqoriya CRUD, provider verify, rəy moderation, stats, user/service idarə, announce API.
- [x] Auth tamamlığı: logout/revoke, şifrə unutma, qeydiyyat email verify (yazma əməliyyatları üçün məcburi; login soft).
- [x] Booking slot race: advisory lock + transaction re-check; upload throttle/orphan GC; Swagger prod gate.
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
> **Cari məhsul qərarı (2026-08):** Platforma **ödənişsizdir** — xidmət verənlərdən komissiya/abunə alınmır; tərəflər öz aralarında razılaşır. Daxili ödəniş modulunun tətbiqi gələcək məhsul qərarından asılıdır.
- [ ] `payments` modulu (opsional gələcək): intent + hold/capture + komissiya + refund.
- [ ] İdempotency açarları.
- [ ] Push (FCM) + SMS (OTP/status) inteqrasiyası.

## Faza 6 — Miqyas & keyfiyyət
- [x] Fayl saxlama (local + S3/R2 driver) — `POST /uploads`; magic-byte yoxlama + orphan silinmə.
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
