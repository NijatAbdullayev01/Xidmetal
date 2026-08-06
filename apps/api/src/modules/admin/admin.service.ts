import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import {
  BookingStatus,
  NotificationType,
  Prisma,
  ReviewStatus,
  ServiceStatus,
  UserRole,
} from '@prisma/client';
import type {
  AdminAnnouncementResult,
  AdminCategorySummary,
  AdminDashboardStats,
  AdminReviewSummary,
  AdminUserSummary,
  BookingSummary,
  PaginatedResponse,
  ServiceSummary,
} from '@xidmetal/shared';
import { PrismaService } from '../../common/database/prisma.service';
import {
  AdminBookingsQueryDto,
  AdminReviewsQueryDto,
  AdminServicesQueryDto,
  AdminUsersQueryDto,
  CreateAnnouncementDto,
  CreateCategoryDto,
  SetProviderVerifiedDto,
  SetReviewStatusDto,
  SetServiceStatusDto,
  SetUserActiveDto,
  UpdateCategoryDto,
} from './dto';

function slugify(input: string): string {
  const map: Record<string, string> = {
    ə: 'e',
    Ə: 'e',
    ı: 'i',
    İ: 'i',
    ö: 'o',
    Ö: 'o',
    ü: 'u',
    Ü: 'u',
    ç: 'c',
    Ç: 'c',
    ş: 's',
    Ş: 's',
    ğ: 'g',
    Ğ: 'g',
  };
  return input
    .split('')
    .map((ch) => map[ch] ?? ch)
    .join('')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getStats(): Promise<AdminDashboardStats> {
    const [
      usersTotal,
      usersCustomers,
      usersProviders,
      usersActive,
      providersUnverified,
      servicesTotal,
      servicesActive,
      bookingsTotal,
      bookingsPending,
      reviewsPending,
      categoriesActive,
    ] = await Promise.all([
      this.prisma.user.count({ where: { role: { not: UserRole.ADMIN } } }),
      this.prisma.user.count({ where: { role: UserRole.CUSTOMER } }),
      this.prisma.user.count({ where: { role: UserRole.PROVIDER } }),
      this.prisma.user.count({
        where: { isActive: true, role: { not: UserRole.ADMIN } },
      }),
      this.prisma.providerProfile.count({ where: { isVerified: false } }),
      this.prisma.service.count(),
      this.prisma.service.count({ where: { status: ServiceStatus.ACTIVE } }),
      this.prisma.booking.count(),
      this.prisma.booking.count({ where: { status: BookingStatus.PENDING } }),
      this.prisma.review.count({ where: { status: ReviewStatus.PENDING } }),
      this.prisma.category.count({ where: { isActive: true } }),
    ]);

    return {
      usersTotal,
      usersCustomers,
      usersProviders,
      usersActive,
      providersUnverified,
      servicesTotal,
      servicesActive,
      bookingsTotal,
      bookingsPending,
      reviewsPending,
      categoriesActive,
    };
  }

  async listUsers(query: AdminUsersQueryDto): Promise<PaginatedResponse<AdminUserSummary>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      role: query.role ?? { not: UserRole.ADMIN },
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(query.search
        ? {
            OR: [
              { email: { contains: query.search, mode: 'insensitive' } },
              { firstName: { contains: query.search, mode: 'insensitive' } },
              { lastName: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          providerProfile: true,
          _count: {
            select: {
              services: true,
              bookingsAsCustomer: true,
              bookingsAsProvider: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: rows.map((u) => this.mapUser(u)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 0,
    };
  }

  async getUser(id: string): Promise<AdminUserSummary> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        providerProfile: true,
        _count: {
          select: {
            services: true,
            bookingsAsCustomer: true,
            bookingsAsProvider: true,
          },
        },
      },
    });

    if (!user || user.role === UserRole.ADMIN) {
      throw new NotFoundException('İstifadəçi tapılmadı');
    }

    return this.mapUser(user);
  }

  async setUserActive(id: string, adminId: string, dto: SetUserActiveDto) {
    if (id === adminId) {
      throw new BadRequestException('Öz hesabınızı deaktiv edə bilməzsiniz');
    }

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || user.role === UserRole.ADMIN) {
      throw new NotFoundException('İstifadəçi tapılmadı');
    }

    if (!dto.isActive) {
      await this.prisma.refreshToken.deleteMany({ where: { userId: id } });
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { isActive: dto.isActive },
      include: {
        providerProfile: true,
        _count: {
          select: {
            services: true,
            bookingsAsCustomer: true,
            bookingsAsProvider: true,
          },
        },
      },
    });

    return this.mapUser(updated);
  }

  async setProviderVerified(userId: string, dto: SetProviderVerifiedDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { providerProfile: true },
    });

    if (!user || user.role !== UserRole.PROVIDER || !user.providerProfile) {
      throw new NotFoundException('Xidmət verən tapılmadı');
    }

    await this.prisma.providerProfile.update({
      where: { userId },
      data: { isVerified: dto.isVerified },
    });

    return this.getUser(userId);
  }

  async listCategories(): Promise<AdminCategorySummary[]> {
    const categories = await this.prisma.category.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { services: true } } },
    });

    return categories.map((c) => this.mapCategory(c));
  }

  async createCategory(dto: CreateCategoryDto): Promise<AdminCategorySummary> {
    const slug = dto.slug?.trim() || slugify(dto.name);
    if (!slug) {
      throw new BadRequestException('Slug yaradıla bilmədi — adı dəyişin');
    }

    const existing = await this.prisma.category.findUnique({ where: { slug } });
    if (existing) {
      throw new ConflictException('Bu slug artıq mövcuddur');
    }

    const maxSort = await this.prisma.category.aggregate({ _max: { sortOrder: true } });
    const category = await this.prisma.category.create({
      data: {
        name: dto.name.trim(),
        slug,
        description: dto.description?.trim() || null,
        icon: dto.icon?.trim() || null,
        sortOrder: dto.sortOrder ?? (maxSort._max.sortOrder ?? 0) + 1,
        isActive: dto.isActive ?? true,
      },
      include: { _count: { select: { services: true } } },
    });

    return this.mapCategory(category);
  }

  async updateCategory(id: string, dto: UpdateCategoryDto): Promise<AdminCategorySummary> {
    const existing = await this.prisma.category.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Kateqoriya tapılmadı');
    }

    if (dto.slug && dto.slug !== existing.slug) {
      const clash = await this.prisma.category.findUnique({ where: { slug: dto.slug } });
      if (clash) {
        throw new ConflictException('Bu slug artıq mövcuddur');
      }
    }

    const category = await this.prisma.category.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.slug !== undefined ? { slug: dto.slug } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description.trim() || null }
          : {}),
        ...(dto.icon !== undefined ? { icon: dto.icon.trim() || null } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
      include: { _count: { select: { services: true } } },
    });

    return this.mapCategory(category);
  }

  async listServices(
    query: AdminServicesQueryDto,
  ): Promise<PaginatedResponse<ServiceSummary>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ServiceWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              {
                provider: {
                  OR: [
                    { firstName: { contains: query.search, mode: 'insensitive' } },
                    { lastName: { contains: query.search, mode: 'insensitive' } },
                  ],
                },
              },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.service.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          category: { select: { id: true, name: true } },
          provider: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
              providerProfile: { select: { experience: true, rating: true, reviewCount: true } },
            },
          },
          images: { orderBy: { sortOrder: 'asc' }, take: 1 },
          _count: { select: { bookings: true } },
        },
      }),
      this.prisma.service.count({ where }),
    ]);

    return {
      items: rows.map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        price: Number(s.price),
        priceUnit: s.priceUnit,
        categoryId: s.categoryId,
        categoryName: s.category.name,
        providerId: s.providerId,
        providerName: `${s.provider.firstName} ${s.provider.lastName}`,
        providerAvatarUrl: s.provider.avatarUrl ?? undefined,
        providerExperience: s.provider.providerProfile?.experience ?? undefined,
        averageRating: s.provider.providerProfile?.rating ?? 0,
        reviewCount: s.provider.providerProfile?.reviewCount ?? 0,
        status: s.status as ServiceSummary['status'],
        location: s.location ?? undefined,
        isRemote: s.isRemote,
        serviceVenue: s.serviceVenue ?? undefined,
        vehicleLength: s.vehicleLength ?? undefined,
        vehicleWidth: s.vehicleWidth ?? undefined,
        vehicleHeight: s.vehicleHeight ?? undefined,
        cargoRouteScope: s.cargoRouteScope ?? undefined,
        createdAt: s.createdAt.toISOString(),
        bookingCount: s._count.bookings,
        images: s.images.map((img) => ({
          id: img.id,
          url: img.url,
          alt: img.alt ?? undefined,
          sortOrder: img.sortOrder,
        })),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 0,
    };
  }

  async setServiceStatus(id: string, dto: SetServiceStatusDto): Promise<ServiceSummary> {
    const existing = await this.prisma.service.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Xidmət tapılmadı');
    }

    const updated = await this.prisma.service.update({
      where: { id },
      data: { status: dto.status },
      include: {
        category: { select: { id: true, name: true } },
        provider: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            providerProfile: { select: { experience: true, rating: true, reviewCount: true } },
          },
        },
        images: { orderBy: { sortOrder: 'asc' }, take: 3 },
        _count: { select: { bookings: true } },
      },
    });

    return {
      id: updated.id,
      title: updated.title,
      description: updated.description,
      price: Number(updated.price),
      priceUnit: updated.priceUnit,
      categoryId: updated.categoryId,
      categoryName: updated.category.name,
      providerId: updated.providerId,
      providerName: `${updated.provider.firstName} ${updated.provider.lastName}`,
      providerAvatarUrl: updated.provider.avatarUrl ?? undefined,
      providerExperience: updated.provider.providerProfile?.experience ?? undefined,
      averageRating: updated.provider.providerProfile?.rating ?? 0,
      reviewCount: updated.provider.providerProfile?.reviewCount ?? 0,
      status: updated.status as ServiceSummary['status'],
      location: updated.location ?? undefined,
      isRemote: updated.isRemote,
      serviceVenue: updated.serviceVenue ?? undefined,
      vehicleLength: updated.vehicleLength ?? undefined,
      vehicleWidth: updated.vehicleWidth ?? undefined,
      vehicleHeight: updated.vehicleHeight ?? undefined,
      cargoRouteScope: updated.cargoRouteScope ?? undefined,
      createdAt: updated.createdAt.toISOString(),
      bookingCount: updated._count.bookings,
      images: updated.images.map((img) => ({
        id: img.id,
        url: img.url,
        alt: img.alt ?? undefined,
        sortOrder: img.sortOrder,
      })),
    };
  }

  async listBookings(
    query: AdminBookingsQueryDto,
  ): Promise<PaginatedResponse<BookingSummary>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.BookingWhereInput = {
      ...(query.status ? { status: query.status } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          service: { select: { title: true } },
          customer: { select: { firstName: true, lastName: true } },
          provider: { select: { firstName: true, lastName: true } },
          review: { select: { id: true } },
        },
      }),
      this.prisma.booking.count({ where }),
    ]);

    return {
      items: rows.map((b) => ({
        id: b.id,
        serviceId: b.serviceId,
        serviceTitle: b.service.title,
        customerId: b.customerId,
        customerName: `${b.customer.firstName} ${b.customer.lastName}`,
        providerId: b.providerId,
        providerName: `${b.provider.firstName} ${b.provider.lastName}`,
        scheduledAt: b.scheduledAt.toISOString(),
        proposedScheduledAt: b.proposedScheduledAt?.toISOString(),
        status: b.status as BookingSummary['status'],
        totalPrice: Number(b.totalPrice),
        notes: b.notes ?? undefined,
        address: b.address ?? undefined,
        imageUrl: b.imageUrl ?? undefined,
        hasReview: Boolean(b.review),
        createdAt: b.createdAt.toISOString(),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 0,
    };
  }

  async listReviews(
    query: AdminReviewsQueryDto,
  ): Promise<PaginatedResponse<AdminReviewSummary>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ReviewWhereInput = {
      ...(query.status ? { status: query.status } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { id: true, firstName: true, lastName: true } },
          booking: {
            select: {
              providerId: true,
              service: { select: { title: true } },
              provider: { select: { firstName: true, lastName: true } },
            },
          },
        },
      }),
      this.prisma.review.count({ where }),
    ]);

    return {
      items: rows.map((r) => ({
        id: r.id,
        bookingId: r.bookingId,
        serviceTitle: r.booking.service.title,
        authorId: r.author.id,
        authorName: `${r.author.firstName} ${r.author.lastName}`,
        providerId: r.booking.providerId,
        providerName: `${r.booking.provider.firstName} ${r.booking.provider.lastName}`,
        rating: r.rating,
        comment: r.comment ?? undefined,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 0,
    };
  }

  async setReviewStatus(id: string, dto: SetReviewStatusDto): Promise<AdminReviewSummary> {
    if (dto.status !== ReviewStatus.APPROVED && dto.status !== ReviewStatus.REJECTED) {
      throw new BadRequestException('Yalnız APPROVED və ya REJECTED statusu təyin edilə bilər');
    }

    const review = await this.prisma.review.findUnique({
      where: { id },
      include: {
        booking: {
          select: {
            providerId: true,
            provider: {
              select: {
                providerProfile: { select: { rating: true, reviewCount: true } },
              },
            },
          },
        },
      },
    });

    if (!review) {
      throw new NotFoundException('Rəy tapılmadı');
    }

    const profile = review.booking.provider.providerProfile;
    if (!profile) {
      throw new BadRequestException('Xidmət verənin profili tapılmadı');
    }

    const previousStatus = review.status;
    const nextStatus = dto.status;

    await this.prisma.$transaction(async (tx) => {
      await tx.review.update({
        where: { id },
        data: { status: nextStatus },
      });

      // APPROVED → digər: reytinqdən çıxar
      if (previousStatus === ReviewStatus.APPROVED && nextStatus !== ReviewStatus.APPROVED) {
        const newCount = Math.max(0, profile.reviewCount - 1);
        let newRating = 0;
        if (newCount > 0) {
          newRating =
            Math.round(
              ((profile.rating * profile.reviewCount - review.rating) / newCount) * 100,
            ) / 100;
        }
        await tx.providerProfile.update({
          where: { userId: review.booking.providerId },
          data: { rating: Math.max(0, newRating), reviewCount: newCount },
        });
      }

      // digər → APPROVED: reytinqə əlavə et
      if (previousStatus !== ReviewStatus.APPROVED && nextStatus === ReviewStatus.APPROVED) {
        const newCount = profile.reviewCount + 1;
        const newRating =
          profile.reviewCount === 0
            ? review.rating
            : (profile.rating * profile.reviewCount + review.rating) / newCount;
        await tx.providerProfile.update({
          where: { userId: review.booking.providerId },
          data: {
            rating: Math.round(newRating * 100) / 100,
            reviewCount: newCount,
          },
        });
      }
    });

    const refreshed = await this.prisma.review.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
        booking: {
          select: {
            providerId: true,
            service: { select: { title: true } },
            provider: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!refreshed) {
      throw new NotFoundException('Rəy tapılmadı');
    }

    return {
      id: refreshed.id,
      bookingId: refreshed.bookingId,
      serviceTitle: refreshed.booking.service.title,
      authorId: refreshed.author.id,
      authorName: `${refreshed.author.firstName} ${refreshed.author.lastName}`,
      providerId: refreshed.booking.providerId,
      providerName: `${refreshed.booking.provider.firstName} ${refreshed.booking.provider.lastName}`,
      rating: refreshed.rating,
      comment: refreshed.comment ?? undefined,
      status: refreshed.status,
      createdAt: refreshed.createdAt.toISOString(),
    };
  }

  async createAnnouncement(dto: CreateAnnouncementDto): Promise<AdminAnnouncementResult> {
    const roles = dto.roles?.length
      ? dto.roles
      : [UserRole.CUSTOMER, UserRole.PROVIDER];

    const users = await this.prisma.user.findMany({
      where: {
        isActive: true,
        role: { in: roles },
      },
      select: { id: true },
    });

    if (users.length === 0) {
      return { sentCount: 0 };
    }

    const title = dto.title.trim();
    const body = dto.body.trim();
    const href = dto.href?.trim();
    const safeHref =
      href && href.startsWith('/') && !href.startsWith('//') && !href.includes('://')
        ? href
        : undefined;

    await this.prisma.notification.createMany({
      data: users.map((u) => ({
        userId: u.id,
        type: NotificationType.ADMIN_ANNOUNCEMENT,
        title,
        body,
        data: {
          source: 'admin',
          ...(safeHref ? { href: safeHref } : {}),
        } as Prisma.InputJsonValue,
      })),
    });

    return { sentCount: users.length };
  }

  private mapUser(user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    avatarUrl: string | null;
    role: UserRole;
    isVerified: boolean;
    isActive: boolean;
    createdAt: Date;
    lastSeenAt: Date | null;
    providerProfile: {
      id: string;
      isVerified: boolean;
      rating: number;
      reviewCount: number;
      location: string | null;
      experience: number | null;
    } | null;
    _count: {
      services: number;
      bookingsAsCustomer: number;
      bookingsAsProvider: number;
    };
  }): AdminUserSummary {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone ?? undefined,
      avatarUrl: user.avatarUrl ?? undefined,
      role: user.role as AdminUserSummary['role'],
      isVerified: user.isVerified,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
      lastSeenAt: user.lastSeenAt?.toISOString() ?? null,
      providerProfile: user.providerProfile
        ? {
            id: user.providerProfile.id,
            isVerified: user.providerProfile.isVerified,
            rating: user.providerProfile.rating,
            reviewCount: user.providerProfile.reviewCount,
            location: user.providerProfile.location ?? undefined,
            experience: user.providerProfile.experience ?? undefined,
          }
        : undefined,
      _count: user._count,
    };
  }

  private mapCategory(category: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    icon: string | null;
    sortOrder: number;
    isActive: boolean;
    createdAt: Date;
    _count: { services: number };
  }): AdminCategorySummary {
    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description ?? undefined,
      icon: category.icon ?? undefined,
      sortOrder: category.sortOrder,
      isActive: category.isActive,
      serviceCount: category._count.services,
      createdAt: category.createdAt.toISOString(),
    };
  }
}
