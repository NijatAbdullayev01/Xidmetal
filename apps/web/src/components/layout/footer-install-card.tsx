'use client';

import { useState } from 'react';
import { Download, Share, Smartphone } from 'lucide-react';
import { usePwaInstall } from '@/hooks/use-pwa-install';

/**
 * Footer tagline altındakı quraşdırma CTA — yalnız telefonda,
 * quraşdırıla bilən (Android) və ya iOS cihazlarda görünür.
 */
export function FooterInstallCard() {
  const { mode, installing, install } = usePwaInstall();
  const [showIosHint, setShowIosHint] = useState(false);

  if (mode === null) return null;

  if (mode === 'ios') {
    return (
      <div className="mt-3 flex w-full flex-col items-center gap-3 sm:hidden">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 ring-1 ring-brand/20">
            <Smartphone className="h-5 w-5 text-brand-foreground" aria-hidden />
          </span>
          <p className="text-sm font-semibold text-foreground">Telefonunuza quraşdırın</p>
        </div>
        <button
          type="button"
          onClick={() => setShowIosHint((value) => !value)}
          aria-expanded={showIosHint}
          className="inline-flex min-h-11 w-full max-w-[240px] items-center justify-center gap-2 rounded-lg bg-brand-foreground px-6 py-3 text-sm font-medium text-brand transition-colors hover:bg-brand-foreground/90"
        >
          <Share className="h-4 w-4" aria-hidden />
          Ana ekrana əlavə edin
        </button>
        {showIosHint ? (
          <p className="text-xs font-medium text-muted-foreground">
            Paylaş düyməsinə basın → «Ana ekrana əlavə et» seçin
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mt-3 w-full sm:hidden">
      <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-3 rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border">
        <div className="text-center">
          <p className="text-sm font-semibold text-foreground">Xidmətal tətbiqi</p>
          <p className="text-xs text-muted-foreground">Daha sürətli giriş və bildirişlər</p>
        </div>
        <button
          type="button"
          disabled={installing}
          onClick={() => void install()}
          className="inline-flex min-h-11 w-full max-w-[240px] items-center justify-center gap-2 rounded-lg bg-brand px-6 py-3 text-sm font-medium text-brand-foreground shadow-sm transition-colors hover:bg-brand-dark disabled:pointer-events-none disabled:opacity-60"
        >
          <Download className="h-4 w-4" aria-hidden />
          {installing ? 'Quraşdırılır…' : 'Proqramı quraşdırın'}
        </button>
      </div>
    </div>
  );
}
