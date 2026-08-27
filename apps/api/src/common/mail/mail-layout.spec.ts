import { describe, expect, it } from 'vitest';
import {
  MAIL_LOGO_CID,
  buildCustomerBookingReviewUrl,
  buildMailLogo,
  buildMailText,
  escapeHtml,
  findMailLogoFile,
  formatMailFrom,
  publicMailLogoUrl,
  renderMailReviewCta,
  wrapBrandedMailHtml,
} from './mail-layout';

describe('formatMailFrom', () => {
  it('ünvana Xidmətal adını əlavə edir', () => {
    expect(formatMailFrom('mail@xidmetal.com')).toBe(
      '"Xidmətal" <mail@xidmetal.com>',
    );
  });

  it('noreply ünvanını mail@-ə çevirir', () => {
    expect(formatMailFrom('Xidmətal <noreply@xidmetal.com>')).toBe(
      '"Xidmətal" <mail@xidmetal.com>',
    );
  });
});

describe('publicMailLogoUrl', () => {
  it('marketplace origin-dən API loqo URL-i qurur', () => {
    expect(publicMailLogoUrl('https://xidmetal.com/')).toBe(
      'https://xidmetal.com/api/v1/mail/logo.png',
    );
  });

  it('etibarsız URL-i rədd edir', () => {
    expect(publicMailLogoUrl('javascript:alert(1)')).toBeNull();
    expect(publicMailLogoUrl('not-a-url')).toBeNull();
  });
});

describe('wrapBrandedMailHtml', () => {
  it('profil başlığında loqo və intro göstərir', () => {
    const html = wrapBrandedMailHtml({
      intro: 'Sifarişiniz təsdiqləndi',
      innerHtml: '<p>Bədən</p>',
      logoSrc: `cid:${MAIL_LOGO_CID}`,
      appUrl: 'https://xidmetal.com',
    });
    expect(html).toContain('cid:xidmetal-logo');
    expect(html).toContain('alt="Xidmətal"');
    expect(html).toContain('#FFCC00');
    expect(html).toContain('Sifarişiniz təsdiqləndi');
    expect(html).toContain('align="center"');
    expect(html).toContain('margin:0 auto');
    expect(html).toContain('text-align:center');
    expect(html).toContain('Reklam məktubu deyil');
    expect(html).toContain('display:none');
    expect(html).not.toContain('— Xidmətal');
  });

  it('loqo yoxdursa brend adını göstərir', () => {
    const html = wrapBrandedMailHtml({
      intro: 'Kodunuz',
      innerHtml: '<p>123</p>',
    });
    expect(html).toContain('Xidmətal');
    expect(html).not.toContain('<img');
  });

  it('istifadəçi mətnini escape edir', () => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
    const html = wrapBrandedMailHtml({
      intro: '<b>x</b>',
      innerHtml: 'ok',
    });
    expect(html).toContain('&lt;b&gt;x&lt;/b&gt;');
    expect(html).not.toContain('<b>x</b>');
  });
});

describe('buildMailText', () => {
  it('alt brend imzasını yazmır', () => {
    const text = buildMailText({
      intro: 'Salam',
      body: 'Mətn',
      appUrl: 'https://xidmetal.com',
    });
    expect(text).toContain('Salam');
    expect(text).toContain('Mətn');
    expect(text).toContain('Reklam məktubu deyil');
    expect(text).not.toContain('— Xidmətal');
  });

  it('footer mətnini gövdə ilə səbəb arasında qoyur', () => {
    const text = buildMailText({
      intro: 'Tamamlandı',
      body: 'Sifariş bitdi.',
      reason: 'Səbəb sətri',
      footerText: 'Rəy bildir\nhttps://example.com/review',
    });
    expect(text.indexOf('Rəy bildir')).toBeGreaterThan(text.indexOf('Sifariş bitdi.'));
    expect(text.indexOf('Səbəb sətri')).toBeGreaterThan(text.indexOf('Rəy bildir'));
  });
});

describe('buildCustomerBookingReviewUrl', () => {
  it('müştəri sifariş səhifəsinə rəy parametrli link qurur', () => {
    expect(
      buildCustomerBookingReviewUrl('https://xidmetal.com/', 'bk-1'),
    ).toBe('https://xidmetal.com/dashboard/customer/bookings/bk-1?review=1');
  });

  it('etibarsız origin-i rədd edir', () => {
    expect(buildCustomerBookingReviewUrl('javascript:alert(1)', 'bk-1')).toBeNull();
    expect(buildCustomerBookingReviewUrl('https://xidmetal.com', '  ')).toBeNull();
  });
});

describe('renderMailReviewCta', () => {
  it('link olanda Rəy bildir düyməsi qoyur', () => {
    const cta = renderMailReviewCta(
      'https://xidmetal.com/dashboard/customer/bookings/bk-1?review=1',
    );
    expect(cta.html).toContain('Rəy bildir');
    expect(cta.html).toContain(
      'https://xidmetal.com/dashboard/customer/bookings/bk-1?review=1',
    );
    expect(cta.text).toContain('Rəy bildir');
    expect(cta.text).toContain('https://xidmetal.com/dashboard/customer/bookings/bk-1?review=1');
  });
});

describe('wrapBrandedMailHtml footer', () => {
  it('rəy bölməsini alt brend sətri yerinə qoyur', () => {
    const cta = renderMailReviewCta(
      'https://xidmetal.com/dashboard/customer/bookings/bk-1?review=1',
    );
    const html = wrapBrandedMailHtml({
      intro: 'Sifariş tamamlandı',
      innerHtml: '<p>Bitdi</p>',
      footerHtml: cta.html,
    });
    expect(html).toContain('Rəy bildir');
    expect(html).not.toContain('— Xidmətal');
  });
});

describe('buildMailLogo', () => {
  it('lokal fayl varsa CID attachment qaytarır', () => {
    const logo = buildMailLogo('https://xidmetal.com');
    const file = findMailLogoFile();
    if (!file) {
      expect(logo.src).toBe('https://xidmetal.com/api/v1/mail/logo.png');
      expect(logo.attachment).toBeNull();
      return;
    }
    expect(logo.src).toBe(`cid:${MAIL_LOGO_CID}`);
    expect(logo.attachment?.cid).toBe(MAIL_LOGO_CID);
    expect(logo.attachment?.path).toBe(file);
    expect(logo.attachment?.contentType).toBe('image/png');
  });
});
