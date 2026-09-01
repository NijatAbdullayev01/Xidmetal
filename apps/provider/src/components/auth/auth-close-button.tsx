'use client';

import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AuthCloseButton() {
  const router = useRouter();

  function handleClose() {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push('/');
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="absolute right-3 top-3 h-9 w-9 p-0 text-muted-foreground hover:text-foreground sm:right-4 sm:top-4"
      onClick={handleClose}
      aria-label="Geri qayıt"
    >
      <X className="h-5 w-5" />
    </Button>
  );
}
