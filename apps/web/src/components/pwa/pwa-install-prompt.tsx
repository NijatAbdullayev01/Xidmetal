'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Bell, Download, Home, Share, X, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isInstallPromptSnoozed } from '@/lib/pwa-install';
import { usePwaInstall } from '@/hooks/use-pwa-install';

/** Səhifə yükləndikdən sonra təklifi göstərmə gecikməsi */
const SHOW_DELAY_MS = 1500;

/**
 * Mobil istifadəçiyə PWA quraşdırma təklifi.
 * Yalnız telefonda, artıq quraşdırılmayıbsa və son «Sonra»-dan 3 gün keçibsə göstərilir.
 */
export function PwaInstallPrompt() {
  const { mode, installing, install, dismiss } = usePwaInstall();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (mode === null || isInstallPromptSnoozed()) return;
    const id = window.setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [mode]);

  const handleInstall = async () => {
    const outcome = await install();
    if (outcome !== 'unavailable') setVisible(false);
  };

  const handleDismiss = () => {
    dismiss();
    setVisible(false);
  };

  if (!visible) return null;

  const isIos = mode === 'ios';

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[220] flex justify-center p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      role="dialog"
      aria-modal="true"
      aria-label="Xidmətal proqramını quraşdırın"
    >
      <div className="pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-3xl border border-brand/40 bg-card shadow-2xl ring-1 ring-black/10 motion-safe:animate-[sheet-in_280ms_cubic-bezier(0.16,1,0.3,1)]">
        <div className="h-1.5 w-full bg-gradient-to-r from-brand via-brand-light to-brand" aria-hidden />

        <button
          type="button"
          onClick={handleDismiss}
          className="absolute right-3 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-muted/70"
          aria-label="Bağla"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>

        <div className="flex flex-col gap-4 p-5 pt-4">
          <div className="flex items-center gap-3 pr-8">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-brand shadow-sm ring-4 ring-brand/20">
              <Image
                src="/icon-192.png"
                alt=""
                width={48}
                height={48}
                className="h-12 w-12 object-contain"
              />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold leading-tight text-foreground">
                {isIos ? 'Əsas ekrana əlavə edin' : 'Xidmətal proqramını quraşdırın'}
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {isIos
                  ? 'Paylaş düyməsinə basın, sonra «Ana ekrana əlavə et» seçin.'
                  : 'Saytı telefonunuza bir toxunuşla quraşdırın.'}
              </p>
            </div>
          </div>

          <ul className="flex flex-col gap-2 rounded-2xl bg-muted/60 p-3 text-sm text-foreground">
            <li className="flex items-center gap-2.5">
              <Home className="h-4 w-4 shrink-0 text-brand-foreground" aria-hidden />
              Əsas ekranda hər zaman əlinizin altında
            </li>
            <li className="flex items-center gap-2.5">
              <Zap className="h-4 w-4 shrink-0 text-brand-foreground" aria-hidden />
              Tam ekran və daha sürətli giriş
            </li>
            <li className="flex items-center gap-2.5">
              <Bell className="h-4 w-4 shrink-0 text-brand-foreground" aria-hidden />
              Sifariş və mesaj bildirişləri
            </li>
          </ul>

          <div className="flex flex-col gap-2">
            {isIos ? (
              <Button size="lg" onClick={handleDismiss} className="w-full">
                <Share className="h-4 w-4" aria-hidden />
                Anladım
              </Button>
            ) : (
              <>
                <Button size="lg" disabled={installing} onClick={() => void handleInstall()} className="w-full">
                  <Download className="h-4 w-4" aria-hidden />
                  {installing ? 'Quraşdırılır…' : 'Quraşdır'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDismiss}
                  className="w-full text-muted-foreground"
                >
                  Sonra
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
