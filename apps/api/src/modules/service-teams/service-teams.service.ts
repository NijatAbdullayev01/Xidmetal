import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProviderAccountType } from '@prisma/client';
import { SERVICE_TEAMS, type ServiceTeamSummary } from '@xidmetal/shared';
import { PrismaService } from '../../common/database/prisma.service';
import {
  ServiceCapacityService,
  capacityHoldingBookingWhere,
} from '../../common/booking/service-capacity.service';
import { CreateServiceTeamDto, UpdateServiceTeamDto } from './dto';

@Injectable()
export class ServiceTeamsService {
  constructor(
    private prisma: PrismaService,
    private capacity: ServiceCapacityService,
  ) {}

  async list(serviceId: string, userId: string): Promise<ServiceTeamSummary[]> {
    await this.assertServiceOwner(serviceId, userId);
    await this.capacity.ensureDefaultTeam(serviceId);
    const rows = await this.prisma.serviceTeam.findMany({
      where: { serviceId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map((row) => this.mapTeam(row));
  }

  async create(
    serviceId: string,
    userId: string,
    dto: CreateServiceTeamDto,
  ): Promise<ServiceTeamSummary> {
    await this.assertCompanyOwner(serviceId, userId);
    await this.capacity.ensureDefaultTeam(serviceId);

    const name = dto.name.trim();
    const activeCount = await this.prisma.serviceTeam.count({
      where: { serviceId, isActive: true },
    });
    if (activeCount >= SERVICE_TEAMS.MAX_PER_SERVICE) {
      throw new BadRequestException(
        `Bir xidmətə maksimum ${SERVICE_TEAMS.MAX_PER_SERVICE} komanda əlavə etmək olar`,
      );
    }

    const maxSort = await this.prisma.serviceTeam.aggregate({
      where: { serviceId },
      _max: { sortOrder: true },
    });

    try {
      const created = await this.prisma.serviceTeam.create({
        data: {
          serviceId,
          name,
          sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
          isDefault: false,
          isActive: true,
        },
      });
      await this.capacity.syncAvailability(userId);
      return this.mapTeam(created);
    } catch (error) {
      this.throwIfNameConflict(error);
      throw error;
    }
  }

  async update(
    serviceId: string,
    teamId: string,
    userId: string,
    dto: UpdateServiceTeamDto,
  ): Promise<ServiceTeamSummary> {
    await this.assertCompanyOwner(serviceId, userId);
    const team = await this.findOwnedTeam(serviceId, teamId);

    if (dto.isActive === false && team.isDefault) {
      throw new BadRequestException('Əsas komandanı deaktiv etmək olmaz');
    }
    if (dto.isActive === false) {
      await this.assertNoHoldingBookings(teamId);
    }

    const name = dto.name?.trim();
    try {
      const updated = await this.prisma.serviceTeam.update({
        where: { id: teamId },
        data: {
          ...(name ? { name } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        },
      });
      return this.mapTeam(updated);
    } catch (error) {
      this.throwIfNameConflict(error);
      throw error;
    }
  }

  async remove(serviceId: string, teamId: string, userId: string): Promise<void> {
    await this.assertCompanyOwner(serviceId, userId);
    const team = await this.findOwnedTeam(serviceId, teamId);
    if (team.isDefault) {
      throw new BadRequestException('Əsas komandanı silmək olmaz');
    }

    const remaining = await this.prisma.serviceTeam.count({
      where: { serviceId, isActive: true, id: { not: teamId } },
    });
    if (remaining < 1) {
      throw new BadRequestException('Ən azı bir aktiv komanda qalmalıdır');
    }

    await this.assertNoHoldingBookings(teamId);
    await this.prisma.serviceTeam.delete({ where: { id: teamId } });
    await this.capacity.syncAvailability(userId);
  }

  private async assertServiceOwner(serviceId: string, userId: string) {
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
      select: {
        id: true,
        providerId: true,
        provider: {
          select: { providerProfile: { select: { accountType: true } } },
        },
      },
    });
    if (!service) throw new NotFoundException('Xidmət tapılmadı');
    if (service.providerId !== userId) {
      throw new ForbiddenException('Bu xidmətin komandalarını idarə etmək icazəniz yoxdur');
    }
    return service;
  }

  private async assertCompanyOwner(serviceId: string, userId: string) {
    const service = await this.assertServiceOwner(serviceId, userId);
    if (service.provider.providerProfile?.accountType !== ProviderAccountType.COMPANY) {
      throw new ForbiddenException(
        'Əlavə komanda yalnız şirkət hesabında yaradıla bilər',
      );
    }
    return service;
  }

  private async findOwnedTeam(serviceId: string, teamId: string) {
    const team = await this.prisma.serviceTeam.findUnique({ where: { id: teamId } });
    if (!team || team.serviceId !== serviceId) {
      throw new NotFoundException('Komanda tapılmadı');
    }
    return team;
  }

  private async assertNoHoldingBookings(teamId: string) {
    const holding = await this.prisma.booking.count({
      where: {
        teamId,
        ...capacityHoldingBookingWhere(),
      },
    });
    if (holding > 0) {
      throw new BadRequestException(
        'Bu komandanın aktiv və ya gözləyən sifarişi var — əvvəl onları tamamlayın və ya başqa komandaya keçin',
      );
    }
  }

  private throwIfNameConflict(error: unknown): void {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException('Bu adda komanda artıq mövcuddur');
    }
  }

  private mapTeam(row: {
    id: string;
    serviceId: string;
    name: string;
    sortOrder: number;
    isDefault: boolean;
    isActive: boolean;
    createdAt: Date;
  }): ServiceTeamSummary {
    return {
      id: row.id,
      serviceId: row.serviceId,
      name: row.name,
      sortOrder: row.sortOrder,
      isDefault: row.isDefault,
      isActive: row.isActive,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
