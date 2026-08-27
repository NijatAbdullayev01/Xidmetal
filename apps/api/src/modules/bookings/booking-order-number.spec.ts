import { describe, expect, it, vi } from 'vitest';
import {
  bakuYearTwoDigit,
  bookingOrderNumberLabel,
  formatBookingOrderNumber,
  isBookingOrderNumber,
  normalizeBookingOrderNumber,
} from '@xidmetal/shared';
import {
  allocateBookingOrderNumber,
  bookingOrderNumberSearchWhere,
} from './booking-order-number';

describe('formatBookingOrderNumber', () => {
  it('Bakı ili və 6 rəqəmli ardıcıllıqla XM-YY-NNNNNN qaytarır', () => {
    expect(formatBookingOrderNumber(421, new Date('2026-08-27T10:00:00.000Z'))).toBe(
      'XM-26-000421',
    );
  });

  it('Bakı gecə yarısından sonra ili irəli çəkir', () => {
    // 31 dek 2026 22:00 UTC = 1 yan 2027 02:00 Bakı
    expect(formatBookingOrderNumber(1, new Date('2026-12-31T22:00:00.000Z'))).toBe(
      'XM-27-000001',
    );
  });

  it('1 milyondan sonra padding-i aşır, amma format saxlanır', () => {
    expect(formatBookingOrderNumber(1_000_000, new Date('2026-01-01T00:00:00.000Z'))).toBe(
      'XM-26-1000000',
    );
  });

  it('sıfır və mənfi seq qəbul etmir', () => {
    expect(() => formatBookingOrderNumber(0)).toThrow(RangeError);
    expect(() => formatBookingOrderNumber(-1)).toThrow(RangeError);
  });
});

describe('normalizeBookingOrderNumber', () => {
  it('boşluq və kiçik hərfi normallaşdırır', () => {
    expect(normalizeBookingOrderNumber(' xm-26-000421 ')).toBe('XM-26-000421');
  });

  it('UUID və qısa mətni rədd edir', () => {
    expect(normalizeBookingOrderNumber('b1')).toBeNull();
    expect(
      normalizeBookingOrderNumber('550e8400-e29b-41d4-a716-446655440000'),
    ).toBeNull();
  });
});

describe('isBookingOrderNumber / label', () => {
  it('etiketi Azərbaycan dilində qurur', () => {
    expect(bookingOrderNumberLabel('XM-26-000421')).toBe('Sifariş № XM-26-000421');
  });

  it('yalnız düzgün formatı qəbul edir', () => {
    expect(isBookingOrderNumber('XM-26-000421')).toBe(true);
    expect(isBookingOrderNumber('XM-26-00042')).toBe(false);
  });
});

describe('bakuYearTwoDigit', () => {
  it('UTC ilindən asılı olmayaraq Bakı ilini götürür', () => {
    expect(bakuYearTwoDigit(new Date('2026-08-27T10:00:00.000Z'))).toBe('26');
  });
});

describe('allocateBookingOrderNumber', () => {
  it('sequence dəyərini formatlaşdırır', async () => {
    const db = {
      $queryRaw: vi.fn().mockResolvedValue([{ seq: 12n }]),
    };
    await expect(
      allocateBookingOrderNumber(db, new Date('2026-08-27T10:00:00.000Z')),
    ).resolves.toBe('XM-26-000012');
  });

  it('boş sequence cavabını rədd edir', async () => {
    const db = {
      $queryRaw: vi.fn().mockResolvedValue([]),
    };
    await expect(allocateBookingOrderNumber(db)).rejects.toThrow(
      'Sifariş nömrəsi yaradıla bilmədi',
    );
  });
});

describe('bookingOrderNumberSearchWhere', () => {
  it('boş axtarışı filtrə çevirmir', () => {
    expect(bookingOrderNumberSearchWhere()).toBeUndefined();
    expect(bookingOrderNumberSearchWhere('   ')).toBeUndefined();
  });

  it('tam nömrə üçün unique equals istifadə edir', () => {
    expect(bookingOrderNumberSearchWhere('xm-26-000421')).toEqual({
      orderNumber: 'XM-26-000421',
    });
  });

  it('rəqəm seq üçün contains istifadə edir', () => {
    expect(bookingOrderNumberSearchWhere('000421')).toEqual({
      orderNumber: { contains: '000421', mode: 'insensitive' },
    });
  });

  it('mənasız axtarışı boş nəticəyə bağlayır', () => {
    expect(bookingOrderNumberSearchWhere('hello')).toEqual({
      orderNumber: { equals: '__NO_MATCH__' },
    });
  });
});
