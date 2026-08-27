import { ServiceUnavailableException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { sendMail, createTransport } = vi.hoisted(() => {
  const sendMail = vi.fn();
  const createTransport = vi.fn(() => ({ sendMail }));
  return { sendMail, createTransport };
});

vi.mock('nodemailer', () => ({
  createTransport,
}));

import { MailService } from './mail.service';

function makeConfig(values: Record<string, string | undefined>) {
  return {
    get(key: string, defaultValue?: unknown) {
      return values[key] ?? defaultValue;
    },
  };
}

describe('MailService SMTP failures', () => {
  beforeEach(() => {
    sendMail.mockReset();
    createTransport.mockClear();
    sendMail.mockRejectedValue(new Error('connect ECONNREFUSED 127.0.0.1:587'));
  });

  it('SMTP_HOST boş/whitespace olanda transporter yaratmır', async () => {
    const service = new MailService(
      makeConfig({
        NODE_ENV: 'development',
        SMTP_HOST: '   ',
        SMTP_FROM: 'noreply@test.az',
      }) as never,
    );

    await expect(
      service.sendSignupVerificationCode('ali@test.az', '123456'),
    ).resolves.toEqual({ delivered: false, previewCode: '123456' });
    expect(createTransport).not.toHaveBeenCalled();
  });

  it('əlaqə mesajı SMTP uğursuz olsa belə throw etmir', async () => {
    const service = new MailService(
      makeConfig({
        NODE_ENV: 'development',
        SMTP_HOST: 'localhost',
        SMTP_FROM: 'noreply@test.az',
        CONTACT_INBOX_EMAIL: 'info@test.az',
      }) as never,
    );

    await expect(
      service.sendContactMessage({
        name: 'Əli',
        email: 'ali@test.az',
        subjectLabel: 'Ümumi sual',
        message: 'Salam, test mesajıdır.',
      }),
    ).resolves.toEqual({ delivered: false });
  });

  it('DEV-də OTP SMTP bağlantısı uğursuz olanda previewCode qaytarır', async () => {
    const service = new MailService(
      makeConfig({
        NODE_ENV: 'development',
        SMTP_HOST: 'localhost',
        SMTP_FROM: 'noreply@test.az',
      }) as never,
    );

    await expect(
      service.sendSignupVerificationCode('ali@test.az', '123456'),
    ).resolves.toEqual({ delivered: false, previewCode: '123456' });
  });

  it('PROD-da OTP SMTP uğursuz olanda AZ ServiceUnavailable qaytarır', async () => {
    const service = new MailService(
      makeConfig({
        NODE_ENV: 'production',
        SMTP_HOST: 'smtp.example.com',
        SMTP_FROM: 'noreply@test.az',
      }) as never,
    );

    await expect(
      service.sendSignupVerificationCode('ali@test.az', '123456'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('DEV-də SMTP auth xətası OTP-ni preview-ə düşürmür', async () => {
    sendMail.mockRejectedValue(new Error('Invalid login: 535 5.7.8'));
    const service = new MailService(
      makeConfig({
        NODE_ENV: 'development',
        SMTP_HOST: 'smtp.gmail.com',
        SMTP_FROM: 'noreply@test.az',
      }) as never,
    );

    await expect(
      service.sendSignupVerificationCode('ali@test.az', '123456'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});

describe('MailService branded customer mail', () => {
  beforeEach(() => {
    sendMail.mockReset();
    createTransport.mockClear();
    sendMail.mockResolvedValue({ messageId: 'm1' });
  });

  it('sifariş e-poçtunun profil başlığında loqo və From adı olur', async () => {
    const service = new MailService(
      makeConfig({
        NODE_ENV: 'development',
        SMTP_HOST: 'localhost',
        SMTP_FROM: 'noreply@test.az',
        CONTACT_INBOX_EMAIL: 'info@test.az',
        NEXT_PUBLIC_APP_URL: 'https://xidmetal.com',
      }) as never,
    );

    await expect(
      service.sendBookingStatusMail({
        to: 'musteri@test.az',
        subject: 'Xidmətal — Sifariş № XM-26-000421',
        intro: 'Sifarişiniz təsdiqləndi',
        body: '«Təmizlik» sifarişiniz təsdiqləndi.',
        orderNumber: 'XM-26-000421',
      }),
    ).resolves.toEqual({ delivered: true });

    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'test.az' }),
    );
    const payload = sendMail.mock.calls[0]?.[0] as {
      from: string;
      html: string;
      text: string;
      subject: string;
      replyTo?: string;
      messageId?: string;
      inReplyTo?: string;
      headers?: Record<string, string>;
      attachments?: Array<{ cid?: string }>;
    };
    expect(payload.from).toBe('"Xidmətal" <mail@test.az>');
    expect(payload.replyTo).toBe('info@test.az');
    expect(payload.html).toContain('#FFCC00');
    expect(payload.html).toContain('Sifarişiniz təsdiqləndi');
    expect(payload.html).toContain('cid:xidmetal-logo');
    expect(payload.html).toContain('Reklam məktubu deyil');
    expect(payload.html).not.toContain('https://xidmetal.com/logo.png');
    expect(payload.attachments?.[0]?.cid).toBe('xidmetal-logo');
    expect(payload.subject).toBe('Xidmətal — Sifariş № XM-26-000421');
    expect(payload.inReplyTo).toBeUndefined();
    expect(payload.messageId).toMatch(
      /^<booking-XM-26-000421-[A-Za-z0-9-]+@xidmetal.com>$/,
    );
    expect(payload.headers?.['X-Entity-Ref-ID']).toBe('booking-XM-26-000421');
    expect(payload.headers?.['Auto-Submitted']).toBe('auto-generated');
    expect(payload.headers?.['List-Unsubscribe']).toContain(
      'https://xidmetal.com/mail/unsubscribe',
    );
    expect(payload.text).toContain('XM-26-000421');
    expect(payload.html).not.toContain('— Xidmətal');
    expect(payload.text).not.toContain('— Xidmətal');
    expect(payload.html).not.toContain('Rəy bildir');
    expect(payload.text).not.toContain('Rəy bildir');
  });

  it('tamamlanmış sifariş e-poçtunda Rəy bildir bölməsi olur', async () => {
    const service = new MailService(
      makeConfig({
        NODE_ENV: 'development',
        SMTP_HOST: 'localhost',
        SMTP_FROM: 'noreply@test.az',
        CONTACT_INBOX_EMAIL: 'info@test.az',
        NEXT_PUBLIC_APP_URL: 'https://xidmetal.com',
      }) as never,
    );

    await expect(
      service.sendBookingStatusMail({
        to: 'musteri@test.az',
        subject: 'Xidmətal — Sifariş № XM-26-000421',
        intro: 'Sifariş tamamlandı',
        body: '«Təmizlik» sifarişiniz tamamlandı.',
        orderNumber: 'XM-26-000421',
        reviewBookingId: 'bk-42',
      }),
    ).resolves.toEqual({ delivered: true });

    const payload = sendMail.mock.calls[0]?.[0] as {
      html: string;
      text: string;
    };
    expect(payload.html).toContain('Rəy bildir');
    expect(payload.html).toContain(
      'https://xidmetal.com/dashboard/customer/bookings/bk-42?review=1',
    );
    expect(payload.html).not.toContain('— Xidmətal');
    expect(payload.text).toContain('Rəy bildir');
    expect(payload.text).toContain(
      'https://xidmetal.com/dashboard/customer/bookings/bk-42?review=1',
    );
  });

  it('təsdiq kodu e-poçtunda Message-ID domeni From ilə üst-üstə düşür', async () => {
    const service = new MailService(
      makeConfig({
        NODE_ENV: 'development',
        SMTP_HOST: 'localhost',
        SMTP_FROM: 'mail@xidmetal.com',
        CONTACT_INBOX_EMAIL: 'info@xidmetal.com',
        NEXT_PUBLIC_APP_URL: 'https://xidmetal.com',
      }) as never,
    );

    await expect(
      service.sendSignupVerificationCode('musteri@test.az', '12345678'),
    ).resolves.toEqual({ delivered: true, previewCode: '12345678' });

    const payload = sendMail.mock.calls[0]?.[0] as {
      from: string;
      messageId?: string;
      headers?: Record<string, string>;
      attachments?: unknown;
    };
    expect(payload.from).toBe('"Xidmətal" <mail@xidmetal.com>');
    expect(payload.messageId).toMatch(/@xidmetal.com>$/);
    expect(payload.headers?.['Auto-Submitted']).toBe('auto-generated');
    expect(payload.headers?.['List-Unsubscribe']).toBeUndefined();
    expect(payload.attachments).toEqual(
      expect.arrayContaining([expect.objectContaining({ cid: 'xidmetal-logo' })]),
    );
  });
});
