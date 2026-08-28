import { describe, expect, it } from 'vitest';
import { isAccessJwtRevoked } from './access-jwt';

describe('isAccessJwtRevoked', () => {
  it('iat yoxdursa ləğv edir', () => {
    expect(isAccessJwtRevoked(undefined, new Date())).toBe(true);
    expect(isAccessJwtRevoked(undefined)).toBe(true);
  });

  it('cutoff-dan əvvəl verilmiş tokeni ləğv edir', () => {
    const issuedAt = Math.floor(Date.now() / 1000) - 60;
    const revokedAt = new Date();
    expect(isAccessJwtRevoked(issuedAt, null, revokedAt)).toBe(true);
  });

  it('cutoff-dan sonra verilmiş tokeni saxlayır', () => {
    const revokedAt = new Date(Date.now() - 60_000);
    const issuedAt = Math.floor(Date.now() / 1000);
    expect(isAccessJwtRevoked(issuedAt, revokedAt)).toBe(false);
  });

  it('bütün cutoff-lar boşdursa ləğv etmir', () => {
    expect(isAccessJwtRevoked(1_700_000_000, null, undefined)).toBe(false);
  });
});
