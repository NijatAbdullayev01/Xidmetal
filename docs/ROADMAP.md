# Yol Xəritəsi — On-Demand & Canlı İzləmə

Bu sənəd hədəf arxitekturaya çatmaq üçün mərhələli, prioritetləşdirilmiş planı verir. Hər mərhələ əvvəlkinin üzərində qurulur və **additive** dəyişikliklərlə mövcud funksionallığı sındırmır.

Əlaqəli sənədlər: [TARGET_ARCHITECTURE.md](./TARGET_ARCHITECTURE.md), [DATA_MODEL.md](./DATA_MODEL.md), [REALTIME_TRACKING.md](./REALTIME_TRACKING.md), [BOOKING_LIFECYCLE.md](./BOOKING_LIFECYCLE.md), [ARCHITECTURE.md](./ARCHITECTURE.md) (cari vəziyyət).

> **Cari baza (2026-08):** marketplace MVP + on-demand — auth, services, availability, bookings (SCHEDULED + INSTANT), dispatch, live tracking (Socket.IO), reviews, messages (REST), in-app/push kanalları (env), payments scaffolding (flag OFF), reports, contact, admin panel. Aşağıdakı checkbox-lar hədəf yola nisbətən yenilənib.

> **Məhsul qərarı (rol):** bir hesab = bir rol (`CUSTOMER` **və ya** `PROVIDER`). Eyni hesabla müştəridən xidmət verənə keçid / dual-role **yoxdur** — bu boşluq deyil, qəsdən qərardır. Xidmət verən olmaq üçün ayrı qeydiyyat. Ətraflı: [ARCHITECTURE.md](./ARCHITECTURE.md) § Rollar.

---

## Faza 0 — Bünövrə & təhlükəsizlik (əvvəlcə)
- [x] Test infrastrukturu: Vitest (unit) qurulumu; kritik auth/storage helper-lər.
- [x] CI: lint + typecheck + test + migrate (PostGIS + Redis) + build; Playwright auth+smoke.
- [x] Structured logging (`pino`) + Sentry (API opsional `SENTRY_DSN`; web/admin `NEXT_PUBLIC_SENTRY_DSN`).
- [x] Production migration axını: `prisma migrate deploy` (`pnpm db:migrate:deploy`).
- [x] Auth/security hardening: cookie-only tokens, clientApp audience, refresh family revoke, passwordChangedAt, JWT prod fail-fast, media URL allowlist, `/health/ready`, API Dockerfile.


## Faza 1 — Domain tamlığı (mövcud boşluqlar)
- [x] **Reviews modulu** — yaratma + rating aggregate (transaction); admin REJECT var.
- [x] **Notifications modulu** — in-app siyahı + oxundu; push ✅ Faza 5.
- [x] **Messages modulu** — REST chat (WebSocket ayrı fazada).
- [x] **Booking state machine (əsas)** — icazəli keçidlər + rol matrisi (`PENDING`…`COMPLETED`); admin bypass.
- [x] Booking lifecycle tam hədəf: `EN_ROUTE`, `ARRIVED`; `BookingType` (INSTANT/SCHEDULED); timestamp sahələri (`acceptedAt`/`enRouteAt`/`arrivedAt`/`startedAt`/`completedAt`/`cancelledAt`). INSTANT avto-dispatch Phase 4.
- [x] Bildiriş tamlığı: `BOOKING_COMPLETED`, `BOOKING_REJECTED`, `BOOKING_EN_ROUTE`, `BOOKING_ARRIVED`, `REVIEW_RECEIVED`, ləğv emit-ləri (admin announce ✅); kritik statuslar e-poçt (best-effort).
- [x] Admin səthi: kateqoriya CRUD, provider verify, rəy moderation, şikayət moderation, stats, user/service idarə, announce API.
- [x] Auth tamamlığı: logout/revoke, şifrə unutma, qeydiyyat email verify (yazma əməliyyatları üçün məcburi; login soft).
- [x] Booking slot race: advisory lock + transaction re-check; upload throttle/orphan GC; Swagger prod gate.
## Faza 2 — Geospatial
- [x] PostGIS extension + `ProviderProfile` mövqe sahələri + availability.
- [x] `geo` modulu: geokodlaşdırma, `ST_DWithin` yaxınlıq sorğuları.
- [x] Booking-ə origin/dest koordinatları.

## Faza 3 — Real-time & tracking
- [x] Socket.IO gateway + JWT handshake auth (mesajlar: `message:new` + HTTP polling fallback; bildirişlər: `notification:new` + polling).
- [x] Redis adapter (miqyaslama) — Redis artıq throttler üçün bağlıdır; Socket.IO `@socket.io/redis-adapter` əlavə olunub (REDIS_URL yoxdursa in-memory).
- [x] `tracking` modulu: `location:push` → yayım + `LocationPing` (sampling).
- [x] Frontend: canlı xəritə (Mapbox), provider marker, ETA.
- [x] Provider PWA: `watchPosition` + throttle (+ minimal manifest/SW).
- [x] Chat realtime: `MESSAGE_NEW` emit + web invalidate (polling interval WS bağlı olanda yavaşladılır).

## Faza 4 — Dispatch (on-demand çağırış)
- [x] `dispatch` modulu: yaxın provider tapma + sıralama.
- [x] `DispatchOffer` + BullMQ timeout/reassign axını.
- [x] Presence (online/offline) idarəetməsi (`ProviderAvailability` + WS connect/disconnect + heartbeat/`lastSeenAt`).

## Faza 5 — Ödəniş & bildiriş kanalları
> **Cari məhsul qərarı (2026-08):** Platforma **ödənişsizdir** — xidmət verənlərdən komissiya/abunə alınmır; tərəflər öz aralarında razılaşır. Daxili ödəniş modulunun tətbiqi gələcək məhsul qərarından asılıdır.
- [x] `payments` modulu — **scaffolding + feature flag** (`PAYMENTS_ENABLED=false` default). Intent/hold/capture/refund + Noop/Stripe stub; booking axını PaymentIntent tələb etmir.
- [x] İdempotency açarları — `Payment.idempotencyKey` + `IdempotencyRecord` (TTL + saatlıq cleanup); `Idempotency-Key` header payments route-larında.
- [x] Push (FCM) — `DeviceToken`; FCM HTTP v1/legacy real send (credentials); default noop. Web Firebase `getToken`.

## Faza 6 — Miqyas & keyfiyyət
- [x] Fayl saxlama (local + S3/R2 driver) — `POST /uploads`; magic-byte yoxlama + orphan silinmə.
- [x] E2E testlər (Playwright) — smoke + kritik UI axınları (`apps/web/e2e`); API unit testlər genişləndirilib.
- [x] Metrics/dashboards, yük testi — `GET /api/v1/metrics` (`prom-client`), Grafana JSON + Prometheus scrape, opsional `docker-compose.monitoring.yml`, k6 (`pnpm load:smoke`).
- [ ] (Opsional) `apps/mobile` — React Native — **deferred**: native push/GPS Faza 3–5 web/PWA ilə örtülür; yarımçıq skeleton yaratmırıq. Plan: [MOBILE.md](./MOBILE.md).

---

## Asılılıq qrafı

```
Faza 0 ─► Faza 1 ─► Faza 2 ─► Faza 3 ─► Faza 4
                                    └─► Faza 5 ─► Faza 6
```

## Ölçülər (Definition of Done)
Hər fazada: yeni kod tiplənib (`any` yoxdur), test var, `pnpm typecheck && pnpm lint` keçir, mövcud endpoint-lər sınmayıb, sənəd yenilənib.
