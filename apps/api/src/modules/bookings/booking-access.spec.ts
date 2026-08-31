import { describe, expect, it } from 'vitest';
import { BookingType, UserRole } from '@xidmetal/shared';
import {
  isAssignedProvider,
  isBookingParticipant,
  isInstantUnassigned,
} from './booking-access';

const instantPending = {
  customerId: 'c1',
  providerId: 'catalog-owner',
  type: BookingType.INSTANT,
  acceptedAt: null,
};

const instantAccepted = {
  ...instantPending,
  providerId: 'p-accepted',
  acceptedAt: new Date('2026-01-01'),
};

const scheduled = {
  customerId: 'c1',
  providerId: 'p1',
  type: BookingType.SCHEDULED,
  acceptedAt: null,
};

describe('booking-access', () => {
  it('INSTANT PENDING seed provider təyin olunmayıb', () => {
    expect(isInstantUnassigned(instantPending)).toBe(true);
    expect(isAssignedProvider('catalog-owner', instantPending)).toBe(false);
    expect(isBookingParticipant('catalog-owner', UserRole.PROVIDER, instantPending)).toBe(
      false,
    );
  });

  it('INSTANT PENDING xidmət alan iştirakçıdır', () => {
    expect(isBookingParticipant('c1', UserRole.CUSTOMER, instantPending)).toBe(true);
  });

  it('INSTANT qəbul olunmuş provider iştirakçıdır', () => {
    expect(isAssignedProvider('p-accepted', instantAccepted)).toBe(true);
    expect(isBookingParticipant('p-accepted', UserRole.PROVIDER, instantAccepted)).toBe(
      true,
    );
    expect(isBookingParticipant('catalog-owner', UserRole.PROVIDER, instantAccepted)).toBe(
      false,
    );
  });

  it('SCHEDULED provider acceptedAt olmasa da iştirakçıdır', () => {
    expect(isAssignedProvider('p1', scheduled)).toBe(true);
    expect(isBookingParticipant('p1', UserRole.PROVIDER, scheduled)).toBe(true);
  });

  it('admin həmişə iştirakçıdır', () => {
    expect(isBookingParticipant('a1', UserRole.ADMIN, instantPending)).toBe(true);
  });
});
