import { describe, expect, it } from 'vitest';
import {
  formatBookingOrderNumber,
  normalizeBookingOrderNumber,
  parseBookingOrderNumberSearch,
} from '@xidmetal/shared';

describe('booking order number (shared)', () => {
  it('oxunaqlı XM-YY-NNNNNN formatı verir', () => {
    expect(formatBookingOrderNumber(7, new Date('2026-03-01T08:00:00.000Z'))).toBe(
      'XM-26-000007',
    );
  });

  it('axtarış üçün nömrəni normallaşdırır', () => {
    expect(normalizeBookingOrderNumber('XM-26-000007')).toBe('XM-26-000007');
    expect(normalizeBookingOrderNumber('random')).toBeNull();
  });
});

describe('parseBookingOrderNumberSearch', () => {
  it('tam nömrəni dəqiq uyğunluğa çevirir', () => {
    expect(parseBookingOrderNumberSearch('XM-26-000421')).toEqual({
      type: 'equals',
      value: 'XM-26-000421',
    });
    expect(parseBookingOrderNumberSearch(' xm 26 000421 ')).toEqual({
      type: 'equals',
      value: 'XM-26-000421',
    });
    expect(parseBookingOrderNumberSearch('XM26000421')).toEqual({
      type: 'equals',
      value: 'XM-26-000421',
    });
  });

  it('ətraf mətn içindən nömrəni çıxarır', () => {
    expect(parseBookingOrderNumberSearch('Sifariş № XM-26-000421')).toEqual({
      type: 'equals',
      value: 'XM-26-000421',
    });
  });

  it('il və natamam ardıcıllıq üçün contains istifadə edir', () => {
    expect(parseBookingOrderNumberSearch('XM-26')).toEqual({
      type: 'contains',
      value: 'XM-26',
    });
    expect(parseBookingOrderNumberSearch('XM-26-000')).toEqual({
      type: 'contains',
      value: 'XM-26-000',
    });
  });

  it('3–8 rəqəmlik seq axtarışını qəbul edir', () => {
    expect(parseBookingOrderNumberSearch('421')).toEqual({
      type: 'contains',
      value: '421',
    });
    expect(parseBookingOrderNumberSearch('000421')).toEqual({
      type: 'contains',
      value: '000421',
    });
  });

  it('qısa və ya mənasız daxiletməni rədd edir', () => {
    expect(parseBookingOrderNumberSearch('')).toBeNull();
    expect(parseBookingOrderNumberSearch('XM')).toBeNull();
    expect(parseBookingOrderNumberSearch('12')).toBeNull();
    expect(parseBookingOrderNumberSearch('hello')).toBeNull();
  });
});
