import { describe, expect, it } from 'vitest';
import {
  adminQueueTabPrefix,
  bumpedAdminQueueId,
  formatAttentionCount,
  formatAttentionLiveMessage,
  formatNavAttentionAria,
  navAttentionCount,
  shouldPlayAttentionSound,
} from './nav-attention';

const empty = {
  providersUnverified: 0,
  servicesPendingReview: 0,
  reviewsPending: 0,
  reportsPending: 0,
};

describe('navAttentionCount', () => {
  it('xidmət verənlər üçün təsdiq növbəsini qaytarır', () => {
    expect(
      navAttentionCount('/providers', {
        ...empty,
        providersUnverified: 3,
        servicesPendingReview: 1,
      }),
    ).toBe(3);
  });

  it('xidmətlər üçün yoxlama növbəsini qaytarır', () => {
    expect(
      navAttentionCount('/services', {
        ...empty,
        providersUnverified: 3,
        servicesPendingReview: 1,
      }),
    ).toBe(1);
  });

  it('şikayət və rəy növbəsini qaytarır', () => {
    expect(navAttentionCount('/reports', { ...empty, reportsPending: 4 })).toBe(4);
    expect(navAttentionCount('/reviews', { ...empty, reviewsPending: 2 })).toBe(2);
  });

  it('digər menyularda 0 qaytarır', () => {
    expect(
      navAttentionCount('/users', { ...empty, providersUnverified: 3, servicesPendingReview: 1 }),
    ).toBe(0);
  });
});

describe('shouldPlayAttentionSound', () => {
  it('ilk snapshot-da səs çalmır', () => {
    expect(
      shouldPlayAttentionSound(null, { ...empty, providersUnverified: 2, servicesPendingReview: 1 }),
    ).toBe(false);
  });

  it('xidmət verən növbəsi artanda səs çalır', () => {
    expect(
      shouldPlayAttentionSound(
        { ...empty, providersUnverified: 1 },
        { ...empty, providersUnverified: 2 },
      ),
    ).toBe(true);
  });

  it('xidmət növbəsi artanda səs çalır', () => {
    expect(
      shouldPlayAttentionSound(
        { ...empty, servicesPendingReview: 1 },
        { ...empty, servicesPendingReview: 2 },
      ),
    ).toBe(true);
  });

  it('şikayət növbəsi artanda səs çalır', () => {
    expect(
      shouldPlayAttentionSound({ ...empty, reportsPending: 0 }, { ...empty, reportsPending: 1 }),
    ).toBe(true);
  });

  it('azalmada və eyni sayda səs çalmır', () => {
    expect(
      shouldPlayAttentionSound(
        { ...empty, providersUnverified: 2, servicesPendingReview: 2 },
        { ...empty, providersUnverified: 1, servicesPendingReview: 2 },
      ),
    ).toBe(false);
    expect(
      shouldPlayAttentionSound({ ...empty, providersUnverified: 1 }, { ...empty, providersUnverified: 1 }),
    ).toBe(false);
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
      formatAttentionLiveMessage({ ...empty, providersUnverified: 1, servicesPendingReview: 2 }),
    ).toBe('1 xidmət verən təsdiq gözləyir. 2 xidmət yoxlama gözləyir');
  });
});

describe('adminQueueTabPrefix', () => {
  it('növbə yoxdursa null qaytarır', () => {
    expect(adminQueueTabPrefix(empty)).toBeNull();
  });

  it('təzə gələn növbəni tab-da əvvələ qoyur', () => {
    expect(bumpedAdminQueueId({ ...empty, reportsPending: 0 }, { ...empty, reportsPending: 1 })).toBe(
      'reports',
    );
    expect(
      adminQueueTabPrefix(
        { ...empty, providersUnverified: 2, reportsPending: 1 },
        'reports',
      ),
    ).toBe('Şikayət, 2 xidmət verən təsdiqi');
  });

  it('tək növbənin mövzusunu yazır', () => {
    expect(adminQueueTabPrefix({ ...empty, servicesPendingReview: 1 })).toBe('Xidmət yoxlaması');
  });
});
