import { describe, expect, it } from 'vitest';
import {
  isLoopbackSmtpHost,
  isSmtpConnectFailure,
  normalizeSmtpHost,
  parseSmtpPort,
} from './smtp-host';

describe('smtp-host', () => {
  it('normalizeSmtpHost boş və whitespace-i null edir', () => {
    expect(normalizeSmtpHost(undefined)).toBeNull();
    expect(normalizeSmtpHost('')).toBeNull();
    expect(normalizeSmtpHost('  ')).toBeNull();
    expect(normalizeSmtpHost('smtp.gmail.com')).toBe('smtp.gmail.com');
  });

  it('loopback hostları tanıyır', () => {
    expect(isLoopbackSmtpHost('localhost')).toBe(true);
    expect(isLoopbackSmtpHost('127.0.0.1')).toBe(true);
    expect(isLoopbackSmtpHost('::1')).toBe(true);
    expect(isLoopbackSmtpHost('smtp.gmail.com')).toBe(false);
  });

  it('SMTP portunu parse edir', () => {
    expect(parseSmtpPort('587')).toBe(587);
    expect(parseSmtpPort(465)).toBe(465);
    expect(parseSmtpPort('nope')).toBe(587);
    expect(parseSmtpPort(0)).toBe(587);
  });

  it('bağlantı xətalarını tanıyır', () => {
    expect(isSmtpConnectFailure(new Error('connect ECONNREFUSED 127.0.0.1:587'))).toBe(
      true,
    );
    expect(isSmtpConnectFailure({ code: 'ETIMEDOUT', message: 'timeout' })).toBe(true);
    expect(isSmtpConnectFailure(new Error('Invalid login'))).toBe(false);
  });
});
