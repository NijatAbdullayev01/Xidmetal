import { describe, expect, it } from 'vitest';
import { ReportTargetType } from '@xidmetal/shared';
import {
  mayReportBooking,
  mayReportMessage,
  mayReportService,
  mayReportUser,
  reportTargetNotFoundMessage,
} from './report-target-access';

describe('report-target-access', () => {
  it('booking — yalnız tərəflər', () => {
    expect(
      mayReportBooking({
        reporterId: 'c1',
        booking: { customerId: 'c1', providerId: 'p1' },
      }),
    ).toBe(true);
    expect(
      mayReportBooking({
        reporterId: 'x',
        booking: { customerId: 'c1', providerId: 'p1' },
      }),
    ).toBe(false);
    expect(mayReportBooking({ reporterId: 'c1', booking: null })).toBe(false);
  });

  it('service — müştəri booking tarixçəsi + öz xidmət yox', () => {
    expect(
      mayReportService({
        reporterId: 'c1',
        service: { providerId: 'p1' },
        hasCustomerBooking: true,
      }),
    ).toBe(true);
    expect(
      mayReportService({
        reporterId: 'p1',
        service: { providerId: 'p1' },
        hasCustomerBooking: true,
      }),
    ).toBe(false);
    expect(
      mayReportService({
        reporterId: 'c1',
        service: { providerId: 'p1' },
        hasCustomerBooking: false,
      }),
    ).toBe(false);
  });

  it('user — özünü yox, ortaq əlaqə lazımdır', () => {
    expect(
      mayReportUser({
        reporterId: 'a',
        targetUserId: 'b',
        targetExists: true,
        hasSharedBookingOrConversation: true,
      }),
    ).toBe(true);
    expect(
      mayReportUser({
        reporterId: 'a',
        targetUserId: 'a',
        targetExists: true,
        hasSharedBookingOrConversation: true,
      }),
    ).toBe(false);
    expect(
      mayReportUser({
        reporterId: 'a',
        targetUserId: 'b',
        targetExists: true,
        hasSharedBookingOrConversation: false,
      }),
    ).toBe(false);
  });

  it('message — söhbət iştirakçısı', () => {
    expect(
      mayReportMessage({
        reporterId: 'c1',
        message: { conversation: { customerId: 'c1', providerId: 'p1' } },
      }),
    ).toBe(true);
    expect(
      mayReportMessage({
        reporterId: 'x',
        message: { conversation: { customerId: 'c1', providerId: 'p1' } },
      }),
    ).toBe(false);
  });

  it('not-found mesajları AZ', () => {
    expect(reportTargetNotFoundMessage(ReportTargetType.BOOKING)).toContain('Sifariş');
  });
});
