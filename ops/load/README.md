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

# Capacity (ramp → 5000 VU, HTTP) — 5k hədəf yoxlaması
pnpm load:capacity

# Socket.IO handshake smoke (node + apps/web socket.io-client)
pnpm load:realtime
```

k6 yoxdursa smoke/stress xəbərdarlıq verir və **exit 0** (fail-soft).
`load:realtime` API və ya socket.io-client yoxdursa eyni fail-soft.
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
| capacity | `<5%` | `<2s` |

## Nəticələr

`ops/load/results/` gitignore-dadır — artefakt commit etməyin.
