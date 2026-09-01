import { ConfigService } from '@nestjs/config';
import type { ServerOptions } from 'socket.io';

export function resolveSocketCorsOrigins(
  config: Pick<ConfigService, 'get'>,
): string | string[] | false {
  const socketCors = config.get<string>('SOCKET_CORS_ORIGIN')?.trim();
  const corsOriginRaw =
    socketCors || config.get<string>('CORS_ORIGIN', 'http://localhost:3120,http://localhost:3121');
  const origins = [
    ...corsOriginRaw.split(','),
    config.get<string>('NEXT_PUBLIC_APP_URL'),
    config.get<string>('NEXT_PUBLIC_ADMIN_URL'),
    config.get<string>('NEXT_PUBLIC_PROVIDER_URL'),
  ]
    .map((origin) => origin?.trim())
    .filter((origin): origin is string => Boolean(origin))
    .filter((origin, index, all) => all.indexOf(origin) === index);

  if (origins.length === 0) return false;
  return origins.length === 1 ? origins[0]! : origins;
}

export function buildSocketCorsOptions(
  config: Pick<ConfigService, 'get'>,
): ServerOptions['cors'] {
  return {
    origin: resolveSocketCorsOrigins(config),
    credentials: true,
  };
}
