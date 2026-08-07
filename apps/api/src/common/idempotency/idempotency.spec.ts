import { describe, expect, it } from 'vitest';
import { ConflictException } from '@nestjs/common';
import {
  assertIdempotencyPayloadCompatible,
  hashIdempotencyPayload,
  normalizeIdempotencyKey,
} from './idempotency.helpers';

describe('idempotency helpers', () => {
  it('normalizeIdempotencyKey boşu null edir', () => {
    expect(normalizeIdempotencyKey(null)).toBeNull();
    expect(normalizeIdempotencyKey('  ')).toBeNull();
    expect(normalizeIdempotencyKey('abc-123')).toBe('abc-123');
  });

  it('eyni payload eyni hash verir', () => {
    const a = hashIdempotencyPayload({ amount: 10, currency: 'AZN' });
    const b = hashIdempotencyPayload({ amount: 10, currency: 'AZN' });
    expect(a).toBe(b);
  });

  it('fərqli payload conflict atır', () => {
    const stored = hashIdempotencyPayload({ amount: 10 });
    expect(() =>
      assertIdempotencyPayloadCompatible(stored, { amount: 20 }),
    ).toThrow(ConflictException);
  });

  it('eyni payload conflict atmaz', () => {
    const stored = hashIdempotencyPayload({ amount: 10 });
    expect(() =>
      assertIdempotencyPayloadCompatible(stored, { amount: 10 }),
    ).not.toThrow();
  });
});
