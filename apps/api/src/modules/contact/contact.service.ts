import { Injectable, Logger } from '@nestjs/common';
import { contactSubjectLabels } from '@xidmetal/shared';
import { CaptchaService } from '../../common/captcha/captcha.service';
import { MailService } from '../../common/mail/mail.service';
import { PrismaService } from '../../common/database/prisma.service';
import { ContactMessageDto } from './dto';

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(
    private mailService: MailService,
    private captcha: CaptchaService,
    private prisma: PrismaService,
  ) {}

  async submit(dto: ContactMessageDto) {
    // Honeypot doludursa — bot kimi səssiz uğur qaytar (spam göndərmə)
    if (dto.website?.trim()) {
      return {
        message: 'Mesajınız uğurla göndərildi. Tezliklə sizinlə əlaqə saxlayacağıq.',
      };
    }

    await this.captcha.assertValid(dto.captchaToken);

    const subjectLabel = contactSubjectLabels[dto.subject];
    const name = dto.name.trim();
    const email = dto.email.trim().toLowerCase();
    const phone = dto.phone?.trim() || null;
    const message = dto.message.trim();

    await this.prisma.contactMessage.create({
      data: {
        name,
        email,
        phone,
        subject: subjectLabel,
        message,
      },
    });

    try {
      await this.mailService.sendContactMessage({
        name,
        email,
        phone: phone || undefined,
        subjectLabel,
        message,
      });
    } catch (err) {
      this.logger.warn(
        `Əlaqə mesajı saxlanıldı, e-poçt göndərilmədi: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    return {
      message: 'Mesajınız uğurla göndərildi. Tezliklə sizinlə əlaqə saxlayacağıq.',
    };
  }
}
