import { describe, expect, it } from 'vitest';
import { BookingStatus } from '@xidmetal/shared';
import { buildBookingStatusTimeline } from './booking-status-timeline';

const BASE = {
  createdAt: '2026-08-27T10:00:00.000Z',
  acceptedAt: null as string | null,
  enRouteAt: null as string | null,
  arrivedAt: null as string | null,
  startedAt: null as string | null,
  completedAt: null as string | null,
  cancelledAt: null as string | null,
};

describe('buildBookingStatusTimeline', () => {
  it('gözləyən sifarişdə yaradılma vaxtını və növbəti mərhələləri göstərir', () => {
    const entries = buildBookingStatusTimeline({
      ...BASE,
      status: BookingStatus.PENDING,
    });

    expect(entries.map((entry) => entry.status)).toEqual([
      BookingStatus.PENDING,
      BookingStatus.CONFIRMED,
      BookingStatus.EN_ROUTE,
      BookingStatus.ARRIVED,
      BookingStatus.IN_PROGRESS,
      BookingStatus.COMPLETED,
    ]);
    expect(entries[0]).toMatchObject({
      label: 'Gözləyir',
      at: BASE.createdAt,
      current: true,
      reached: true,
    });
    expect(entries[1]).toMatchObject({
      at: null,
      current: false,
      reached: false,
    });
  });

  it('təsdiqlənmiş sifarişdə qəbul vaxtını doldurur', () => {
    const entries = buildBookingStatusTimeline({
      ...BASE,
      status: BookingStatus.CONFIRMED,
      acceptedAt: '2026-08-27T10:15:00.000Z',
    });

    expect(entries.find((entry) => entry.status === BookingStatus.CONFIRMED)).toMatchObject({
      label: 'Təsdiqlənib',
      at: '2026-08-27T10:15:00.000Z',
      current: true,
      reached: true,
    });
    expect(entries.find((entry) => entry.status === BookingStatus.EN_ROUTE)?.reached).toBe(
      false,
    );
  });

  it('ləğvdə yalnız keçilmiş addımları və ləğv vaxtını göstərir', () => {
    const entries = buildBookingStatusTimeline({
      ...BASE,
      status: BookingStatus.CANCELLED,
      acceptedAt: '2026-08-27T10:15:00.000Z',
      cancelledAt: '2026-08-27T11:00:00.000Z',
    });

    expect(entries.map((entry) => entry.status)).toEqual([
      BookingStatus.PENDING,
      BookingStatus.CONFIRMED,
      BookingStatus.CANCELLED,
    ]);
    expect(entries.at(-1)).toMatchObject({
      label: 'Ləğv edilib',
      at: '2026-08-27T11:00:00.000Z',
      current: true,
    });
  });

  it('tamamlanmış sifarişdə bütün keçid vaxtlarını doldurur', () => {
    const entries = buildBookingStatusTimeline({
      ...BASE,
      status: BookingStatus.COMPLETED,
      acceptedAt: '2026-08-27T10:15:00.000Z',
      enRouteAt: '2026-08-27T11:00:00.000Z',
      arrivedAt: '2026-08-27T11:20:00.000Z',
      startedAt: '2026-08-27T11:25:00.000Z',
      completedAt: '2026-08-27T12:00:00.000Z',
    });

    expect(entries.every((entry) => entry.reached)).toBe(true);
    expect(entries.find((entry) => entry.status === BookingStatus.COMPLETED)).toMatchObject({
      label: 'Tamamlanıb',
      at: '2026-08-27T12:00:00.000Z',
      current: true,
    });
    expect(entries.find((entry) => entry.status === BookingStatus.EN_ROUTE)?.at).toBe(
      '2026-08-27T11:00:00.000Z',
    );
  });

  it('imtina üçün ləğv vaxtı yoxdursa tire saxlayır', () => {
    const entries = buildBookingStatusTimeline({
      ...BASE,
      status: BookingStatus.REJECTED,
    });

    expect(entries.map((entry) => entry.status)).toEqual([
      BookingStatus.PENDING,
      BookingStatus.REJECTED,
    ]);
    expect(entries.at(-1)).toMatchObject({
      label: 'İmtina edilib',
      at: null,
      current: true,
    });
  });
});
