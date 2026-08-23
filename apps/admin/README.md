# @xidmetal/admin

Marketplace-dən **ayrı origin**-də işləyən admin paneli (təhlükəsizlik üçün).

- **Port (production):** `3021` — **dev:** `3121` (`pnpm --filter @xidmetal/admin dev`)
- **Auth storage:** `xidmetal-admin-auth` (web-in `xidmetal-auth` açarından ayrı)
- **Rol:** yalnız `ADMIN` — digər rollar login-də rədd edilir
- **robots:** `noindex`

```bash
pnpm --filter @xidmetal/admin dev
# → http://127.0.0.1:3121/login
```

Seed admin:

```bash
pnpm db:seed
# ADMIN_EMAIL / ADMIN_PASSWORD (.env.development)
```
