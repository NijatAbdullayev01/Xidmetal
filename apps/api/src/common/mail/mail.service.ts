import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import {
  buildCustomerBookingReviewUrl,
  buildMailLogo,
  buildMailText,
  escapeHtml,
  formatMailFrom,
  renderMailReviewCta,
  wrapBrandedMailHtml,
  type MailLogo,
} from './mail-layout';
import { buildBookingMailThread } from './booking-mail';
import {
  DEFAULT_MAIL_DOMAIN,
  DEFAULT_MAIL_FROM,
  buildDeliverabilityHeaders,
  buildMailMessageId,
  buildUnsubscribeUrl,
  extractMailAddress,
  extractMailDomain,
  isNoreplyAddress,
  type MailKind,
} from './mail-identity';
import {
  isSmtpConnectFailure,
  normalizeSmtpHost,
  parseSmtpPort,
} from './smtp-host';

const MAIL_UNAVAILABLE_MESSAGE =
  'E-poçt xidməti müvəqqəti əlçatan deyil. Bir az sonra yenidən cəhd edin.';

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
  private readonly mailLogo: MailLogo;
  private readonly appUrl: string | undefined;

  constructor(private config: ConfigService) {
    this.isProduction = this.config.get<string>('NODE_ENV') === 'production';
    this.appUrl = this.config.get<string>('NEXT_PUBLIC_APP_URL')?.trim() || undefined;
    this.mailLogo = buildMailLogo(this.appUrl);
    const host = normalizeSmtpHost(this.config.get<string>('SMTP_HOST'));
    const user = this.config.get<string>('SMTP_USER')?.trim();
    const pass = this.config.get<string>('SMTP_PASS')?.trim();
    const rawFrom =
      this.config.get<string>('SMTP_FROM', DEFAULT_MAIL_FROM) ?? DEFAULT_MAIL_FROM;
    if (isNoreplyAddress(rawFrom)) {
      this.logger.warn(
        'SMTP_FROM no-reply ünvanıdır — göndərən mail@domain yazılır (spam qovluğu).',
      );
    }
    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: parseSmtpPort(this.config.get<string | number>('SMTP_PORT')),
        secure: this.config.get<string>('SMTP_SECURE') === 'true',
        auth: user && pass ? { user, pass } : undefined,
        name:
          this.config.get<string>('MAIL_HELO_NAME')?.trim() ||
          extractMailDomain(this.smtpFrom()) ||
          DEFAULT_MAIL_DOMAIN,
        connectionTimeout: 8_000,
        greetingTimeout: 8_000,
        socketTimeout: 15_000,
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

  async sendPhoneChangeCode(
    email: string,
    code: string,
    newPhone: string,
  ): Promise<MailSendResult> {
    return this.sendCodeMail(
      email,
      'Xidmətal — Telefon təsdiq kodu',
      `Telefon nömrənizi ${newPhone} olaraq dəyişmək üçün təsdiq kodunuz`,
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

  async sendContactMessage(input: {
    name: string;
    email: string;
    phone?: string;
    subjectLabel: string;
    message: string;
  }): Promise<MailSendResult> {
    const inbox =
      this.config.get<string>('CONTACT_INBOX_EMAIL')?.trim() ||
      this.config.get<string>('SMTP_FROM', DEFAULT_MAIL_FROM) ||
      DEFAULT_MAIL_FROM;
    const from = this.smtpFrom();
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

    return this.dispatchMail({
      from,
      to: inbox,
      replyTo: input.email,
      subject,
      text,
      html,
      kind: 'internal',
      // Inbox Prisma-dadır; SMTP down olsa belə forma 500 olmamalıdır
      softFailInProduction: true,
    });
  }

  /**
   * Sifariş statusu e-poçtu. SMTP yoxdursa DEV-də log; production-da atılır (status update-i sındırmır).
   */
  async sendBookingStatusMail(input: {
    to: string;
    subject: string;
    intro: string;
    body: string;
    orderNumber?: string;
    /** Tamamlanmış sifarişdə alt «Rəy bildir» bölməsi üçün */
    reviewBookingId?: string;
  }): Promise<MailSendResult> {
    const reason = input.orderNumber
      ? `Bu mesajı ${input.orderNumber} nömrəli sifarişinizə görə aldınız. Reklam məktubu deyil.`
      : undefined;
    const reviewCta = input.reviewBookingId
      ? renderMailReviewCta(
          buildCustomerBookingReviewUrl(this.appUrl, input.reviewBookingId),
        )
      : null;
    const text = buildMailText({
      intro: input.intro,
      body: input.body,
      reason,
      appUrl: this.appUrl,
      footerText: reviewCta?.text,
    });
    const html = wrapBrandedMailHtml({
      intro: input.intro,
      innerHtml: `<p style="margin:0;">${escapeHtml(input.body)}</p>`,
      logoSrc: this.mailLogo.src,
      appUrl: this.appUrl,
      preheader: input.intro,
      reason,
      footerHtml: reviewCta?.html,
    });
    const thread = input.orderNumber
      ? buildBookingMailThread({ orderNumber: input.orderNumber })
      : null;
    const replyTo = this.mailReplyTo();
    const headers = {
      ...buildDeliverabilityHeaders({
        kind: 'transactional',
        unsubscribeMailto: replyTo ?? extractMailAddress(this.smtpFrom()),
        unsubscribeUrl: buildUnsubscribeUrl(this.appUrl),
      }),
      ...(thread ? { 'X-Entity-Ref-ID': thread.entityRefId } : {}),
    };

    return this.dispatchMail({
      from: this.smtpFrom(),
      to: input.to,
      replyTo,
      subject: input.subject,
      text,
      html,
      kind: 'transactional',
      attachments: this.mailLogoAttachment(),
      messageId: thread?.messageId,
      headers,
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
      this.config.get<string>('SMTP_FROM', DEFAULT_MAIL_FROM) ||
      DEFAULT_MAIL_FROM;
    const from = this.smtpFrom();
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
      kind: 'internal',
      softFailInProduction: true,
    });
  }

  private async sendCodeMail(
    email: string,
    subject: string,
    intro: string,
    code: string,
  ): Promise<MailSendResult> {
    const body =
      `Kodunuz: ${code}\n\n` +
      'Kod 15 dəqiqə ərzində etibarlıdır. Bu sorğunu siz göndərməmisinizsə, bu mesajı nəzərə almayın.';
    const reason =
      'Bu kodu xidmetal.com-da hesab təsdiqi və ya şifrə əməliyyatı üçün aldınız. Reklam məktubu deyil.';
    const text = buildMailText({
      intro,
      body,
      reason,
      appUrl: this.appUrl,
    });
    const html = wrapBrandedMailHtml({
      intro,
      innerHtml:
        `<p style="margin:16px 0;font-size:28px;font-weight:bold;letter-spacing:6px;color:#1A1A1A;">${escapeHtml(code)}</p>` +
        `<p style="margin:0;font-size:14px;color:#555555;">Kod 15 dəqiqə ərzində etibarlıdır. Bu sorğunu siz göndərməmisinizsə, bu mesajı nəzərə almayın.</p>`,
      logoSrc: this.mailLogo.src,
      appUrl: this.appUrl,
      preheader: `${intro}: ${code}`,
      reason,
    });

    return this.dispatchMail({
      from: this.smtpFrom(),
      to: email,
      replyTo: this.mailReplyTo(),
      subject,
      text,
      html,
      kind: 'auth',
      attachments: this.mailLogoAttachment(),
      headers: buildDeliverabilityHeaders({ kind: 'auth' }),
      previewCode: code,
    });
  }

  private smtpFrom(): string {
    return formatMailFrom(
      this.config.get<string>('SMTP_FROM', DEFAULT_MAIL_FROM) ?? DEFAULT_MAIL_FROM,
    );
  }

  private mailReplyTo(): string | undefined {
    const reply =
      this.config.get<string>('MAIL_REPLY_TO')?.trim() ||
      this.config.get<string>('CONTACT_INBOX_EMAIL')?.trim();
    if (!reply) return undefined;
    const fromAddr = extractMailAddress(this.smtpFrom());
    if (fromAddr && reply.toLowerCase() === fromAddr) return undefined;
    return reply;
  }

  private mailLogoAttachment(): nodemailer.SendMailOptions['attachments'] {
    return this.mailLogo.attachment ? [this.mailLogo.attachment] : undefined;
  }

  private async dispatchMail(input: {
    from: string;
    to: string;
    subject: string;
    text: string;
    html: string;
    kind: MailKind;
    replyTo?: string;
    previewCode?: string;
    attachments?: nodemailer.SendMailOptions['attachments'];
    messageId?: string;
    headers?: Record<string, string>;
    /** true → SMTP yoxdursa və ya göndərmə uğursuzdursa throw etmə (best-effort) */
    softFailInProduction?: boolean;
  }): Promise<MailSendResult> {
    if (!this.transporter) {
      if (this.isProduction && !input.softFailInProduction) {
        throw new ServiceUnavailableException(
          MAIL_UNAVAILABLE_MESSAGE,
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

    const domain = extractMailDomain(input.from) ?? DEFAULT_MAIL_DOMAIN;
    const headers = {
      ...buildDeliverabilityHeaders({ kind: input.kind }),
      ...input.headers,
    };

    try {
      await this.transporter.sendMail({
        from: input.from,
        to: input.to,
        replyTo: input.replyTo,
        subject: input.subject,
        text: input.text,
        html: input.html,
        attachments: input.attachments,
        messageId: input.messageId ?? buildMailMessageId(domain),
        headers,
      });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      const devConnectFallback =
        !this.isProduction && isSmtpConnectFailure(err) && !input.softFailInProduction;
      if (devConnectFallback) {
        this.logger.warn(
          `[DEV] SMTP əlçatan deyil (${detail}) — e-poçt loga yazıldı (${input.to}): ${input.text}`,
        );
        return {
          delivered: false,
          ...this.devPreview(input.previewCode),
        };
      }

      this.logger.error(`SMTP göndərmə uğursuz (${input.to}): ${detail}`);
      if (input.softFailInProduction) {
        return {
          delivered: false,
          ...this.devPreview(input.previewCode),
        };
      }
      throw new ServiceUnavailableException(MAIL_UNAVAILABLE_MESSAGE);
    }

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
