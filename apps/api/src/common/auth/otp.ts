import { randomInt } from 'crypto';

/** E-poçt təsdiq kodu uzunluğu — brute-force üçün 6 rəqəm zəifdir */
export const OTP_DIGITS = 8;

/** Kriptografik təsadüfi N rəqəmli OTP (leading zero yox — fixed length) */
export function generateNumericOtp(digits = OTP_DIGITS): string {
  if (digits < 6 || digits > 12) {
    throw new Error('OTP rəqəm sayı 6–12 arası olmalıdır');
  }
  const min = 10 ** (digits - 1);
  const max = 10 ** digits;
  return randomInt(min, max).toString();
}
