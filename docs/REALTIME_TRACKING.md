# Real-time & Canlı İzləmə Dizaynı

Bu sənəd xidmət verənin yolda olduğu zaman xəritədə **canlı izlənməsi** üçün texniki dizaynı təsvir edir.

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
└── ws-jwt.guard.ts          # handshake auth
```

- `@nestjs/websockets` + `@nestjs/platform-socket.io`.
- Miqyaslama üçün `@socket.io/redis-adapter` (çoxlu instans arasında yayım).

### Handshake auth

JWT `handshake.auth.token`-də göndərilir və `WsJwtGuard` ilə yoxlanılır. Etibarsız token → bağlantı rədd edilir. HTTP JWT strategiyası ilə eyni secret istifadə olunur (təkrar məntiq yazma — mövcud `jwt.strategy.ts` məntiqini paylaş).

---

## 3. Otaqlar (rooms)

| Otaq | Kim daxil olur | Məqsəd |
|------|----------------|--------|
| `booking:{id}` | Həmin sifarişin müştəri + provideri | Lokasiya + status |
| `user:{id}` | Konkret istifadəçi | Şəxsi bildiriş |
| `provider:{id}` | Konkret provider | Dispatch təklifi |

İstifadəçi yalnız icazəsi olan otaqlara qoşula bilər (server-side yoxlama — client-in göndərdiyi `bookingId`-yə etibar etmə).

---

## 4. Event-lər

### Client → Server

| Event | Göndərən | Payload | İzah |
|-------|----------|---------|------|
| `location:push` | Provider | `{ bookingId, lat, lng, heading, speed }` | Canlı mövqe (throttled) |
| `booking:subscribe` | Müştəri/Provider | `{ bookingId }` | Otağa qoşul (auth yoxlanır) |

### Server → Client

| Event | Alan | Payload |
|-------|------|---------|
| `location:update` | `booking:{id}` otağı | `{ lat, lng, heading, etaSeconds }` |
| `booking:status` | `booking:{id}` otağı | `{ status, timestamp }` |
| `notification:new` | `user:{id}` | `{ id, type, title, body }` |
| `dispatch:offer` | `provider:{id}` | `{ bookingId, distanceM, expiresAt }` |

---

## 5. Lokasiya axını

```
Provider PWA                Gateway              Customer PWA
 watchPosition()  ──push──►  throttle/validate
                            ├─ broadcast ──►  location:update ─► xəritədə marker
                            └─ (hər N saniyə) LocationPing DB
```

- **Provider tərəf:** `navigator.geolocation.watchPosition` → ~3-5 saniyəlik throttle → `location:push`.
- **Server:** validasiya (koordinat aralığı, sürət sanity), otağa yayım, seçilmiş nöqtələri DB-yə.
- **Müştəri tərəf:** `location:update` alır, xəritə marker-ini animasiya ilə hərəkət etdirir.

> Battery/data: throttle interval və `enableHighAccuracy` balanslı olmalıdır. Provider yalnız aktiv (`IN_PROGRESS`/`en route`) sifarişdə lokasiya göndərir.

---

## 6. Xəritə & ETA

- **Xəritə:** Mapbox GL JS (və ya Google Maps JS). Client komponent (`'use client'`).
- **Marşrut & ETA:** Directions API (Mapbox/Google) — provider mövqeyindən müştəri ünvanına.
- ETA server tərəfdə hesablanıb `location:update` ilə göndərilir (client-də API açarı saxlamamaq üçün) və ya cache olunur (Redis, qısa TTL) — sorğu sayını azaltmaq üçün.

---

## 7. Presence (online/offline)

- Provider qoşulanda `ProviderProfile.availability = ONLINE`, `disconnect`-də `OFFLINE`.
- Redis-də presence key (TTL + heartbeat) — instanslar arası doğru vəziyyət.
- Dispatch yalnız `ONLINE` provider-ləri nəzərə alır.

---

## 8. Etibarlılıq

- **Reconnect:** Socket.IO avtomatik yenidən qoşulma; client reconnect-də `booking:subscribe` təkrar edir.
- **Offline fallback:** Provider bağlantısı qırılarsa, son məlum mövqe + "əlaqə kəsildi" indikatoru göstərilir.
- **Backpressure:** Həddindən artıq event → server tərəfdə throttle/drop.

---

## 9. Təhlükəsizlik

- Handshake JWT auth (məcburi).
- Otaq üzvlüyü server-side yoxlanır (yalnız öz sifarişin).
- Rate limit WS event-lərində (məs. `location:push` üçün max tezlik).
- Xəritə API açarları backend-də və ya domain-restricted; client-ə secret sızmır.

---

## 10. Test

- Gateway unit test (mock socket).
- İnteqrasiya: socket.io-client ilə otaq/yayım axını.
- Yük testi: eyni anda N provider location push (məs. Artillery).
