'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  notificationPromptCopy,
  openNotificationPermissionUi,
  readNotificationPromptMode,
  type NotificationPromptMode,
} from '@/lib/notification-permission';

/** «Sonra» — qısa fasilə, sonra yenidən göstər (icazə verilənə qədər) */
const SNOOZE_MS = 20_000;
const RESHOW_TICK_MS = 5_000;
const ADDRESS_HINT_MS = 8_000;

type VisibleMode = Exclude<NotificationPromptMode, 'granted'>;

/**
 * Bildiriş icazəsi verilənə qədər təkrar göstərilən prompt.
 * «İcazə ver» — native brauzer pəncərəsini açır; blokdadırsa sayt ayarları bələdçisi.
 */
export function NotificationPermissionPrompt() {
  const [mode, setMode] = useState<NotificationPromptMode | null>(null);
  const [snoozedUntil, setSnoozedUntil] = useState(0);
  const [busy, setBusy] = useState(false);
  const [showAddressHint, setShowAddressHint] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const sync = useCallback(() => {
    const next = readNotificationPromptMode();
    setMode(next);
    if (next === 'granted' || next === 'ask') {
      setShowAddressHint(false);
    }
    setNow(Date.now());
  }, []);

  useEffect(() => {
    sync();

    const onFocus = () => sync();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') sync();
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    const tick = window.setInterval(() => {
      setNow(Date.now());
      const next = readNotificationPromptMode();
      setMode((prev) => (prev === next ? prev : next));
      if (next === 'granted' || next === 'ask') {
        setShowAddressHint(false);
      }
    }, RESHOW_TICK_MS);

    let statusRef: PermissionStatus | null = null;
    if ('permissions' in navigator) {
      void navigator.permissions
        .query({ name: 'notifications' as PermissionName })
        .then((status) => {
          statusRef = status;
          status.onchange = () => sync();
        })
        .catch(() => {
          // ignore
        });
    }

    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearInterval(tick);
      if (statusRef) statusRef.onchange = null;
    };
  }, [sync]);

  useEffect(() => {
    if (!showAddressHint) return;
    const id = window.setTimeout(() => setShowAddressHint(false), ADDRESS_HINT_MS);
    return () => window.clearTimeout(id);
  }, [showAddressHint]);

  if (mode === null || mode === 'granted' || now < snoozedUntil) {
    return null;
  }

  const activeMode: VisibleMode = mode;
  const copy = notificationPromptCopy(activeMode);

  const enable = () => {
    if (activeMode === 'unsupported') return;

    // User gesture: native dialoq / OS ayarları eyni klikdə
    const pending = openNotificationPermissionUi();
    setBusy(true);

    void pending
      .then((result) => {
        if (result.permission === 'granted') {
          setMode('granted');
          setShowAddressHint(false);
          return;
        }

        if (result.permission === 'denied') {
          setMode('blocked');
          // Sayt panelini web aça bilmirik — ünvan çubuğuna yönləndir
          if (result.opened === 'none') {
            setShowAddressHint(true);
          }
          return;
        }

        // default qaldı (dialoq bağlandı) — qısa fasilə
        setMode('ask');
        setSnoozedUntil(Date.now() + SNOOZE_MS);
      })
      .finally(() => {
        setBusy(false);
      });
  };

  const snooze = () => {
    setShowAddressHint(false);
    setSnoozedUntil(Date.now() + SNOOZE_MS);
  };

  return (
    <>
      {showAddressHint ? (
        <div
          className="pointer-events-none fixed inset-x-0 top-0 z-[210] flex justify-center px-3 pt-[max(0.5rem,env(safe-area-inset-top))]"
          role="status"
          aria-live="polite"
        >
          <div className="max-w-md rounded-xl border border-brand bg-brand px-4 py-2.5 text-center text-sm font-medium text-brand-foreground shadow-lg">
            ↑ Ünvan çubuğundakı kilidə basın → Bildirişlər → İcazə ver
          </div>
        </div>
      ) : null}

      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[200] flex justify-center p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4"
        role="dialog"
        aria-modal="false"
        aria-label="Bildiriş icazəsi"
      >
        <div className="pointer-events-auto flex w-full max-w-lg flex-col gap-3 rounded-2xl border-2 border-brand bg-card p-4 shadow-2xl ring-4 ring-brand/30 sm:max-w-xl sm:flex-row sm:items-center sm:gap-4">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-brand-foreground">
              <Bell className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{copy.title}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{copy.description}</p>
            </div>
          </div>
          <div className="flex shrink-0 gap-2 sm:flex-col sm:items-stretch">
            <Button
              type="button"
              size="sm"
              disabled={busy || activeMode === 'unsupported'}
              onClick={enable}
              className="min-h-[44px] flex-1 sm:min-h-10 sm:flex-none"
            >
              {copy.primaryLabel}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={snooze}
              className="min-h-[44px] flex-1 sm:min-h-10 sm:flex-none"
            >
              Sonra
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
