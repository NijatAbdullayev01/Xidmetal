'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { bookingOrderNumberLabel } from '@xidmetal/shared';
import { cn } from '@/lib/utils';

export function BookingOrderNumber({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className={cn('flex min-w-0 flex-wrap items-center gap-2 text-sm', className)}>
      <span className="text-muted-foreground">Sifariş nömrəsi:</span>
      <span className="font-mono">{value}</span>
      <button
        type="button"
        onClick={() => void copy()}
        className="relative inline-flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand before:absolute before:-inset-3 before:content-['']"
        aria-label={copied ? 'Kopyalandı' : `${bookingOrderNumberLabel(value)}-ni kopyala`}
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-emerald-600" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </button>
      {copied ? (
        <span className="text-xs text-emerald-700 dark:text-emerald-400">Kopyalandı</span>
      ) : null}
    </div>
  );
}
