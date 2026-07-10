import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { ReviewQueryDto } from './dto';
import { ReviewStatus } from '@prisma/client';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

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
