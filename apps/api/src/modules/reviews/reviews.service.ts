import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { BookingStatus, ReviewStatus, NotificationType } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import { CreateReviewDto, ReviewQueryDto } from './dto';

type ReviewWithRelations = {
  id: string;
  bookingId: string;
  rating: number;
  comment: string | null;
  status: ReviewStatus;
  createdAt: Date;
  author: { firstName: string; lastName: string };
  booking: { service: { title: string } };
};

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async create(authorId: string, dto: CreateReviewDto) {
    const comment = dto.comment?.trim() || undefined;
    if (comment !== undefined && comment.length < 10) {
      throw new BadRequestException('Şərh minimum 10 simvol olmalıdır');
    }

    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
      include: {
        review: { select: { id: true } },
        service: { select: { title: true } },
        provider: {
          select: {
            id: true,
            providerProfile: { select: { rating: true, reviewCount: true } },
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException('Sifariş tapılmadı');
    }

    if (booking.customerId !== authorId) {
      throw new ForbiddenException('Yalnız öz sifarişinizə rəy yaza bilərsiniz');
    }

    if (booking.status !== BookingStatus.COMPLETED) {
      throw new BadRequestException('Rəy yalnız tamamlanmış sifarişə yazıla bilər');
    }

    if (booking.review) {
      throw new ConflictException('Bu sifarişə artıq rəy yazılıb');
    }

    const profile = booking.provider.providerProfile;
    if (!profile) {
      throw new BadRequestException('Xidmət verənin profili tapılmadı');
    }

    const review = await this.prisma.$transaction(async (tx) => {
      const created = await tx.review.create({
        data: {
          bookingId: booking.id,
          authorId,
          rating: dto.rating,
          comment,
          status: ReviewStatus.PENDING,
        },
        include: {
          author: { select: { firstName: true, lastName: true } },
          booking: {
            select: {
              service: { select: { title: true } },
            },
          },
        },
      });

      await tx.notification.create({
        data: {
          userId: booking.providerId,
          type: NotificationType.REVIEW_RECEIVED,
          title: 'Yeni rəy alındı',
          body: `«${booking.service.title}» sifarişi üçün ${dto.rating} ulduzlu rəy yazıldı. Moderasiyadan sonra görünəcək.`,
          data: { bookingId: booking.id, reviewId: created.id },
        },
      });

      return created;
    });

    return this.mapReview(review, 'full');
  }

  /** Provider dashboard — PENDING + APPROVED (REJECTED yalnız status filtri ilə) */
  async findReceivedByProvider(providerId: string, query: ReviewQueryDto) {
    return this.listProviderReviews(providerId, query, 'full', {
      includePending: true,
    });
  }

  /** İctimai — müştərilər digər rəylərə baxa bilir (qismən anonim ad) */
  async findPublicByProvider(providerId: string, query: ReviewQueryDto) {
    const provider = await this.prisma.user.findFirst({
      where: {
        id: providerId,
        providerProfile: { isNot: null },
      },
      select: {
        firstName: true,
        lastName: true,
        providerProfile: {
          select: { rating: true, reviewCount: true },
        },
      },
    });

    if (!provider?.providerProfile) {
      throw new NotFoundException('Xidmət verən tapılmadı');
    }

    const page = await this.listProviderReviews(providerId, query, 'public', {
      includePending: false,
    });

    const distributionWhere = {
      status: ReviewStatus.APPROVED,
      booking: {
        providerId,
        ...(query.serviceId ? { serviceId: query.serviceId } : {}),
      },
    };

    const [groups, filteredCount, filteredAvg] = await Promise.all([
      this.prisma.review.groupBy({
        by: ['rating'],
        where: distributionWhere,
        _count: { _all: true },
      }),
      query.serviceId
        ? this.prisma.review.count({ where: distributionWhere })
        : Promise.resolve(provider.providerProfile.reviewCount),
      query.serviceId
        ? this.prisma.review.aggregate({
            where: distributionWhere,
            _avg: { rating: true },
          })
        : Promise.resolve(null),
    ]);

    const distribution: Record<1 | 2 | 3 | 4 | 5, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };
    for (const group of groups) {
      if (group.rating >= 1 && group.rating <= 5) {
        distribution[group.rating as 1 | 2 | 3 | 4 | 5] = group._count._all;
      }
    }

    const averageRating = query.serviceId
      ? Math.round((filteredAvg?._avg.rating ?? 0) * 100) / 100
      : provider.providerProfile.rating;

    return {
      ...page,
      providerName: `${provider.firstName} ${provider.lastName}`,
      stats: {
        averageRating,
        reviewCount: filteredCount,
        ratingDistribution: distribution,
      },
    };
  }

  private async listProviderReviews(
    providerId: string,
    query: ReviewQueryDto,
    authorMode: 'full' | 'public',
    options: { includePending: boolean },
  ) {
    const { page = 1, limit = 20, serviceId, status } = query;
    const skip = (page - 1) * limit;

    let statusFilter: ReviewStatus | { in: ReviewStatus[] };
    if (status) {
      statusFilter = status;
    } else if (options.includePending) {
      // Provider: gözləyən + təsdiqlənmiş (rədd edilmişlər default gizlidir)
      statusFilter = { in: [ReviewStatus.PENDING, ReviewStatus.APPROVED] };
    } else {
      statusFilter = ReviewStatus.APPROVED;
    }

    const where = {
      status: statusFilter,
      booking: {
        providerId,
        ...(serviceId ? { serviceId } : {}),
      },
    };

    const [items, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { firstName: true, lastName: true } },
          booking: {
            select: {
              service: { select: { title: true } },
            },
          },
        },
      }),
      this.prisma.review.count({ where }),
    ]);

    return {
      items: items.map((review) => this.mapReview(review, authorMode)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 0,
    };
  }

  private mapReview(review: ReviewWithRelations, authorMode: 'full' | 'public') {
    return {
      id: review.id,
      bookingId: review.bookingId,
      serviceTitle: review.booking.service.title,
      authorName:
        authorMode === 'public'
          ? this.formatPublicAuthorName(review.author.firstName, review.author.lastName)
          : `${review.author.firstName} ${review.author.lastName}`,
      rating: review.rating,
      comment: review.comment ?? undefined,
      status: review.status,
      createdAt: review.createdAt.toISOString(),
    };
  }

  /** İctimai siyahıda: "Nicat A." — tam soyad gizlədilir */
  private formatPublicAuthorName(firstName: string, lastName: string): string {
    const initial = lastName.trim().charAt(0);
    return initial ? `${firstName} ${initial.toUpperCase()}.` : firstName;
  }
}
