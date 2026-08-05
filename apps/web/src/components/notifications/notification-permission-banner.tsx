'use client';

import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { requestNotificationPermission } from '@/lib/live-attention';

const DISMISS_KEY = 'xidmetal-notif-prompt-dismissed';

/**
 * Brauzer bildiriş icazəsi hələ verilməyibsə, kabinetdə yumşaq xatırlatma.
 * Mobil və desktop-da tab arxa planda olanda OS bildirişi üçün lazımdır.
 */
export function NotificationPermissionBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'default') return;
    try {
      if (localStorage.getItem(DISMISS_KEY) === '1') return;
    } catch {
      // ignore
    }
    setVisible(true);
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // ignore
    }
  };

  const enable = async () => {
    const permission = await requestNotificationPermission();
    setVisible(false);
    if (permission === 'granted') {
      try {
        localStorage.setItem(DISMISS_KEY, '1');
      } catch {
        // ignore
      }
    }
  };

  return (
    <div className="border-b border-border bg-brand/15 px-3 py-2.5 sm:px-4">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex items-start gap-2.5 sm:items-center">
          <Bell className="mt-0.5 h-4 w-4 shrink-0 text-brand-foreground" aria-hidden />
          <p className="text-sm text-foreground">
            Yeni mesaj və sifariş gələndə brauzer bildirişi almaq üçün icazə verin — səhifə
            arxa planda olsa belə xəbərdar olacaqsınız.
          </p>
        </div>
        <div className="flex shrink-0 gap-2 pl-6 sm:pl-0">
          <Button type="button" size="sm" onClick={() => void enable()} className="min-h-[44px] sm:min-h-0">
            İcazə ver
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={dismiss}
            className="min-h-[44px] sm:min-h-0"
          >
            Sonra
          </Button>
        </div>
      </div>
    </div>
  );
}
