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

  it('services imzalanır', () => {
    const url = 'http://localhost:4000/uploads/services/x.jpg';
    const signed = signPrivateMediaUrl(url, secret, 60);
    expect(signed).toContain('sig=');
    expect(isPrivateUploadKey('services/x.jpg')).toBe(true);
  });

  it('avatars imzalanır', () => {
    const url = 'http://localhost:4000/uploads/avatars/x.jpg';
    const signed = signPrivateMediaUrl(url, secret, 60);
    expect(signed).toContain('sig=');
    expect(isPrivateUploadKey('avatars/x.jpg')).toBe(true);
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

  it('services və avatars da doğrulanır', () => {
    for (const key of ['services/x.jpg', 'avatars/x.jpg'] as const) {
      const signed = signPrivateMediaUrl(
        `http://localhost:4000/uploads/${key}`,
        secret,
        60,
      );
      const parsed = new URL(signed);
      expect(
        verifyPrivateMediaAccess({
          uploadKey: key,
          expRaw: parsed.searchParams.get('exp') ?? undefined,
          sigRaw: parsed.searchParams.get('sig') ?? undefined,
          secret,
        }),
      ).toBe(true);
      expect(
        verifyPrivateMediaAccess({
          uploadKey: key,
          expRaw: undefined,
          sigRaw: undefined,
          secret,
        }),
      ).toBe(false);
    }
  });

  it('kyc və messages da imzalanır', () => {
    for (const key of ['kyc/x.jpg', 'messages/x.jpg'] as const) {
      const signed = signPrivateMediaUrl(
        `http://localhost:4000/uploads/${key}`,
        secret,
        60,
      );
      expect(signed).toContain('sig=');
      expect(isPrivateUploadKey(key)).toBe(true);
    }
  });

  it('KYC default TTL 15 dəqiqədir', () => {
    const before = Math.floor(Date.now() / 1000);
    const signed = signPrivateMediaUrl(
      'http://localhost:4000/uploads/kyc/doc.jpg',
      secret,
    );
    const exp = Number(new URL(signed).searchParams.get('exp'));
    expect(exp).toBeGreaterThanOrEqual(before + 15 * 60 - 2);
    expect(exp).toBeLessThanOrEqual(before + 15 * 60 + 2);
  });
});
