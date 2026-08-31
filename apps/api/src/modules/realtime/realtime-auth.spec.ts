import { describe, expect, it } from 'vitest';
import { UserRole } from '@xidmetal/shared';
import { canJoinBookingRoom, canPushLocation } from './realtime-auth';

describe('canJoinBookingRoom', () => {
  const booking = { customerId: 'c1', providerId: 'p1' };

  it('xidmət alan və provider qoşula bilər', () => {
    expect(canJoinBookingRoom({ id: 'c1', role: UserRole.CUSTOMER }, booking)).toBe(true);
    expect(canJoinBookingRoom({ id: 'p1', role: UserRole.PROVIDER }, booking)).toBe(true);
  });

  it('üçüncü şəxs qoşula bilməz', () => {
    expect(canJoinBookingRoom({ id: 'x', role: UserRole.CUSTOMER }, booking)).toBe(false);
  });

  it('admin qoşula bilər', () => {
    expect(canJoinBookingRoom({ id: 'a1', role: UserRole.ADMIN }, booking)).toBe(true);
  });

  it('INSTANT PENDING seed provider otağa qoşula bilməz', () => {
    const instant = {
      customerId: 'c1',
      providerId: 'catalog-owner',
      type: 'INSTANT',
      acceptedAt: null,
    };
    expect(
      canJoinBookingRoom({ id: 'catalog-owner', role: UserRole.PROVIDER }, instant),
    ).toBe(false);
    expect(canJoinBookingRoom({ id: 'c1', role: UserRole.CUSTOMER }, instant)).toBe(true);
  });
});

describe('canPushLocation', () => {
  it('yalnız provider push edə bilər', () => {
    expect(canPushLocation({ id: 'p1', role: UserRole.PROVIDER }, { providerId: 'p1' })).toBe(
      true,
    );
    expect(canPushLocation({ id: 'c1', role: UserRole.CUSTOMER }, { providerId: 'p1' })).toBe(
      false,
    );
  });

  it('INSTANT PENDING seed provider lokasiya göndərə bilməz', () => {
    expect(
      canPushLocation(
        { id: 'catalog-owner', role: UserRole.PROVIDER },
        { providerId: 'catalog-owner', type: 'INSTANT', acceptedAt: null },
      ),
    ).toBe(false);
  });
});
