import { describe, expect, it } from 'vitest';
import { formatAttentionCount, formatNavAttentionAria, isNewerAttentionEvent, providerServicesNavAttention } from './nav-attention';

describe('formatAttentionCount', () => {
  it('99-dan yuxarı sayları qısaldır', () => {
    expect(formatAttentionCount(3)).toBe('3');
    expect(formatAttentionCount(99)).toBe('99');
    expect(formatAttentionCount(100)).toBe('99+');
  });
});

describe('formatNavAttentionAria', () => {
  it('növbə olanda label əlavə edir', () => {
    expect(formatNavAttentionAria('Xidmətlərim', 0)).toBeUndefined();
    expect(formatNavAttentionAria('Xidmətlərim', 2)).toBe('Xidmətlərim, 2 gözləyən');
  });
});

describe('providerServicesNavAttention', () => {
  it('düzəliş növbəsi ilə oxunmamış təsdiqi toplayır', () => {
    expect(
      providerServicesNavAttention({ needsRevisionCount: 1, unreadApprovedCount: 1 }),
    ).toBe(2);
    expect(
      providerServicesNavAttention({ needsRevisionCount: 2, unreadApprovedCount: 0 }),
    ).toBe(2);
    expect(
      providerServicesNavAttention({ needsRevisionCount: 0, unreadApprovedCount: 1 }),
    ).toBe(1);
  });
});

describe('isNewerAttentionEvent', () => {
  it('ilk hadisəni yeni sayır', () => {
    expect(
      isNewerAttentionEvent(
        { id: null, at: null },
        { id: 'n1', at: '2026-08-26T10:00:00.000Z' },
      ),
    ).toBe(true);
  });

  it('eyni id-də səs çalmır', () => {
    expect(
      isNewerAttentionEvent(
        { id: 'n1', at: '2026-08-26T10:00:00.000Z' },
        { id: 'n1', at: '2026-08-26T10:00:00.000Z' },
      ),
    ).toBe(false);
  });

  it('daha yeni id-də səs çalır', () => {
    expect(
      isNewerAttentionEvent(
        { id: 'n1', at: '2026-08-26T10:00:00.000Z' },
        { id: 'n2', at: '2026-08-26T10:01:00.000Z' },
      ),
    ).toBe(true);
  });
});
