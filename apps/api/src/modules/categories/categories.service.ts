import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const categories = await this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { services: true } } },
    });

    return categories.map((c: (typeof categories)[number]) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description ?? undefined,
      icon: c.icon ?? undefined,
      serviceCount: c._count.services,
    }));
  }

  async findBySlug(slug: string) {
    const category = await this.prisma.category.findUnique({
      where: { slug },
      include: { _count: { select: { services: true } } },
    });

    if (!category || !category.isActive) {
      throw new NotFoundException('Kateqoriya tapılmadı');
    }

    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description ?? undefined,
      icon: category.icon ?? undefined,
      serviceCount: category._count.services,
    };
  }
}
