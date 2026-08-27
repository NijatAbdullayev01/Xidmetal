import { describe, expect, it } from 'vitest';
import { wantsBookingReviewOpen } from './booking-review-query';

describe('wantsBookingReviewOpen', () => {
  it('e-poçt linkindəki review=1 parametrini tanıyır', () => {
    expect(wantsBookingReviewOpen({ review: '1' })).toBe(true);
    expect(wantsBookingReviewOpen({ review: 'true' })).toBe(true);
    expect(wantsBookingReviewOpen({ review: ['1'] })).toBe(true);
  });

  it('digər dəyərləri açmır', () => {
    expect(wantsBookingReviewOpen({})).toBe(false);
    expect(wantsBookingReviewOpen({ review: '0' })).toBe(false);
    expect(wantsBookingReviewOpen({ highlight: '1' })).toBe(false);
  });
});
