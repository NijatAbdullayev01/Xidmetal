import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { BookingStatus, ReviewStatus } from '@prisma/client';
import { NotificationType } from '@xidmetal/shared';
import { PrismaService } from '../../common/database/prisma.service';
import { CreateReviewDto, ReviewQueryDto } from './dto';

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
          status: ReviewStatus.APPROVED,
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

      const previousCount = profile.reviewCount;
      const previousRating = profile.rating;
      const newCount = previousCount + 1;
      const newRating =
        previousCount === 0
          ? dto.rating
          : (previousRating * previousCount + dto.rating) / newCount;

      await tx.providerProfile.update({
        where: { userId: booking.providerId },
        data: {
          rating: Math.round(newRating * 100) / 100,
          reviewCount: newCount,
        },
      });

      await tx.notification.create({
        data: {
          userId: booking.providerId,
          type: NotificationType.REVIEW_RECEIVED,
          title: 'Yeni rəy aldınız',
          body: `«${booking.service.title}» xidmətinizə ${dto.rating} ulduzlu rəy yazıldı.`,
          data: { bookingId: booking.id, reviewId: created.id },
        },
      });

      return created;
    });

    return {
      id: review.id,
      bookingId: review.bookingId,
      serviceTitle: review.booking.service.title,
      authorName: `${review.author.firstName} ${review.author.lastName}`,
      rating: review.rating,
      comment: review.comment ?? undefined,
      status: review.status,
      createdAt: review.createdAt.toISOString(),
    };
  }

  async findReceivedByProvider(providerId: string, query: ReviewQueryDto) {
    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where = {
      status: ReviewStatus.APPROVED,
      booking: { providerId },
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
      items: items.map((review) => ({
        id: review.id,
        bookingId: review.bookingId,
        serviceTitle: review.booking.service.title,
        authorName: `${review.author.firstName} ${review.author.lastName}`,
        rating: review.rating,
        comment: review.comment ?? undefined,
        status: review.status,
        createdAt: review.createdAt.toISOString(),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
