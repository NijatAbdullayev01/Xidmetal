import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { StorageService } from '../../common/storage/storage.service';
import { assertProviderVerified } from '../../common/provider/assert-provider-verified';
import { CreateServiceDto, UpdateServiceDto, ServiceQueryDto } from './dto';
import {
  UserRole,
  PriceUnit,
  CargoRouteScope,
  requiresServiceVenue,
  requiresVehicleDetails,
  requiresCargoRouteScope,
  allowsPerSqmPriceUnit,
  MAX_SERVICE_IMAGES,
  ACTIVE_BOOKING_STATUSES,
} from '@xidmetal/shared';
import { ReviewStatus, ServiceStatus } from '@prisma/client';

const SERVICE_IMAGES_INCLUDE = { orderBy: { sortOrder: 'asc' as const } };

@Injectable()
export class ServicesService {
  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
  ) {}

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
          images: SERVICE_IMAGES_INCLUDE,
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
      items: await Promise.all(items.map(async (service) => {
        const stats = reviewStats.get(service.id);
        return this.mapService({
          ...service,
          provider: undefined,
          bookingCount: service._count.bookings,
          activeBookingCount: activeBookingCounts.get(service.id) ?? 0,
          averageRating: stats?.averageRating ?? 0,
          reviewCount: stats?.reviewCount ?? 0,
        });
      })),
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
      category: { isActive: true },
      provider: {
        isActive: true,
        deletedAt: null,
        providerProfile: { isVerified: true },
      },
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
          images: SERVICE_IMAGES_INCLUDE,
          provider: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
              providerProfile: {
                select: { experience: true, availability: true },
              },
            },
          },
        },
      }),
      this.prisma.service.count({ where }),
    ]);

    const reviewStats = await this.getReviewStatsByService(items.map((service) => service.id));
    const mappedItems = await Promise.all(items.map(async (service) => {
      const stats = reviewStats.get(service.id);
      return this.mapService({
        ...service,
        averageRating: stats?.averageRating ?? 0,
        reviewCount: stats?.reviewCount ?? 0,
      });
    }));
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
        images: SERVICE_IMAGES_INCLUDE,
      },
    });

    if (!service) throw new NotFoundException('Xidmət tapılmadı');

    const isOwner = requesterId === service.providerId;
    const isAdmin = requesterRole === UserRole.ADMIN;
    if (service.status !== ServiceStatus.ACTIVE && !isOwner && !isAdmin) {
      throw new NotFoundException('Xidmət tapılmadı');
    }
    if (!service.category.isActive && !isOwner && !isAdmin) {
      throw new NotFoundException('Xidmət tapılmadı');
    }
    if (!service.provider.providerProfile?.isVerified && !isOwner && !isAdmin) {
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
    if (!category.isActive) {
      throw new BadRequestException('Bu kateqoriya hazırda aktiv deyil');
    }

    await this.assertNoDuplicateService(providerId, dto.categoryId, dto.title);

    this.assertValidPriceUnit(category.slug, dto.priceUnit);
    this.assertValidServiceVenue(category.slug, dto.serviceVenue);
    this.assertValidVehicleDetails(
      dto.title,
      {
        vehicleLength: dto.vehicleLength,
        vehicleWidth: dto.vehicleWidth,
        vehicleHeight: dto.vehicleHeight,
        cargoRouteScope: dto.cargoRouteScope,
      },
      { rejectExtras: true },
    );
    this.assertCargoVehicleImages(dto.title, dto.images);

    const {
      images,
      vehicleLength,
      vehicleWidth,
      vehicleHeight,
      cargoRouteScope,
      ...serviceFields
    } = dto;
    const normalizedImages = await this.normalizeServiceImages(images, providerId);
    const vehicleFields = this.resolveVehicleFields(dto.title, {
      vehicleLength,
      vehicleWidth,
      vehicleHeight,
      cargoRouteScope,
    });

    const service = await this.prisma.service.create({
      data: {
        ...serviceFields,
        serviceVenue: requiresServiceVenue(category.slug) ? dto.serviceVenue : null,
        ...vehicleFields,
        providerId,
        status: ServiceStatus.DRAFT,
        ...(normalizedImages.length > 0 && {
          images: {
            create: normalizedImages.map((url, index) => ({
              url,
              sortOrder: index,
            })),
          },
        }),
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        images: SERVICE_IMAGES_INCLUDE,
      },
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
      if (!category.isActive) {
        throw new BadRequestException('Bu kateqoriya hazırda aktiv deyil');
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

    this.assertValidVehicleDetails(effectiveTitle, {
      vehicleLength:
        dto.vehicleLength !== undefined
          ? dto.vehicleLength
          : requiresVehicleDetails(effectiveTitle)
            ? (service.vehicleLength ?? undefined)
            : undefined,
      vehicleWidth:
        dto.vehicleWidth !== undefined
          ? dto.vehicleWidth
          : requiresVehicleDetails(effectiveTitle)
            ? (service.vehicleWidth ?? undefined)
            : undefined,
      vehicleHeight:
        dto.vehicleHeight !== undefined
          ? dto.vehicleHeight
          : requiresVehicleDetails(effectiveTitle)
            ? (service.vehicleHeight ?? undefined)
            : undefined,
      cargoRouteScope:
        dto.cargoRouteScope !== undefined
          ? dto.cargoRouteScope
          : requiresCargoRouteScope(effectiveTitle)
            ? (service.cargoRouteScope ?? undefined)
            : undefined,
    });

    const effectiveVehicle = {
      vehicleLength:
        dto.vehicleLength !== undefined ? dto.vehicleLength : service.vehicleLength ?? undefined,
      vehicleWidth:
        dto.vehicleWidth !== undefined ? dto.vehicleWidth : service.vehicleWidth ?? undefined,
      vehicleHeight:
        dto.vehicleHeight !== undefined ? dto.vehicleHeight : service.vehicleHeight ?? undefined,
      cargoRouteScope:
        dto.cargoRouteScope !== undefined
          ? dto.cargoRouteScope
          : service.cargoRouteScope ?? undefined,
    };

    const effectiveImageCount =
      dto.images !== undefined ? dto.images.length : undefined;
    if (effectiveImageCount !== undefined) {
      this.assertCargoVehicleImages(effectiveTitle, dto.images);
    } else if (requiresVehicleDetails(effectiveTitle)) {
      const existingImageCount = await this.prisma.serviceImage.count({
        where: { serviceId: id },
      });
      if (existingImageCount < 1) {
        throw new BadRequestException(
          'Yükdaşıma xidməti üçün ən azı 1 avtomobil şəkli əlavə edin',
        );
      }
    }

    if (dto.status === ServiceStatus.ARCHIVED) {
      const activeBookings = await this.prisma.booking.count({
        where: {
          serviceId: id,
          status: {
            in: [...ACTIVE_BOOKING_STATUSES],
          },
        },
      });
      if (activeBookings > 0) {
        throw new ConflictException('Aktiv sifarişləri olan xidməti arxivləmək olmaz');
      }
    }

    if (dto.status !== undefined && role !== UserRole.ADMIN) {
      this.assertProviderStatusTransition(service.status, dto.status);
    }

    const { images, vehicleLength, vehicleWidth, vehicleHeight, cargoRouteScope, ...serviceFields } =
      dto;
    const normalizedImages =
      images !== undefined ? await this.normalizeServiceImages(images, service.providerId) : undefined;

    const previousImages =
      normalizedImages !== undefined
        ? await this.prisma.serviceImage.findMany({
            where: { serviceId: id },
            select: { url: true },
          })
        : [];

    const updated = await this.prisma.$transaction(async (tx) => {
      if (normalizedImages !== undefined) {
        await tx.serviceImage.deleteMany({ where: { serviceId: id } });
        if (normalizedImages.length > 0) {
          await tx.serviceImage.createMany({
            data: normalizedImages.map((url, index) => ({
              serviceId: id,
              url,
              sortOrder: index,
            })),
          });
        }
      }

      const vehicleChanged =
        dto.title !== undefined ||
        vehicleLength !== undefined ||
        vehicleWidth !== undefined ||
        vehicleHeight !== undefined ||
        cargoRouteScope !== undefined;

      return tx.service.update({
        where: { id },
        data: {
          ...serviceFields,
          ...(dto.categoryId !== undefined || dto.serviceVenue !== undefined
            ? {
                serviceVenue: requiresServiceVenue(effectiveCategory.slug)
                  ? (dto.serviceVenue ?? service.serviceVenue)
                  : null,
              }
            : {}),
          ...(vehicleChanged
            ? this.resolveVehicleFields(effectiveTitle, effectiveVehicle)
            : {}),
        },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          images: SERVICE_IMAGES_INCLUDE,
        },
      });
    });

    if (normalizedImages !== undefined) {
      const kept = new Set(normalizedImages);
      const orphaned = previousImages
        .map((image) => image.url)
        .filter((url) => !kept.has(url));
      await this.storageService.deleteManyByPublicUrls(orphaned);
    }

    return this.mapService({ ...updated, provider: undefined });
  }

  /**
   * Xidmət verən elanı admin yoxlamasına göndərir.
   * DRAFT | NEEDS_REVISION → PENDING_REVIEW (hesab təsdiqi məcburidir).
   */
  async submitForReview(id: string, providerId: string) {
    const service = await this.prisma.service.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true, slug: true, isActive: true } },
        images: SERVICE_IMAGES_INCLUDE,
      },
    });
    if (!service) throw new NotFoundException('Xidmət tapılmadı');
    if (service.providerId !== providerId) {
      throw new ForbiddenException('Bu xidməti yoxlamaya göndərmək icazəniz yoxdur');
    }
    if (!service.category.isActive) {
      throw new BadRequestException('Bu kateqoriya hazırda aktiv deyil');
    }

    await assertProviderVerified(
      this.prisma,
      providerId,
      'Yoxlamaya göndərmək üçün hesabınız admin tərəfindən təsdiqlənməlidir',
    );

    if (
      service.status !== ServiceStatus.DRAFT &&
      service.status !== ServiceStatus.NEEDS_REVISION
    ) {
      throw new BadRequestException(
        'Yalnız qaralama və ya düzəliş tələb olunan xidmətlər yoxlamaya göndərilə bilər',
      );
    }

    if (service.images.length < 1) {
      throw new BadRequestException('Yoxlamaya göndərmək üçün ən azı 1 şəkil lazımdır');
    }

    this.assertCargoVehicleImages(
      service.title,
      service.images.map((image) => image.url),
    );

    const updated = await this.prisma.service.update({
      where: { id },
      data: {
        status: ServiceStatus.PENDING_REVIEW,
        submittedAt: new Date(),
        // Köhnə düzəliş qeydi saxlanılır ki, admin müqayisə edə bilsin; təsdiqdə silinir
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        images: SERVICE_IMAGES_INCLUDE,
      },
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
          in: [...ACTIVE_BOOKING_STATUSES],
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

    const images = await this.prisma.serviceImage.findMany({
      where: { serviceId: id },
      select: { url: true },
    });

    await this.prisma.service.delete({ where: { id } });
    await this.storageService.deleteManyByPublicUrls(images.map((image) => image.url));
    return { message: 'Xidmət silindi' };
  }

  private assertProviderStatusTransition(from: ServiceStatus, to: ServiceStatus) {
    if (from === to) return;

    const allowed: Partial<Record<ServiceStatus, ServiceStatus[]>> = {
      [ServiceStatus.ACTIVE]: [ServiceStatus.PAUSED, ServiceStatus.ARCHIVED],
      [ServiceStatus.PAUSED]: [ServiceStatus.ACTIVE, ServiceStatus.ARCHIVED],
      [ServiceStatus.DRAFT]: [ServiceStatus.ARCHIVED],
      [ServiceStatus.PENDING_REVIEW]: [ServiceStatus.ARCHIVED],
      [ServiceStatus.NEEDS_REVISION]: [ServiceStatus.ARCHIVED],
    };

    const next = allowed[from];
    if (!next?.includes(to)) {
      if (to === ServiceStatus.ACTIVE || to === ServiceStatus.PENDING_REVIEW) {
        throw new ForbiddenException(
          'Xidməti birbaşa aktivləşdirmək olmaz — «Yoxlamaya göndər» istifadə edin',
        );
      }
      throw new ForbiddenException('Bu status keçidinə icazə verilmir');
    }
  }

  private async countActiveBookingsByService(serviceIds: string[]) {
    const counts = new Map<string, number>();
    if (serviceIds.length === 0) return counts;

    const rows = await this.prisma.booking.groupBy({
      by: ['serviceId'],
      where: {
        serviceId: { in: serviceIds },
        status: {
          in: [...ACTIVE_BOOKING_STATUSES],
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

  private assertValidVehicleDetails(
    title: string,
    dims: {
      vehicleLength?: number | null;
      vehicleWidth?: number | null;
      vehicleHeight?: number | null;
      cargoRouteScope?: string | null;
    },
    options?: { rejectExtras?: boolean },
  ) {
    const needsVehicle = requiresVehicleDetails(title);
    const needsRoute = requiresCargoRouteScope(title);

    if (needsVehicle) {
      if (dims.vehicleLength == null) {
        throw new BadRequestException('Yükdaşıma üçün maşın uzunluğunu qeyd edin');
      }
      if (dims.vehicleWidth == null) {
        throw new BadRequestException('Yükdaşıma üçün maşın enini qeyd edin');
      }
      if (dims.vehicleHeight == null) {
        throw new BadRequestException('Yükdaşıma üçün maşın hündürlüyünü qeyd edin');
      }
    } else if (
      options?.rejectExtras &&
      (dims.vehicleLength != null || dims.vehicleWidth != null || dims.vehicleHeight != null)
    ) {
      throw new BadRequestException(
        'Maşın ölçüləri yalnız yükdaşıma xidmət növləri üçün mövcuddur',
      );
    }

    if (needsRoute) {
      if (!dims.cargoRouteScope) {
        throw new BadRequestException(
          'Şəhərdaxili və ya şəhərlərarası daşıma seçilməlidir',
        );
      }
      return;
    }

    if (options?.rejectExtras && dims.cargoRouteScope != null) {
      throw new BadRequestException(
        'Daşıma marşrutu yalnız nəqliyyat xidmət növləri üçün mövcuddur',
      );
    }
  }

  private assertCargoVehicleImages(title: string, images?: string[]) {
    if (!requiresVehicleDetails(title)) return;
    if (!images || images.length < 1) {
      throw new BadRequestException(
        'Yükdaşıma xidməti üçün ən azı 1 avtomobil şəkli əlavə edin',
      );
    }
  }

  private resolveVehicleFields(
    title: string,
    dims: {
      vehicleLength?: number | null;
      vehicleWidth?: number | null;
      vehicleHeight?: number | null;
      cargoRouteScope?: string | null;
    },
  ): {
    vehicleLength: number | null;
    vehicleWidth: number | null;
    vehicleHeight: number | null;
    cargoRouteScope: CargoRouteScope | null;
  } {
    const needsVehicle = requiresVehicleDetails(title);
    const needsRoute = requiresCargoRouteScope(title);

    return {
      vehicleLength: needsVehicle ? (dims.vehicleLength ?? null) : null,
      vehicleWidth: needsVehicle ? (dims.vehicleWidth ?? null) : null,
      vehicleHeight: needsVehicle ? (dims.vehicleHeight ?? null) : null,
      cargoRouteScope: needsRoute
        ? ((dims.cargoRouteScope as CargoRouteScope | null) ?? null)
        : null,
    };
  }

  private assertValidPriceUnit(categorySlug: string | undefined, priceUnit?: string) {
    if (priceUnit !== PriceUnit.PER_SQM) return;
    if (!allowsPerSqmPriceUnit(categorySlug)) {
      throw new BadRequestException(
        'Kvadrat başına qiymət yalnız Təmizlik və Dezinfeksiya kateqoriyaları üçün mövcuddur',
      );
    }
  }

  private async normalizeServiceImages(images?: string[], userId?: string): Promise<string[]> {
    if (!images || images.length === 0) return [];
    if (images.length > MAX_SERVICE_IMAGES) {
      throw new BadRequestException(
        `Maksimum ${MAX_SERVICE_IMAGES} şəkil əlavə etmək olar`,
      );
    }
    const normalized: string[] = [];
    for (const url of images) {
      if (userId) {
        normalized.push(
          await this.storageService.assertOwnedUploadUrl(url, 'services', userId),
        );
        continue;
      }
      this.storageService.assertAllowedMediaUrl(url);
      normalized.push(this.storageService.toCanonicalMediaUrl(url));
    }
    return normalized;
  }

  private async mapService(service: {
    id: string;
    title: string;
    description: string;
    price: { toNumber(): number } | number;
    priceUnit: string;
    categoryId: string;
    providerId: string;
    status: string;
    reviewNote?: string | null;
    submittedAt?: Date | null;
    reviewedAt?: Date | null;
    location: string | null;
    isRemote: boolean;
    serviceVenue?: string | null;
    vehicleLength?: number | null;
    vehicleWidth?: number | null;
    vehicleHeight?: number | null;
    cargoRouteScope?: string | null;
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
        availability?: string | null;
      } | null;
    };
    images?: Array<{
      id: string;
      url: string;
      alt: string | null;
      sortOrder: number;
    }>;
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
      providerAvatarUrl: await this.storageService.toReadableMediaUrl(
        service.provider?.avatarUrl,
      ),
      providerExperience: service.provider?.providerProfile?.experience ?? undefined,
      providerAvailability: service.provider?.providerProfile?.availability ?? undefined,
      averageRating: service.averageRating ?? 0,
      reviewCount: service.reviewCount ?? 0,
      status: service.status,
      reviewNote: service.reviewNote ?? null,
      submittedAt: service.submittedAt?.toISOString() ?? null,
      reviewedAt: service.reviewedAt?.toISOString() ?? null,
      location: service.location ?? undefined,
      isRemote: service.isRemote,
      serviceVenue: service.serviceVenue ?? undefined,
      vehicleLength: service.vehicleLength ?? undefined,
      vehicleWidth: service.vehicleWidth ?? undefined,
      vehicleHeight: service.vehicleHeight ?? undefined,
      cargoRouteScope: service.cargoRouteScope ?? undefined,
      createdAt: service.createdAt.toISOString(),
      ...(service.bookingCount !== undefined && { bookingCount: service.bookingCount }),
      ...(service.activeBookingCount !== undefined && {
        activeBookingCount: service.activeBookingCount,
      }),
      ...(service.images !== undefined && {
        images: await Promise.all(
          service.images.map(async (image) => ({
            id: image.id,
            url: (await this.storageService.toReadableMediaUrl(image.url)) ?? image.url,
            alt: image.alt ?? undefined,
            sortOrder: image.sortOrder,
          })),
        ),
      }),
    };
  }
}
