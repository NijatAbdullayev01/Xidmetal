# Mobil (deferred) — Faza 6 opsional

> **Status (2026-08):** Tam React Native marketplace app **defer** edilib. `apps/mobile` yaradılmayıb.

## Niyə defer?

- Faza 6 əsas deliverable: **metrics + yük testi**, native app deyil.
- Yarımçıq mobile skeleton (CI/shared wiring olmadan) monorepo-nu zibilləyir — anti-pattern.
- Faza 3–5 ehtiyacları **web/PWA** ilə örtülür: Socket.IO tracking, `watchPosition`, web push (FCM), in-app bildirişlər.

## Gələcək plan (structure only)

```
apps/mobile/          # React Native (Expo tövsiyə)
  src/
    api/              # @xidmetal/shared types + REST client
    auth/             # JWT cookie/token strategy (native secure store)
    tracking/         # background GPS (native)
    push/             # FCM native
packages/shared/      # mövcud — dəyişmədən reuse
```

## Minimum DoD (gələcək PR)

1. Runnable Expo/RN app + `pnpm` workspace wiring
2. Shared types/schemas import
3. Auth + booking list MVP
4. CI job (lint/typecheck) — yalnız app real olduqda
5. Native push + background location üçün platform icazələri

Bu sənəd kod app yaratmır; yalnız plan saxlayır. ROADMAP checkbox açıq qalır.
