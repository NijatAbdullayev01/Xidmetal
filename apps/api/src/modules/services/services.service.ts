import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { CreateServiceDto, UpdateServiceDto, ServiceQueryDto } from './dto';
import { UserRole } from '@xidmetal/shared';
import { BookingStatus, ServiceStatus } from '@prisma/client';

@Injectable()
export class ServicesService {
  constructor(private prisma: PrismaService) {}

  async findMine(providerId: string, query: ServiceQueryDto) {
    const { page = 1, limit = 20, categoryId, search } = query;
    const skip = (page - 1) * limit;

    const where = {
      providerId,
      ...(categoryId && { categoryId }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } },
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

    return {
      items: items.map((service) =>
        this.mapService({
          ...service,
          provider: undefined,
          bookingCount: service._count.bookings,
        }),
      ),
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
              providerProfile: { select: { rating: true, reviewCount: true } },
            },
          },
        },
      }),
      this.prisma.service.count({ where }),
    ]);

    return {
      items: items.map(this.mapService),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string) {
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
    return this.mapService(service);
  }

  async create(providerId: string, dto: CreateServiceDto) {
    const service = await this.prisma.service.create({
      data: {
        ...dto,
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

    const updated = await this.prisma.service.update({
      where: { id },
      data: dto,
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
      throw new ConflictException('Sifariş tarixçəsi olan xidməti silmək olmaz. Arxivləyin.');
    }

    await this.prisma.service.delete({ where: { id } });
    return { message: 'Xidmət silindi' };
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
    createdAt: Date;
    bookingCount?: number;
    category?: { id: string; name: string; slug?: string };
    provider?: {
      id: string;
      firstName: string;
      lastName: string;
      avatarUrl: string | null;
      providerProfile?: { rating: number; reviewCount: number } | null;
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
      averageRating: service.provider?.providerProfile?.rating ?? 0,
      reviewCount: service.provider?.providerProfile?.reviewCount ?? 0,
      status: service.status,
      location: service.location ?? undefined,
      isRemote: service.isRemote,
      createdAt: service.createdAt.toISOString(),
      ...(service.bookingCount !== undefined && { bookingCount: service.bookingCount }),
    };
  }
}
