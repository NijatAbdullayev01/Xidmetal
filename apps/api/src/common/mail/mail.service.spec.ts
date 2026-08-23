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
