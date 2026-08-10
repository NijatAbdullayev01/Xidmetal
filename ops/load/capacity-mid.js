/**
 * k6 mid-capacity — tək API prosesinin praktik sərhədi (~800 VU).
 * 5k üçün API×3+ (docker compose --scale) lazımdır — bax docs/CAPACITY.md
 *
 *   BASE_URL=http://localhost:4000 pnpm exec bash ops/load/run.sh capacity-mid
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = (__ENV.BASE_URL || 'http://localhost:4000').replace(/\/$/, '');
const API = `${BASE_URL}/api/v1`;

export const options = {
  stages: [
    { duration: '20s', target: 100 },
    { duration: '30s', target: 300 },
    { duration: '40s', target: 500 },
    { duration: '40s', target: 800 },
    { duration: '20s', target: 0 },
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
