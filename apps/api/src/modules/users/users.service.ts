import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

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

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }
}
