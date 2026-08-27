import { describe, expect, it } from 'vitest';
import {
  BookingStatus,
  BookingType,
  bookingMessagingBlockedMessage,
  isBookingMessagingEnabled,
  isBookingPriceVisibleToCustomer,
  isBookingProviderRatingVisible,
} from '@xidmetal/shared';

describe('isBookingMessagingEnabled (sifariş mesaj qapısı)', () => {
  it('gözləmə və terminal statuslarda bağlıdır', () => {
    expect(isBookingMessagingEnabled(BookingStatus.PENDING)).toBe(false);
    expect(isBookingMessagingEnabled(BookingStatus.CANCELLED)).toBe(false);
    expect(isBookingMessagingEnabled(BookingStatus.REJECTED)).toBe(false);
    expect(isBookingMessagingEnabled(BookingStatus.COMPLETED)).toBe(false);
  });

  it('qəbuldan icraya qədər açıqdır', () => {
    expect(isBookingMessagingEnabled(BookingStatus.CONFIRMED)).toBe(true);
    expect(isBookingMessagingEnabled(BookingStatus.EN_ROUTE)).toBe(true);
    expect(isBookingMessagingEnabled(BookingStatus.ARRIVED)).toBe(true);
    expect(isBookingMessagingEnabled(BookingStatus.IN_PROGRESS)).toBe(true);
  });

  it('bağlı status üçün izah mesajı', () => {
    expect(bookingMessagingBlockedMessage(BookingStatus.COMPLETED)).toBe(
      'Tamamlanmış sifarişdə mesaj yazıla bilməz',
    );
    expect(bookingMessagingBlockedMessage(BookingStatus.PENDING)).toBe(
      'Mesaj yazmaq üçün xidmət verən sifarişi qəbul etməlidir',
    );
  });
});

describe('isBookingPriceVisibleToCustomer (sifariş qiyməti)', () => {
  it('təsdiqdən əvvəl gizlidir', () => {
    expect(isBookingPriceVisibleToCustomer(BookingStatus.PENDING)).toBe(false);
    expect(isBookingPriceVisibleToCustomer(BookingStatus.REJECTED)).toBe(false);
    expect(isBookingPriceVisibleToCustomer(BookingStatus.CANCELLED, null)).toBe(
      false,
    );
  });

  it('xidmət verən qəbul etdikdən sonra görünür', () => {
    expect(isBookingPriceVisibleToCustomer(BookingStatus.CONFIRMED)).toBe(true);
    expect(isBookingPriceVisibleToCustomer(BookingStatus.COMPLETED)).toBe(true);
    expect(
      isBookingPriceVisibleToCustomer(
        BookingStatus.CANCELLED,
        '2026-08-27T10:00:00.000Z',
      ),
    ).toBe(true);
  });
});

describe('isBookingProviderRatingVisible (xidmət verən reytinqi)', () => {
  it('təcili axtarış zamanı gizlidir', () => {
    expect(
      isBookingProviderRatingVisible(BookingType.INSTANT, null),
    ).toBe(false);
    expect(isBookingProviderRatingVisible(BookingType.INSTANT)).toBe(false);
  });

  it('təcili sifariş qəbulundan sonra görünür', () => {
    expect(
      isBookingProviderRatingVisible(
        BookingType.INSTANT,
        '2026-08-27T10:00:00.000Z',
      ),
    ).toBe(true);
  });

  it('planlı sifarişdə həmişə görünür', () => {
    expect(isBookingProviderRatingVisible(BookingType.SCHEDULED)).toBe(true);
    expect(
      isBookingProviderRatingVisible(BookingType.SCHEDULED, null),
    ).toBe(true);
  });
});

