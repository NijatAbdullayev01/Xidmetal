import { describe, expect, it } from 'vitest';
import { bookingWindowEndMs, rangesOverlap } from './booking-overlap';

describe('rangesOverlap', () => {
  it('eyni başlanğıc → kəsişir', () => {
    expect(rangesOverlap(100, 200, 100, 200)).toBe(true);
  });

  it('qismən örtüşmə → kəsişir', () => {
    expect(rangesOverlap(100, 200, 150, 250)).toBe(true);
  });

  it('bitişik uclar (aEnd === bStart) → kəsişmir', () => {
    expect(rangesOverlap(100, 200, 200, 300)).toBe(false);
  });

  it('tam ayrı intervallar → kəsişmir', () => {
    expect(rangesOverlap(100, 200, 300, 400)).toBe(false);
  });

  it('bir interval digərini tam əhatə edir → kəsişir', () => {
    expect(rangesOverlap(100, 400, 200, 300)).toBe(true);
  });
});

describe('bookingWindowEndMs', () => {
  it('müsbət duration istifadə edir', () => {
    expect(bookingWindowEndMs(0, 30)).toBe(30 * 60_000);
  });

  it('sıfır/mənfi duration üçün 60 dəq default', () => {
    expect(bookingWindowEndMs(0, 0)).toBe(60 * 60_000);
    expect(bookingWindowEndMs(0, -5)).toBe(60 * 60_000);
  });
});
