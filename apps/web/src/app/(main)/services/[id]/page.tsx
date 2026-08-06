import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { ServiceSummary } from '@xidmetal/shared';
import { api } from '@/lib/api';
import { ServiceDetailView } from '@/components/services/service-detail-view';

export const revalidate = 60;

type PageProps = {
  params: Promise<{ id: string }>;
};

async function loadService(id: string): Promise<ServiceSummary | null> {
  try {
    return await api.service(id);
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const service = await loadService(id);
  if (!service) {
    return { title: 'Xidmət tapılmadı' };
  }

  const description =
    service.description?.slice(0, 160) ||
    `${service.title} — ${service.categoryName} | Xidmətal`;

  return {
    title: service.title,
    description,
    openGraph: {
      title: service.title,
      description,
      type: 'website',
      ...(service.images?.[0]?.url
        ? { images: [{ url: service.images[0].url }] }
        : {}),
    },
  };
}

export default async function ServiceDetailPage({ params }: PageProps) {
  const { id } = await params;
  const service = await loadService(id);
  if (!service) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <ServiceDetailView service={service} />
    </div>
  );
}
