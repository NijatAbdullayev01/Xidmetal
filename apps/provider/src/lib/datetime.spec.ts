import { describe, expect, it } from 'vitest';
import {
  BookingType,
  formatAzDate,
  formatAzDateTime,
  formatAzTime,
  formatBookingDateTime,
} from '@xidmetal/shared';

describe('formatAzDate / formatAzDateTime', () => {
  it('UTC anı Bakı vaxtına (UTC+4) çevirir', () => {
    const utc = '2026-08-27T14:00:00.000Z';
    expect(formatAzDate(utc)).toBe('27 avqust 2026');
    expect(formatAzTime(utc)).toBe('18:00');
    expect(formatAzDateTime(utc)).toBe('27 avqust 2026, 18:00');
  });

  it('Bakı gecə yarısından sonra tarixi irəli çəkir', () => {
    expect(formatAzDateTime('2026-12-31T20:00:00.000Z')).toBe(
      '1 yanvar 2027, 00:00',
    );
  });

  it('YYYY-MM-DD təqvim gününü timezone-a görə dəyişmir', () => {
    expect(formatAzDate('2026-08-27')).toBe('27 avqust 2026');
  });

  it('etibarsız dəyərdə tire qaytarır', () => {
    expect(formatAzDateTime('not-a-date')).toBe('—');
    expect(formatAzDate('2026-13-40')).toBe('—');
  });
});

describe('formatBookingDateTime', () => {
  it('planlı sifarişdə təyin olunmuş slotu göstərir', () => {
    expect(
      formatBookingDateTime({
        type: BookingType.SCHEDULED,
        createdAt: '2026-08-20T10:00:00.000Z',
        scheduledAt: '2026-08-27T14:00:00.000Z',
      }),
    ).toBe('27 avqust 2026, 18:00');
  });

  it('təcili sifarişdə yaradılma vaxtını göstərir', () => {
    expect(
      formatBookingDateTime({
        type: BookingType.INSTANT,
        createdAt: '2026-08-27T14:00:00.000Z',
        scheduledAt: '2026-08-27T14:15:00.000Z',
      }),
    ).toBe('27 avqust 2026, 18:00');
  });
});
