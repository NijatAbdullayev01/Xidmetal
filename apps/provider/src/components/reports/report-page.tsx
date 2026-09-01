import { ReportTargetType } from '@xidmetal/shared';
import { ReportForm } from '@/components/reports/report-form';

const TARGET_VALUES = new Set<string>(Object.values(ReportTargetType));

function parseTargetType(raw?: string): ReportTargetType | undefined {
  if (!raw || !TARGET_VALUES.has(raw)) return undefined;
  return raw as ReportTargetType;
}

export function ReportPage({
  title,
  description,
  targetType,
  targetId,
}: {
  title: string;
  description: string;
  targetType?: string;
  targetId?: string;
}) {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="mt-1 text-muted-foreground">{description}</p>
      </div>
      <ReportForm
        defaultTargetType={parseTargetType(targetType)}
        defaultTargetId={targetId}
      />
    </div>
  );
}
