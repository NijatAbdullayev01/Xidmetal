'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { toDisplayMediaUrl, type ServiceImageSummary } from '@xidmetal/shared';
import { cn } from '@/lib/utils';

interface ServiceImageGalleryProps {
  images: ServiceImageSummary[];
  /** Modal açılanda 0-dan başlamaq üçün */
  initialIndex?: number;
  className?: string;
  /** Şəkil sahəsinin max-height utility-ləri */
  imageClassName?: string;
}

export function ServiceImageGallery({
  images,
  initialIndex = 0,
  className,
  imageClassName,
}: ServiceImageGalleryProps) {
  const count = images.length;
  const [activeIndex, setActiveIndex] = useState(() =>
    Math.min(Math.max(initialIndex, 0), Math.max(count - 1, 0)),
  );

  useEffect(() => {
    setActiveIndex(Math.min(Math.max(initialIndex, 0), Math.max(count - 1, 0)));
  }, [initialIndex, count]);

  const goPrev = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + count) % count);
  }, [count]);

  const goNext = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % count);
  }, [count]);

  useEffect(() => {
    if (count <= 1) return;

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
  }, [count, goPrev, goNext]);

  const cover = images[0];
  if (!cover) return null;

  const active = images[activeIndex] ?? cover;

  return (
    <div className={cn('min-w-0 space-y-3', className)}>
      <div className="relative overflow-hidden rounded-xl bg-muted ring-1 ring-border/60">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={toDisplayMediaUrl(active.url)}
          alt={active.alt ?? `Xidmət şəkli ${activeIndex + 1}`}
          className={cn(
            'mx-auto max-h-[min(50dvh,420px)] w-full object-contain',
            imageClassName,
          )}
        />

        {count > 1 ? (
          <>
            <p className="absolute bottom-2.5 right-2.5 rounded-md bg-background/90 px-2 py-1 text-[11px] font-semibold tabular-nums text-foreground shadow-sm ring-1 ring-border/60">
              {activeIndex + 1} / {count}
            </p>
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
        <ul className="flex min-w-0 gap-1.5 overflow-x-auto overscroll-x-contain py-0.5 [scrollbar-width:thin]">
          {images.map((image, index) => (
            <li key={image.id} className="shrink-0">
              <button
                type="button"
                onClick={() => setActiveIndex(index)}
                className={cn(
                  'box-border h-10 w-10 overflow-hidden rounded-md border-2 transition-[border-color,opacity]',
                  index === activeIndex
                    ? 'border-brand opacity-100'
                    : 'border-transparent opacity-70 ring-1 ring-inset ring-border/70 hover:opacity-100',
                )}
                aria-label={`Şəkil ${index + 1}`}
                aria-current={index === activeIndex ? 'true' : undefined}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={toDisplayMediaUrl(image.url)}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
