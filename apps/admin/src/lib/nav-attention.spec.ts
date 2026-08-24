import { describe, expect, it } from 'vitest';
import {
  formatAttentionCount,
  formatAttentionLiveMessage,
  formatNavAttentionAria,
  navAttentionCount,
  shouldPlayAttentionSound,
} from './nav-attention';

const empty = { providersUnverified: 0, servicesPendingReview: 0 };

describe('navAttentionCount', () => {
  it('xidmət verənlər üçün təsdiq növbəsini qaytarır', () => {
    expect(
      navAttentionCount('/providers', { providersUnverified: 3, servicesPendingReview: 1 }),
    ).toBe(3);
  });

  it('xidmətlər üçün yoxlama növbəsini qaytarır', () => {
    expect(
      navAttentionCount('/services', { providersUnverified: 3, servicesPendingReview: 1 }),
    ).toBe(1);
  });

  it('digər menyularda 0 qaytarır', () => {
    expect(navAttentionCount('/users', { providersUnverified: 3, servicesPendingReview: 1 })).toBe(
      0,
    );
  });
});

describe('shouldPlayAttentionSound', () => {
  it('ilk snapshot-da səs çalmır', () => {
    expect(shouldPlayAttentionSound(null, { providersUnverified: 2, servicesPendingReview: 1 })).toBe(
      false,
    );
  });

  it('xidmət verən növbəsi artanda səs çalır', () => {
    expect(
      shouldPlayAttentionSound(
        { providersUnverified: 1, servicesPendingReview: 0 },
        { providersUnverified: 2, servicesPendingReview: 0 },
      ),
    ).toBe(true);
  });

  it('xidmət növbəsi artanda səs çalır', () => {
    expect(
      shouldPlayAttentionSound(
        { providersUnverified: 0, servicesPendingReview: 1 },
        { providersUnverified: 0, servicesPendingReview: 2 },
      ),
    ).toBe(true);
  });

  it('azalmada və eyni sayda səs çalmır', () => {
    expect(
      shouldPlayAttentionSound(
        { providersUnverified: 2, servicesPendingReview: 2 },
        { providersUnverified: 1, servicesPendingReview: 2 },
      ),
    ).toBe(false);
    expect(shouldPlayAttentionSound({ ...empty, providersUnverified: 1 }, { ...empty, providersUnverified: 1 })).toBe(
      false,
    );
  });
});

describe('formatters', () => {
  it('99-dan yuxarı sayları qısaldır', () => {
    expect(formatAttentionCount(5)).toBe('5');
    expect(formatAttentionCount(99)).toBe('99');
    expect(formatAttentionCount(100)).toBe('99+');
  });

  it('aria və live mətni yalnız növbə olanda doldurur', () => {
    expect(formatNavAttentionAria('Xidmət verənlər', 0)).toBeUndefined();
    expect(formatNavAttentionAria('Xidmət verənlər', 2)).toBe('Xidmət verənlər, 2 gözləyən');
    expect(formatAttentionLiveMessage(empty)).toBe('');
    expect(
      formatAttentionLiveMessage({ providersUnverified: 1, servicesPendingReview: 2 }),
    ).toBe('1 xidmət verən təsdiq gözləyir. 2 xidmət yoxlama gözləyir');
  });
});
