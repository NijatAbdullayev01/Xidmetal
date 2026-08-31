# Real-time & Canlı İzləmə Dizaynı

Bu sənəd xidmət verənin yolda olduğu zaman **canlı izlənməsi** üçün texniki dizaynı təsvir edir.

> **Cari vəziyyət (2026-08, Faza 3):** Socket.IO gateway + `tracking` / dispatch / **`message:new`** **implemented**. Mesajlar/bildirişlər üçün TanStack Query **polling** fallback saxlanılır; WS ilə invalidate. Bax: [ROADMAP.md](./ROADMAP.md) Faza 3.

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
├── ws-auth.service.ts       # handshake auth (cookie-first, auth.token/Bearer fallback)
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

1. Frontend `io(..., { withCredentials: true, auth: { clientApp: marketplace } })`.
2. Socket.IO handshake cookie header-indən app-scoped httpOnly access cookie oxunur.
3. Alternativ fallback: `handshake.auth.token` və ya `Authorization: Bearer`.

Etibarsız token → bağlantı rədd edilir. HTTP `JwtStrategy` ilə eyni secret / `passwordChangedAt` / audience qaydaları.

---

## 3. Otaqlar (rooms)

| Otaq | Kim daxil olur | Məqsəd |
|------|----------------|--------|
| `booking:{id}` | Həmin sifarişin xidmət alan + provideri (+ admin) | Lokasiya + status |
| `user:{id}` | Konkret istifadəçi | Şəxsi bildiriş |
| `provider:{id}` | Konkret provider | Dispatch təklifi (Faza 4) |

İstifadəçi yalnız icazəsi olan otaqlara qoşula bilər (`booking:subscribe` server-side yoxlanır).

---

## 4. Event-lər

### Client → Server

| Event | Göndərən | Payload | İzah |
|-------|----------|---------|------|
| `location:push` | Provider | `{ bookingId, lat, lng, heading, speed }` | Canlı mövqe (throttled ~3s) |
| `booking:subscribe` | Xidmət alan/Provider | `{ bookingId }` | Otağa qoşul (auth yoxlanır) |
| `booking:unsubscribe` | Xidmət alan/Provider | `{ bookingId }` | Otaqdan çıx |

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
                            ├─ broadcast ──►  location:update ─► ETA / məsafə paneli
                            └─ (hər ~15s) LocationPing DB
```

- **Provider:** `navigator.geolocation.watchPosition` → ~3s throttle → `location:push` (yalnız trackable status).
- **Server hot path:** validate + Redis throttle → **WS `location:update` dərhal** (haversine ETA).
- **Server background:** ProviderProfile/PostGIS sync ~15s; `LocationPing` ~15s; Mapbox ETA dəqiqləşdirmə (opsional).
- **Xidmət alan:** canlı mövqe paneli və Google Maps linki yoxdur; ünvan mətni sifariş kartında qalır.

> Battery/data: throttle interval və `enableHighAccuracy` balanslıdır. Background GPS brauzer/OS limitlərinə tabedir (tab açıq olanda etibarlı).
> Miqyas: bax [CAPACITY.md](./CAPACITY.md).

---

## 6. ETA

- Embedded xəritə və xarici Google Maps naviqasiya linki yoxdur.
- **ETA / məsafə:** server `GET /geo/route` + WS (provider sync üçün) — Google Routes (New) → OSRM → Mapbox → haversine×yol əmsalı.

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
- Directions secret yalnız backend-də (`GOOGLE_MAPS_API_KEY` / `MAPBOX_ACCESS_TOKEN`).

---

## 10. Test

- Unit: room auth (`realtime-auth.spec.ts`), throttle/sample + ETA (`location-throttle.spec.ts`), `RealtimeService` emit (`realtime.service.spec.ts`), messages WS (`messages.service.spec.ts`).
- Socket.IO smoke (əl ilə): `pnpm load:realtime` — handshake / auth reject; API yoxdursa fail-soft exit 0.
- İnteqrasiya / ağır yük: opsional Artillery / k6 WS ssenariləri (CI default-da yox).
