/**
 * k6 smoke — sağlamlıq + public siyahılar.
 *
 *   BASE_URL=http://localhost:4000 pnpm load:smoke
 *   LOAD_TEST_TOKEN=...  # opsional JWT (Authorization Bearer) — auth-lu yoxlama
 *
 * Thresholds: error rate < 1%, p95 < 500ms (smoke).
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = (__ENV.BASE_URL || 'http://localhost:4000').replace(/\/$/, '');
const API = `${BASE_URL}/api/v1`;
const TOKEN = __ENV.LOAD_TEST_TOKEN || '';

export const options = {
  vus: 2,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
  },
};

function headers() {
  const h = { Accept: 'application/json' };
  if (TOKEN) {
    h.Authorization = `Bearer ${TOKEN}`;
  }
  return h;
}

export default function () {
  const health = http.get(`${API}/health`, { headers: headers() });
  check(health, {
    'health 200': (r) => r.status === 200,
  });

  const ready = http.get(`${API}/health/ready`, { headers: headers() });
  check(ready, {
    'ready 200 və ya 503': (r) => r.status === 200 || r.status === 503,
  });

  const categories = http.get(`${API}/categories`, { headers: headers() });
  check(categories, {
    'categories 200': (r) => r.status === 200,
  });

  const services = http.get(`${API}/services?page=1&limit=10`, {
    headers: headers(),
  });
  check(services, {
    'services 200': (r) => r.status === 200,
  });

  if (TOKEN) {
    const me = http.get(`${API}/users/me`, { headers: headers() });
    check(me, {
      'users/me 200 (token)': (r) => r.status === 200,
    });
  }

  sleep(1);
}
