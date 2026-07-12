import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter | null;

  constructor(private config: ConfigService) {
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

  async sendEmailChangeCode(email: string, code: string): Promise<void> {
    const from = this.config.get<string>('SMTP_FROM', 'noreply@xidmetal.az');
    const subject = 'Xidmetal — E-mail təsdiq kodu';
    const text =
      `E-mail ünvanınızı dəyişdirmək üçün təsdiq kodunuz: ${code}\n\n` +
      'Kod 15 dəqiqə ərzində etibarlıdır. Bu sorğunu siz göndərməmisinizsə, bu mesajı nəzərə almayın.';
    const html =
      `<p>E-mail ünvanınızı dəyişdirmək üçün təsdiq kodunuz:</p>` +
      `<p style="font-size:24px;font-weight:bold;letter-spacing:4px">${code}</p>` +
      `<p>Kod 15 dəqiqə ərzində etibarlıdır. Bu sorğunu siz göndərməmisinizsə, bu mesajı nəzərə almayın.</p>`;

    if (!this.transporter) {
      this.logger.warn(`[DEV] E-mail (${email}): ${text}`);
      return;
    }

    await this.transporter.sendMail({ from, to: email, subject, text, html });
  }
}
