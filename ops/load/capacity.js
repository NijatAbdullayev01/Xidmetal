/**
 * k6 capacity — 5k concurrent hədəfinə yaxın HTTP smoke ramp.
 *
 * Real brauzer/WS 5k simulyasiya etmir; API + nginx + DB dayanıqlığını yoxlayır.
 *
 *   BASE_URL=http://localhost:4000 pnpm load:capacity
 *
 * Thresholds: error < 5%, p95 < 2s (yüksək VU — real prod ölçüsü).
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = (__ENV.BASE_URL || 'http://localhost:4000').replace(/\/$/, '');
const API = `${BASE_URL}/api/v1`;

export const options = {
  stages: [
    { duration: '30s', target: 100 },
    { duration: '1m', target: 500 },
    { duration: '2m', target: 1500 },
    { duration: '2m', target: 3000 },
    { duration: '2m', target: 5000 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<2000'],
  },
};

export default function () {
  const paths = [
    `${API}/health`,
    `${API}/categories`,
    `${API}/services?page=1&limit=20`,
  ];
  const url = paths[Math.floor(Math.random() * paths.length)];
  const res = http.get(url, { headers: { Accept: 'application/json' } });
  check(res, {
    'status ok': (r) => r.status >= 200 && r.status < 500,
  });
  sleep(0.5 + Math.random());
}
