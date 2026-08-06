import { describe, expect, it } from 'vitest';
import {
  assertJwtSecretForRuntime,
  isPlaceholderJwtSecret,
} from './jwt-secret';

describe('jwt-secret', () => {
  it('placeholder aşkar edir', () => {
    expect(
      isPlaceholderJwtSecret('change-me-in-production-use-long-random-string'),
    ).toBe(true);
    expect(isPlaceholderJwtSecret('a'.repeat(40))).toBe(false);
  });

  it('production-da zəif secret fail edir', () => {
    expect(() =>
      assertJwtSecretForRuntime('change-me-in-production-use-long-random-string', 'production'),
    ).toThrow(/JWT_SECRET/);
  });

  it('development-da placeholder-ə icazə verir', () => {
    expect(() =>
      assertJwtSecretForRuntime('change-me-in-production-use-long-random-string', 'development'),
    ).not.toThrow();
  });
});
