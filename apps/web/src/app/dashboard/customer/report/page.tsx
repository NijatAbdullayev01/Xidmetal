import { ReportForm } from '@/components/reports/report-form';

export default function CustomerReportPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Şikayət et</h1>
        <p className="mt-1 text-muted-foreground">
          Pozuntu və ya təhlükəsizlik problemini bizə bildirin.
        </p>
      </div>
      <ReportForm />
    </div>
  );
}
