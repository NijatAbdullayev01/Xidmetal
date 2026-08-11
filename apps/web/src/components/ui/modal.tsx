'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useScrollLock } from '@/hooks/use-scroll-lock';
import { cn } from '@/lib/utils';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Başlıq — a11y üçün `aria-labelledby` */
  title?: string;
  /** Alt mətn — a11y üçün `aria-describedby` */
  description?: string;
  className?: string;
  panelClassName?: string;
}

export function Modal({
  open,
  onClose,
  children,
  title,
  description,
  className,
  panelClassName,
}: ModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useScrollLock(open);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;

    const frame = requestAnimationFrame(() => {
      panelRef.current?.focus();
    });

    return () => cancelAnimationFrame(frame);
  }, [open]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className={cn(
        'fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4',
        className,
      )}
    >
      <div
        role="presentation"
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cn(
          'relative z-10 flex max-h-[min(92dvh,720px)] w-full max-w-lg flex-col overflow-hidden',
          'rounded-t-2xl bg-card shadow-2xl ring-1 ring-border sm:rounded-2xl',
          'motion-safe:animate-[modal-in_200ms_ease-out]',
          panelClassName,
        )}
        onMouseDown={(event) => event.stopPropagation()}
      >
        {title ? (
          <span id={titleId} className="sr-only">
            {title}
          </span>
        ) : null}
        {description ? (
          <span id={descriptionId} className="sr-only">
            {description}
          </span>
        ) : null}
        {children}
      </div>
    </div>,
    document.body,
  );
}
