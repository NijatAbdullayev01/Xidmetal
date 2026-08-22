import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface MailSendResult {
  delivered: boolean;
  /** Yalnız non-production — test/dev üçün OTP UI-də göstərilir */
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

  async sendPhoneVerificationCode(email: string, code: string): Promise<MailSendResult> {
    return this.sendCodeMail(
      email,
      'Xidmətal — Telefon təsdiqi',
      'Telefon nömrənizi təsdiqləmək üçün kodunuz',
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

  async sendContactMessage(input: {
    name: string;
    email: string;
    phone?: string;
    subjectLabel: string;
    message: string;
  }): Promise<MailSendResult> {
    const inbox =
      this.config.get<string>('CONTACT_INBOX_EMAIL')?.trim() ||
      this.config.get<string>('SMTP_FROM', 'noreply@xidmetal.az');
    const from = this.config.get<string>('SMTP_FROM', 'noreply@xidmetal.az');
    const subject = `[Xidmətal] ${input.subjectLabel} — ${input.name}`;
    const text = [
      `Ad: ${input.name}`,
      `E-poçt: ${input.email}`,
      input.phone ? `Telefon: ${input.phone}` : null,
      `Mövzu: ${input.subjectLabel}`,
      '',
      input.message,
    ]
      .filter(Boolean)
      .join('\n');
    const html =
      `<p><strong>Ad:</strong> ${escapeHtml(input.name)}</p>` +
      `<p><strong>E-poçt:</strong> ${escapeHtml(input.email)}</p>` +
      (input.phone
        ? `<p><strong>Telefon:</strong> ${escapeHtml(input.phone)}</p>`
        : '') +
      `<p><strong>Mövzu:</strong> ${escapeHtml(input.subjectLabel)}</p>` +
      `<hr/><p style="white-space:pre-wrap">${escapeHtml(input.message)}</p>`;

    return this.dispatchMail({ from, to: inbox, replyTo: input.email, subject, text, html });
  }

  /**
   * Sifariş statusu e-poçtu. SMTP yoxdursa DEV-də log; production-da atılır (status update-i sındırmır).
   */
  async sendBookingStatusMail(input: {
    to: string;
    subject: string;
    intro: string;
    body: string;
  }): Promise<MailSendResult> {
    const from = this.config.get<string>('SMTP_FROM', 'noreply@xidmetal.az');
    const text = `${input.intro}\n\n${input.body}\n\n— Xidmətal`;
    const html =
      `<p>${escapeHtml(input.intro)}</p>` +
      `<p>${escapeHtml(input.body)}</p>` +
      `<p style="color:#666;font-size:12px">— Xidmətal</p>`;

    return this.dispatchMail({
      from,
      to: input.to,
      subject: input.subject,
      text,
      html,
      softFailInProduction: true,
    });
  }

  /** Admin/inbox — yeni şikayət barədə (best-effort) */
  async sendReportAlert(input: {
    reporterEmail: string;
    reporterName: string;
    reasonLabel: string;
    targetType: string;
    targetId?: string | null;
    description: string;
  }): Promise<MailSendResult> {
    const inbox =
      this.config.get<string>('CONTACT_INBOX_EMAIL')?.trim() ||
      this.config.get<string>('SMTP_FROM', 'noreply@xidmetal.az');
    const from = this.config.get<string>('SMTP_FROM', 'noreply@xidmetal.az');
    const subject = `[Xidmətal] Yeni şikayət — ${input.reasonLabel}`;
    const text = [
      `Şikayətçi: ${input.reporterName} <${input.reporterEmail}>`,
      `Səbəb: ${input.reasonLabel}`,
      `Hədəf: ${input.targetType}${input.targetId ? ` (${input.targetId})` : ''}`,
      '',
      input.description,
    ].join('\n');
    const html =
      `<p><strong>Şikayətçi:</strong> ${escapeHtml(input.reporterName)} &lt;${escapeHtml(input.reporterEmail)}&gt;</p>` +
      `<p><strong>Səbəb:</strong> ${escapeHtml(input.reasonLabel)}</p>` +
      `<p><strong>Hədəf:</strong> ${escapeHtml(input.targetType)}${
        input.targetId ? ` (${escapeHtml(input.targetId)})` : ''
      }</p>` +
      `<hr/><p style="white-space:pre-wrap">${escapeHtml(input.description)}</p>`;

    return this.dispatchMail({
      from,
      to: inbox,
      replyTo: input.reporterEmail,
      subject,
      text,
      html,
      softFailInProduction: true,
    });
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

    return this.dispatchMail({
      from,
      to: email,
      subject,
      text,
      html,
      previewCode: code,
    });
  }

  private async dispatchMail(input: {
    from: string;
    to: string;
    subject: string;
    text: string;
    html: string;
    replyTo?: string;
    previewCode?: string;
    /** true → production-da SMTP yoxdursa throw etmə (best-effort) */
    softFailInProduction?: boolean;
  }): Promise<MailSendResult> {
    if (!this.transporter) {
      if (this.isProduction && !input.softFailInProduction) {
        throw new ServiceUnavailableException(
          'E-poçt xidməti müvəqqəti əlçatan deyil. Bir az sonra yenidən cəhd edin.',
        );
      }

      this.logger.warn(
        `${this.isProduction ? '[PROD]' : '[DEV]'} SMTP yoxdur — e-poçt (${input.to}): ${input.text}`,
      );
      return {
        delivered: false,
        ...this.devPreview(input.previewCode),
      };
    }

    await this.transporter.sendMail({
      from: input.from,
      to: input.to,
      replyTo: input.replyTo,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
    return {
      delivered: true,
      // Test rejimində SMTP olsa belə kodu API cavabında qaytar (prod-da heç vaxt)
      ...this.devPreview(input.previewCode),
    };
  }

  private devPreview(previewCode?: string): { previewCode?: string } {
    if (this.isProduction || !previewCode) return {};
    return { previewCode };
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
