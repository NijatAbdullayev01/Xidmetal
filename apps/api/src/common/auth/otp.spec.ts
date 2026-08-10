import { describe, expect, it } from 'vitest';
import { generateNumericOtp, OTP_DIGITS } from './otp';

describe('generateNumericOtp', () => {
  it('default 8 rəqəm qaytarır', () => {
    const code = generateNumericOtp();
    expect(code).toHaveLength(OTP_DIGITS);
    expect(code).toMatch(/^\d{8}$/);
  });

  it('leading zero yaratmır (fixed length)', () => {
    for (let i = 0; i < 20; i += 1) {
      expect(generateNumericOtp(8)[0]).not.toBe('0');
    }
  });
});
