import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomBytes, randomInt } from 'crypto';
import { EmailVerificationPurpose, UserRole, ServiceStatus, BookingStatus } from '@prisma/client';
import { ACTIVE_BOOKING_STATUSES, ProviderAvailability } from '@xidmetal/shared';
import { PrismaService } from '../../common/database/prisma.service';
import { MailService } from '../../common/mail/mail.service';
import { SmsService } from '../../common/sms/sms.service';
import { assertValidEmailCode } from '../../common/auth/email-verification-codes';
import { StorageService } from '../../common/storage/storage.service';
import {
  ChangePasswordDto,
  UpdateProfileDto,
  RequestEmailChangeDto,
  ConfirmEmailChangeDto,
  ConfirmPhoneVerifyDto,
  DeleteAccountDto,
} from './dto';

const EMAIL_CODE_EXPIRY_MS = 15 * 60 * 1000;

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
    private smsService: SmsService,
    private storageService: StorageService,
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
        phoneVerifiedAt: true,
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

  async getProviderDashboardStats(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        providerProfile: { select: { rating: true, reviewCount: true } },
      },
    });
    if (!user) throw new NotFoundException('İstifadəçi tapılmadı');
    if (user.role !== UserRole.PROVIDER) {
      throw new BadRequestException('Bu endpoint yalnız xidmət verənlər üçündür');
    }

    const [totalServices, activeServices, pendingBookings, completedBookings] =
      await Promise.all([
        this.prisma.service.count({ where: { providerId: userId } }),
        this.prisma.service.count({
          where: { providerId: userId, status: ServiceStatus.ACTIVE },
        }),
        this.prisma.booking.count({
          where: { providerId: userId, status: BookingStatus.PENDING },
        }),
        this.prisma.booking.count({
          where: { providerId: userId, status: BookingStatus.COMPLETED },
        }),
      ]);

    return {
      activeServices,
      totalServices,
      pendingBookings,
      completedBookings,
      rating: user.providerProfile?.rating ?? 0,
      reviewCount: user.providerProfile?.reviewCount ?? 0,
    };
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
      this.storageService.assertAllowedMediaUrl(dto.avatarUrl);
    }

    if (
      (dto.experience !== undefined || dto.bio !== undefined || dto.location !== undefined) &&
      existing.role !== UserRole.PROVIDER
    ) {
      throw new BadRequestException(
        'Bio, ünvan və təcrübə yalnız xidmət verənlər üçün yenilənə bilər',
      );
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

    const phoneChanged =
      dto.phone !== undefined && (phone ?? null) !== (existing.phone ?? null);

    const previousAvatarUrl = existing.avatarUrl;
    const nextAvatarUrl =
      dto.avatarUrl !== undefined ? dto.avatarUrl || null : previousAvatarUrl;

    const providerProfileData: {
      experience?: number;
      bio?: string | null;
      location?: string | null;
    } = {};
    if (dto.experience !== undefined) providerProfileData.experience = dto.experience;
    if (dto.bio !== undefined) providerProfileData.bio = dto.bio.trim() || null;
    if (dto.location !== undefined) providerProfileData.location = dto.location.trim() || null;
    const hasProviderProfileUpdate = Object.keys(providerProfileData).length > 0;

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName }),
        ...(dto.phone !== undefined && {
          phone,
          ...(phoneChanged ? { phoneVerifiedAt: null } : {}),
        }),
        ...(dto.avatarUrl !== undefined && {
          avatarUrl: dto.avatarUrl || null,
        }),
        ...(hasProviderProfileUpdate &&
          existing.role === UserRole.PROVIDER && {
            providerProfile: {
              upsert: {
                create: providerProfileData,
                update: providerProfileData,
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
        phoneVerifiedAt: true,
        avatarUrl: true,
        role: true,
        isVerified: true,
        createdAt: true,
        providerProfile: true,
      },
    });

    if (
      dto.avatarUrl !== undefined &&
      previousAvatarUrl &&
      previousAvatarUrl !== nextAvatarUrl
    ) {
      await this.storageService.deleteByPublicUrl(previousAvatarUrl);
    }

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
        data: { passwordHash, passwordChangedAt: new Date() },
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

    const mail = await this.mailService.sendEmailChangeCode(newEmail, code);

    return {
      message: mail.delivered
        ? 'Təsdiq kodu yeni e-poçt ünvanına göndərildi'
        : 'SMTP qurulmayıb — təsdiq kodu server loguna yazıldı (DEV)',
      ...(mail.previewCode ? { previewCode: mail.previewCode } : {}),
    };
  }

  async confirmEmailChange(userId: string, dto: ConfirmEmailChangeDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('İstifadəçi tapılmadı');

    const newEmail = dto.newEmail.trim().toLowerCase();
    await assertValidEmailCode(this.prisma, {
      userId,
      email: newEmail,
      purpose: EmailVerificationPurpose.EMAIL_CHANGE,
      code: dto.code,
    });

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
        data: { email: newEmail, isVerified: true },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          phoneVerifiedAt: true,
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

  /**
   * SMS OTP — profil telefonunu təsdiqləyir (SMS_STATUS_ENABLED üçün tələb).
   * Kod `email_verification_codes.email` sütununda E.164 kimi saxlanır.
   */
  async requestPhoneVerify(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('İstifadəçi tapılmadı');

    const phone = user.phone?.trim();
    if (!phone) {
      throw new BadRequestException(
        'Əvvəlcə profilə mobil nömrə əlavə edin',
      );
    }

    if (user.phoneVerifiedAt) {
      return { message: 'Telefon artıq təsdiqlənib', alreadyVerified: true };
    }

    const code = randomInt(100000, 1000000).toString();
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + EMAIL_CODE_EXPIRY_MS);

    await this.prisma.$transaction([
      this.prisma.emailVerificationCode.deleteMany({
        where: { userId, purpose: EmailVerificationPurpose.PHONE_VERIFY },
      }),
      this.prisma.emailVerificationCode.create({
        data: {
          userId,
          email: phone,
          codeHash,
          purpose: EmailVerificationPurpose.PHONE_VERIFY,
          expiresAt,
        },
      }),
    ]);

    const body = `Xidmətal telefon təsdiq kodu: ${code}. 15 dəqiqə etibarlıdır.`;
    await this.smsService.send({ to: phone, body });

    const provider = this.smsService.adapterName;
    return {
      message:
        provider === 'noop'
          ? 'SMS provayder qurulmayıb — kod server loguna yazılmayıb; SMS_PROVIDER=console və ya twilio təyin edin'
          : provider === 'console'
            ? 'Təsdiq kodu server loguna yazıldı (console SMS)'
            : 'Təsdiq kodu SMS ilə göndərildi',
      ...(provider === 'console' || provider === 'noop'
        ? { previewCode: code }
        : {}),
    };
  }

  async confirmPhoneVerify(userId: string, dto: ConfirmPhoneVerifyDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('İstifadəçi tapılmadı');

    const phone = user.phone?.trim();
    if (!phone) {
      throw new BadRequestException('Profilə mobil nömrə əlavə edilməyib');
    }

    await assertValidEmailCode(this.prisma, {
      userId,
      email: phone,
      purpose: EmailVerificationPurpose.PHONE_VERIFY,
      code: dto.code,
    });

    const updatedUser = await this.prisma.$transaction(async (tx) => {
      await tx.emailVerificationCode.deleteMany({
        where: { userId, purpose: EmailVerificationPurpose.PHONE_VERIFY },
      });

      return tx.user.update({
        where: { id: userId },
        data: { phoneVerifiedAt: new Date() },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          phoneVerifiedAt: true,
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

  async deleteAccount(userId: string, dto: DeleteAccountDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        deletedAt: true,
        isActive: true,
        role: true,
        avatarUrl: true,
      },
    });

    if (!user || user.deletedAt || !user.isActive) {
      throw new NotFoundException('İstifadəçi tapılmadı');
    }

    if (user.role === UserRole.ADMIN) {
      throw new BadRequestException('Administrator hesabı bu yolla silinə bilməz');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Şifrə səhvdir');
    }

    const activeBooking = await this.prisma.booking.findFirst({
      where: {
        OR: [{ customerId: userId }, { providerId: userId }],
        status: { in: [...ACTIVE_BOOKING_STATUSES] },
      },
      select: { id: true },
    });

    if (activeBooking) {
      throw new BadRequestException(
        'Aktiv sifarişiniz varken hesabı silə bilməzsiniz. Əvvəlcə sifarişləri tamamlayın və ya ləğv edin.',
      );
    }

    const tombstoneEmail = `deleted+${userId}@deleted.xidmetal.local`;
    const scrambledHash = await bcrypt.hash(randomBytes(32).toString('hex'), 12);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          deletedAt: new Date(),
          isActive: false,
          email: tombstoneEmail,
          phone: null,
          avatarUrl: null,
          passwordHash: scrambledHash,
          passwordChangedAt: new Date(),
          firstName: 'Silinmiş',
          lastName: 'İstifadəçi',
        },
      }),
      this.prisma.refreshToken.deleteMany({ where: { userId } }),
      this.prisma.emailVerificationCode.deleteMany({ where: { userId } }),
    ]);

    if (user.avatarUrl) {
      await this.storageService.deleteByPublicUrl(user.avatarUrl);
    }

    return { message: 'Hesabınız silindi' };
  }

  async exportMyData(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        phoneVerifiedAt: true,
        role: true,
        isVerified: true,
        createdAt: true,
        deletedAt: true,
        isActive: true,
        providerProfile: {
          select: {
            bio: true,
            experience: true,
            location: true,
            isVerified: true,
            rating: true,
            reviewCount: true,
            availability: true,
          },
        },
      },
    });

    if (!user || user.deletedAt || !user.isActive) {
      throw new NotFoundException('İstifadəçi tapılmadı');
    }

    const [services, bookingsAsCustomer, bookingsAsProvider, notifications, deviceTokens] =
      await Promise.all([
        this.prisma.service.findMany({
          where: { providerId: userId },
          select: {
            id: true,
            title: true,
            status: true,
            price: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 500,
        }),
        this.prisma.booking.findMany({
          where: { customerId: userId },
          select: {
            id: true,
            status: true,
            type: true,
            scheduledAt: true,
            totalPrice: true,
            createdAt: true,
            service: { select: { title: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 500,
        }),
        this.prisma.booking.findMany({
          where: { providerId: userId },
          select: {
            id: true,
            status: true,
            type: true,
            scheduledAt: true,
            totalPrice: true,
            createdAt: true,
            service: { select: { title: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 500,
        }),
        this.prisma.notification.findMany({
          where: { userId },
          select: {
            id: true,
            type: true,
            title: true,
            createdAt: true,
            isRead: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 200,
        }),
        this.prisma.deviceToken.findMany({
          where: { userId },
          select: {
            id: true,
            platform: true,
            token: true,
            createdAt: true,
          },
          take: 50,
        }),
      ]);

    const mapBooking = (
      b: {
        id: string;
        status: string;
        type: string;
        scheduledAt: Date;
        totalPrice: number | { toNumber?: () => number } | unknown;
        createdAt: Date;
        service: { title: string };
      },
      role: 'customer' | 'provider',
    ) => ({
      id: b.id,
      serviceTitle: b.service.title,
      status: b.status,
      type: b.type,
      scheduledAt: b.scheduledAt.toISOString(),
      totalPrice:
        typeof b.totalPrice === 'number'
          ? b.totalPrice
          : Number(b.totalPrice),
      role,
      createdAt: b.createdAt.toISOString(),
    });

    return {
      exportedAt: new Date().toISOString(),
      profile: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        phoneVerifiedAt: user.phoneVerifiedAt?.toISOString() ?? null,
        role: user.role,
        isVerified: user.isVerified,
        createdAt: user.createdAt.toISOString(),
        providerProfile: user.providerProfile
          ? {
              bio: user.providerProfile.bio,
              experience: user.providerProfile.experience,
              location: user.providerProfile.location,
              isVerified: user.providerProfile.isVerified,
              rating: user.providerProfile.rating,
              reviewCount: user.providerProfile.reviewCount,
              availability: String(user.providerProfile.availability),
            }
          : null,
      },
      services: services.map((s) => ({
        id: s.id,
        title: s.title,
        status: s.status,
        price: Number(s.price),
        createdAt: s.createdAt.toISOString(),
      })),
      bookings: [
        ...bookingsAsCustomer.map((b) => mapBooking(b, 'customer')),
        ...bookingsAsProvider.map((b) => mapBooking(b, 'provider')),
      ],
      notifications: notifications.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        createdAt: n.createdAt.toISOString(),
        isRead: n.isRead,
      })),
      deviceTokens: deviceTokens.map((d) => ({
        id: d.id,
        platform: d.platform,
        tokenMasked:
          d.token.length <= 8
            ? '****'
            : `${d.token.slice(0, 4)}…${d.token.slice(-4)}`,
        createdAt: d.createdAt.toISOString(),
      })),
    };
  }

  private mapUserProfile(user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    phoneVerifiedAt?: Date | null;
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
      availability?: ProviderAvailability | string;
      lastLat?: number | null;
      lastLng?: number | null;
      lastHeading?: number | null;
      locationUpdatedAt?: Date | null;
    } | null;
  }) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone ?? undefined,
      phoneVerifiedAt: user.phoneVerifiedAt?.toISOString() ?? null,
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
            availability:
              (user.providerProfile.availability as ProviderAvailability | undefined) ??
              ProviderAvailability.OFFLINE,
            lastLat: user.providerProfile.lastLat ?? null,
            lastLng: user.providerProfile.lastLng ?? null,
            lastHeading: user.providerProfile.lastHeading ?? null,
            locationUpdatedAt:
              user.providerProfile.locationUpdatedAt?.toISOString() ?? null,
          }
        : undefined,
    };
  }
}
