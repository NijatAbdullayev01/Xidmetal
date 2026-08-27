import { describe, expect, it } from 'vitest';
import { composeBookingAddress, formatBookingAddressDisplay } from './booking-address';

describe('composeBookingAddress', () => {
  it('şəhər/rayonu küçə ünvanından əvvəl yazır', () => {
    expect(
      composeBookingAddress({
        street: 'Nizami küçəsi 12',
        location: 'Bakı',
      }),
    ).toBe('Bakı, Nizami küçəsi 12');
  });

  it('Bakı daxili rayonu ünvandan əvvəl yazır', () => {
    expect(
      composeBookingAddress({
        street: 'Nizami küçəsi 12',
        location: 'Bakı, Nəsimi rayonu',
      }),
    ).toBe('Bakı, Nəsimi rayonu, Nizami küçəsi 12');
  });

  it('blok, mərtəbə və qapı detallarını küçədən sonra saxlayır', () => {
    expect(
      composeBookingAddress({
        street: 'Nizami küçəsi 12',
        block: '5',
        floor: '3',
        door: '14',
        location: 'Gəncə',
      }),
    ).toBe('Gəncə, Nizami küçəsi 12, Blok 5, Mərtəbə 3, Qapı 14');
  });
});

describe('formatBookingAddressDisplay', () => {
  it('köhnə sıranı şəhər, rayon, yazılı ünvan, blok, mərtəbə, qapı edir', () => {
    expect(
      formatBookingAddressDisplay(
        'Süleyman sani axundov, Blok 2, Mərtəbə 2, Qapı 2, Bakı, Binəqədi rayonu',
      ),
    ).toBe('Bakı, Binəqədi rayonu, Süleyman sani axundov, Blok 2, Mərtəbə 2, Qapı 2');
  });

  it('artıq düzgün sıranı saxlayır', () => {
    expect(
      formatBookingAddressDisplay(
        'Bakı, Binəqədi rayonu, Süleyman sani axundov, Blok 2, Mərtəbə 2, Qapı 2',
      ),
    ).toBe('Bakı, Binəqədi rayonu, Süleyman sani axundov, Blok 2, Mərtəbə 2, Qapı 2');
  });

  it('kataloq ünvanı olmayan mətni olduğu kimi qaytarır', () => {
    expect(formatBookingAddressDisplay('Nizami küçəsi 12')).toBe('Nizami küçəsi 12');
  });
});
