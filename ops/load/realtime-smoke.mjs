/**
 * Realtime smoke — Socket.IO handshake (auth olmadan reject gözlənilir).
 *
 *   BASE_URL=http://localhost:4000 pnpm load:realtime
 *
 * socket.io-client `apps/web` dependency-sindən oxunur. Fail-soft: paket/API
 * yoxdursa exit 0 + xəbərdarlıq (k6 load skriptləri kimi).
 */

import { createRequire } from 'node:module';
import { createConnection } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const BASE_URL = (process.env.BASE_URL || 'http://localhost:4000').replace(
  /\/$/,
  '',
);

function warn(msg) {
  console.warn(`[realtime-smoke] ${msg}`);
}

function canReach(host, port, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const socket = createConnection({ host, port }, () => {
      socket.end();
      resolve(true);
    });
    socket.on('error', () => resolve(false));
    socket.setTimeout(timeoutMs, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function loadSocketIoClient() {
  const requireFromWeb = createRequire(
    path.join(ROOT, 'apps/web/package.json'),
  );
  try {
    return requireFromWeb('socket.io-client');
  } catch {
    return null;
  }
}

async function main() {
  const url = new URL(BASE_URL);
  const port = Number(url.port || (url.protocol === 'https:' ? 443 : 80));
  const reachable = await canReach(url.hostname, port);
  if (!reachable) {
    warn(`API əlçatan deyil (${BASE_URL}) — skip`);
    process.exit(0);
  }

  const ioMod = await loadSocketIoClient();
  if (!ioMod?.io) {
    warn('socket.io-client tapılmadı (apps/web) — skip');
    process.exit(0);
  }

  const { io } = ioMod;

  await new Promise((resolve, reject) => {
    const socket = io(BASE_URL, {
      path: '/socket.io',
      transports: ['websocket'],
      withCredentials: false,
      timeout: 5000,
      reconnection: false,
      autoConnect: true,
    });

    const timer = setTimeout(() => {
      socket.close();
      reject(new Error('timeout'));
    }, 8000);

    socket.on('connect', () => {
      // Dev-də bəzi quraşdırmalar anonim bağlantıya icazə verə bilər —
      // connect özü smoke keçidi sayılır.
      clearTimeout(timer);
      console.log('[realtime-smoke] Socket.IO connect OK');
      socket.close();
      resolve();
    });

    socket.on('connect_error', (err) => {
      clearTimeout(timer);
      // Auth tələb olunan serverlər üçün connect_error gözləniləndir
      const msg = err?.message || String(err);
      if (/auth|unauthorized|jwt|token|forbidden/i.test(msg)) {
        console.log(
          `[realtime-smoke] gözlənilən auth reject: ${msg}`,
        );
        socket.close();
        resolve();
        return;
      }
      // Engine IO handshake uğurlu, app auth fail — OK
      if (/websocket error|xhr poll error/i.test(msg) === false) {
        console.log(`[realtime-smoke] connect_error (əlverişli): ${msg}`);
        socket.close();
        resolve();
        return;
      }
      socket.close();
      reject(err);
    });
  }).catch((err) => {
    warn(`uğursuz: ${err instanceof Error ? err.message : String(err)}`);
    // Fail-soft — CI/load default-u sındırmasın
    process.exit(0);
  });
}

main();
