# Hədəf Arxitektura — On-Demand Xidmət & Canlı İzləmə

Bu sənəd Xidmetal-ın **real-time, on-demand** platformaya çevrilməsi üçün lazım olan hədəf arxitekturanı təsvir edir.

> **Kontekst:** İstifadəçi xidməti rezerv edir → xidmət verəni çağırır → xidmət verən yolda olduqda xəritədə **canlı izlənir** → iş bitdikdə tamamlanır → müştəri **rəy verir**.
>
> Mövcud arxitektura klassik "randevu/booking" platformasıdır. Bu sənəd aradakı boşluğu bağlayan hədəf vəziyyəti müəyyən edir. Mövcud vəziyyət üçün [ARCHITECTURE.md](./ARCHITECTURE.md)-ə baxın.

---

## 1. Yüksək səviyyəli baxış

```
┌──────────────────────────────────────────────────────────────────┐
│                            CLIENTS                                 │
│   Customer Web/PWA        Provider Web/PWA (GPS)      Admin Panel  │
└───────────┬───────────────────────┬────────────────────┬─────────┘
            │ HTTPS (REST)           │ WSS (Socket.IO)     │
            ▼                        ▼                     ▼
┌──────────────────────────────────────────────────────────────────┐
│                        API Gateway / apps/api                     │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │ REST (v1)  │  │ WS Gateway   │  │ Dispatch     │               │
│  │ Controllers│  │ (Socket.IO)  │  │ Engine       │               │
│  └─────┬──────┘  └──────┬───────┘  └──────┬───────┘               │
│        │                │                 │                        │
│  ┌─────▼────────────────▼─────────────────▼──────┐                │
│  │              Application Services              │                │
│  └─────┬───────────────┬───────────────┬─────────┘                │
│        │               │               │                          │
│  ┌─────▼─────┐  ┌───────▼──────┐  ┌─────▼──────┐                   │
│  │  Prisma   │  │  Redis       │  │  BullMQ    │                   │
│  │ PostgreSQL│  │  (pub/sub,   │  │  (jobs,    │                   │
│  │ + PostGIS │  │   presence)  │  │   timeout) │                   │
│  └───────────┘  └──────────────┘  └────────────┘                  │
└──────────────────────────────────────────────────────────────────┘
        │                    │                    │
   ┌────▼────┐        ┌──────▼──────┐      ┌───────▼───────┐
   │ Maps /  │        │ Push (FCM)  │      │ Payment PSP   │
   │Directions│       │ SMS / Email │      │ (Stripe/local)│
   └─────────┘        └─────────────┘      └───────────────┘
```

---

## 2. Texnologiya əlavələri

Mövcud stack (Next.js 15, NestJS 11, Prisma, PostgreSQL, Redis) saxlanılır. Aşağıdakılar **əlavə olunur**:

| Sahə | Texnologiya | Səbəb |
|------|-------------|-------|
| Real-time | `@nestjs/websockets` + Socket.IO + `@socket.io/redis-adapter` | Canlı lokasiya, status, bildiriş |
| Geospatial | PostgreSQL **PostGIS** (`geography` tipi, GiST index) | Yaxınlıqdakı provider axtarışı, məsafə |
| Xəritə / ETA | **Mapbox GL JS** (və ya Google Maps) + Directions API | Canlı xəritə, marşrut, ETA |
| Background jobs | **BullMQ** (Redis üzərində) | Dispatch timeout, bildiriş, rating aggregate |
| Push bildiriş | **Firebase Cloud Messaging** (FCM) | Mobil/web push |
| SMS / Email | Yerli SMS provayderi + **Resend/SendGrid** | OTP, təsdiq, bildiriş |
| Ödəniş | **Stripe** və ya yerli PSP (payment intent + hold/capture) | Marketplace ödənişləri, komissiya |
| Fayl saxlama | **S3 / Cloudflare R2** | Avatar, xidmət şəkilləri, sənədlər |
| Observability | **Sentry** + structured logging (`pino`) + metrics | Xəta izləmə, monitorinq |
| Test | **Vitest** (unit), **Supertest** (e2e API), **Playwright** (E2E) | Regressiyanın qarşısını almaq |

---

## 3. Backend modulları

Mövcud: `auth`, `users`, `categories`, `services`, `bookings`, `health`.

Əlavə olunmalı modullar:

| Modul | Məsuliyyət | Status |
|-------|------------|--------|
| `reviews` | Rəy CRUD, rating aggregate | Schema var, modul **yox** |
| `notifications` | In-app + push + email/SMS bildirişlər | Schema var, modul **yox** |
| `realtime` (gateway) | Socket.IO gateway, otaqlar, presence | **Yox** |
| `tracking` | Provider lokasiya axını, marşrut, ETA | **Yox** |
| `dispatch` | On-demand provider tapma/təklif/timeout | **Yox** |
| `geo` | Geokodlaşdırma, yaxınlıq sorğuları (PostGIS) | **Yox** |
| `payments` | Payment intent, hold/capture, komissiya, payout, refund | **Yox** |
| `messaging` | Müştəri↔provider chat (opsional "çağırış") | **Yox** |

