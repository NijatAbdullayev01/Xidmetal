import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Optional,
} from '@nestjs/common';
import {
  BookingStatus,
  NotificationType,
  Prisma,
  ProviderAvailability,
  ReportStatus,
  ReviewStatus,
  ServiceStatus,
  UserRole,
} from '@prisma/client';
import type {
  AdminAnnouncementResult,
  AdminCategorySummary,
  AdminDashboardStats,
  AdminReportSummary,
  AdminReviewSummary,
  AdminUserSummary,
  BookingSummary,
  PaginatedResponse,
  ServiceSummary,
} from '@xidmetal/shared';
import { sanitizeInternalPath } from '@xidmetal/shared';
import { PrismaService } from '../../common/database/prisma.service';
import { NotificationChannelsService } from '../../common/notifications/notification-channels.service';
import { StorageService } from '../../common/storage/storage.service';
import {
  AdminBookingsQueryDto,
  AdminReportsQueryDto,
  AdminReviewsQueryDto,
  AdminServicesQueryDto,
  AdminUsersQueryDto,
  CreateAnnouncementDto,
  CreateCategoryDto,
  SetProviderVerifiedDto,
  SetReportStatusDto,
  SetReviewStatusDto,
  SetServiceStatusDto,
  RequestServiceRevisionDto,
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
  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
    @Optional() private channels?: NotificationChannelsService,
  ) {}

  async getStats(): Promise<AdminDashboardStats> {
    const [
      usersTotal,
      usersCustomers,
      usersProviders,
      usersActive,
      providersUnverified,
      servicesTotal,
      servicesActive,
      servicesPendingReview,
      bookingsTotal,
      bookingsPending,
      reviewsPending,
      reportsPending,
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
      this.prisma.service.count({ where: { status: ServiceStatus.PENDING_REVIEW } }),
      this.prisma.booking.count(),
      this.prisma.booking.count({ where: { status: BookingStatus.PENDING } }),
      this.prisma.review.count({ where: { status: ReviewStatus.PENDING } }),
      this.prisma.report.count({ where: { status: ReportStatus.PENDING } }),
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
      servicesPendingReview,
      bookingsTotal,
      bookingsPending,
      reviewsPending,
      reportsPending,
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
      items: await Promise.all(rows.map((u) => this.mapUser(u))),
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

    if (adminId) {
      void this.writeAudit(adminId, 'USER_ACTIVE', 'USER', id, { isActive: dto.isActive });
    }

    return this.mapUser(updated);
  }

  async setProviderVerified(userId: string, dto: SetProviderVerifiedDto, adminId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { providerProfile: true },
    });

    if (!user || user.role !== UserRole.PROVIDER || !user.providerProfile) {
      throw new NotFoundException('Xidmət verən tapılmadı');
    }

    const wasVerified = user.providerProfile.isVerified;
    if (wasVerified === dto.isVerified) {
      return this.getUser(userId);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.providerProfile.update({
        where: { userId },
        data: {
          isVerified: dto.isVerified,
          ...(!dto.isVerified
            ? { availability: ProviderAvailability.OFFLINE }
            : {}),
        },
      });

      // Təsdiq ləğv olunanda aktiv xidmətlər dayandırılsın — marketplace-də görünməsin
      if (!dto.isVerified) {
        await tx.service.updateMany({
          where: { providerId: userId, status: ServiceStatus.ACTIVE },
          data: { status: ServiceStatus.PAUSED },
        });
      }
    });

    const title = dto.isVerified
      ? 'Hesabınız təsdiqləndi'
      : 'Hesab təsdiqi ləğv edildi';
    const body = dto.isVerified
      ? 'Admin hesabınızı təsdiqlədi. İndi xidmətlərinizi aktivləşdirə və sifariş qəbul edə bilərsiniz.'
      : 'Admin hesab təsdiqinizi ləğv etdi. Aktiv xidmətləriniz dayandırıldı; yenidən xidmət göstərmək üçün təsdiq gözləyin.';
    const href = '/dashboard/provider/services';

    const notification = await this.prisma.notification.create({
      data: {
        userId,
        type: NotificationType.ADMIN_ANNOUNCEMENT,
        title,
        body,
        data: { source: 'admin', href, providerVerified: dto.isVerified },
      },
    });

    this.channels?.deliverAfterInApp({
      userId,
      title,
      body,
      type: NotificationType.ADMIN_ANNOUNCEMENT,
      notificationId: notification.id,
      data: {
        source: 'admin',
        href,
        providerVerified: dto.isVerified,
      },
    });

    if (adminId) {
      void this.writeAudit(adminId, 'PROVIDER_VERIFY', 'USER', userId, {
        isVerified: dto.isVerified,
      });
    }

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
      items: await Promise.all(rows.map(async (s) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        price: Number(s.price),
        priceUnit: s.priceUnit,
        categoryId: s.categoryId,
        categoryName: s.category.name,
        providerId: s.providerId,
        providerName: `${s.provider.firstName} ${s.provider.lastName}`,
        providerAvatarUrl: await this.storageService.toReadableMediaUrl(s.provider.avatarUrl),
        providerExperience: s.provider.providerProfile?.experience ?? undefined,
        averageRating: s.provider.providerProfile?.rating ?? 0,
        reviewCount: s.provider.providerProfile?.reviewCount ?? 0,
        status: s.status as ServiceSummary['status'],
        reviewNote: s.reviewNote ?? null,
        submittedAt: s.submittedAt?.toISOString() ?? null,
        reviewedAt: s.reviewedAt?.toISOString() ?? null,
        location: s.location ?? undefined,
        isRemote: s.isRemote,
        serviceVenue: s.serviceVenue ?? undefined,
        vehicleLength: s.vehicleLength ?? undefined,
        vehicleWidth: s.vehicleWidth ?? undefined,
        vehicleHeight: s.vehicleHeight ?? undefined,
        cargoRouteScope: s.cargoRouteScope ?? undefined,
        createdAt: s.createdAt.toISOString(),
        bookingCount: s._count.bookings,
        images: await Promise.all(
          s.images.map(async (img) => ({
            id: img.id,
            url: (await this.storageService.toReadableMediaUrl(img.url)) ?? img.url,
            alt: img.alt ?? undefined,
            sortOrder: img.sortOrder,
          })),
        ),
      }))),
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

    if (dto.status === ServiceStatus.ACTIVE) {
      return this.approveService(id);
    }

    const updated = await this.prisma.service.update({
      where: { id },
      data: { status: dto.status },
      include: this.serviceAdminInclude(),
    });

    return this.mapAdminService(updated);
  }

  async approveService(id: string): Promise<ServiceSummary> {
    const existing = await this.prisma.service.findUnique({
      where: { id },
      include: {
        provider: { select: { id: true, providerProfile: { select: { isVerified: true } } } },
      },
    });
    if (!existing) {
      throw new NotFoundException('Xidmət tapılmadı');
    }
    if (!existing.provider.providerProfile?.isVerified) {
      throw new BadRequestException(
        'Əvvəlcə xidmət verənin profilini təsdiqləyin — sonra xidməti aktivləşdirmək olar',
      );
    }

    const updated = await this.prisma.service.update({
      where: { id },
      data: {
        status: ServiceStatus.ACTIVE,
        reviewNote: null,
        reviewedAt: new Date(),
      },
      include: this.serviceAdminInclude(),
    });

    const title = 'Xidmətiniz təsdiqləndi';
    const body = `«${updated.title}» xidmətiniz yoxlamadan keçdi və müştərilərə görünür.`;
    const href = '/dashboard/provider/services';
    const notification = await this.prisma.notification.create({
      data: {
        userId: updated.providerId,
        type: NotificationType.ADMIN_ANNOUNCEMENT,
        title,
        body,
        data: { source: 'admin', href, serviceId: updated.id, serviceApproved: true },
      },
    });
    this.channels?.deliverAfterInApp({
      userId: updated.providerId,
      title,
      body,
      type: NotificationType.ADMIN_ANNOUNCEMENT,
      notificationId: notification.id,
      data: { source: 'admin', href, serviceId: updated.id, serviceApproved: true },
    });

    return this.mapAdminService(updated);
  }

  async requestServiceRevision(
    id: string,
    dto: RequestServiceRevisionDto,
  ): Promise<ServiceSummary> {
    const existing = await this.prisma.service.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Xidmət tapılmadı');
    }
    if (
      existing.status !== ServiceStatus.PENDING_REVIEW &&
      existing.status !== ServiceStatus.ACTIVE
    ) {
      throw new BadRequestException(
        'Yalnız yoxlamada olan və ya aktiv xidmətlər düzəlişə göndərilə bilər',
      );
    }

    const note = dto.note.trim();
    const updated = await this.prisma.service.update({
      where: { id },
      data: {
        status: ServiceStatus.NEEDS_REVISION,
        reviewNote: note,
        reviewedAt: new Date(),
      },
      include: this.serviceAdminInclude(),
    });

    const title = 'Xidmət düzəlişə göndərildi';
    const body = `«${updated.title}» xidmətiniz düzəliş tələb edir: ${note}`;
    const href = `/dashboard/provider/services/${updated.id}/edit`;
    const notification = await this.prisma.notification.create({
      data: {
        userId: updated.providerId,
        type: NotificationType.ADMIN_ANNOUNCEMENT,
        title,
        body,
        data: {
          source: 'admin',
          href,
          serviceId: updated.id,
          serviceNeedsRevision: true,
        },
      },
    });
    this.channels?.deliverAfterInApp({
      userId: updated.providerId,
      title,
      body,
      type: NotificationType.ADMIN_ANNOUNCEMENT,
      notificationId: notification.id,
      data: {
        source: 'admin',
        href,
        serviceId: updated.id,
        serviceNeedsRevision: true,
      },
    });

    return this.mapAdminService(updated);
  }

  private serviceAdminInclude() {
    return {
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
      images: { orderBy: { sortOrder: 'asc' as const }, take: 3 },
      _count: { select: { bookings: true } },
    };
  }

  private async mapAdminService(updated: {
    id: string;
    title: string;
    description: string;
    price: { toNumber(): number } | number;
    priceUnit: string;
    categoryId: string;
    providerId: string;
    status: ServiceStatus;
    reviewNote: string | null;
    submittedAt: Date | null;
    reviewedAt: Date | null;
    location: string | null;
    isRemote: boolean;
    serviceVenue: string | null;
    vehicleLength: number | null;
    vehicleWidth: number | null;
    vehicleHeight: number | null;
    cargoRouteScope: string | null;
    createdAt: Date;
    category: { id: string; name: string };
    provider: {
      firstName: string;
      lastName: string;
      avatarUrl: string | null;
      providerProfile: {
        experience: number | null;
        rating: number;
        reviewCount: number;
      } | null;
    };
    images: Array<{ id: string; url: string; alt: string | null; sortOrder: number }>;
    _count: { bookings: number };
  }): Promise<ServiceSummary> {
    return {
      id: updated.id,
      title: updated.title,
      description: updated.description,
      price: typeof updated.price === 'number' ? updated.price : Number(updated.price),
      priceUnit: updated.priceUnit,
      categoryId: updated.categoryId,
      categoryName: updated.category.name,
      providerId: updated.providerId,
      providerName: `${updated.provider.firstName} ${updated.provider.lastName}`,
      providerAvatarUrl: await this.storageService.toReadableMediaUrl(
        updated.provider.avatarUrl,
      ),
      providerExperience: updated.provider.providerProfile?.experience ?? undefined,
      averageRating: updated.provider.providerProfile?.rating ?? 0,
      reviewCount: updated.provider.providerProfile?.reviewCount ?? 0,
      status: updated.status as ServiceSummary['status'],
      reviewNote: updated.reviewNote ?? null,
      submittedAt: updated.submittedAt?.toISOString() ?? null,
      reviewedAt: updated.reviewedAt?.toISOString() ?? null,
      location: updated.location ?? undefined,
      isRemote: updated.isRemote,
      serviceVenue: updated.serviceVenue ?? undefined,
      vehicleLength: updated.vehicleLength ?? undefined,
      vehicleWidth: updated.vehicleWidth ?? undefined,
      vehicleHeight: updated.vehicleHeight ?? undefined,
      cargoRouteScope: updated.cargoRouteScope ?? undefined,
      createdAt: updated.createdAt.toISOString(),
      bookingCount: updated._count.bookings,
      images: await Promise.all(
        updated.images.map(async (img) => ({
          id: img.id,
          url: (await this.storageService.toReadableMediaUrl(img.url)) ?? img.url,
          alt: img.alt ?? undefined,
          sortOrder: img.sortOrder,
        })),
      ),
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
      items: await Promise.all(rows.map(async (b) => ({
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
        type: b.type as BookingSummary['type'],
        totalPrice: Number(b.totalPrice),
        notes: b.notes ?? undefined,
        address: b.address ?? undefined,
        imageUrl: await this.storageService.toReadableMediaUrl(b.imageUrl),
        cancelReason: b.cancelReason ?? undefined,
        cancelledBy: b.cancelledBy ?? undefined,
        cancelledAt: b.cancelledAt?.toISOString(),
        acceptedAt: b.acceptedAt?.toISOString(),
        enRouteAt: b.enRouteAt?.toISOString(),
        arrivedAt: b.arrivedAt?.toISOString(),
        startedAt: b.startedAt?.toISOString(),
        completedAt: b.completedAt?.toISOString(),
        hasReview: Boolean(b.review),
        createdAt: b.createdAt.toISOString(),
      }))),
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

  async listReports(
    query: AdminReportsQueryDto,
  ): Promise<PaginatedResponse<AdminReportSummary>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ReportWhereInput = {
      ...(query.status ? { status: query.status } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.report.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          reporter: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          resolvedBy: { select: { firstName: true, lastName: true } },
        },
      }),
      this.prisma.report.count({ where }),
    ]);

    return {
      items: rows.map((r) => ({
        id: r.id,
        reporterId: r.reporter.id,
        reporterName: `${r.reporter.firstName} ${r.reporter.lastName}`,
        reporterEmail: r.reporter.email,
        targetType: r.targetType,
        targetId: r.targetId,
        reason: r.reason,
        description: r.description,
        status: r.status,
        adminNote: r.adminNote,
        resolvedAt: r.resolvedAt?.toISOString() ?? null,
        resolvedByName: r.resolvedBy
          ? `${r.resolvedBy.firstName} ${r.resolvedBy.lastName}`
          : null,
        createdAt: r.createdAt.toISOString(),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 0,
    };
  }

  async setReportStatus(
    id: string,
    adminId: string,
    dto: SetReportStatusDto,
  ): Promise<AdminReportSummary> {
    if (dto.status !== ReportStatus.RESOLVED && dto.status !== ReportStatus.DISMISSED) {
      throw new BadRequestException('Yalnız RESOLVED və ya DISMISSED statusu təyin edilə bilər');
    }

    const existing = await this.prisma.report.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Şikayət tapılmadı');
    }

    const updated = await this.prisma.report.update({
      where: { id },
      data: {
        status: dto.status,
        adminNote: dto.adminNote?.trim() || null,
        resolvedAt: new Date(),
        resolvedById: adminId,
      },
      include: {
        reporter: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        resolvedBy: { select: { firstName: true, lastName: true } },
      },
    });

    return {
      id: updated.id,
      reporterId: updated.reporter.id,
      reporterName: `${updated.reporter.firstName} ${updated.reporter.lastName}`,
      reporterEmail: updated.reporter.email,
      targetType: updated.targetType,
      targetId: updated.targetId,
      reason: updated.reason,
      description: updated.description,
      status: updated.status,
      adminNote: updated.adminNote,
      resolvedAt: updated.resolvedAt?.toISOString() ?? null,
      resolvedByName: updated.resolvedBy
        ? `${updated.resolvedBy.firstName} ${updated.resolvedBy.lastName}`
        : null,
      createdAt: updated.createdAt.toISOString(),
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
    const safeHref = sanitizeInternalPath(dto.href?.trim()) ?? undefined;

    const ANNOUNCE_BATCH = 500;
    const notificationData = {
      source: 'admin',
      ...(safeHref ? { href: safeHref } : {}),
    } as Prisma.InputJsonValue;

    for (let i = 0; i < users.length; i += ANNOUNCE_BATCH) {
      const batch = users.slice(i, i + ANNOUNCE_BATCH);
      await this.prisma.notification.createMany({
        data: batch.map((u) => ({
          userId: u.id,
          type: NotificationType.ADMIN_ANNOUNCEMENT,
          title,
          body,
          data: notificationData,
        })),
      });

      // createMany id qaytarmır — WS invalidate üçün best-effort emit
      for (const u of batch) {
        this.channels?.deliverAfterInApp({
          userId: u.id,
          title,
          body,
          type: NotificationType.ADMIN_ANNOUNCEMENT,
          data: {
            source: 'admin',
            ...(safeHref ? { href: safeHref } : {}),
          },
        });
      }
    }

    return { sentCount: users.length };
  }

  async listProviderKyc(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });
    if (!user || user.role !== UserRole.PROVIDER) {
      throw new NotFoundException('Xidmət verən tapılmadı');
    }
    const rows = await this.prisma.providerKycDocument.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return Promise.all(
      rows.map(async (row) => ({
        id: row.id,
        type: row.type,
        url: (await this.storageService.toReadableMediaUrl(row.url)) ?? row.url,
        status: row.status,
        adminNote: row.adminNote,
        reviewedAt: row.reviewedAt?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString(),
      })),
    );
  }

  async setKycStatus(
    documentId: string,
    adminId: string,
    dto: { status: 'APPROVED' | 'REJECTED'; adminNote?: string },
  ) {
    const doc = await this.prisma.providerKycDocument.findUnique({
      where: { id: documentId },
    });
    if (!doc) throw new NotFoundException('KYC sənədi tapılmadı');

    const updated = await this.prisma.providerKycDocument.update({
      where: { id: documentId },
      data: {
        status: dto.status,
        adminNote: dto.adminNote?.trim() || null,
        reviewedAt: new Date(),
      },
    });
    void this.writeAudit(adminId, 'KYC_REVIEW', 'KYC', documentId, {
      userId: doc.userId,
      status: dto.status,
    });
    return {
      id: updated.id,
      type: updated.type,
      url: (await this.storageService.toReadableMediaUrl(updated.url)) ?? updated.url,
      status: updated.status,
      adminNote: updated.adminNote,
      reviewedAt: updated.reviewedAt?.toISOString() ?? null,
      createdAt: updated.createdAt.toISOString(),
    };
  }

  async listContactMessages(query: { page?: number; limit?: number; isRead?: boolean }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = query.isRead === undefined ? {} : { isRead: query.isRead };
    const [rows, total] = await Promise.all([
      this.prisma.contactMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.contactMessage.count({ where }),
    ]);
    return {
      items: rows.map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        subject: row.subject,
        message: row.message,
        isRead: row.isRead,
        createdAt: row.createdAt.toISOString(),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 0,
    };
  }

  async markContactRead(id: string, adminId: string) {
    const row = await this.prisma.contactMessage.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Mesaj tapılmadı');
    const updated = await this.prisma.contactMessage.update({
      where: { id },
      data: { isRead: true },
    });
    void this.writeAudit(adminId, 'CONTACT_READ', 'CONTACT', id, {});
    return {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      phone: updated.phone,
      subject: updated.subject,
      message: updated.message,
      isRead: updated.isRead,
      createdAt: updated.createdAt.toISOString(),
    };
  }

  async listAuditLogs(query: { page?: number; limit?: number }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 30;
    const [rows, total] = await Promise.all([
      this.prisma.adminAuditLog.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { admin: { select: { firstName: true, lastName: true } } },
      }),
      this.prisma.adminAuditLog.count(),
    ]);
    return {
      items: rows.map((row) => ({
        id: row.id,
        adminId: row.adminId,
        adminName: `${row.admin.firstName} ${row.admin.lastName}`,
        action: row.action,
        targetType: row.targetType,
        targetId: row.targetId,
        meta: (row.meta as Record<string, unknown> | null) ?? null,
        createdAt: row.createdAt.toISOString(),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 0,
    };
  }

  private async writeAudit(
    adminId: string,
    action: string,
    targetType: string,
    targetId: string | null,
    meta: Record<string, unknown>,
  ) {
    try {
      await this.prisma.adminAuditLog.create({
        data: {
          adminId,
          action,
          targetType,
          targetId,
          meta: meta as Prisma.InputJsonValue,
        },
      });
    } catch {
      // audit heç vaxt əsas əməliyyatı pozmasın
    }
  }

  private async mapUser(user: {
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
  }): Promise<AdminUserSummary> {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone ?? undefined,
      avatarUrl: await this.storageService.toReadableMediaUrl(user.avatarUrl),
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
