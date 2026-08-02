import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { CreateServiceDto, UpdateServiceDto, ServiceQueryDto } from './dto';
import { UserRole, PriceUnit, requiresServiceVenue } from '@xidmetal/shared';
import { BookingStatus, ReviewStatus, ServiceStatus } from '@prisma/client';

@Injectable()
export class ServicesService {
  constructor(private prisma: PrismaService) {}

  async findMine(providerId: string, query: ServiceQueryDto) {
    const { page = 1, limit = 20, categoryId, search } = query;
    const skip = (page - 1) * limit;

    const where = {
      providerId,
      status: { not: ServiceStatus.ARCHIVED },
      ...(categoryId && { categoryId }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } },
          { location: { contains: search, mode: 'insensitive' as const } },
          { category: { name: { contains: search, mode: 'insensitive' as const } } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.service.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          _count: { select: { bookings: true } },
        },
      }),
      this.prisma.service.count({ where }),
    ]);

    const serviceIds = items.map((service) => service.id);
    const [activeBookingCounts, reviewStats] = await Promise.all([
      this.countActiveBookingsByService(serviceIds),
      this.getReviewStatsByService(serviceIds),
    ]);

    return {
      items: items.map((service) => {
        const stats = reviewStats.get(service.id);
        return this.mapService({
          ...service,
          provider: undefined,
          bookingCount: service._count.bookings,
          activeBookingCount: activeBookingCounts.get(service.id) ?? 0,
          averageRating: stats?.averageRating ?? 0,
          reviewCount: stats?.reviewCount ?? 0,
        });
      }),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findAll(query: ServiceQueryDto) {
    const { page = 1, limit = 20, categoryId, search, providerId } = query;
    const skip = (page - 1) * limit;

    const where = {
      status: ServiceStatus.ACTIVE,
      ...(categoryId && { categoryId }),
      ...(providerId && { providerId }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } },
          { location: { contains: search, mode: 'insensitive' as const } },
          { category: { name: { contains: search, mode: 'insensitive' as const } } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.service.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          provider: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
              providerProfile: {
                select: { experience: true },
              },
            },
          },
        },
      }),
      this.prisma.service.count({ where }),
    ]);

    const reviewStats = await this.getReviewStatsByService(items.map((service) => service.id));
    const mappedItems = items.map((service) => {
      const stats = reviewStats.get(service.id);
      return this.mapService({
        ...service,
        averageRating: stats?.averageRating ?? 0,
        reviewCount: stats?.reviewCount ?? 0,
      });
    });
    const dedupedItems = this.dedupePublicListingItems(mappedItems);

    return {
      items: dedupedItems,
      total: total - (mappedItems.length - dedupedItems.length),
      page,
      limit,
      totalPages: Math.ceil(Math.max(total - (mappedItems.length - dedupedItems.length), 0) / limit),
    };
  }

  async findById(id: string, requesterId?: string, requesterRole?: string) {
    const service = await this.prisma.service.findUnique({
      where: { id },
      include: {
        category: true,
        provider: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            providerProfile: true,
          },
        },
        images: { orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!service) throw new NotFoundException('Xidmət tapılmadı');

    const isOwner = requesterId === service.providerId;
    const isAdmin = requesterRole === UserRole.ADMIN;
    if (service.status !== ServiceStatus.ACTIVE && !isOwner && !isAdmin) {
      throw new NotFoundException('Xidmət tapılmadı');
    }

    const reviewStats = await this.getReviewStatsByService([service.id]);
    const stats = reviewStats.get(service.id);

    return this.mapService({
      ...service,
      averageRating: stats?.averageRating ?? 0,
      reviewCount: stats?.reviewCount ?? 0,
    });
  }

  async create(providerId: string, dto: CreateServiceDto) {
    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
    });
    if (!category) {
      throw new NotFoundException('Kateqoriya tapılmadı');
    }

    await this.assertNoDuplicateService(providerId, dto.categoryId, dto.title);

    this.assertValidPriceUnit(category.slug, dto.priceUnit);
    this.assertValidServiceVenue(category.slug, dto.serviceVenue);

    const service = await this.prisma.service.create({
      data: {
        ...dto,
        serviceVenue: requiresServiceVenue(category.slug) ? dto.serviceVenue : null,
        providerId,
        status: ServiceStatus.DRAFT,
      },
      include: { category: { select: { id: true, name: true, slug: true } } },
    });
    return this.mapService({ ...service, provider: undefined });
  }

  async update(id: string, userId: string, role: string, dto: UpdateServiceDto) {
    const service = await this.prisma.service.findUnique({ where: { id } });
    if (!service) throw new NotFoundException('Xidmət tapılmadı');
    if (service.providerId !== userId && role !== UserRole.ADMIN) {
      throw new ForbiddenException('Bu xidməti redaktə etmək icazəniz yoxdur');
    }

    if (dto.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: dto.categoryId },
      });
      if (!category) {
        throw new NotFoundException('Kateqoriya tapılmadı');
      }
    }

    const effectiveCategoryId = dto.categoryId ?? service.categoryId;
    const effectivePriceUnit = dto.priceUnit ?? service.priceUnit;
    const effectiveCategory = await this.prisma.category.findUnique({
      where: { id: effectiveCategoryId },
    });
    if (!effectiveCategory) {
      throw new NotFoundException('Kateqoriya tapılmadı');
    }

    const effectiveTitle = dto.title ?? service.title;
    await this.assertNoDuplicateService(
      service.providerId,
      effectiveCategoryId,
      effectiveTitle,
      id,
    );

    this.assertValidPriceUnit(effectiveCategory.slug, effectivePriceUnit);
    this.assertValidServiceVenue(
      effectiveCategory.slug,
      dto.serviceVenue !== undefined ? dto.serviceVenue : service.serviceVenue ?? undefined,
    );

    if (dto.status === ServiceStatus.ARCHIVED) {
      const activeBookings = await this.prisma.booking.count({
        where: {
          serviceId: id,
          status: {
            in: [BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS],
          },
        },
      });
      if (activeBookings > 0) {
        throw new ConflictException('Aktiv sifarişləri olan xidməti arxivləmək olmaz');
      }
    }

    const updated = await this.prisma.service.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.categoryId !== undefined || dto.serviceVenue !== undefined
          ? {
              serviceVenue: requiresServiceVenue(effectiveCategory.slug)
                ? (dto.serviceVenue ?? service.serviceVenue)
                : null,
            }
          : {}),
      },
      include: { category: { select: { id: true, name: true, slug: true } } },
    });
    return this.mapService({ ...updated, provider: undefined });
  }

  async remove(id: string, userId: string, role: string) {
    const service = await this.prisma.service.findUnique({ where: { id } });
    if (!service) throw new NotFoundException('Xidmət tapılmadı');
    if (service.providerId !== userId && role !== UserRole.ADMIN) {
      throw new ForbiddenException('Bu xidməti silmək icazəniz yoxdur');
    }

    const activeBookings = await this.prisma.booking.count({
      where: {
        serviceId: id,
        status: {
          in: [BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS],
        },
      },
    });
    if (activeBookings > 0) {
      throw new ConflictException('Aktiv sifarişləri olan xidməti silmək olmaz');
    }

    const bookingCount = await this.prisma.booking.count({ where: { serviceId: id } });
    if (bookingCount > 0) {
      await this.prisma.service.update({
        where: { id },
        data: { status: ServiceStatus.ARCHIVED },
      });
      return { message: 'Xidmət arxivləndi' };
    }

    await this.prisma.service.delete({ where: { id } });
    return { message: 'Xidmət silindi' };
  }

  private async countActiveBookingsByService(serviceIds: string[]) {
    const counts = new Map<string, number>();
    if (serviceIds.length === 0) return counts;

    const rows = await this.prisma.booking.groupBy({
      by: ['serviceId'],
      where: {
        serviceId: { in: serviceIds },
        status: {
          in: [BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS],
        },
      },
      _count: { _all: true },
    });

    for (const row of rows) {
      counts.set(row.serviceId, row._count._all);
    }

    return counts;
  }

  /** Hər xidmət üçün yalnız həmin xidmətə yazılmış təsdiqlənmiş rəylərin statistikası */
  private async getReviewStatsByService(serviceIds: string[]) {
    const stats = new Map<string, { averageRating: number; reviewCount: number }>();
    if (serviceIds.length === 0) return stats;

    const rows = await this.prisma.review.findMany({
      where: {
        status: ReviewStatus.APPROVED,
        booking: { serviceId: { in: serviceIds } },
      },
      select: {
        rating: true,
        booking: { select: { serviceId: true } },
      },
    });

    const totals = new Map<string, { sum: number; count: number }>();
    for (const row of rows) {
      const serviceId = row.booking.serviceId;
      const current = totals.get(serviceId) ?? { sum: 0, count: 0 };
      current.sum += row.rating;
      current.count += 1;
      totals.set(serviceId, current);
    }

    for (const [serviceId, { sum, count }] of totals) {
      stats.set(serviceId, {
        averageRating: Math.round((sum / count) * 100) / 100,
        reviewCount: count,
      });
    }

    return stats;
  }

  private dedupePublicListingItems<
    T extends {
      id: string;
      providerId: string;
      categoryId: string;
      title: string;
      description: string;
      price: number;
      priceUnit: string;
      location?: string;
      createdAt: string;
    },
  >(items: T[]): T[] {
    const seen = new Map<string, T>();

    for (const item of items) {
      const key = [
        item.providerId,
        item.categoryId,
        item.title,
        item.description,
        item.price,
        item.priceUnit,
        item.location ?? '',
      ].join('\0');
      const existing = seen.get(key);
      if (!existing || item.createdAt > existing.createdAt) {
        seen.set(key, item);
      }
    }

    return [...seen.values()].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  private async assertNoDuplicateService(
    providerId: string,
    categoryId: string,
    title: string,
    excludeServiceId?: string,
  ) {
    const duplicate = await this.prisma.service.findFirst({
      where: {
        providerId,
        categoryId,
        title,
        status: { not: ServiceStatus.ARCHIVED },
        ...(excludeServiceId && { id: { not: excludeServiceId } }),
      },
      select: { id: true },
    });

    if (duplicate) {
      throw new ConflictException(
        'Bu kateqoriyada eyni adlı aktiv xidmətiniz artıq mövcuddur',
      );
    }
  }

  private assertValidServiceVenue(categorySlug: string | undefined, serviceVenue?: string | null) {
    if (requiresServiceVenue(categorySlug)) {
      if (!serviceVenue) {
        throw new BadRequestException('Gözəllik xidməti üçün xidmət yeri seçilməlidir');
      }
      return;
    }

    if (serviceVenue) {
      throw new BadRequestException('Xidmət yeri yalnız Gözəllik kateqoriyası üçün mövcuddur');
    }
  }

  private assertValidPriceUnit(categorySlug: string | undefined, priceUnit?: string) {
    if (priceUnit !== PriceUnit.PER_SQM) return;
    if (categorySlug !== 'temizlik') {
      throw new BadRequestException(
        'Kvadrat başına təmizlik qiyməti yalnız Təmizlik kateqoriyası üçün mövcuddur',
      );
    }
  }

  private mapService(service: {
    id: string;
    title: string;
    description: string;
    price: { toNumber(): number } | number;
    priceUnit: string;
    categoryId: string;
    providerId: string;
    status: string;
    location: string | null;
    isRemote: boolean;
    serviceVenue?: string | null;
    createdAt: Date;
    bookingCount?: number;
    activeBookingCount?: number;
    averageRating?: number;
    reviewCount?: number;
    category?: { id: string; name: string; slug?: string };
    provider?: {
      id: string;
      firstName: string;
      lastName: string;
      avatarUrl: string | null;
      providerProfile?: {
        experience: number | null;
      } | null;
    };
  }) {
    const price = typeof service.price === 'number' ? service.price : service.price.toNumber();
    return {
      id: service.id,
      title: service.title,
      description: service.description,
      price,
      priceUnit: service.priceUnit,
      categoryId: service.categoryId,
      categoryName: service.category?.name ?? '',
      providerId: service.providerId,
      providerName: service.provider
        ? `${service.provider.firstName} ${service.provider.lastName}`
        : '',
      providerAvatarUrl: service.provider?.avatarUrl ?? undefined,
      providerExperience: service.provider?.providerProfile?.experience ?? undefined,
      averageRating: service.averageRating ?? 0,
      reviewCount: service.reviewCount ?? 0,
      status: service.status,
      location: service.location ?? undefined,
      isRemote: service.isRemote,
      serviceVenue: service.serviceVenue ?? undefined,
      createdAt: service.createdAt.toISOString(),
      ...(service.bookingCount !== undefined && { bookingCount: service.bookingCount }),
      ...(service.activeBookingCount !== undefined && {
        activeBookingCount: service.activeBookingCount,
      }),
    };
  }
}
