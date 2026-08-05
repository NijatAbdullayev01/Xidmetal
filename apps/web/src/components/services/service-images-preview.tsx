'use client';

import { useState } from 'react';
import { Images, X } from 'lucide-react';
import type { ServiceImageSummary } from '@xidmetal/shared';
import { Modal } from '@/components/ui/modal';
import { ServiceImageGallery } from '@/components/services/service-image-gallery';
import { cn } from '@/lib/utils';

interface ServiceImagesPreviewProps {
  images: ServiceImageSummary[];
  title?: string;
  className?: string;
  /**
   * false olduqda yalnız cover göstərilir — lightbox parent (məs. kart preview) idarə edir.
   * @default true
   */
  enableLightbox?: boolean;
}

export function ServiceImagesPreview({
  images,
  title,
  className,
  enableLightbox = true,
}: ServiceImagesPreviewProps) {
  const [open, setOpen] = useState(false);

  const count = images.length;
  const cover = images[0];

  if (!cover) return null;

  const coverInner = (
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
  );

  if (!enableLightbox) {
    return (
      <div className={cn('relative block w-full overflow-hidden bg-muted', className)}>
        {coverInner}
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
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
        {coverInner}
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
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
            onClick={() => setOpen(false)}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Bağla"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          <ServiceImageGallery
            images={images}
            imageClassName="max-h-[min(60dvh,480px)]"
          />
        </div>
      </Modal>
    </>
  );
}
