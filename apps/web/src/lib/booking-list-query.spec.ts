import { describe, expect, it } from 'vitest';
import { BookingStatus } from '@xidmetal/shared';
import {
  buildBookingStatusTabs,
  DEFAULT_BOOKING_LIST_PARAMS,
  getBookingListQueryParams,
  getBookingStatusQueryParams,
} from './booking-list-query';

const TABS = buildBookingStatusTabs();

describe('getBookingListQueryParams', () => {
  it('limit və status tabını saxlayır', () => {
    expect(getBookingListQueryParams('pending', 'all', TABS)).toEqual({
      limit: '50',
      status: BookingStatus.PENDING,
    });
  });

  it('düzgün sifariş nömrəsini search parametrinə çevirir', () => {
    expect(
      getBookingListQueryParams('all', 'all', TABS, ' xm-26-000421 '),
    ).toEqual({
      limit: '50',
      search: 'xm-26-000421',
    });
  });

  it('natamam XM prefiksini göndərmir', () => {
    expect(getBookingListQueryParams('all', 'all', TABS, 'XM')).toEqual({
      limit: '50',
    });
  });

  it('status dropdown-u axtarışla birləşdirir', () => {
    expect(
      getBookingListQueryParams('all', BookingStatus.COMPLETED, TABS, '421'),
    ).toEqual({
      limit: '50',
      status: BookingStatus.COMPLETED,
      search: '421',
    });
  });
});

describe('DEFAULT_BOOKING_LIST_PARAMS', () => {
  it('Hamısı tabı üçün yalnız limit saxlayır', () => {
    expect(DEFAULT_BOOKING_LIST_PARAMS).toEqual({ limit: '50' });
  });
});

describe('getBookingStatusQueryParams', () => {
  it('aktiv tab üçün statuses siyahısı qaytarır', () => {
    const params = getBookingStatusQueryParams('active', 'all', TABS);
    expect(params.statuses).toContain(BookingStatus.CONFIRMED);
    expect(params.status).toBeUndefined();
  });
});
