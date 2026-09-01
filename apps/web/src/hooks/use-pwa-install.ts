'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type BeforeInstallPromptEvent,
  isIosDevice,
  isMobileViewport,
  isStandalone,
  writeInstallDismissedAt,
} from '@/lib/pwa-install';

export type PwaInstallMode = 'installable' | 'ios' | null;
export type InstallOutcome = 'accepted' | 'dismissed' | 'unavailable';

/**
 * Paylaşılan PWA quraşdırma hook-u — `beforeinstallprompt` tutur,
 * platformaya görə rejim verir və quraşdırma dialoqunu açır.
 * Floating prompt və footer CTA eyni məntiqi bölüşür.
 */
export function usePwaInstall() {
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [mode, setMode] = useState<PwaInstallMode>(null);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (isStandalone() || !isMobileViewport()) return;

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      deferredPromptRef.current = event as BeforeInstallPromptEvent;
      setMode('installable');
    };

    const onAppInstalled = () => {
      deferredPromptRef.current = null;
      setMode(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onAppInstalled);

    // iOS `beforeinstallprompt` göndərmir — bələdçi rejimi
    if (isIosDevice()) {
      setMode('ios');
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const install = useCallback(async (): Promise<InstallOutcome> => {
    const prompt = deferredPromptRef.current;
    if (!prompt) return 'unavailable';

    setInstalling(true);
    await prompt.prompt();
    const choice = await prompt.userChoice;
    deferredPromptRef.current = null;
    setInstalling(false);

    if (choice.outcome === 'accepted') {
      setMode(null);
      return 'accepted';
    }

    writeInstallDismissedAt();
    return 'dismissed';
  }, []);

  const dismiss = useCallback(() => {
    writeInstallDismissedAt();
    setMode(null);
  }, []);

  return { mode, installing, install, dismiss };
}