Hər modul mövcud konvensiyaya tabedir: `Controller → Service → Prisma`, DTO validation (class-validator), AZ dilində error mesajları. Bax: [.cursor/rules/backend.mdc].

---

## 4. Real-time qat

Canlı izləmə üçün REST **kifayət deyil** (saniyəlik location update-ləri DB-ni və şəbəkəni yükləyər). Socket.IO gateway istifadə olunur.

- **Handshake auth:** JWT WS handshake-də (`auth.token`) yoxlanılır.
- **Otaqlar (rooms):** `booking:{id}`, `user:{id}`, `provider:{id}`.
- **Event-lər:** `location:update`, `booking:status`, `notification:new`, `dispatch:offer`.
- **Miqyaslama:** Çoxlu instans üçün Socket.IO **Redis adapter** (pub/sub).
- **Throttling:** Provider lokasiyası ~3-5 saniyədə bir göndərilir; DB-yə yalnız seçilmiş nöqtələr yazılır (audit/marşrut üçün).

Ətraflı: [REALTIME_TRACKING.md](./REALTIME_TRACKING.md).

---

## 5. On-demand dispatch (çağırış məntiqi)

Sifarişin iki tipi olur: `INSTANT` (indi çağır) və `SCHEDULED` (planlaşdırılmış).

`INSTANT` axını:
1. Müştəri sifariş yaradır (koordinatlar ilə).
2. Dispatch engine PostGIS ilə **yaxın + online + uyğun** provider-ləri tapır.
3. Növbə ilə (və ya paralel) təklif göndərilir → BullMQ **timeout** (məs. 30 san).
4. Provider qəbul edir → `CONFIRMED`; rədd/timeout → növbəti provider-ə.
5. Uyğun provider yoxdursa → müştəriyə bildiriş.

Ətraflı: [BOOKING_LIFECYCLE.md](./BOOKING_LIFECYCLE.md).

---

## 6. Geospatial data

- PostGIS extension (`CREATE EXTENSION postgis`).
- Provider-in son mövqeyi (`ProviderProfile.lastLocation geography(Point)`).
- Booking-in origin/destination koordinatları.
- GiST index ilə `ST_DWithin` yaxınlıq sorğuları.

Prisma PostGIS-i native dəstəkləmədiyi üçün `Unsupported("geography(Point,4326)")` tipi + raw SQL (`$queryRaw`) istifadə olunur. Ətraflı: [DATA_MODEL.md](./DATA_MODEL.md).

---

## 7. Ödəniş

- Marketplace modeli: müştəri ödəyir → platforma komissiya tutur → provider-ə payout.
- `PaymentIntent` yaradılır, iş başlayanda **hold**, tamamlananda **capture**.
- Ləğv/refund siyasəti sifariş vəziyyətinə bağlıdır (bax lifecycle).
- İdempotency açarları ilə ikiqat ödənişin qarşısı alınır.

---

## 8. Bildiriş kanalları

| Kanal | İstifadə |
|-------|----------|
| In-app (WS) | Canlı status, "provider yoldadır/gəldi" |
| Push (FCM) | App bağlı olduqda |
| SMS | OTP, kritik status dəyişiklikləri |
| Email | Qəbz, hesabat, marketinq |

Bütün bildirişlər `notifications` modulundan keçir; göndərmə BullMQ job-ları ilə asinxron edilir.

---

## 9. Mobil / PWA

Canlı izləmə praktikada provider tərəfdə arxa planda GPS tələb edir:
- **MVP:** Provider Web tətbiqi **PWA** + `navigator.geolocation.watchPosition`.
- **Sonra:** React Native (və ya Flutter) app — arxa plan lokasiya, native push.

Frontend `apps/web` cari qalır; mobil app gələcəkdə `apps/mobile` kimi əlavə oluna bilər.

---

## 10. Observability & DevOps

- **Logging:** `pino` structured JSON, request-id korrelyasiyası.
- **Errors:** Sentry (backend + frontend).
- **Metrics:** Prometheus-uyğun `/metrics`.
- **CI/CD:** GitHub Actions — lint, typecheck, test, build, `prisma migrate deploy`.
- **Migration:** Production-da `db:push` deyil, **`prisma migrate deploy`**.
- **Deployment:** Konteynerlər (Docker) → Railway/Fly/Kubernetes; frontend Vercel.

---

## 11. Prinsiplər

1. **Additive dəyişiklik** — mövcud API/schema sındırılmır, yeni sahələr optional/əlavə olunur. Bax: [.cursor/rules/safe-changes.mdc].
2. **Contract stabilliyi** — `packages/shared` tipləri backend və frontend arasında yeganə həqiqət mənbəyidir.
3. **Event-driven** — status dəyişiklikləri event yayımlayır (WS + notification + job).
4. **Modern kod** — deprecated pattern istifadə olunmur. Bax: [.cursor/rules/no-legacy-code.mdc].
