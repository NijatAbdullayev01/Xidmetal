import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface MailSendResult {
  delivered: boolean;
  /** Yalnız development + SMTP yoxdursa — test üçün */
  previewCode?: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter | null;
  private readonly isProduction: boolean;

  constructor(private config: ConfigService) {
    this.isProduction = this.config.get<string>('NODE_ENV') === 'production';
    const host = this.config.get<string>('SMTP_HOST');
    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: this.config.get<number>('SMTP_PORT', 587),
        secure: this.config.get<string>('SMTP_SECURE') === 'true',
        auth: {
          user: this.config.get<string>('SMTP_USER'),
          pass: this.config.get<string>('SMTP_PASS'),
        },
      });
    } else {
      this.transporter = null;
    }
  }

  isConfigured(): boolean {
    return this.transporter !== null;
  }

  async sendEmailChangeCode(email: string, code: string): Promise<MailSendResult> {
    return this.sendCodeMail(
      email,
      'Xidmətal — E-poçt təsdiq kodu',
      'E-poçt ünvanınızı dəyişdirmək üçün təsdiq kodunuz',
      code,
    );
  }

  async sendSignupVerificationCode(email: string, code: string): Promise<MailSendResult> {
    return this.sendCodeMail(
      email,
      'Xidmətal — E-poçt təsdiqi',
      'Hesabınızı təsdiqləmək üçün kodunuz',
      code,
    );
  }

  async sendPasswordResetCode(email: string, code: string): Promise<MailSendResult> {
    return this.sendCodeMail(
      email,
      'Xidmətal — Şifrə bərpası',
      'Şifrənizi yeniləmək üçün təsdiq kodunuz',
      code,
    );
  }

  private async sendCodeMail(
    email: string,
    subject: string,
    intro: string,
    code: string,
  ): Promise<MailSendResult> {
    const from = this.config.get<string>('SMTP_FROM', 'noreply@xidmetal.az');
    const text =
      `${intro}: ${code}\n\n` +
      'Kod 15 dəqiqə ərzində etibarlıdır. Bu sorğunu siz göndərməmisinizsə, bu mesajı nəzərə almayın.';
    const html =
      `<p>${intro}:</p>` +
      `<p style="font-size:24px;font-weight:bold;letter-spacing:4px">${code}</p>` +
      `<p>Kod 15 dəqiqə ərzində etibarlıdır. Bu sorğunu siz göndərməmisinizsə, bu mesajı nəzərə almayın.</p>`;

    if (!this.transporter) {
      if (this.isProduction) {
        throw new ServiceUnavailableException(
          'E-poçt xidməti müvəqqəti əlçatan deyil. Bir az sonra yenidən cəhd edin.',
        );
      }

      this.logger.warn(`[DEV] SMTP yoxdur — e-poçt (${email}): ${text}`);
      return { delivered: false, previewCode: code };
    }

    await this.transporter.sendMail({ from, to: email, subject, text, html });
    return { delivered: true };
  }
}
