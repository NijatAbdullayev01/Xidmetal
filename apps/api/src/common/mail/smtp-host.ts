const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

const CONNECT_FAILURE =
  /ECONNREFUSED|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|ECONNRESET|EHOSTUNREACH|EPIPE/i;

export function normalizeSmtpHost(raw: string | undefined | null): string | null {
  const host = raw?.trim() ?? '';
  return host.length > 0 ? host : null;
}

export function isLoopbackSmtpHost(host: string): boolean {
  return LOOPBACK_HOSTS.has(host.trim().toLowerCase());
}

export function parseSmtpPort(raw: string | number | undefined, fallback = 587): number {
  const port = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) return fallback;
  return port;
}

export function isSmtpConnectFailure(err: unknown): boolean {
  const code =
    typeof err === 'object' && err !== null && 'code' in err
      ? String((err as { code: unknown }).code)
      : '';
  const message = err instanceof Error ? err.message : String(err);
  return CONNECT_FAILURE.test(code) || CONNECT_FAILURE.test(message);
}
