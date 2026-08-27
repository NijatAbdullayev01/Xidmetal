import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MAIL_FROM,
  buildDeliverabilityHeaders,
  buildMailMessageId,
  buildUnsubscribeUrl,
  extractMailAddress,
  extractMailDomain,
  formatMailFrom,
  isNoreplyAddress,
  rewriteNoreplyAddress,
} from './mail-identity';

describe('extractMailAddress / domain', () => {
  it('adlı və adsız From sətrini parse edir', () => {
    expect(extractMailAddress('"Xidmətal" <mail@xidmetal.com>')).toBe(
      'mail@xidmetal.com',
    );
    expect(extractMailAddress('info@xidmetal.com')).toBe('info@xidmetal.com');
    expect(extractMailAddress('not-an-email')).toBeNull();
  });

  it('domeni çıxarır', () => {
    expect(extractMailDomain('Xidmətal <MAIL@Xidmetal.com>')).toBe('xidmetal.com');
  });
});

describe('noreply rewrite', () => {
  it('noreply/no-reply ünvanını mail@domain edir', () => {
    expect(rewriteNoreplyAddress('noreply@xidmetal.com')).toBe(
      'mail@xidmetal.com',
    );
    expect(rewriteNoreplyAddress('no-reply@xidmetal.com')).toBe(
      'mail@xidmetal.com',
    );
    expect(rewriteNoreplyAddress('info@xidmetal.com')).toBe('info@xidmetal.com');
  });

  it('isNoreplyAddress tanıyır', () => {
    expect(isNoreplyAddress('noreply@xidmetal.com')).toBe(true);
    expect(isNoreplyAddress('"X" <no-reply@xidmetal.com>')).toBe(true);
    expect(isNoreplyAddress('mail@xidmetal.com')).toBe(false);
  });
});

describe('formatMailFrom', () => {
  it('boş From üçün mail@xidmetal.com istifadə edir', () => {
    expect(formatMailFrom('')).toBe(`"Xidmətal" <${DEFAULT_MAIL_FROM}>`);
  });

  it('ünvana Xidmətal adını əlavə edir', () => {
    expect(formatMailFrom('mail@xidmetal.com')).toBe(
      '"Xidmətal" <mail@xidmetal.com>',
    );
  });

  it('noreply ünvanını mail@-ə çevirir', () => {
    expect(formatMailFrom('noreply@xidmetal.com')).toBe(
      '"Xidmətal" <mail@xidmetal.com>',
    );
  });

  it('artıq adlı From-da noreply-i dəyişir, adı saxlayır', () => {
    expect(formatMailFrom('Xidmətal <noreply@xidmetal.com>')).toBe(
      '"Xidmətal" <mail@xidmetal.com>',
    );
  });
});

describe('buildMailMessageId', () => {
  it('From domeni ilə Message-ID qurur', () => {
    expect(buildMailMessageId('xidmetal.com', 'abc.def')).toBe(
      '<abc.def@xidmetal.com>',
    );
  });
});

describe('deliverability headers', () => {
  it('auth məktubuna List-Unsubscribe qoymur', () => {
    const headers = buildDeliverabilityHeaders({
      kind: 'auth',
      unsubscribeMailto: 'info@xidmetal.com',
      unsubscribeUrl: 'https://xidmetal.com/mail/unsubscribe',
    });
    expect(headers['Auto-Submitted']).toBe('auto-generated');
    expect(headers['List-Unsubscribe']).toBeUndefined();
  });

  it('sifariş məktubuna List-Unsubscribe əlavə edir', () => {
    const headers = buildDeliverabilityHeaders({
      kind: 'transactional',
      unsubscribeMailto: 'info@xidmetal.com',
      unsubscribeUrl: 'https://xidmetal.com/mail/unsubscribe',
    });
    expect(headers['List-Unsubscribe']).toContain(
      '<https://xidmetal.com/mail/unsubscribe>',
    );
    expect(headers['List-Unsubscribe']).toContain('mailto:info@xidmetal.com');
  });

  it('unsubscribe URL-i origin-dən qurur', () => {
    expect(buildUnsubscribeUrl('https://xidmetal.com/')).toBe(
      'https://xidmetal.com/mail/unsubscribe',
    );
    expect(buildUnsubscribeUrl('javascript:alert(1)')).toBeNull();
  });
});
