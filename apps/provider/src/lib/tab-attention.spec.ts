import { describe, expect, it } from 'vitest';
import {
  applyTabAttentionTitle,
  channelTabLabel,
  formatTabAttentionPrefix,
  stripTabAttentionPrefix,
  tabLabelsFromChannels,
  truncateTabLabel,
} from '@xidmetal/shared';
import { marketplaceTabPrefix } from './tab-attention';

describe('truncateTabLabel', () => {
  it('qısa mətni saxlayır', () => {
    expect(truncateTabLabel('Yeni mesaj')).toBe('Yeni mesaj');
  });

  it('uzun mövzunu kəsir', () => {
    const long = 'Mart kampaniyası bütün xidmət verənlərə xüsusi endirim';
    const out = truncateTabLabel(long, 20);
    expect(out.endsWith('…')).toBe(true);
    expect(out.length).toBeLessThanOrEqual(20);
  });
});

describe('strip / apply tab prefix', () => {
  it('mövzu prefiksini əlavə edir və təmizləyir', () => {
    expect(applyTabAttentionTitle('Xidmətal', 'Yeni mesaj')).toBe('(Yeni mesaj) Xidmətal');
    expect(stripTabAttentionPrefix('(Yeni mesaj) Xidmətal')).toBe('Xidmətal');
  });

  it('köhnə (N) formatını da silir', () => {
    expect(stripTabAttentionPrefix('(3) Xidmətal')).toBe('Xidmətal');
  });

  it('səhifə başlığını saxlayır', () => {
    expect(applyTabAttentionTitle('Sifarişlər | Xidmətal', 'Sifariş təsdiqləndi')).toBe(
      '(Sifariş təsdiqləndi) Sifarişlər | Xidmətal',
    );
  });

  it('təkrar tətbiqdə prefiksi ikiqatlamır', () => {
    const once = applyTabAttentionTitle('Xidmətal', 'Yeni mesaj');
    expect(applyTabAttentionTitle(once, 'Yeni mesaj')).toBe('(Yeni mesaj) Xidmətal');
  });
});

describe('channelTabLabel', () => {
  it('ən son mövzunu göstərir', () => {
    expect(
      channelTabLabel({
        id: 'booking',
        count: 1,
        singular: 'Yeni sifariş',
        plural: 'yeni sifariş',
        latestTitle: 'Sifariş təsdiqləndi',
      }),
    ).toBe('Sifariş təsdiqləndi');
  });

  it('çox olanda mövzu + qalan say', () => {
    expect(
      channelTabLabel({
        id: 'booking',
        count: 3,
        singular: 'Yeni sifariş',
        plural: 'yeni sifariş',
        latestTitle: 'Xidmət verən yoldadır',
      }),
    ).toBe('Xidmət verən yoldadır +2');
  });
});

describe('tabLabelsFromChannels', () => {
  it('ən yeni kanalı əvvələ qoyur', () => {
    const labels = tabLabelsFromChannels([
      {
        id: 'message',
        count: 1,
        at: '2026-08-27T10:00:00.000Z',
        singular: 'Yeni mesaj',
        plural: 'yeni mesaj',
      },
      {
        id: 'booking',
        count: 1,
        at: '2026-08-27T10:05:00.000Z',
        singular: 'Yeni sifariş',
        plural: 'yeni sifariş',
        latestTitle: 'Sifariş təsdiqləndi',
      },
    ]);
    expect(labels[0]).toBe('Sifariş təsdiqləndi');
    expect(labels[1]).toBe('Yeni mesaj');
  });
});

describe('formatTabAttentionPrefix', () => {
  it('iki mövzunu birləşdirir', () => {
    expect(formatTabAttentionPrefix(['Yeni mesaj', 'Sifariş təsdiqləndi'])).toBe(
      'Yeni mesaj, Sifariş təsdiqləndi',
    );
  });

  it('üçdən artıqda qısa saxlayır', () => {
    expect(formatTabAttentionPrefix(['A', 'B', 'C'])).toBe('A, B +1');
  });

  it('mötərizəni mövzudan çıxarır ki, strip pozulmasın', () => {
    expect(truncateTabLabel('Elan (vacib)')).toBe('Elan vacib');
    expect(formatTabAttentionPrefix(['Elan (vacib)'])).toBe('Elan vacib');
    expect(stripTabAttentionPrefix(applyTabAttentionTitle('Xidmətal', 'Elan (vacib)'))).toBe(
      'Xidmətal',
    );
  });
});

describe('marketplaceTabPrefix', () => {
  const empty = { count: 0, at: null, latestTitle: null };

  it('boş olanda null qaytarır', () => {
    expect(
      marketplaceTabPrefix({
        messages: { count: 0, at: null },
        bookings: empty,
        reviews: empty,
        announcements: empty,
      }),
    ).toBeNull();
  });

  it('ən son sifariş mövzusunu yazır', () => {
    expect(
      marketplaceTabPrefix({
        messages: { count: 0, at: null },
        bookings: {
          count: 1,
          at: '2026-08-27T12:00:00.000Z',
          latestTitle: 'Sifariş təsdiqləndi',
        },
        reviews: empty,
        announcements: empty,
      }),
    ).toBe('Sifariş təsdiqləndi');
  });

  it('xidmət yoxlamasını tab-da göstərir', () => {
    expect(
      marketplaceTabPrefix({
        messages: { count: 0, at: null },
        bookings: empty,
        reviews: empty,
        announcements: empty,
        services: {
          count: 1,
          at: '2026-08-27T12:00:00.000Z',
          latestTitle: 'Xidmətiniz düzəliş gözləyir',
        },
      }),
    ).toBe('Xidmətiniz düzəliş gözləyir');
  });

  it('mesaj və sifarişi birləşdirir — yenisi əvvəl', () => {
    expect(
      marketplaceTabPrefix({
        messages: { count: 2, at: '2026-08-27T12:01:00.000Z' },
        bookings: {
          count: 1,
          at: '2026-08-27T11:00:00.000Z',
          latestTitle: 'Yeni sifariş',
        },
        reviews: empty,
        announcements: empty,
      }),
    ).toBe('2 yeni mesaj, Yeni sifariş');
  });
});
