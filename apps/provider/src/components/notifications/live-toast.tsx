'use client';

import Link from 'next/link';
import { Bell, Briefcase, ClipboardList, MessageSquare, X } from 'lucide-react';
import type { LiveAttentionKind } from '@/lib/live-attention';
import { cn } from '@/lib/utils';

export interface LiveToastItem {
  id: string;
  kind: LiveAttentionKind;
  title: string;
  body: string;
  href: string;
}

interface LiveToastHostProps {
  toasts: LiveToastItem[];
  onDismiss: (id: string) => void;
}

export function LiveToastHost({ toasts, onDismiss }: LiveToastHostProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex flex-col items-center gap-2 p-3 sm:top-3 sm:items-end sm:p-4"
      aria-live="assertive"
      aria-relevant="additions"
    >
      {toasts.map((toast) => {
        const Icon =
          toast.kind === 'message'
            ? MessageSquare
            : toast.kind === 'admin'
              ? Bell
              : toast.kind === 'service'
                ? Briefcase
                : ClipboardList;
        return (
          <div
            key={toast.id}
            className={cn(
              'pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-lg border border-border bg-card p-3 shadow-lg',
              'motion-safe:animate-[picker-in_0.25s_ease-out]',
            )}
            role="alert"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-brand-foreground">
              <Icon className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-sm font-semibold text-foreground">{toast.title}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{toast.body}</p>
              <Link
                href={toast.href}
                onClick={() => onDismiss(toast.id)}
                className="mt-2 inline-flex min-h-[44px] items-center text-sm font-medium text-brand-foreground underline-offset-2 hover:underline sm:min-h-0"
              >
                Bax
              </Link>
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground sm:h-8 sm:w-8"
              aria-label="Bildirişi bağla"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
