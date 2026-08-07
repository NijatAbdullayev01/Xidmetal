# Real-time & Canlı İzləmə Dizaynı

Bu sənəd xidmət verənin yolda olduğu zaman xəritədə **canlı izlənməsi** üçün texniki dizaynı təsvir edir.

> **Cari vəziyyət (2026-08, Faza 3):** Socket.IO gateway + `tracking` modulu **implemented**. Mesajlar/bildirişlər üçün TanStack Query **polling** saxlanılır (additive fallback); WS `booking:status` / `notification:new` ilə invalidate edilə bilər. Bax: [ROADMAP.md](./ROADMAP.md) Faza 3.

---

## 1. Niyə WebSocket, REST deyil?

Canlı lokasiya saniyədə/bir neçə saniyədə bir yenilənir. REST polling:
- Şəbəkə və DB-ni yükləyir,
- Gecikmə (latency) yaradır,
- Miqyaslanmır.

Ona görə **Socket.IO gateway** istifadə olunur. DB-yə yalnız seçilmiş nöqtələr (`LocationPing`) yazılır.

---

## 2. Gateway (NestJS)

```
apps/api/src/modules/realtime/
├── realtime.module.ts
├── realtime.gateway.ts      # @WebSocketGateway
├── realtime.service.ts      # otaq/yayım məntiqi
├── ws-auth.service.ts       # handshake JWT (cookie | auth.token | Bearer)
├── realtime.controller.ts   # GET /realtime/socket-token
└── redis-io.adapter.ts      # @socket.io/redis-adapter

apps/api/src/modules/tracking/
├── tracking.module.ts
├── tracking.service.ts      # location:push, sampling, REST pings
├── tracking.controller.ts   # GET /bookings/:id/location-pings
└── eta.service.ts           # Mapbox Directions + haversine fallback
```

- `@nestjs/websockets` + `@nestjs/platform-socket.io`.
- Miqyaslama: `@socket.io/redis-adapter` (`REDIS_URL`); yoxdursa in-memory (dev); prod-da warn.

### Handshake auth

1. Frontend `GET /api/v1/realtime/socket-token` (cookie session) → access JWT.
2. Socket.IO `handshake.auth.token` (+ `clientApp: marketplace`).
3. Alternativ: `Authorization: Bearer` və ya cookie `xidmetal_access` (reverse-proxy eyni origin).

Etibarsız token → bağlantı rədd edilir. HTTP `JwtStrategy` ilə eyni secret / `passwordChangedAt` / audience qaydaları.

---

## 3. Otaqlar (rooms)

| Otaq | Kim daxil olur | Məqsəd |
|------|----------------|--------|
| `booking:{id}` | Həmin sifarişin müştəri + provideri (+ admin) | Lokasiya + status |
| `user:{id}` | Konkret istifadəçi | Şəxsi bildiriş |
| `provider:{id}` | Konkret provider | Dispatch təklifi (Faza 4) |

İstifadəçi yalnız icazəsi olan otaqlara qoşula bilər (`booking:subscribe` server-side yoxlanır).

---

## 4. Event-lər

### Client → Server

| Event | Göndərən | Payload | İzah |
|-------|----------|---------|------|
| `location:push` | Provider | `{ bookingId, lat, lng, heading, speed }` | Canlı mövqe (throttled ~3s) |
| `booking:subscribe` | Müştəri/Provider | `{ bookingId }` | Otağa qoşul (auth yoxlanır) |
| `booking:unsubscribe` | Müştəri/Provider | `{ bookingId }` | Otaqdan çıx |

### Server → Client

| Event | Alan | Payload |
|-------|------|---------|
| `location:update` | `booking:{id}` | `{ bookingId, lat, lng, heading, speed, etaSeconds, distanceMeters, recordedAt }` |
| `booking:status` | `booking:{id}` | `{ bookingId, status, timestamp }` |
| `notification:new` | `user:{id}` | `{ id, type, title, body }` (opsional emit) |
| `dispatch:offer` | `provider:{id}` | `{ offerId, bookingId, serviceTitle, address, destLat, destLng, distanceM, expiresAt, scheduledAt }` |
| `dispatch:offer-expired` | `provider:{id}` | `{ offerId, bookingId }` |
| `dispatch:offer-result` | `provider:{id}` | `{ offerId, bookingId, status, providerId? }` |

---

## 5. Lokasiya axını

```
Provider PWA                Gateway              Customer PWA
 watchPosition()  ──push──►  throttle/validate
                            ├─ geo profile + PostGIS
                            ├─ broadcast ──►  location:update ─► xəritədə marker
                            └─ (hər ~15s) LocationPing DB
```

- **Provider:** `navigator.geolocation.watchPosition` → ~3s throttle → `location:push` (yalnız `EN_ROUTE`).
- **Server:** validasiya, otağa yayım, sampling `LocationPing`, ETA (Mapbox Directions və ya haversine).
- **Müştəri:** `location:update` → Mapbox marker + ETA/məsafə.

> Battery/data: throttle interval və `enableHighAccuracy` balanslıdır. Background GPS brauzer/OS limitlərinə tabedir (tab açıq olanda etibarlı).

---

## 6. Xəritə & ETA

- **Xəritə:** Mapbox GL JS (`NEXT_PUBLIC_MAPBOX_TOKEN`). Token yoxdursa AZ empty state — build sınmır.
- **ETA:** Server `MAPBOX_ACCESS_TOKEN` Directions API (30s cache); yoxdursa haversine + ~30 km/s orta sürət.

---

## 7. Presence (online/offline) — ✅ Faza 4

- `User.lastSeenAt`: REST heartbeat + provider WS connect.
- `ProviderAvailability`: UI (`PATCH /geo/me/availability`) + accept → BUSY; complete/cancel → ONLINE.
- WS son disconnect: yalnız `ONLINE` → `OFFLINE` (BUSY toxunulmur; CUSTOMER/ADMIN profilinə toxunulmur).
- Dispatch namizədləri yalnız `ONLINE` (geo nearby).

---

## 8. Etibarlılıq

- **Reconnect:** Socket.IO avtomatik; client reconnect-də `booking:subscribe` təkrar.
- **Offline fallback:** REST polling saxlanılır; WS gələndə query invalidate.
- **Backpressure:** `location:push` server throttle (~3s).

---

## 9. Təhlükəsizlik

- Handshake JWT auth (məcburi).
- Otaq üzvlüyü server-side.
- Rate limit WS `location:push`.
- Mapbox secret yalnız backend-də (`MAPBOX_ACCESS_TOKEN`); client token domain-restricted public token.

---

## 10. Test

- Unit: room auth (`realtime-auth.spec.ts`), throttle/sample + ETA (`location-throttle.spec.ts`).
- İnteqrasiya / yük: gələcək (socket.io-client e2e, Artillery).
