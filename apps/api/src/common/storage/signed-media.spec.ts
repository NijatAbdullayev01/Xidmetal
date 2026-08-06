import { describe, expect, it } from 'vitest';
import {
  isPrivateUploadKey,
  signPrivateMediaUrl,
  stripMediaSignature,
  verifyPrivateMediaAccess,
} from './signed-media';

describe('signed-media', () => {
  const secret = 'test-jwt-secret-at-least-32-chars!!';

  it('stripMediaSignature query silir', () => {
    expect(
      stripMediaSignature('http://localhost:4000/uploads/bookings/a.jpg?exp=1&sig=abc'),
    ).toBe('http://localhost:4000/uploads/bookings/a.jpg');
  });

  it('services ictimai qalır', () => {
    const url = 'http://localhost:4000/uploads/services/x.jpg';
    expect(signPrivateMediaUrl(url, secret)).toBe(url);
    expect(isPrivateUploadKey('services/x.jpg')).toBe(false);
  });

  it('bookings imzalanır və doğrulanır', () => {
    const url = 'http://localhost:4000/uploads/bookings/x.jpg';
    const signed = signPrivateMediaUrl(url, secret, 60);
    expect(signed).toContain('sig=');
    expect(signed).toContain('exp=');

    const parsed = new URL(signed);
    const key = 'bookings/x.jpg';
    expect(
      verifyPrivateMediaAccess({
        uploadKey: key,
        expRaw: parsed.searchParams.get('exp') ?? undefined,
        sigRaw: parsed.searchParams.get('sig') ?? undefined,
        secret,
      }),
    ).toBe(true);
  });

  it('vaxtı keçmiş imza rədd edilir', () => {
    expect(
      verifyPrivateMediaAccess({
        uploadKey: 'bookings/x.jpg',
        expRaw: String(Math.floor(Date.now() / 1000) - 10),
        sigRaw: 'deadbeef',
        secret,
      }),
    ).toBe(false);
  });
});
