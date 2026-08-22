import { Injectable } from '@nestjs/common';
import { contactSubjectLabels } from '@xidmetal/shared';
import { CaptchaService } from '../../common/captcha/captcha.service';
import { MailService } from '../../common/mail/mail.service';
import { PrismaService } from '../../common/database/prisma.service';
import { ContactMessageDto } from './dto';

@Injectable()
export class ContactService {
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
    await this.prisma.contactMessage.create({
      data: {
        name: dto.name.trim(),
        email: dto.email.trim().toLowerCase(),
        phone: dto.phone?.trim() || null,
        subject: subjectLabel,
        message: dto.message.trim(),
      },
    });

    await this.mailService.sendContactMessage({
      name: dto.name.trim(),
      email: dto.email.trim().toLowerCase(),
      phone: dto.phone?.trim() || undefined,
      subjectLabel,
      message: dto.message.trim(),
    });

    return {
      message: 'Mesajınız uğurla göndərildi. Tezliklə sizinlə əlaqə saxlayacağıq.',
    };
  }
}
