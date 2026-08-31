import { describe, expect, it } from 'vitest';
import {
  BookingStatus,
  BookingType,
  bookingHoldsServiceCapacity,
  effectiveServiceCapacity,
  isSlotAtCapacity,
} from '@xidmetal/shared';

describe('service capacity helpers', () => {
  it('təcili axtarış PENDING tutum tutmur', () => {
    expect(
      bookingHoldsServiceCapacity(BookingType.INSTANT, BookingStatus.PENDING),
    ).toBe(false);
    expect(
      bookingHoldsServiceCapacity(BookingType.INSTANT, BookingStatus.CONFIRMED),
    ).toBe(true);
  });

  it('planlaşdırılmış PENDING rezervasiyadır', () => {
    expect(
      bookingHoldsServiceCapacity(BookingType.SCHEDULED, BookingStatus.PENDING),
    ).toBe(true);
  });

  it('şirkət tutumu komanda sayına bərabərdir, fərdi həmişə 1', () => {
    expect(effectiveServiceCapacity('COMPANY', 3)).toBe(3);
    expect(effectiveServiceCapacity('COMPANY', 0)).toBe(1);
    expect(effectiveServiceCapacity('INDIVIDUAL', 5)).toBe(1);
  });

  it('slot doludur yalnız tutum bitəndə', () => {
    expect(isSlotAtCapacity(1, 3)).toBe(false);
    expect(isSlotAtCapacity(3, 3)).toBe(true);
    expect(isSlotAtCapacity(1, 1)).toBe(true);
  });
});
