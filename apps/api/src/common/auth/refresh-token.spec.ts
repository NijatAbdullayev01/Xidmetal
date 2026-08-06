import { describe, expect, it } from 'vitest';
import { hashRefreshToken } from './refresh-token';

describe('hashRefreshToken', () => {
  it('eyni token üçün sabit SHA-256 hash qaytarır', () => {
    const a = hashRefreshToken('test-refresh-token');
    const b = hashRefreshToken('test-refresh-token');
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
    expect(a).toMatch(/^[a-f0-9]+$/);
  });

  it('fərqli tokenlər fərqli hash verir', () => {
    expect(hashRefreshToken('alpha')).not.toBe(hashRefreshToken('beta'));
  });

  it('plain token-u saxlamır', () => {
    const plain = 'super-secret-refresh';
    expect(hashRefreshToken(plain)).not.toContain(plain);
  });
});
