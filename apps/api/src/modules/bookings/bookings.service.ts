import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { CreateBookingDto, UpdateBookingStatusDto } from './dto';
import { UserRole, BookingStatus } from '@xidmetal/shared';
import { ServiceStatus } from '@prisma/client';

@Injectable()
export class BookingsService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    userId: string,
    role: string,
    page = 1,
    limit = 20,
    status?: BookingStatus,
  ) {
    const skip = (page - 1) * limit;
    const where = {
      ...(role === UserRole.PROVIDER
        ? { providerId: userId }
        : role === UserRole.ADMIN
          ? {}
          : { customerId: userId }),
      ...(status && { status }),
    };

    const [items, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          service: { select: { id: true, title: true } },
          customer: { select: { id: true, firstName: true, lastName: true } },
          provider: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.booking.count({ where }),
    ]);

    return {
      items: items.map((b: (typeof items)[number]) => ({
        id: b.id,
        serviceId: b.serviceId,
        serviceTitle: b.service.title,
        customerId: b.customerId,
        customerName: `${b.customer.firstName} ${b.customer.lastName}`,
        providerId: b.providerId,
        providerName: `${b.provider.firstName} ${b.provider.lastName}`,
        scheduledAt: b.scheduledAt.toISOString(),
        status: b.status,
        totalPrice: b.totalPrice.toNumber(),
        notes: b.notes ?? undefined,
        createdAt: b.createdAt.toISOString(),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async create(customerId: string, dto: CreateBookingDto) {
    const service = await this.prisma.service.findUnique({
      where: { id: dto.serviceId },
    });

    if (!service || service.status !== ServiceStatus.ACTIVE) {
      throw new NotFoundException('Xidmət tapılmadı və ya aktiv deyil');
    }

    if (service.providerId === customerId) {
      throw new BadRequestException('Öz xidmətinizə sifariş verə bilməzsiniz');
    }

    return this.prisma.booking.create({
      data: {
        serviceId: dto.serviceId,
        customerId,
        providerId: service.providerId,
        scheduledAt: new Date(dto.scheduledAt),
        totalPrice: service.price,
        notes: dto.notes,
        address: dto.address,
        status: BookingStatus.PENDING,
      },
    });
  }

  async updateStatus(id: string, userId: string, role: string, dto: UpdateBookingStatusDto) {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) throw new NotFoundException('Sifariş tapılmadı');

    const isProvider = booking.providerId === userId;
    const isCustomer = booking.customerId === userId;
    const isAdmin = role === UserRole.ADMIN;

    if (!isProvider && !isCustomer && !isAdmin) {
      throw new ForbiddenException('Bu sifarişi idarə etmək icazəniz yoxdur');
    }

    this.validateStatusTransition(
      booking.status as BookingStatus,
      dto.status,
      isProvider,
      isCustomer,
      isAdmin,
    );

    return this.prisma.booking.update({
      where: { id },
      data: { status: dto.status },
    });
  }

  private validateStatusTransition(
    current: BookingStatus,
    next: BookingStatus,
    isProvider: boolean,
    isCustomer: boolean,
    isAdmin: boolean,
  ) {
    if (current === next) return;
    if (isAdmin) return;

    const providerTransitions: Partial<Record<BookingStatus, BookingStatus[]>> = {
      [BookingStatus.PENDING]: [BookingStatus.CONFIRMED, BookingStatus.REJECTED],
      [BookingStatus.CONFIRMED]: [BookingStatus.IN_PROGRESS, BookingStatus.CANCELLED],
      [BookingStatus.IN_PROGRESS]: [BookingStatus.COMPLETED],
    };

    const customerTransitions: Partial<Record<BookingStatus, BookingStatus[]>> = {
      [BookingStatus.PENDING]: [BookingStatus.CANCELLED],
      [BookingStatus.CONFIRMED]: [BookingStatus.CANCELLED],
    };

    const allowed = isProvider
      ? providerTransitions[current] ?? []
      : isCustomer
        ? customerTransitions[current] ?? []
        : [];

    if (!allowed.includes(next)) {
      throw new BadRequestException('Bu status dəyişikliyi icazəli deyil');
    }
  }
}
