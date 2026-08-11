import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import {
  EmailVerificationPurpose,
  UserRole,
  ServiceStatus,
  BookingStatus,
  BookingType,
  DispatchOfferStatus,
} from '@prisma/client';
import { ACTIVE_BOOKING_STATUSES, ProviderAvailability } from '@xidmetal/shared';
import { PrismaService } from '../../common/database/prisma.service';
import { MailService } from '../../common/mail/mail.service';
import { assertValidEmailCode } from '../../common/auth/email-verification-codes';
import { generateNumericOtp } from '../../common/auth/otp';
import { StorageService } from '../../common/storage/storage.service';
import {
  ChangePasswordDto,
  UpdateProfileDto,
  RequestEmailChangeDto,
  ConfirmEmailChangeDto,
  DeleteAccountDto,
} from './dto';

const EMAIL_CODE_EXPIRY_MS = 15 * 60 * 1000;

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
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

    const now = new Date();
    const [totalServices, activeServices, scheduledPending, offerPending, completedBookings] =
      await Promise.all([
        this.prisma.service.count({ where: { providerId: userId } }),
        this.prisma.service.count({
          where: { providerId: userId, status: ServiceStatus.ACTIVE },
        }),
        // Seed PENDING INSTANT sayılmır — yalnız planlı gözləyənlər
        this.prisma.booking.count({
          where: {
            providerId: userId,
            status: BookingStatus.PENDING,
            NOT: { type: BookingType.INSTANT },
          },
        }),
        // Forma filtrlərinə uyğun aktiv təcili təkliflər
        this.prisma.dispatchOffer.count({
          where: {
            providerId: userId,
            status: DispatchOfferStatus.PENDING,
            expiresAt: { gt: now },
            booking: {
              type: BookingType.INSTANT,
              status: BookingStatus.PENDING,
            },
          },
        }),
        this.prisma.booking.count({
          where: { providerId: userId, status: BookingStatus.COMPLETED },
        }),
      ]);
    const pendingBookings = scheduledPending + offerPending;

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

    const normalizedAvatarUrl =
      dto.avatarUrl !== undefined && dto.avatarUrl !== null && dto.avatarUrl !== ''
        ? await this.storageService.assertOwnedUploadUrl(dto.avatarUrl, 'avatars', userId)
        : dto.avatarUrl;

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

    const previousAvatarUrl = existing.avatarUrl;
    const nextAvatarUrl =
      dto.avatarUrl !== undefined ? normalizedAvatarUrl || null : previousAvatarUrl;

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
        }),
        ...(dto.avatarUrl !== undefined && {
          avatarUrl: normalizedAvatarUrl || null,
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

    const code = generateNumericOtp();
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
    const redactedMessage = '[silinib]';

    const bookingIds = (
      await this.prisma.booking.findMany({
        where: {
          OR: [{ customerId: userId }, { providerId: userId }],
        },
        select: { id: true },
      })
    ).map((b) => b.id);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
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
      });

      await tx.refreshToken.deleteMany({ where: { userId } });
      await tx.emailVerificationCode.deleteMany({ where: { userId } });
      await tx.deviceToken.deleteMany({ where: { userId } });

      await tx.message.updateMany({
        where: { senderId: userId },
        data: { content: redactedMessage },
      });

      if (bookingIds.length > 0) {
        await tx.locationPing.deleteMany({
          where: { bookingId: { in: bookingIds } },
        });

        await tx.booking.updateMany({
          where: { id: { in: bookingIds } },
          data: {
            notes: null,
            address: null,
            imageUrl: null,
            destLat: null,
            destLng: null,
            originLat: null,
            originLng: null,
            cancelReason: null,
          },
        });
      }

      await tx.providerProfile.updateMany({
        where: { userId },
        data: {
          bio: null,
          location: null,
          lastLat: null,
          lastLng: null,
          lastHeading: null,
          locationUpdatedAt: null,
          availability: ProviderAvailability.OFFLINE,
        },
      });
    });

    // PostGIS geography sütunu Prisma Unsupported — raw scrub
    try {
      await this.prisma.$executeRaw`
        UPDATE provider_profiles
        SET last_location = NULL
        WHERE user_id = ${userId}
      `;
    } catch {
      // best-effort — PostGIS yoxdursa və ya sync artıq NULL
    }

    if (user.avatarUrl) {
      await this.storageService.deleteByPublicUrl(user.avatarUrl);
    }

    return { message: 'Hesabınız silindi' };
  }

  private async mapUserProfile(user: {
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
      avatarUrl: await this.storageService.toReadableMediaUrl(user.avatarUrl),
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
