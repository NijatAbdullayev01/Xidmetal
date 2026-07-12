import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import { RegisterDto, LoginDto } from './dto';
import { UserRole } from '@xidmetal/shared';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Bu e-mail artıq qeydiyyatdan keçib');
    }

    const role = dto.role ?? UserRole.CUSTOMER;
    if (role === UserRole.ADMIN) {
      throw new BadRequestException('Bu hesab növü ilə qeydiyyat mümkün deyil');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    let user;
    try {
      user = await this.prisma.user.create({
        data: {
          email: dto.email,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          role,
          ...(role === UserRole.PROVIDER && {
            providerProfile: { create: {} },
          }),
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_CONSTRAINT_VIOLATION
      ) {
        throw new ConflictException('Bu e-mail artıq qeydiyyatdan keçib');
      }
      throw error;
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    return { user: this.sanitizeUser(user), tokens };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('E-mail və ya şifrə səhvdir');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('E-mail və ya şifrə səhvdir');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    return { user: this.sanitizeUser(user), tokens };
  }

  async refresh(refreshToken: string) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      select: {
        id: true,
        expiresAt: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            avatarUrl: true,
            role: true,
            isVerified: true,
            isActive: true,
            createdAt: true,
          },
        },
      },
    });

    if (!stored || stored.expiresAt < new Date() || !stored.user.isActive) {
      throw new UnauthorizedException('Refresh token etibarsızdır');
    }

    // Atomic silinmə: eyni token ilə paralel refresh sorğularının hər ikisinin
    // yeni token cütlüyü yaratmasının (token reuse) qarşısını alır.
    const { count } = await this.prisma.refreshToken.deleteMany({
      where: { id: stored.id, token: refreshToken },
    });
    if (count === 0) {
      throw new UnauthorizedException('Refresh token etibarsızdır');
    }

    const tokens = await this.generateTokens(
      stored.user.id,
      stored.user.email,
      stored.user.role,
    );
    return { user: this.sanitizeUser(stored.user), tokens };
  }

  private async generateTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = randomBytes(64).toString('hex');
    const expiresIn = this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '30d');
    const expiresAt = new Date(Date.now() + this.parseDuration(expiresIn));

    await this.prisma.refreshToken.create({
      data: { token: refreshToken, userId, expiresAt },
    });

    return { accessToken, refreshToken };
  }

  private parseDuration(duration: string): number {
    const match = duration.match(/^(\d+)([dhms])$/);
    if (!match) return 30 * 24 * 60 * 60 * 1000;
    const [, value, unit] = match;
    const num = parseInt(value!, 10);
    const multipliers: Record<string, number> = {
      d: 86400000,
      h: 3600000,
      m: 60000,
      s: 1000,
    };
    return num * (multipliers[unit!] ?? 86400000);
  }

  private sanitizeUser(user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    avatarUrl: string | null;
    role: string;
    isVerified: boolean;
    createdAt: Date;
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
    };
  }
}
