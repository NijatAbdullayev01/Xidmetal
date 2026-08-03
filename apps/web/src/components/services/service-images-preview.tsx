'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Images, X } from 'lucide-react';
import type { ServiceImageSummary } from '@xidmetal/shared';
import { Modal } from '@/components/ui/modal';
import { cn } from '@/lib/utils';

interface ServiceImagesPreviewProps {
  images: ServiceImageSummary[];
  title?: string;
  className?: string;
}

export function ServiceImagesPreview({
  images,
  title,
  className,
}: ServiceImagesPreviewProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const count = images.length;
  const cover = images[0];

  const openGallery = () => {
    setActiveIndex(0);
    setOpen(true);
  };

  const closeGallery = () => setOpen(false);

  const goPrev = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + count) % count);
  }, [count]);

  const goNext = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % count);
  }, [count]);

  useEffect(() => {
    if (!open || count <= 1) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goPrev();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        goNext();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, count, goPrev, goNext]);

  if (!cover) return null;

  const active = images[activeIndex] ?? cover;

  return (
    <>
      <button
        type="button"
        onClick={openGallery}
        className={cn(
          'relative block w-full overflow-hidden bg-muted',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand',
          className,
        )}
        aria-label={
          count > 1
            ? `Xidmət şəkillərinə bax (${count} şəkil)`
            : 'Xidmət şəklinə bax'
        }
        title="Şəkillərə baxmaq üçün klikləyin"
      >
        <span className="relative block aspect-[16/10] w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cover.url}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
          {count > 1 ? (
            <span
              className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 rounded-md bg-background/90 px-2 py-1 text-[11px] font-semibold tabular-nums text-foreground shadow-sm ring-1 ring-border/60"
              aria-hidden
            >
              <Images className="h-3 w-3" />
              {count}
            </span>
          ) : null}
        </span>
      </button>

      <Modal
        open={open}
        onClose={closeGallery}
        title={title ? `${title} — şəkillər` : 'Xidmət şəkilləri'}
        description="Xidmətin şəkilləri"
        panelClassName="max-w-lg"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border/60 px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-tight">Şəkillər</h2>
            {title ? (
              <p className="mt-0.5 truncate text-sm text-muted-foreground">{title}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={closeGallery}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Bağla"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          <div className="relative overflow-hidden rounded-xl bg-muted ring-1 ring-border/60">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={active.url}
              alt={active.alt ?? `Xidmət şəkli ${activeIndex + 1}`}
              className="mx-auto max-h-[min(60dvh,480px)] w-full object-contain"
            />

            {count > 1 ? (
              <>
                <button
                  type="button"
                  onClick={goPrev}
                  className="absolute left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm ring-1 ring-border transition-colors hover:bg-background"
                  aria-label="Əvvəlki şəkil"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm ring-1 ring-border transition-colors hover:bg-background"
                  aria-label="Növbəti şəkil"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            ) : null}
          </div>

          {count > 1 ? (
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground tabular-nums">
                {activeIndex + 1} / {count}
              </p>
              <ul className="flex gap-1.5 overflow-x-auto">
                {images.map((image, index) => (
                  <li key={image.id}>
                    <button
                      type="button"
                      onClick={() => setActiveIndex(index)}
                      className={cn(
                        'h-10 w-10 overflow-hidden rounded-md ring-1 transition-[box-shadow,opacity]',
                        index === activeIndex
                          ? 'ring-2 ring-brand opacity-100'
                          : 'ring-border/70 opacity-70 hover:opacity-100',
                      )}
                      aria-label={`Şəkil ${index + 1}`}
                      aria-current={index === activeIndex ? 'true' : undefined}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={image.url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </Modal>
    </>
  );
}
