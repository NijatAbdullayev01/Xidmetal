# @xidmetal/admin

Marketplace-dən **ayrı origin**-də işləyən admin paneli (təhlükəsizlik üçün).

- **Port:** `3021`
- **Auth storage:** `xidmetal-admin-auth` (web-in `xidmetal-auth` açarından ayrı)
- **Rol:** yalnız `ADMIN` — digər rollar login-də rədd edilir
- **robots:** `noindex`

```bash
pnpm --filter @xidmetal/admin dev
# → http://localhost:3021/login
```

Seed admin:

```bash
pnpm --filter @xidmetal/database seed
# ADMIN_EMAIL / ADMIN_PASSWORD (.env)
```
