import { ForbiddenException } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import {
  CLIENT_APP,
  CLIENT_APP_HEADER,
  UserRole,
  type ClientApp,
} from '@xidmetal/shared';
import type { Request } from 'express';

/** JWT aud claim → ClientApp (string | string[] normallaşdırma) */
export function normalizeTokenAudience(aud: unknown): ClientApp | undefined {
  const raw = Array.isArray(aud) ? aud[0] : aud;
  if (raw === CLIENT_APP.ADMIN || raw === CLIENT_APP.MARKETPLACE) {
    return raw;
  }
  return undefined;
}

export function readClientAppFromHeaders(
  headers: Record<string, unknown> | undefined,
): ClientApp | undefined {
  if (!headers) return undefined;
  const header = headers[CLIENT_APP_HEADER];
  const raw = Array.isArray(header) ? header[0] : header;
  if (raw === CLIENT_APP.MARKETPLACE || raw === CLIENT_APP.ADMIN) {
    return raw;
  }
  return undefined;
}

export function readClientAppFromRequest(req: Request): ClientApp | undefined {
  return readClientAppFromHeaders(
    req.headers as Record<string, unknown> | undefined,
  );
}

/**
 * Header + JWT aud uyğunluğu + rol/app qaydası.
 * mode: 'http' → ForbiddenException; 'ws' → WsException
 */
export function assertSessionAudience(options: {
  headerApp?: ClientApp;
  tokenAud?: ClientApp;
  role: string;
  mode: 'http' | 'ws';
}): void {
  const { headerApp, tokenAud, role, mode } = options;
  const reject = (message: string): never => {
    if (mode === 'ws') {
      throw new WsException(message);
    }
    throw new ForbiddenException(message);
  };

  if (headerApp && tokenAud && headerApp !== tokenAud) {
    reject('Sessiya bu tətbiq üçün etibarsızdır');
  }

  const effectiveApp = headerApp ?? tokenAud;
  if (!effectiveApp) return;

  if (effectiveApp === CLIENT_APP.MARKETPLACE && role === UserRole.ADMIN) {
    reject('Sessiya bu tətbiq üçün etibarsızdır');
  }
  if (effectiveApp === CLIENT_APP.ADMIN && role !== UserRole.ADMIN) {
    reject('Sessiya bu tətbiq üçün etibarsızdır');
  }
}
