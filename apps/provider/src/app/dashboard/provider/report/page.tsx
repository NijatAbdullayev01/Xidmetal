import { ReportPage } from '@/components/reports/report-page';

interface PageProps {
  searchParams: Promise<{ targetType?: string; targetId?: string }>;
}

export default async function ProviderReportPage({ searchParams }: PageProps) {
  const params = await searchParams;
  return (
    <ReportPage
      title="Şikayət et"
      description="Pozuntu və ya təhlükəsizlik problemini bizə bildirin."
      targetType={params.targetType}
      targetId={params.targetId}
    />
  );
}
