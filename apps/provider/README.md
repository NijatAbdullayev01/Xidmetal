# @xidmetal/provider

Marketplace-dən **ayrı origin**-də işləyən xidmət verən paneli.

- **Port (production):** `3022` — **dev:** `3122` (`pnpm --filter @xidmetal/provider dev`)
- **Auth storage:** `xidmetal-provider-auth-v2` (marketplace `xidmetal-auth-v2` açarından ayrı)
- **Audience:** `CLIENT_APP.PROVIDER` — yalnız `PROVIDER` rol; digər rollar login-də rədd edilir
- **robots:** `noindex`

```bash
pnpm --filter @xidmetal/provider dev
# → http://127.0.0.1:3122/login
```

Qeydiyyat (yalnız xidmət verən):

```bash
# http://127.0.0.1:3122/register
```
