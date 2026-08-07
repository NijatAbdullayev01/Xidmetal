# Yük testi (k6)

API işləyərkən əl ilə işə salın — **CI default-da yoxdur** (yavaş/flaky).

## Tələblər

- [k6](https://grafana.com/docs/k6/latest/set-up/install-k6/)
- API: `http://localhost:4000` (və ya `BASE_URL`)

## Əmrlər

```bash
# Smoke (~30s, 2 VU) — health + categories + services
pnpm load:smoke

# Stress (~80s, ramp 25 VU)
pnpm load:stress
```

k6 yoxdursa skript xəbərdarlıq verir və **exit 0** (fail-soft).

## Env

| Dəyişən | Default | Təsvir |
|---------|---------|--------|
| `BASE_URL` | `http://localhost:4000` | API origin (prefix olmadan) |
| `LOAD_TEST_TOKEN` | (boş) | Opsional JWT — smoke-də `GET /users/me` |

Secret-ləri commit etməyin. Nümunə: `.env.example`.

## Thresholds

| Skript | Error rate | p95 |
|--------|------------|-----|
| smoke | `<1%` | `<500ms` |
| stress | `<5%` | `<2s` |

## Nəticələr

`ops/load/results/` gitignore-dadır — artefakt commit etməyin.
