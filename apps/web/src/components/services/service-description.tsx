'use client';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { cn } from '@/lib/utils';

interface ServiceDescriptionProps {
  description: string;
  /** Modal başlığında göstərilən xidmət adı */
  title?: string;
  className?: string;
}

export function ServiceDescription({
  description,
  title,
  className,
}: ServiceDescriptionProps) {
  const [open, setOpen] = useState(false);
  const [truncated, setTruncated] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = textRef.current;
    if (!el) return;

    const check = () => {
      setTruncated(el.scrollHeight > el.clientHeight + 1);
    };

    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [description]);

  const openModal = () => setOpen(true);
  const closeModal = () => setOpen(false);

  return (
    <>
      <p
        ref={textRef}
        className={cn(
          'mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground',
          truncated &&
            'cursor-pointer transition-colors hover:text-foreground/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2',
          className,
        )}
        onClick={truncated ? openModal : undefined}
        role={truncated ? 'button' : undefined}
        tabIndex={truncated ? 0 : undefined}
        onKeyDown={
          truncated
            ? (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  openModal();
                }
              }
            : undefined
        }
        aria-label={truncated ? 'Tam təsvirə bax' : undefined}
        title={truncated ? 'Tam təsvirə baxmaq üçün klikləyin' : undefined}
      >
        {description}
      </p>

      <Modal
        open={open}
        onClose={closeModal}
        title={title ? `${title} — təsvir` : 'Xidmət təsviri'}
        description="Xidmətin tam təsviri"
        panelClassName="max-w-md"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border/60 px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-tight">Təsvir</h2>
            {title ? (
              <p className="mt-0.5 truncate text-sm text-muted-foreground">{title}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={closeModal}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Bağla"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {description}
          </p>
        </div>
      </Modal>
    </>
  );
}
