import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { EmailVerificationPurpose, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import { MailService, type MailSendResult } from '../../common/mail/mail.service';
import {
  RegisterDto,
  LoginDto,
  ResetPasswordDto,
  ConfirmEmailVerificationDto,
} from './dto';
import { CLIENT_APP, ProviderAccountType, ProviderAvailability, UserRole, type ClientApp } from '@xidmetal/shared';
import { resolveProviderProfileCreate, resolveRegisterPersonNames } from './provider-account';
import { parseDurationMs } from '../../common/auth/auth-cookies';
import { assertValidEmailCode } from '../../common/auth/email-verification-codes';
import { generateNumericOtp } from '../../common/auth/otp';
import { hashRefreshToken } from '../../common/auth/refresh-token';
import { CaptchaService } from '../../common/captcha/captcha.service';
import { StorageService } from '../../common/storage/storage.service';
import { invalidateJwtUserCache } from '../../common/auth/jwt-user-cache';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';
const EMAIL_CODE_EXPIRY_MS = 15 * 60 * 1000;

/** İstifadəçi enumeration / timing attack-ə qarşı vahid cavab */
const FORGOT_PASSWORD_MESSAGE =
  'Əgər bu e-poçt qeydiyyatdadırsa, təsdiq kodu göndərildi';
const VERIFY_REQUEST_MESSAGE =
  'Əgər bu e-poçt təsdiqlənməyibsə, təsdiq kodu göndərildi';

/** Login timing pad — mövcud olmayan email üçün də bcrypt dəyəri */
let timingPadHash: string | null = null;

async function compareWithTimingPad(password: string, hash: string | null): Promise<boolean> {
  if (hash) {
    return bcrypt.compare(password, hash);
  }
  if (!timingPadHash) {
    timingPadHash = await bcrypt.hash('__xidmetal_timing_pad__', 12);
  }
  await bcrypt.compare(password, timingPadHash);
  return false;
}
@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
    private mailService: MailService,
    private captcha: CaptchaService,
    private storageService: StorageService,
  ) {}

  async register(dto: RegisterDto) {
    await this.captcha.assertValid(dto.captchaToken);
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [{ email }, { phone: dto.phone }],
      },
      select: { email: true, phone: true },
    });

    if (existing) {
      if (existing.email === email) {
        throw new ConflictException('Bu e-poçt artıq qeydiyyatdan keçib');
      }
      throw new ConflictException('Bu telefon nömrəsi artıq qeydiyyatdan keçib');
    }

    const role = dto.role ?? UserRole.CUSTOMER;
    if (role === UserRole.ADMIN) {
      throw new BadRequestException('Bu hesab növü ilə qeydiyyat mümkün deyil');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const providerProfile = resolveProviderProfileCreate({
      role,
      providerAccountType: dto.providerAccountType,
      companyName: dto.companyName,
    });
    const personNames = resolveRegisterPersonNames({
      role,
      providerAccountType: dto.providerAccountType,
      companyName: dto.companyName,
      firstName: dto.firstName,
      lastName: dto.lastName,
    });

    let user;
    try {
      user = await this.prisma.user.create({
        data: {
          email,
          passwordHash,
          firstName: personNames.firstName,
          lastName: personNames.lastName,
          phone: dto.phone,
          role,
          isVerified: false,
          ...(providerProfile && {
            providerProfile: { create: providerProfile },
          }),
        },
        include: { providerProfile: true },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_CONSTRAINT_VIOLATION
      ) {
        throw new ConflictException(this.uniqueConstraintMessage(error));
      }
      throw error;
    }

    const mail = await this.issueEmailCode(
      user.id,
      user.email,
      EmailVerificationPurpose.SIGNUP_VERIFY,
      (to, code) => this.mailService.sendSignupVerificationCode(to, code),
    );

    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.role,
      CLIENT_APP.MARKETPLACE,
    );
    return {
      user: await this.sanitizeUser(user),
      tokens,
      ...this.mailMeta(mail),
    };
  }

  async login(dto: LoginDto, clientApp: ClientApp) {
    await this.captcha.assertValid(dto.captchaToken);
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { providerProfile: true },
    });
    const usable =
      user && user.isActive && !user.deletedAt ? user : null;

    const valid = await compareWithTimingPad(
      dto.password,
      usable?.passwordHash ?? null,
    );
    if (!usable || !valid) {
      throw new UnauthorizedException('E-poçt və ya şifrə səhvdir');
    }

    this.assertClientAudience(usable.role, clientApp);

    const tokens = await this.generateTokens(
      usable.id,
      usable.email,
      usable.role,
      clientApp,
    );
    return { user: await this.sanitizeUser(usable), tokens };
  }

  /**
   * Marketplace yalnız CUSTOMER/PROVIDER; admin panel yalnız ADMIN.
   * clientApp məcburidir — yanlış app-də session yaradılmır.
   */
  assertClientAudience(role: string, clientApp: ClientApp): void {
    if (clientApp === CLIENT_APP.MARKETPLACE && role === UserRole.ADMIN) {
      throw new ForbiddenException(
        'Administrator hesabı marketplace-ə aid deyil. Admin panelinə keçin.',
      );
    }
    if (clientApp === CLIENT_APP.ADMIN && role !== UserRole.ADMIN) {
      throw new ForbiddenException('Bu panel yalnız administrator üçündür');
    }
  }

  async refresh(refreshToken: string, clientAppHint?: ClientApp) {
    const tokenHash = hashRefreshToken(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: tokenHash },
      select: {
        id: true,
        expiresAt: true,
        userId: true,
        clientApp: true,
        user: {
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
            isActive: true,
            deletedAt: true,
            createdAt: true,
            providerProfile: true,
          },
        },
      },
    });

    if (
      !stored ||
      stored.expiresAt < new Date() ||
      !stored.user.isActive ||
      stored.user.deletedAt
    ) {
      throw new UnauthorizedException('Refresh token etibarsızdır');
    }

    const storedApp =
      stored.clientApp === CLIENT_APP.ADMIN || stored.clientApp === CLIENT_APP.MARKETPLACE
        ? stored.clientApp
        : CLIENT_APP.MARKETPLACE;

    // Client hint varsa session audiense ilə uyğun olmalıdır
    if (clientAppHint && clientAppHint !== storedApp) {
      throw new ForbiddenException('Sessiya bu tətbiq üçün etibarsızdır');
    }

    this.assertClientAudience(stored.user.role, storedApp);

    // Atomic silinmə: eyni token ilə paralel refresh sorğularının hər ikisinin
    // yeni token cütlüyü yaratmasının (token reuse) qarşısını alır.
    const { count } = await this.prisma.refreshToken.deleteMany({
      where: { id: stored.id, token: tokenHash },
    });
    if (count === 0) {
      // Reuse aşkarlandı — oğurlanmış refresh artıq işlədilmiş ola bilər; bütün ailəni ləğv et
      await this.prisma.refreshToken.deleteMany({ where: { userId: stored.userId } });
      throw new UnauthorizedException('Refresh token etibarsızdır');
    }

    const tokens = await this.generateTokens(
      stored.user.id,
      stored.user.email,
      stored.user.role,
      storedApp,
    );
    return {
      user: await this.sanitizeUser(stored.user),
      tokens,
      clientApp: storedApp,
    };
  }

  /** Cari sessiyanı (refresh token) serverdə ləğv edir */
  async logout(refreshToken: string) {
    const tokenHash = hashRefreshToken(refreshToken);
    await this.prisma.refreshToken.deleteMany({ where: { token: tokenHash } });
    return { message: 'Çıxış edildi' };
  }

  /** İstifadəçinin bütün sessiyalarını ləğv edir */
  async logoutAll(userId: string) {
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
    return { message: 'Bütün cihazlardan çıxış edildi' };
  }

  async forgotPassword(email: string, captchaToken?: string) {
    await this.captcha.assertValid(captchaToken);
    const normalized = email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email: normalized },
      select: { id: true, email: true, isActive: true, deletedAt: true },
    });

    // Enumeration-a qarşı: həmişə eyni mesaj; previewCode yalnız mövcud user + DEV
    if (user?.isActive && !user.deletedAt) {
      const mail = await this.issueEmailCode(
        user.id,
        user.email,
        EmailVerificationPurpose.PASSWORD_RESET,
        (to, code) => this.mailService.sendPasswordResetCode(to, code),
      );
      return { message: FORGOT_PASSWORD_MESSAGE, ...this.mailMeta(mail) };
    }

    return { message: FORGOT_PASSWORD_MESSAGE };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, isActive: true, deletedAt: true },
    });

    if (!user || !user.isActive || user.deletedAt) {
      throw new BadRequestException('Təsdiq kodu səhvdir və ya müddəti bitib');
    }

    await assertValidEmailCode(this.prisma, {
      userId: user.id,
      email,
      purpose: EmailVerificationPurpose.PASSWORD_RESET,
      code: dto.code,
    });

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash, passwordChangedAt: new Date() },
      }),
      this.prisma.refreshToken.deleteMany({ where: { userId: user.id } }),
      this.prisma.emailVerificationCode.deleteMany({
        where: { userId: user.id, purpose: EmailVerificationPurpose.PASSWORD_RESET },
      }),
    ]);
    invalidateJwtUserCache(user.id);

    return { message: 'Şifrə uğurla yeniləndi. Yenidən daxil olun' };
  }

  async requestEmailVerification(email: string, captchaToken?: string) {
    await this.captcha.assertValid(captchaToken);
    const normalized = email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email: normalized },
      select: { id: true, email: true, isActive: true, isVerified: true, deletedAt: true },
    });

    if (user?.isActive && !user.deletedAt && !user.isVerified) {
      const mail = await this.issueEmailCode(
        user.id,
        user.email,
        EmailVerificationPurpose.SIGNUP_VERIFY,
        (to, code) => this.mailService.sendSignupVerificationCode(to, code),
      );
      return { message: VERIFY_REQUEST_MESSAGE, ...this.mailMeta(mail) };
    }

    return { message: VERIFY_REQUEST_MESSAGE };
  }

  async confirmEmailVerification(dto: ConfirmEmailVerificationDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
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
        isActive: true,
        deletedAt: true,
        createdAt: true,
        providerProfile: true,
      },
    });

    if (!user || !user.isActive || user.deletedAt) {
      throw new BadRequestException('Təsdiq kodu səhvdir və ya müddəti bitib');
    }

    if (user.isVerified) {
      return {
        message: 'E-poçt artıq təsdiqlənib',
        user: await this.sanitizeUser(user),
      };
    }

    await assertValidEmailCode(this.prisma, {
      userId: user.id,
      email,
      purpose: EmailVerificationPurpose.SIGNUP_VERIFY,
      code: dto.code,
    });

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.emailVerificationCode.deleteMany({
        where: { userId: user.id, purpose: EmailVerificationPurpose.SIGNUP_VERIFY },
      });

      return tx.user.update({
        where: { id: user.id },
        data: { isVerified: true },
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

    return {
      message: 'E-poçt uğurla təsdiqləndi',
      user: await this.sanitizeUser(updated),
    };
  }

  private async issueEmailCode(
    userId: string,
    email: string,
    purpose: EmailVerificationPurpose,
    send: (email: string, code: string) => Promise<MailSendResult>,
  ): Promise<MailSendResult> {
    const code = generateNumericOtp();
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + EMAIL_CODE_EXPIRY_MS);

    await this.prisma.$transaction([
      this.prisma.emailVerificationCode.deleteMany({
        where: { userId, purpose },
      }),
      this.prisma.emailVerificationCode.create({
        data: { userId, email, codeHash, purpose, expiresAt },
      }),
    ]);

    return send(email, code);
  }

  private mailMeta(mail: MailSendResult): {
    mailDelivered: boolean;
    previewCode?: string;
  } {
    return {
      mailDelivered: mail.delivered,
      ...(mail.previewCode ? { previewCode: mail.previewCode } : {}),
    };
  }

  private async generateTokens(
    userId: string,
    email: string,
    role: string,
    clientApp: ClientApp,
  ) {
    const payload = { sub: userId, email, role, aud: clientApp };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = randomBytes(64).toString('hex');
    const expiresIn = this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '30d');
    const expiresAt = new Date(
      Date.now() + parseDurationMs(expiresIn, 30 * 24 * 60 * 60 * 1000),
    );

    await this.prisma.refreshToken.create({
      data: {
        token: hashRefreshToken(refreshToken),
        userId,
        clientApp,
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }

  private uniqueConstraintMessage(error: Prisma.PrismaClientKnownRequestError): string {
    const target = error.meta?.target;
    const fields = Array.isArray(target)
      ? target.map(String)
      : typeof target === 'string'
        ? [target]
        : [];

    if (fields.some((field) => field.includes('phone'))) {
      return 'Bu telefon nömrəsi artıq qeydiyyatdan keçib';
    }

    return 'Bu e-poçt artıq qeydiyyatdan keçib';
  }

  private async sanitizeUser(user: {
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
    providerProfile?: {
      id: string;
      bio: string | null;
      experience: number | null;
      location: string | null;
      accountType: string;
      companyName: string | null;
      isVerified: boolean;
      rating: number;
      reviewCount: number;
      availability: string;
      lastLat: number | null;
      lastLng: number | null;
      lastHeading: number | null;
      locationUpdatedAt: Date | null;
    } | null;
  }) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone ?? undefined,
      phoneVerifiedAt: user.phoneVerifiedAt?.toISOString() ?? null,
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
            accountType: user.providerProfile.accountType as ProviderAccountType,
            companyName: user.providerProfile.companyName ?? null,
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
