import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { ReportSummary } from '@xidmetal/shared';
import {
  ReportReason,
  ReportStatus,
  ReportTargetType,
  reportReasonLabels,
} from '@xidmetal/shared';
import { PrismaService } from '../../common/database/prisma.service';
import { MailService } from '../../common/mail/mail.service';
import { CreateReportDto } from './dto';
import {
  mayReportBooking,
  mayReportMessage,
  mayReportService,
  mayReportUser,
  reportTargetNotFoundMessage,
} from './report-target-access';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

  async create(reporterId: string, dto: CreateReportDto): Promise<ReportSummary> {
    const targetId = dto.targetId?.trim() || null;

    if (dto.targetType !== ReportTargetType.OTHER && !targetId) {
      throw new BadRequestException('Bu hədəf növü üçün ID tələb olunur');
    }

    if (targetId) {
      await this.assertReporterMayTarget(reporterId, dto.targetType, targetId);
    }

    const reporter = await this.prisma.user.findUnique({
      where: { id: reporterId },
      select: { id: true, email: true, firstName: true, lastName: true },
    });
    if (!reporter) {
      throw new NotFoundException('İstifadəçi tapılmadı');
    }

    const report = await this.prisma.report.create({
      data: {
        reporterId,
        targetType: dto.targetType,
        targetId,
        reason: dto.reason,
        description: dto.description.trim(),
        status: ReportStatus.PENDING,
      },
    });

    void this.safeAlertAdmins({
      reporterEmail: reporter.email,
      reporterName: `${reporter.firstName} ${reporter.lastName}`.trim(),
      reason: dto.reason,
      targetType: dto.targetType,
      targetId,
      description: report.description,
    });

    return this.mapReport(report);
  }

  async listMine(
    reporterId: string,
    page = 1,
    limit = 20,
  ): Promise<{ items: ReportSummary[]; total: number; page: number; limit: number; totalPages: number }> {
    const skip = (page - 1) * limit;
    const [rows, total] = await Promise.all([
      this.prisma.report.findMany({
        where: { reporterId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.report.count({ where: { reporterId } }),
    ]);
    return {
      items: rows.map((row) => this.mapReport(row)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 0,
    };
  }

  /**
   * Hədəf mövcudluğu + reporter əlaqəsi.
   * İcazəsiz / mövcud olmayan → eyni «tapılmadı» (ID probing azaltmaq üçün).
   */
  private async assertReporterMayTarget(
    reporterId: string,
    targetType: ReportTargetType,
    targetId: string,
  ) {
    const deny = () => {
      throw new NotFoundException(reportTargetNotFoundMessage(targetType));
    };

    switch (targetType) {
      case ReportTargetType.USER: {
        const target = await this.prisma.user.findFirst({
          where: { id: targetId, deletedAt: null },
          select: { id: true },
        });
        const [sharedBooking, sharedConversation] = await Promise.all([
          this.prisma.booking.findFirst({
            where: {
              OR: [
                { customerId: reporterId, providerId: targetId },
                { customerId: targetId, providerId: reporterId },
              ],
            },
            select: { id: true },
          }),
          this.prisma.conversation.findFirst({
            where: {
              OR: [
                { customerId: reporterId, providerId: targetId },
                { customerId: targetId, providerId: reporterId },
              ],
            },
            select: { id: true },
          }),
        ]);
        if (
          !mayReportUser({
            reporterId,
            targetUserId: targetId,
            targetExists: Boolean(target),
            hasSharedBookingOrConversation: Boolean(sharedBooking || sharedConversation),
          })
        ) {
          deny();
        }
        break;
      }
      case ReportTargetType.SERVICE: {
        const service = await this.prisma.service.findUnique({
          where: { id: targetId },
          select: { id: true, providerId: true },
        });
        const booking = service
          ? await this.prisma.booking.findFirst({
              where: { serviceId: targetId, customerId: reporterId },
              select: { id: true },
            })
          : null;
        if (
          !mayReportService({
            reporterId,
            service,
            hasCustomerBooking: Boolean(booking),
          })
        ) {
          deny();
        }
        break;
      }
      case ReportTargetType.BOOKING: {
        const booking = await this.prisma.booking.findUnique({
          where: { id: targetId },
          select: { customerId: true, providerId: true },
        });
        if (!mayReportBooking({ reporterId, booking })) {
          deny();
        }
        break;
      }
      case ReportTargetType.MESSAGE: {
        const message = await this.prisma.message.findUnique({
          where: { id: targetId },
          select: {
            conversation: { select: { customerId: true, providerId: true } },
          },
        });
        if (!mayReportMessage({ reporterId, message })) {
          deny();
        }
        break;
      }
      case ReportTargetType.OTHER:
        break;
    }
  }

  private async safeAlertAdmins(input: {
    reporterEmail: string;
    reporterName: string;
    reason: ReportReason;
    targetType: ReportTargetType;
    targetId: string | null;
    description: string;
  }) {
    try {
      await this.mailService.sendReportAlert({
        reporterEmail: input.reporterEmail,
        reporterName: input.reporterName,
        reasonLabel: reportReasonLabels[input.reason],
        targetType: input.targetType,
        targetId: input.targetId,
        description: input.description,
      });
    } catch (error) {
      this.logger.warn(
        `Şikayət e-poçtu göndərilmədi: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private mapReport(report: {
    id: string;
    targetType: string;
    targetId: string | null;
    reason: string;
    description: string;
    status: string;
    createdAt: Date;
  }): ReportSummary {
    return {
      id: report.id,
      targetType: report.targetType,
      targetId: report.targetId,
      reason: report.reason,
      description: report.description,
      status: report.status,
      createdAt: report.createdAt.toISOString(),
    };
  }
}
