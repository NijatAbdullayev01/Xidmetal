import { describe, expect, it } from 'vitest';
import { buildSocketCorsOptions, resolveSocketCorsOrigins } from './realtime-cors';

function makeConfig(values: Record<string, string | undefined>) {
  return {
    get<T extends string>(key: string, defaultValue?: T): T | undefined {
      const value = values[key];
      return (value ?? defaultValue) as T | undefined;
    },
  };
}

describe('resolveSocketCorsOrigins', () => {
  it('SOCKET_CORS_ORIGIN varsa ona üstünlük verir', () => {
    const config = makeConfig({
      SOCKET_CORS_ORIGIN: 'https://socket.example.com, https://admin.example.com ',
      CORS_ORIGIN: 'https://ignored.example.com',
      NEXT_PUBLIC_APP_URL: 'https://app.example.com',
    });

    expect(resolveSocketCorsOrigins(config)).toEqual([
      'https://socket.example.com',
      'https://admin.example.com',
      'https://app.example.com',
    ]);
  });

  it('boş origin siyahısında deny-all qaytarır', () => {
    const config = makeConfig({
      SOCKET_CORS_ORIGIN: '   ',
      CORS_ORIGIN: '',
      NEXT_PUBLIC_APP_URL: undefined,
      NEXT_PUBLIC_ADMIN_URL: undefined,
    });

    expect(resolveSocketCorsOrigins(config)).toBe(false);
  });
});

describe('buildSocketCorsOptions', () => {
  it('credentials ilə birlikdə allowlist yaradır', () => {
    const config = makeConfig({
      CORS_ORIGIN: 'https://app.example.com,https://admin.example.com',
    });

    expect(buildSocketCorsOptions(config)).toEqual({
      origin: ['https://app.example.com', 'https://admin.example.com'],
      credentials: true,
    });
  });
});
