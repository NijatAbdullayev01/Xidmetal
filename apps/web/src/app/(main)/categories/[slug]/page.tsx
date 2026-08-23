import { Suspense, cache } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { CategorySummary, ServiceSummary } from '@xidmetal/shared';
import { CategoryPageSkeleton } from '@/components/ui/page-skeletons';
import { api, ApiError } from '@/lib/api';
import { CategoryContent } from './category-content';

export const revalidate = 60;

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
}

/** Eyni request-də generateMetadata + page üçün təkrar API çağırışını aradan qaldırır */
const loadCategoryData = cache(async (slug: string): Promise<{
  category: CategorySummary;
  services: ServiceSummary[];
} | null> => {
  let category: CategorySummary;
  try {
    category = await api.category(slug);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }

  try {
    const servicesResponse = await api.services({
      categoryId: category.id,
      limit: '50',
    });
    return { category, services: servicesResponse.items };
  } catch {
    // Kateqoriya tapıldı — xidmət siyahısı xətası səhifəni yıxmasın
    return { category, services: [] };
  }
});

export async function generateStaticParams() {
  try {
    const categories = await api.categories();
    return categories.map((category) => ({ slug: category.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await loadCategoryData(slug);

  if (!data) {
    return { title: 'Kateqoriya tapılmadı' };
  }

  const { category } = data;

  return {
    title: category.name,
    description:
      category.description ??
      `${category.name} kateqoriyasında etibarlı xidmət verənləri tapın, müqayisə edin və sifariş verin.`,
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const data = await loadCategoryData(slug);

  if (!data) {
    notFound();
  }

  const { category, services } = data;

  return (
    <Suspense fallback={<CategoryPageSkeleton />}>
      <CategoryContent category={category} services={services} />
    </Suspense>
  );
}
