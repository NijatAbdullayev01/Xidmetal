import { describe, expect, it } from 'vitest';
import { userFacingApiMessage } from './api-error';

describe('userFacingApiMessage', () => {
  it('Nest Internal server error-u AZ-ə çevirir', () => {
    expect(userFacingApiMessage(500, 'Internal server error')).toBe(
      'Xəta baş verdi. Bir az sonra yenidən cəhd edin.',
    );
  });

  it('API-nin öz AZ mesajını saxlayır', () => {
    expect(
      userFacingApiMessage(
        503,
        'E-poçt xidməti müvəqqəti əlçatan deyil. Bir az sonra yenidən cəhd edin.',
      ),
    ).toContain('E-poçt xidməti');
  });

  it('413 üçün şəkil mesajı qaytarır', () => {
    expect(userFacingApiMessage(413, 'Payload Too Large')).toContain('Şəkil');
  });
});
