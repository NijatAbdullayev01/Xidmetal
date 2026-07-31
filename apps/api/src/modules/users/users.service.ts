import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import { EmailVerificationPurpose, UserRole } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import { MailService } from '../../common/mail/mail.service';
import {
  ChangePasswordDto,
  UpdateProfileDto,
  RequestEmailChangeDto,
  ConfirmEmailChangeDto,
} from './dto';

const EMAIL_CODE_EXPIRY_MS = 15 * 60 * 1000;

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatarUrl: true,
        role: true,
        isVerified: true,
        createdAt: true,
        providerProfile: true,
      },
    });

    if (!user) throw new NotFoundException('İstifadəçi tapılmadı');
    return this.mapUserProfile(user);
  }

  /** Dashboard açıq olanda periodik çağırılır — onlayn / son görülmə üçün */
  async heartbeat(userId: string) {
    const now = new Date();
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastSeenAt: now },
    });
    return { lastSeenAt: now.toISOString() };
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const existing = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!existing) throw new NotFoundException('İstifadəçi tapılmadı');

    if (dto.avatarUrl !== undefined && dto.avatarUrl !== null && dto.avatarUrl !== '') {
      const isValidAvatar =
        dto.avatarUrl.startsWith('data:image/') ||
        dto.avatarUrl.startsWith('http://') ||
        dto.avatarUrl.startsWith('https://');
      if (!isValidAvatar) {
        throw new BadRequestException('Düzgün şəkil formatı daxil edin');
      }
    }

    if (dto.experience !== undefined && existing.role !== UserRole.PROVIDER) {
      throw new BadRequestException('Təcrübə yalnız xidmət verənlər üçün yenilənə bilər');
    }

    const phone = dto.phone?.trim() || null;
    if (phone) {
      const phoneTaken = await this.prisma.user.findFirst({
        where: { phone, NOT: { id: userId } },
        select: { id: true },
      });
      if (phoneTaken) {
        throw new ConflictException('Bu telefon nömrəsi artıq istifadə olunur');
      }
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName }),
        ...(dto.phone !== undefined && { phone }),
        ...(dto.avatarUrl !== undefined && {
          avatarUrl: dto.avatarUrl || null,
        }),
        ...(dto.experience !== undefined &&
          existing.role === UserRole.PROVIDER && {
            providerProfile: {
              upsert: {
                create: { experience: dto.experience },
                update: { experience: dto.experience },
              },
            },
          }),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatarUrl: true,
        role: true,
        isVerified: true,
        createdAt: true,
        providerProfile: true,
      },
    });

    return this.mapUserProfile(user);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('İstifadəçi tapılmadı');

    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Cari şifrə səhvdir');
    }

    const samePassword = await bcrypt.compare(dto.newPassword, user.passwordHash);
    if (samePassword) {
      throw new BadRequestException('Yeni şifrə cari şifrədən fərqli olmalıdır');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash },
      }),
      // Şifrə dəyişəndə oğurlanmış refresh token-lər etibarsızlaşsın deyə
      // bütün mövcud sessiyaları ləğv edirik.
      this.prisma.refreshToken.deleteMany({ where: { userId } }),
    ]);

    return { message: 'Şifrə uğurla dəyişdirildi' };
  }

  async requestEmailChange(userId: string, dto: RequestEmailChangeDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('İstifadəçi tapılmadı');

    const newEmail = dto.newEmail.trim().toLowerCase();
    if (newEmail === user.email.toLowerCase()) {
      throw new BadRequestException('Yeni e-poçt cari e-poçt ilə eyni ola bilməz');
    }

    const existing = await this.prisma.user.findUnique({ where: { email: newEmail } });
    if (existing) {
      throw new ConflictException('Bu e-poçt artıq istifadə olunur');
    }

    const code = randomInt(100000, 1000000).toString();
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + EMAIL_CODE_EXPIRY_MS);

    await this.prisma.$transaction([
      this.prisma.emailVerificationCode.deleteMany({
        where: { userId, purpose: EmailVerificationPurpose.EMAIL_CHANGE },
      }),
      this.prisma.emailVerificationCode.create({
        data: {
          userId,
          email: newEmail,
          codeHash,
          purpose: EmailVerificationPurpose.EMAIL_CHANGE,
          expiresAt,
        },
      }),
    ]);

    await this.mailService.sendEmailChangeCode(newEmail, code);

    return { message: 'Təsdiq kodu yeni e-poçt ünvanına göndərildi' };
  }

  async confirmEmailChange(userId: string, dto: ConfirmEmailChangeDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('İstifadəçi tapılmadı');

    const newEmail = dto.newEmail.trim().toLowerCase();
    const verification = await this.prisma.emailVerificationCode.findFirst({
      where: {
        userId,
        email: newEmail,
        purpose: EmailVerificationPurpose.EMAIL_CHANGE,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!verification) {
      throw new BadRequestException('Təsdiq kodu tapılmadı. Yenidən kod tələb edin');
    }

    if (verification.expiresAt < new Date()) {
      await this.prisma.emailVerificationCode.delete({ where: { id: verification.id } });
      throw new BadRequestException('Təsdiq kodunun müddəti bitib. Yenidən kod tələb edin');
    }

    const validCode = await bcrypt.compare(dto.code, verification.codeHash);
    if (!validCode) {
      throw new BadRequestException('Təsdiq kodu səhvdir');
    }

    const existing = await this.prisma.user.findUnique({ where: { email: newEmail } });
    if (existing && existing.id !== userId) {
      throw new ConflictException('Bu e-poçt artıq istifadə olunur');
    }

    const updatedUser = await this.prisma.$transaction(async (tx) => {
      await tx.emailVerificationCode.deleteMany({
        where: { userId, purpose: EmailVerificationPurpose.EMAIL_CHANGE },
      });

      // E-poçt dəyişəndə JWT-dəki köhnə `email` claim-i etibarsızlaşdığı üçün
      // mövcud sessiyaları ləğv edib istifadəçini yenidən daxil olmağa yönləndiririk.
      await tx.refreshToken.deleteMany({ where: { userId } });

      return tx.user.update({
        where: { id: userId },
        data: { email: newEmail },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          avatarUrl: true,
          role: true,
          isVerified: true,
          createdAt: true,
          providerProfile: true,
        },
      });
    });

    return this.mapUserProfile(updatedUser);
  }

  private mapUserProfile(user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    avatarUrl: string | null;
    role: string;
    isVerified: boolean;
    createdAt: Date;
    providerProfile: {
      id: string;
      bio: string | null;
      experience: number | null;
      location: string | null;
      isVerified: boolean;
      rating: number;
      reviewCount: number;
    } | null;
  }) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone ?? undefined,
      avatarUrl: user.avatarUrl ?? undefined,
      role: user.role,
      isVerified: user.isVerified,
      createdAt: user.createdAt.toISOString(),
      providerProfile: user.providerProfile
        ? {
            id: user.providerProfile.id,
            bio: user.providerProfile.bio ?? undefined,
            experience: user.providerProfile.experience ?? undefined,
            location: user.providerProfile.location ?? undefined,
            isVerified: user.providerProfile.isVerified,
            rating: user.providerProfile.rating,
            reviewCount: user.providerProfile.reviewCount,
          }
        : undefined,
    };
  }
}
